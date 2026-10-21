import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createCommentHandler } from '../functions/oitutigas-comments/handler.mjs';
if (!globalThis.crypto)globalThis.crypto=webcrypto;
const origin='https://estudante.github.io';
const endpoint='https://teste.supabase.co/functions/v1/oitutigas-comments';
const authorCode='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef';
const adminToken='Admin-ABC123ABC123ABC123ABC123ABC123XYZ';
function setup(configuredAdminToken=adminToken){
  const rows=new Map(),rates=new Map();
  const backend={
    async list(id){return [...rows.values()].filter(r=>r.question_id===id).sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,100);},
    async allowPost(hash){const n=(rates.get(hash)||0)+1;rates.set(hash,n);return n<=8;},
    async insert(row){const full={...row,created_at:new Date().toISOString()};rows.set(row.id,full);return full;},
    async getForDelete(id){return rows.get(id)||null;},
    async deleteByAuthor(id,hash){const row=rows.get(id);if(!row||row.delete_token_hash!==hash)return null;rows.delete(id);return row;},
    async deleteByAdmin(id){const row=rows.get(id)||null;rows.delete(id);return row;}
  };
  return {handle:createCommentHandler(backend,{allowedOrigins:origin,ipSalt:'test-ip-secret',adminToken:configuredAdminToken}),rows,rates};
}
function req(path,method='GET',data=null,other={}){
  const headers={origin,...other};
  const args={method,headers};
  if(data!==null){args.body=JSON.stringify(data);headers['Content-Type']='application/json';}
  return new Request(endpoint+path,args);
}
function payload(overrides={}){return {question_id:'m4-2026:questao-22',author_name:'Estudante',body:'Um comentário científico.',delete_token:authorCode,...overrides};}
const commentId=async handle=>(await(await handle(req('/comments','POST',payload()))).json()).comment.id;
test('publica e lista texto público, sem expor hashes',async()=>{
  const {handle}=setup();
  const post=await handle(req('/comments','POST',payload()));assert.equal(post.status,201);
  const data=(await post.json()).comment;assert.equal(data.body,'Um comentário científico.');assert.equal(data.delete_token_hash,undefined);
  assert.equal(data.image_url,undefined);
  const list=await handle(req('/comments?question_id=m4-2026%3Aquestao-22'));
  assert.equal((await list.json()).comments.length,1);
});
test('exclusão pelo código do autor e recusa código errado',async()=>{
  const {handle,rows}=setup(),id=await commentId(handle);
  assert.equal((await handle(req(`/comments/${id}`,'DELETE',{delete_token:'incorreto'}))).status,403);
  assert.equal(rows.size,1);
  assert.equal((await handle(req(`/comments/${id}`,'DELETE',{delete_token:authorCode}))).status,200);
  assert.equal(rows.size,0);
});
test('admin apaga qualquer comentário sem o código do autor',async()=>{
  const {handle,rows}=setup(),id=await commentId(handle);
  assert.equal((await handle(req('/admin/check','GET',null,{'X-Oitutigas-Admin':adminToken}))).status,200);
  assert.equal((await handle(req(`/comments/${id}`,'DELETE',null,{'X-Oitutigas-Admin':adminToken}))).status,200);
  assert.equal(rows.size,0);
});
test('não autoriza administrador com senha errada ou não configurada',async()=>{
  const {handle,rows}=setup(),id=await commentId(handle);
  assert.equal((await handle(req('/admin/check','GET',null,{'X-Oitutigas-Admin':'errada'.repeat(9)}))).status,403);
  assert.equal((await handle(req(`/comments/${id}`,'DELETE',null,{'X-Oitutigas-Admin':'errada'.repeat(9)}))).status,403);
  assert.equal(rows.size,1);
  const unconfigured=createCommentHandler({},{allowedOrigins:origin,ipSalt:'salt',adminToken:''});
  assert.equal((await unconfigured(req('/admin/check','GET',null,{'X-Oitutigas-Admin':adminToken}))).status,403);
});
test('aceita senha de moderação com quatro caracteres, não três',async()=>{
  const {handle}=setup('7bC4');
  assert.equal((await handle(req('/admin/check','GET',null,{'X-Oitutigas-Admin':'7bC4'}))).status,200);
  assert.equal((await handle(req('/admin/check','GET',null,{'X-Oitutigas-Admin':'7bC'}))).status,403);
  const notConfigured=setup('7bC');
  assert.equal((await notConfigured.handle(req('/admin/check','GET',null,{'X-Oitutigas-Admin':'7bC'}))).status,403);
});
test('bloqueia excesso de tentativas administrativas sem afetar publicações',async()=>{
  const {handle}=setup('7bC4');
  for(let i=0;i<8;i++)assert.equal((await handle(req('/admin/check','GET',null,{'X-Oitutigas-Admin':'xxxx'}))).status,403);
  assert.equal((await handle(req('/admin/check','GET',null,{'X-Oitutigas-Admin':'7bC4'}))).status,429);
  assert.equal((await handle(req('/comments','POST',payload()))).status,201);
});
test('rejeita imagem no JSON e multipart no servidor',async()=>{
  const {handle,rows}=setup();
  assert.equal((await handle(req('/comments','POST',payload({image:'data:image/png;base64,...'})))).status,400);
  const form=new FormData();form.append('body','teste');form.append('image',new Blob(['imagem']),'foto.png');
  assert.equal((await handle(new Request(endpoint+'/comments',{method:'POST',headers:{origin},body:form}))).status,400);
  assert.equal(rows.size,0);
});
test('exige nome e comentário não vazio',async()=>{
  const {handle}=setup();
  assert.equal((await handle(req('/comments','POST',payload({author_name:'   '})))).status,400);
  assert.equal((await handle(req('/comments','POST',payload({body:'   '})))).status,400);
  assert.equal((await handle(req('/comments','POST',payload({question_id:'bad?'})))).status,400);
});
test('recusa origem externa e preflight inválido',async()=>{
  const {handle}=setup();
  assert.equal((await handle(req('/comments','OPTIONS'))).status,204);
  assert.equal((await handle(req('/comments','GET',null,{origin:'https://bad.example'}))).status,403);
  assert.equal((await handle(req('/comments','OPTIONS',null,{origin:'https://bad.example'}))).status,403);
});
test('limite de oito comentários por janela',async()=>{
  const {handle,rows}=setup();
  for(let i=0;i<8;i++)assert.equal((await handle(req('/comments','POST',payload({body:'Mensagem '+i})))).status,201);
  assert.equal((await handle(req('/comments','POST',payload()))).status,429);
  assert.equal(rows.size,8);
});
test('sem origens/salt não publica',async()=>{
  const handler=createCommentHandler({},{allowedOrigins:'',ipSalt:''});
  assert.equal((await handler(req('/comments','POST',payload()))).status,503);
});
