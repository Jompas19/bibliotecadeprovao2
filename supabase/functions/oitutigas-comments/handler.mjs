/* API OituTigas v3: comentários somente em texto, exclusão por autor ou administrador.
 * Não expõe chaves Supabase nem aceita anexos, mesmo em requisições criadas manualmente.
 */
const MAX_NAME = 60;
const MAX_BODY = 2000;
const MAX_REQUEST_BYTES = 16000;
class HttpError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const matchesQuestion = s => typeof s === 'string' && s.length > 0 && s.length <= 160 && /^[A-Za-z0-9:_./-]+$/.test(s);
const hash = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))))
  .map(x => x.toString(16).padStart(2,'0')).join('');
const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function send(body,status,cors) { return new Response(JSON.stringify(body),{status,headers:{...headers,...cors}}); }
function corsFor(origin, origins) {
  if (!origin || !origins.includes(origin)) return {};
  return {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type,X-Oitutigas-Admin','Access-Control-Max-Age':'86400','Vary':'Origin'};
}
async function limitedJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json'))
    throw new HttpError('Envie os dados em JSON. Anexos não são permitidos.');
  if (Number(request.headers.get('content-length')) > MAX_REQUEST_BYTES) throw new HttpError('Comentário muito grande.',413);
  if (!request.body) throw new HttpError('Envie os dados do comentário.');
  const reader=request.body.getReader(); let bytes=0; const chunks=[];
  for (;;) {
    const {value,done}=await reader.read();
    if (done) break;
    bytes+=value.byteLength;
    if (bytes>MAX_REQUEST_BYTES) {await reader.cancel();throw new HttpError('Comentário muito grande.',413);}
    chunks.push(value);
  }
  const data=new Uint8Array(bytes);let at=0;
  for (const chunk of chunks) {data.set(chunk,at);at+=chunk.length;}
  try {const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('body');
    return value;
  } catch (_) {throw new HttpError('Os dados enviados são inválidos.');}
}
function safeEqual(a,b) { // Comparação pelo resumo de comprimento fixo; não compara diretamente as senhas.
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
function asPublic(row) {
  return {id:row.id,question_id:row.question_id,author_name:row.author_name,body:row.body,created_at:row.created_at};
}
export function createCommentHandler(backend, settings={}) {
  const origins=String(settings.allowedOrigins||'').split(',').map(x=>x.trim().replace(/\/+$/,'')).filter(Boolean);
  const salt=String(settings.ipSalt||'');
  const adminToken=String(settings.adminToken||'');
  const adminHash=adminToken.length>=4 ? hash(adminToken) : Promise.resolve(null);
  async function validAdmin(request) {
    const supplied=request.headers.get('x-oitutigas-admin');
    if (!supplied || supplied.length<4 || supplied.length>256) return false;
    const expected=await adminHash;
    return !!expected && safeEqual(await hash(supplied),expected);
  }
  // Limite simples por origem de rede: oito tentativas de moderação por hora.
  // Chaves administrativas nunca são armazenadas ou registradas neste controle.
  async function limitAdmin(request) {
    const ip=(request.headers.get('cf-connecting-ip')||request.headers.get('x-real-ip')||
      request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
    if(!await backend.allowPost(await hash(`${salt}:admin:${ip}`)))
      throw new HttpError('Muitas tentativas de moderação. Tente novamente em uma hora.',429);
  }
  return async request => {
    const origin=request.headers.get('origin');
    const cors=corsFor(origin,origins);
    if(request.method==='OPTIONS')return new Response(null,{status:origin&&origins.includes(origin)?204:403,headers:cors});
    if(!origins.length||!salt)return send({error:'Comentários OituTigas ainda não foram configurados.'},503,cors);
    if(!origin||!origins.includes(origin))return send({error:'Origem não autorizada.'},403,cors);
    const url=new URL(request.url);
    const suffix=url.pathname.split('/oitutigas-comments')[1]||'';
    try {
      if(request.method==='GET'&&suffix==='/comments') {
        const id=url.searchParams.get('question_id');
        if(!matchesQuestion(id))throw new HttpError('Identificador de questão inválido.');
        return send({comments:(await backend.list(id)).map(asPublic)},200,cors);
      }
      if(request.method==='GET'&&suffix==='/admin/check') {
        await limitAdmin(request);
        if(!await validAdmin(request))throw new HttpError('Credencial administrativa inválida.',403);
        return send({admin:true},200,cors);
      }
      if(request.method==='POST'&&suffix==='/comments') {
        const input=await limitedJson(request);
        const questionId=input.question_id, author=input.author_name, body=input.body, code=input.delete_token;
        if(!matchesQuestion(questionId))throw new HttpError('Identificador da questão inválido.');
        if(typeof author!=='string'||!author.trim()||author.trim().length>MAX_NAME)throw new HttpError('Informe seu nome (até 60 caracteres).');
        if(typeof body!=='string'||!body.trim()||body.length>MAX_BODY)throw new HttpError('Escreva um comentário de até 2.000 caracteres.');
        if(typeof code!=='string'||!/^[A-Za-z0-9_-]{32}$/.test(code))throw new HttpError('Código de exclusão inválido.');
        if(Object.hasOwn(input,'image')||Object.hasOwn(input,'image_url')||Object.hasOwn(input,'image_key'))throw new HttpError('Não é permitido anexar imagens.');
        const ip=(request.headers.get('cf-connecting-ip')||request.headers.get('x-real-ip')||
          request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
        if(!await backend.allowPost(await hash(`${salt}:${ip}`)))throw new HttpError('Limite de comentários atingido. Tente novamente em uma hora.',429);
        const row=await backend.insert({id:crypto.randomUUID(),question_id:questionId,author_name:author.trim(),
          body:body.trim(),delete_token_hash:await hash(code)});
        return send({comment:asPublic(row)},201,cors);
      }
      const match=suffix.match(/^\/comments\/([0-9a-f-]{36})$/i);
      if(request.method==='DELETE'&&match) {
        const id=match[1];
        // A chave administrativa autoriza a moderação sem conhecer o código do autor.
        if(request.headers.has('x-oitutigas-admin')) {
          await limitAdmin(request);
          if(!await validAdmin(request))throw new HttpError('Credencial administrativa inválida.',403);
          const removed=await backend.deleteByAdmin(id);
          if(!removed)throw new HttpError('Comentário não encontrado.',404);
          return send({deleted:true,moderated:true},200,cors);
        }
        const input=await limitedJson(request),code=input.delete_token;
        if(typeof code!=='string'||code.length>256||!code.trim())throw new HttpError('Informe o código de exclusão.');
        const row=await backend.getForDelete(id);
        if(!row)throw new HttpError('Comentário não encontrado.',404);
        const digest=await hash(code);
        if(!safeEqual(digest,row.delete_token_hash))throw new HttpError('Código incorreto. O comentário foi preservado.',403);
        if(!await backend.deleteByAuthor(id,digest))throw new HttpError('Comentário já excluído.',404);
        return send({deleted:true},200,cors);
      }
      throw new HttpError('Rota não encontrada.',404);
    } catch(error) {
      if(!(error instanceof HttpError))console.error('Erro OituTigas:',error);
      return send({error:error instanceof HttpError?error.message:'Erro temporário ao acessar comentários.'},
        error instanceof HttpError?error.status:500,cors);
    }
  };
}
