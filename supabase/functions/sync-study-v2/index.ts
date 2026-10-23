import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
const url=Deno.env.get('SUPABASE_URL');
let secret='';try{secret=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||''}catch{}
secret ||= Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'https://jompas19.github.io','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const respond=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers});
const digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(v=>v.toString(16).padStart(2,'0')).join('');
const clean=o=>o&&typeof o==='object'&&!Array.isArray(o)?o:{};
const limit=o=>JSON.stringify(o).length<500000;
function merge(a,b){const out={...clean(a)};for(const [k,v] of Object.entries(clean(b))){if(!v||typeof v!=='object')continue;const old=out[k];if(!old||Number(v.updatedAt||v._syncUpdatedAt||v.confirmedAt||0)>=Number(old.updatedAt||old._syncUpdatedAt||old.confirmedAt||0))out[k]=v;}return out;}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return respond({message:'Método inválido.'},405);
 if(req.headers.get('origin')!=='https://jompas19.github.io')return respond({message:'Origem não autorizada.'},403);
 try{
  if(Number(req.headers.get('content-length')||0)>600000)return respond({message:'Dados muito grandes.'},413);
  const raw=await req.text();if(raw.length>600000)return respond({message:'Dados muito grandes.'},413);
  const b=JSON.parse(raw), key=String(b.key||'').trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9_-]{2,79}$/.test(key))return respond({message:'O ID deve ter entre 3 e 80 caracteres (letras, números, hífen ou sublinhado). IDs curtos podem ser adivinhados.',error:'invalid_key'},400);
  if(!['create','sync','reset'].includes(b.action))return respond({message:'Operação inválida.'},400);
  const key_hash=await digest('bibliotecadeprovao2:v2:'+key);
  const incoming=clean(b.state);
  if(!limit(incoming))return respond({message:'Dados excedem o limite de sincronização.'},413);
  const {data:found,error:readErr}=await db.from('study_sync_v2').select('data,reset_at').eq('key_hash',key_hash).maybeSingle();
  if(readErr)throw readErr;
  if(b.action==='create'){
   if(found)return respond({error:'key_exists',message:'Este ID já existe.'},409);
   const data={progress:clean(incoming.progress),notes:clean(incoming.notes),highlights:clean(incoming.highlights)};
   const {error}=await db.from('study_sync_v2').insert({key_hash,data});
   if(error){if(error.code==='23505')return respond({error:'key_exists',message:'Este ID já existe.'},409);throw error;}
   return respond({state:data,resetAt:0});
  }
  if(!found)return respond({error:'key_not_found',message:'ID não encontrado.'},404);
  if(b.action==='reset'){
   const resetAt=Date.now();
   const data={progress:{},notes:{},highlights:{}};
   const {error}=await db.from('study_sync_v2').update({data,reset_at:resetAt,updated_at:new Date().toISOString()}).eq('key_hash',key_hash);
   if(error)throw error;return respond({state:data,resetAt});
  }
  const resetAt=Number(found.reset_at||0), clientReset=Number(b.resetAt||0);
  const base=clean(found.data);
  const data={progress:merge(base.progress,clientReset<resetAt?{}:incoming.progress),
    notes:merge(base.notes,clientReset<resetAt?{}:incoming.notes),
    highlights:merge(base.highlights,clientReset<resetAt?{}:incoming.highlights)};
  const {error}=await db.from('study_sync_v2').update({data,updated_at:new Date().toISOString()}).eq('key_hash',key_hash);
  if(error)throw error;
  return respond({state:data,resetAt});
 }catch(e){console.error('sync-v2',e);return respond({error:'server_error',message:'Não foi possível sincronizar os dados.'},500)}
});
