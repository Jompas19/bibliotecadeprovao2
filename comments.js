/* Comentários OituTigas: publicação pública em texto, moderação por segredo no servidor. */
(() => {
  'use strict';
  const API=String(window.OITUTIGAS_CONFIG?.apiUrl||'').replace(/\/+$/,'');
  const app=document.getElementById('app'); if(!app)return;
  const credentialsKey='oitutigas:delete-codes:v1';
  const nameKey='oitutigas:author-name:v1';
  const drafts=new Map();
  let mounted=null,sequence=0,adminToken=null;
  let codes={};try{codes=JSON.parse(localStorage.getItem(credentialsKey)||'{}')||{};}catch(_){codes={};}
  const el=(tag,klass,text)=>{const n=document.createElement(tag);if(klass)n.className=klass;if(text!==undefined)n.textContent=text;return n;};
  const saveCodes=()=>{try{localStorage.setItem(credentialsKey,JSON.stringify(codes));}catch(_){}};
  const message=e=>e?.message||'Não foi possível completar a operação.';
  function makeToken(){const b=new Uint8Array(24);crypto.getRandomValues(b);return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function date(t){try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(t));}catch{return '';}}
  async function api(path,opts={}){
    const res=await fetch(API+path,{cache:'no-store',...opts});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||`Falha na comunicação (${res.status}).`);
    return data;
  }
  function status(section,text,error=false){const n=section?.querySelector('.oitu-status');if(n){n.textContent=text;n.classList.toggle('error',error);}}
  function rememberDraft(section){
    if(!section?.isConnected)return;
    const author=section.querySelector('[name=author_name]'),body=section.querySelector('[name=body]');
    if(author&&body)drafts.set(section.dataset.questionId,{author:author.value,body:body.value});
  }
  function renderComments(section,items){
    if(!section.isConnected)return;
    section.querySelector('.oitu-counter').textContent=`${items.length} comentário${items.length===1?'':'s'}`;
    const list=section.querySelector('.oitu-list');list.replaceChildren();
    if(!items.length){list.append(el('div','oitu-empty','Ainda não há comentários. Compartilhe sua explicação!'));return;}
    for(const item of items){
      const article=el('article','oitu-item');
      const head=el('div','oitu-item-head'),left=el('div');
      left.append(el('strong','oitu-author',item.author_name));
      if(codes[item.id])left.append(el('span','oitu-author-pill',' · seu comentário'));
      head.append(left,el('time','oitu-date',date(item.created_at)));
      article.append(head,el('p','oitu-body',item.body));
      const actions=el('div','oitu-actions');
      const owner=el('button','oitu-delete',codes[item.id]?'Excluir meu comentário':'Excluir com código');
      owner.type='button';owner.addEventListener('click',()=>removeComment(section,item.id,false));
      actions.append(owner);
      if(adminToken){
        const admin=el('button','oitu-delete oitu-admin-delete','Excluir como administrador');
        admin.type='button';admin.addEventListener('click',()=>removeComment(section,item.id,true));
        actions.append(admin);
      }
      article.append(actions);list.append(article);
    }
  }
  async function load(section){
    if(!API)return;
    const current=++sequence;
    try{
      const data=await api(`/comments?question_id=${encodeURIComponent(section.dataset.questionId)}`);
      if(current===sequence&&section.isConnected)renderComments(section,data.comments||[]);
    }catch(e){if(current===sequence&&section.isConnected)section.querySelector('.oitu-list').replaceChildren(el('div','oitu-empty',message(e)));}
  }
  async function enterAdmin(section,button){
    if(adminToken){
      adminToken=null;
      button.textContent='Moderação';button.classList.remove('is-active');
      await load(section);return;
    }
    const code=window.prompt('Informe a chave de moderação configurada no Supabase (mínimo de 4 caracteres):');
    if(code===null)return;
    const entered=code.trim();if(!entered)return;
    if(entered.length<4){status(section,'A chave administrativa deve ter pelo menos 4 caracteres.',true);return;}
    button.disabled=true;
    try{
      await api('/admin/check',{headers:{'X-Oitutigas-Admin':entered}});
      adminToken=entered; // Somente em memória; não é gravado em cookie ou localStorage.
      button.textContent='Sair da moderação';button.classList.add('is-active');
      status(section,'Modo administrador ativo nesta aba.');await load(section);
    }catch(e){status(section,message(e),true);}
    finally{if(button.isConnected)button.disabled=false;}
  }
  function field(labelText,name,asTextArea=false){
    const wrap=el('label','oitu-field'),caption=el('span','oitu-label',labelText);
    const control=el(asTextArea?'textarea':'input',asTextArea?'oitu-textarea':'oitu-input');
    control.name=name;control.required=true;control.maxLength=asTextArea?2000:60;
    control.placeholder=asTextArea?'Compartilhe sua explicação, referência ou dúvida...':'Nome exibido publicamente';
    wrap.append(caption,control);return wrap;
  }
  function build(section){
    if(section.dataset.mounted==='1')return;
    section.dataset.mounted='1';
    if(section.dataset.questionId==='tutorial:exemplo'){
      section.innerHTML='<div class="oitu-heading"><div class="oitu-heading-main"><h3>Comentários OituTigas</h3><span class="oitu-counter">Exemplo</span></div></div><p class="oitu-description">Troque explicações com outros estudantes, sem precisar de login.</p><div class="oitu-list"><article class="oitu-item"><div class="oitu-item-head"><strong class="oitu-author">Marina (exemplo)</strong></div><p class="oitu-body">A explicação da alternativa B me ajudou a entender a questão!</p></article></div><div class="oitu-form"><strong>Publique um comentário</strong><p class="oitu-hint">Informe seu nome e escreva o comentário para postar. Você também pode excluir sua publicação pelo código de exclusão.</p><p class="oitu-hint">Esta é apenas uma demonstração. Nenhum dado será enviado.</p></div>';
      return;
    }
    const heading=el('div','oitu-heading');
    const headGroup=el('div','oitu-heading-main');
    headGroup.append(el('h3','','Comentários OituTigas'),el('span','oitu-counter','Carregando...'));
    const admin=el('button','oitu-admin-toggle',adminToken?'Sair da moderação':'Moderação');
    admin.type='button';admin.title='Área reservada ao administrador';
    if(adminToken)admin.classList.add('is-active');
    admin.addEventListener('click',()=>enterAdmin(section,admin));
    heading.append(headGroup,admin);
    const desc=el('p','oitu-description','Comentários publicados pelos estudantes e visíveis para todos. Apenas texto, sem imagens.');
    const list=el('div','oitu-list');list.setAttribute('aria-live','polite');
    section.append(heading,desc,list);
    if(!API){
      list.append(el('div','oitu-disabled','Comentários aguardando configuração: informe a URL da Edge Function em comments-config.js.'));
      heading.querySelector('.oitu-counter').textContent='Aguardando ativação';
      admin.disabled=true;return;
    }
    const form=el('form','oitu-form');
    form.append(el('div','oitu-form-title','Publique um comentário'));
    const nameField=field('Seu nome *','author_name'),bodyField=field('Comentário *','body',true);
    form.append(nameField,bodyField);
    const footer=el('div','oitu-form-bottom');
    footer.append(el('span','oitu-hint','Até 2.000 caracteres · publicações somente em texto.'));
    const publish=el('button','btn primary','Postar');publish.type='submit';footer.append(publish);
    form.append(footer,el('div','oitu-status'));
    const draft=drafts.get(section.dataset.questionId);
    let lastName='';try{lastName=localStorage.getItem(nameKey)||'';}catch(_){}
    form.elements.author_name.value=draft?.author??lastName;
    form.elements.body.value=draft?.body||'';
    for(const control of [form.elements.author_name,form.elements.body])control.addEventListener('input',()=>rememberDraft(section));
    form.addEventListener('submit',event=>{event.preventDefault();publishComment(section,form);});
    section.append(form);load(section);
  }
  async function publishComment(section,form){
    const author=String(form.elements.author_name.value||'').trim();
    const body=String(form.elements.body.value||'').trim();
    if(!author)return status(section,'Informe seu nome.',true);
    if(!body)return status(section,'Escreva um comentário antes de publicar.',true);
    const button=form.querySelector('[type=submit]');button.disabled=true;
    status(section,'Publicando comentário...');
    const code=makeToken();
    try{
      const data=await api('/comments',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({question_id:section.dataset.questionId,author_name:author,body,delete_token:code})});
      codes[data.comment.id]=code;saveCodes();
      try{localStorage.setItem(nameKey,author);}catch(_){}
      drafts.delete(section.dataset.questionId);
      if(form.isConnected){
        form.elements.body.value='';form.querySelector('.oitu-recovery')?.remove();
        const recovery=el('div','oitu-recovery');
        recovery.append(el('strong','','Comentário publicado. Guarde seu código para excluí-lo:'));
        recovery.append(el('div','oitu-code',code));
        recovery.append(el('p','oitu-hint','O código também foi salvo neste navegador. Em outro dispositivo será necessário informá-lo.'));
        const copy=el('button','btn small','Copiar código');copy.type='button';
        copy.addEventListener('click',async()=>{
          try{await navigator.clipboard.writeText(code);copy.textContent='Código copiado!';}
          catch{window.prompt('Copie seu código:',code);}
        });
        recovery.append(copy);form.prepend(recovery);
      }
      status(section,'Comentário publicado e visível para todos.');await load(section);
    }catch(e){status(section,message(e),true);}
    finally{if(button.isConnected)button.disabled=false;}
  }
  async function removeComment(section,id,asAdmin){
    let code;
    if(!asAdmin){
      code=codes[id]||window.prompt('Informe o código de exclusão fornecido ao publicar:')?.trim();
      if(!code)return;
    }else if(!adminToken)return status(section,'Ative a moderação primeiro.',true);
    if(!window.confirm(asAdmin?'Excluir permanentemente este comentário como administrador?':'Excluir permanentemente este comentário?'))return;
    try{
      const options=asAdmin
        ?{method:'DELETE',headers:{'X-Oitutigas-Admin':adminToken}}
        :{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({delete_token:code})};
      await api(`/comments/${encodeURIComponent(id)}`,options);
      delete codes[id];saveCodes();
      status(section,'Comentário excluído.');await load(section);
    }catch(e){status(section,message(e),true);}
  }
  function refresh(){
    const section=document.getElementById('oituComments');
    if(section===mounted)return;
    if(mounted)rememberDraft(mounted);
    mounted=section;sequence++;
    if(section)build(section);
  }
  const observer=new MutationObserver(refresh);
  observer.observe(app,{childList:true,subtree:false});
  refresh();
})();
