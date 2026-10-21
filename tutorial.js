/* Biblioteca de Provões — visita guiada local, sem alterações nos dados de estudo. */
(() => {
  'use strict';
  const frame = document.getElementById('appFrame');
  if (!frame) return;

  const KEY = 'biblioteca:tour-first-choice:v1';
  const steps = [
    {group:'home',target:'#themeToggle',title:'Modo claro / escuro',body:'Troque o visual do site com um clique.'},
    {group:'home',target:'#resetUserBtn',title:'Restaurar',body:'Apaga respostas e anotações. O site pede confirmação antes.'},
    {group:'home',target:'#cloudSyncBtn',outer:true,title:'Sincronizar',body:'Use o mesmo ID para recuperar seu progresso em outros dispositivos.'},
    {group:'question',target:'#studyMarkerToggle',title:'Marca-texto',body:'Ative e selecione palavras para grifar.',demo:'mark'},
    {group:'question',target:'.study-option-exclude',title:'Riscar alternativa (×)',body:'Clique no × para descartar uma opção. Clique de novo para desfazer.',demo:'strike'},
    {group:'question',target:'.study-copy-question',title:'Copiar questão',body:'Copie o enunciado e as alternativas para colar em suas anotações ou compartilhar com colegas.'},
    {group:'question',target:'.status-wrap',title:'Classificação da questão',body:'Depois de responder, marque Acertei, Errei, Dúvida ou Chutei/Não sabia.'},
    {group:'question',target:'#studyExplanationsToggle',title:'Comentários da questão',body:'Oculte as explicações das alternativas, mantendo o gabarito visível.'},
    {group:'question',target:'.post-actions button[onclick="startRetry()"]',title:'Responder novamente',body:'Faça uma nova tentativa sem apagar seu histórico.'},
    {group:'question',target:'.post-actions button[onclick="showKeyModal()"]',title:'Mudar gabarito',body:'Corrija a letra do gabarito apenas para o seu estudo.'},
    {group:'question',target:'.post-actions button[onclick="toggleNotes()"]',title:'Ver anotações',body:'Salve lembretes pessoais, formate textos e adicione imagens.',demo:'notes'},
    {group:'question',target:'#oituComments',title:'Comentários OituTigas',body:'Publique comentários com seu nome; todos podem ler. Exclua usando seu código.',demo:'comments'}
  ];

  let active = false, welcome = false, index = 0, generation = 0, overlay = null;
  let markedThisSession = false;
  let firstChoice = false;
  try { firstChoice = localStorage.getItem(KEY) === '1'; } catch (_) {
    try {firstChoice = sessionStorage.getItem(KEY) === '1';} catch (_) {}
  }
  const rememberChoice = () => {
    markedThisSession = true;
    try { localStorage.setItem(KEY,'1'); } catch (_) { try { sessionStorage.setItem(KEY,'1'); } catch (_) {} }
  };
  const doc = () => { try {return frame.contentDocument;} catch (_) {return null;} };
  const appWindow = () => { try {return frame.contentWindow;} catch (_) {return null;} };
  const ready = () => !!doc()?.getElementById('themeToggle') && typeof appWindow()?.studyTutorialShowLibrary === 'function';

  const stylesheet = document.createElement('style');
  stylesheet.id = 'studyTourStyles';
  stylesheet.textContent = `
    .tour-shell{position:fixed;inset:0;z-index:50000;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#172033}
    .tour-dim{position:fixed;background:rgba(12,20,36,.72);pointer-events:auto;backdrop-filter:blur(1px)}
    .tour-focus{position:fixed;border:3px solid #f5d16e;border-radius:12px;box-shadow:0 0 0 3px rgba(255,255,255,.9),0 10px 42px rgba(0,0,0,.22);pointer-events:auto;background:rgba(255,255,255,.03)}
    .tour-panel{position:fixed;z-index:2;box-sizing:border-box;width:min(370px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;padding:18px;border-radius:17px;background:#fff;color:#172033;box-shadow:0 18px 65px rgba(0,0,0,.3);border:1px solid #dbe3f0}
    .tour-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .tour-kicker{font-weight:800;text-transform:uppercase;letter-spacing:.07em;font-size:11px;color:#506ab8}
    .tour-panel h2{font-size:21px;line-height:1.24;margin:4px 0 6px;color:#172033}
    .tour-panel p{font-size:14px;line-height:1.5;color:#48566c;margin:0 0 12px}
    .tour-panel button,.tour-welcome button{cursor:pointer;font-family:inherit}
    .tour-close{border:0;background:#eff2f8;color:#45536b;font-size:19px;font-weight:750;border-radius:9px;min-width:33px;height:33px;line-height:1}
    .tour-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:14px}
    .tour-button{padding:9px 14px;border:1px solid #cbd4e2;border-radius:9px;background:#fff;color:#273650;font-size:13px;font-weight:700}
    .tour-button.primary{background:#3156d3;border-color:#3156d3;color:#fff}
    .tour-progress{font-size:12px;color:#607088;font-weight:700;white-space:nowrap}
    .tour-progress-track{height:4px;border-radius:20px;background:#edf0f7;overflow:hidden;margin-top:12px}
    .tour-progress-track span{display:block;height:100%;background:#4569d9;border-radius:20px}
    .tour-example{border:1px solid #dfe7f4;background:#f7f9fe;color:#34435b;font-size:13px;line-height:1.45;border-radius:10px;padding:11px 12px;margin-top:11px}
    .tour-example mark{background:#ffe48e;color:#272a32;border-radius:3px;padding:2px 3px}
    .tour-strike{font-weight:700;color:#9f2424;text-decoration:line-through;text-decoration-thickness:2px}
    .tour-sample-note{margin-top:4px;background:#fff;border:1px solid #dce3ee;border-radius:7px;padding:7px 9px}
    .tour-sample-comment{background:#fff;padding:9px 10px;border-radius:8px;border:1px solid #dce3ee}
    .tour-sample-comment strong{font-size:12px;color:#3156a1}
    .tour-sample-comment p{font-size:13px;margin:4px 0 0}
    .tour-welcome-shade{position:fixed;inset:0;background:rgba(12,20,36,.66);backdrop-filter:blur(4px);display:grid;place-items:center;padding:15px}
    .tour-welcome{background:#fff;box-sizing:border-box;border-radius:22px;padding:25px 23px;width:min(470px,100%);box-shadow:0 26px 80px rgba(0,0,0,.3);text-align:center}
    .tour-welcome-icon{width:54px;height:54px;border-radius:17px;background:#eaf0ff;color:#3156d3;display:grid;place-items:center;font-weight:800;font-size:30px;margin:0 auto 13px}
    .tour-welcome h2{margin:0 0 8px;font-size:24px;line-height:1.22}
    .tour-welcome p{color:#5b687b;font-size:14px;line-height:1.55;margin:0 0 21px}
    .tour-welcome-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
    .tour-welcome .tour-button{padding:11px 15px;font-size:14px}
    @media(max-width:490px){.tour-welcome-actions{display:grid}.tour-welcome-actions .tour-button{width:100%}.tour-panel{padding:15px}.tour-panel h2{font-size:18px}.tour-panel p{font-size:13px}}
    @media(prefers-reduced-motion:reduce){.tour-progress-track span{transition:none}}
  `;
  document.head.appendChild(stylesheet);

  function clean(){overlay?.remove();overlay=null;}
  function makeShell(){clean();overlay=document.createElement('div');overlay.className='tour-shell';overlay.setAttribute('role','presentation');document.body.appendChild(overlay);return overlay;}
  function focusPrimary(){const el=overlay?.querySelector('.tour-button.primary');el?.focus({preventScroll:true});}

  function closeTour(){
    generation++;
    const wasActive=active;
    active=false;welcome=false;
    clean();
    if(wasActive){
      try {appWindow()?.studyTutorialFinish?.();} catch (_) {}
      // Mantenha a renderização de retorno sem efeitos; restaure os movimentos depois.
      const currentDoc=doc();
      requestAnimationFrame(()=>currentDoc?.documentElement?.classList.remove('study-tour-active'));
    }
  }

  function showWelcome(){
    if(active||welcome||markedThisSession||firstChoice||!ready())return;
    welcome=true;
    const root=makeShell();
    root.innerHTML=`<div class="tour-welcome-shade"><section class="tour-welcome" role="dialog" aria-modal="true" aria-labelledby="tourWelcomeTitle"><div class="tour-welcome-icon" aria-hidden="true">?</div><h2 id="tourWelcomeTitle">Conheça a Biblioteca de Provões</h2><p>Quer ver um guia rápido das principais funcionalidades? Você também pode começar agora e abrir o tutorial depois pelo botão <strong>?</strong>.</p><div class="tour-welcome-actions"><button type="button" class="tour-button primary" id="tourWelcomeStart">Ver funcionalidades do site</button><button type="button" class="tour-button" id="tourWelcomeSkip">Começar a usar</button></div></section></div>`;
    root.querySelector('#tourWelcomeStart').addEventListener('click',()=>{
      rememberChoice();welcome=false;clean();startTour();
    });
    root.querySelector('#tourWelcomeSkip').addEventListener('click',()=>{
      rememberChoice();welcome=false;clean();
    });
    root.querySelector('#tourWelcomeStart').focus();
  }

  function demoMarkup(kind){
    if(kind==='mark') return '<div class="tour-example">Exemplo: <mark>Trecho importante para revisar</mark></div>';
    if(kind==='strike') return '<div class="tour-example"><span class="tour-strike">A. Alternativa descartada</span> &nbsp;×</div>';
    if(kind==='notes') return '<div class="tour-example">Minhas anotações:<div class="tour-sample-note"><strong>Resumo:</strong> revisar esse conceito. <span aria-label="Imagem adicionada">🖼️</span></div></div>';
    if(kind==='comments')return '<div class="tour-example"><div class="tour-sample-comment"><strong>Marina • exemplo</strong><p>Esta explicação me ajudou a resolver a questão!</p></div></div>';
    return '';
  }

  function boundsOf(step){
    const d=step.outer?document:doc();
    const el=d?.querySelector(step.target);
    if(!el)return null;
    if(!step.outer){
      try{el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});}catch(_){el.scrollIntoView();}
    }
    return el;
  }
  function globalRect(el,outer){
    const r=el.getBoundingClientRect();
    const base=outer?{top:0,left:0}:frame.getBoundingClientRect();
    const left=Math.max(5,Math.min(window.innerWidth-5,base.left+r.left));
    const top=Math.max(5,Math.min(window.innerHeight-5,base.top+r.top));
    const right=Math.max(left+2,Math.min(window.innerWidth-5,base.left+r.right));
    const bottom=Math.max(top+2,Math.min(window.innerHeight-5,base.top+r.bottom));
    return {left,top,right,bottom,width:right-left,height:bottom-top};
  }

  function drawDim(target){
    const root=overlay;
    root.querySelectorAll('.tour-dim,.tour-focus').forEach(x=>x.remove());
    const l=Math.max(0,target.left-5),t=Math.max(0,target.top-5);
    const r=Math.min(window.innerWidth,target.right+5),b=Math.min(window.innerHeight,target.bottom+5);
    for(const [x,y,w,h] of [[0,0,innerWidth,t],[0,t,l,b-t],[r,t,innerWidth-r,b-t],[0,b,innerWidth,innerHeight-b]]){
      const n=document.createElement('div');n.className='tour-dim';
      Object.assign(n.style,{left:x+'px',top:y+'px',width:Math.max(0,w)+'px',height:Math.max(0,h)+'px'});
      root.insertBefore(n,root.firstChild);
    }
    const focus=document.createElement('div');focus.className='tour-focus';focus.setAttribute('aria-hidden','true');
    Object.assign(focus.style,{left:l+'px',top:t+'px',width:(r-l)+'px',height:(b-t)+'px',boxSizing:'border-box'});
    root.insertBefore(focus,root.firstChild);
  }

  function placePanel(panel,r){
    const vw=innerWidth,vh=innerHeight,margin=12,gap=16;
    const pw=panel.offsetWidth,ph=panel.offsetHeight;
    let x=Math.min(Math.max(margin,r.left),vw-pw-margin);
    let y;
    if(r.bottom+gap+ph<=vh-margin) y=r.bottom+gap;
    else if(r.top-gap-ph>=margin) y=r.top-gap-ph;
    else if(r.left>pw+gap+margin){x=r.left-pw-gap;y=(vh-ph)/2;}
    else if(vw-r.right>pw+gap+margin){x=r.right+gap;y=(vh-ph)/2;}
    else y=(r.top+r.bottom)/2 + ((r.top>vh/2)?-ph-gap:gap);
    panel.style.left=Math.round(Math.max(margin,Math.min(vw-pw-margin,x)))+'px';
    panel.style.top=Math.round(Math.max(margin,Math.min(vh-ph-margin,y)))+'px';
    panel.style.visibility='visible';
  }

  async function showStep(){
    if(!active)return;
    const g=++generation,step=steps[index];
    if(!step){closeTour();return;}
    const a=appWindow();
    if(step.group==='question'&&!doc()?.getElementById('studyMarkerToggle')){
      // Inicia uma questão-modelo já respondida, sem salvar qualquer progresso.
      a?.studyTutorialShowExample?.();
    }else if(step.group==='home'&&!doc()?.querySelector('.library')){
      a?.studyTutorialShowLibrary?.();
    }
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(!active||g!==generation)return;
    let el=boundsOf(step);
    if(!el){await new Promise(resolve=>setTimeout(resolve,130));el=boundsOf(step);}
    if(!active||g!==generation)return;
    if(!el){
      // Um elemento ausente não impede concluir o guia.
      if(index<steps.length-1){index++;showStep();}else closeTour();
      return;
    }
    await new Promise(resolve=>requestAnimationFrame(resolve));
    if(!active||g!==generation)return;
    const r=globalRect(el,step.outer);
    const root=makeShell();
    root.innerHTML=`<section class="tour-panel" role="dialog" aria-modal="true" aria-labelledby="studyTourStepTitle" style="visibility:hidden"><div class="tour-panel-head"><div><div class="tour-kicker">Guia rápido • ${step.group==='home'?'Biblioteca':'Questões'}</div><h2 id="studyTourStepTitle">${step.title}</h2></div><button class="tour-close" type="button" aria-label="Fechar tutorial" title="Fechar tutorial">×</button></div><p>${step.body}</p>${demoMarkup(step.demo)}<div class="tour-progress-track" aria-hidden="true"><span style="width:${((index+1)/steps.length)*100}%"></span></div><div class="tour-actions"><button class="tour-button tour-prev" type="button" ${index===0?'disabled':''}>Anterior</button><span class="tour-progress">${index+1} de ${steps.length}</span><button class="tour-button primary tour-next" type="button">${index===steps.length-1?'Finalizar':'Próximo'}</button></div></section>`;
    root.querySelector('.tour-close').addEventListener('click',closeTour);
    root.querySelector('.tour-prev').addEventListener('click',()=>move(-1));
    root.querySelector('.tour-next').addEventListener('click',()=>move(1));
    drawDim(r);
    const panel=root.querySelector('.tour-panel');
    placePanel(panel,r);
    focusPrimary();
  }
  function move(delta){
    if(!active)return;
    const next=index+delta;
    if(next>=steps.length){closeTour();return;}
    if(next<0)return;
    index=next;
    showStep();
  }

  function startTour(){
    if(active)closeTour();
    if(welcome){welcome=false;clean();rememberChoice();}
    if(!ready())return;
    rememberChoice();
    active=true;index=0;
    doc()?.documentElement?.classList.add('study-tour-active');
    appWindow().studyTutorialShowLibrary();
    showStep();
  }
  window.startStudyTutorial=startTour;
  window.addEventListener('keydown',e=>{
    if(!(active||welcome))return;
    if(e.key==='Escape'){
      e.preventDefault();
      if(welcome){rememberChoice();welcome=false;clean();}
      else closeTour();
    }else if(active&&e.key==='ArrowRight'){e.preventDefault();move(1);}
    else if(active&&e.key==='ArrowLeft'){e.preventDefault();move(-1);}
  },true);
  window.addEventListener('resize',()=>{if(active)showStep();});
  let welcomeRetry = null;
  function scheduleWelcome(){
    clearInterval(welcomeRetry);
    if(firstChoice||markedThisSession)return;
    let count=0;
    welcomeRetry=setInterval(()=>{
      if(firstChoice||markedThisSession||welcome){clearInterval(welcomeRetry);return;}
      if(ready()){clearInterval(welcomeRetry);showWelcome();return;}
      if(++count>120)clearInterval(welcomeRetry);
    },250);
  }
  frame.addEventListener('load',()=>{
    // Sincronização pode recarregar a aplicação; o guia é encerrado sem perda de dados.
    if(active)closeTour();
    scheduleWelcome();
  });
  scheduleWelcome();
})();
