/* Animações contextuais. Observe o DOM sem substituir funções de estudo ou alterar dados. */
(() => {
  'use strict';
  const app = document.getElementById('app');
  if (!app) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let previous = { view: '', id: '', confirmed: false, selection: '', status: '' };

  function read() {
    const card = app.querySelector('.question-card[data-question-id]');
    const view = card ? 'question' : app.querySelector('.library') ? 'library' : 'other';
    return {
      view,
      id: card?.getAttribute('data-question-id') || '',
      confirmed: !!card?.querySelector('.status-wrap'),
      selection: card?.querySelector('.option.selected .letter')?.textContent?.trim() ||
                 [...(card?.querySelectorAll('.vf-button.selected') || [])].map(el => el.textContent.trim()).join('|'),
      status: card?.querySelector('.status-btn.active')?.textContent?.trim() || ''
    };
  }

  function add(selector, cls, scope = app) {
    scope?.querySelector(selector)?.classList.add(cls);
  }

  function apply() {
    const current = read();
    if (reduced.matches || document.documentElement.classList.contains('study-tour-active')) { previous = current; return; }

    if (current.view === 'library' && previous.view !== 'library') {
      add('.hero', 'motion-enter-hero');
      app.querySelectorAll('.exam-card').forEach((card, i) => {
        card.classList.add('motion-enter-card');
        card.style.setProperty('--motion-delay', Math.min(i, 9) * 30 + 'ms');
      });
    }

    if (current.view === 'question') {
      const card = app.querySelector('.question-card');
      if (previous.view !== 'question') {
        add('.exam-shell', 'motion-enter-shell');
      } else if (previous.id === current.id) {
        if (!previous.confirmed && current.confirmed) {
          add('.result', 'motion-reveal-result', card);
          // Revela alternativa + comentário como uma peça única, sem abrir emendas.
          card.querySelectorAll('.option-block:has(> .alternative-comment)')
            .forEach((el, i) => {
              el.classList.add('motion-reveal-option');
              el.style.setProperty('--motion-delay', Math.min(i, 6) * 35 + 'ms');
            });
          card.querySelectorAll('.structured-item .alternative-comment, .structured-correction, .question-review-note')
            .forEach((el, i) => {
              el.classList.add('motion-reveal');
              el.style.setProperty('--motion-delay', Math.min(i, 6) * 35 + 'ms');
            });
          ['.status-wrap', '.post-actions', '.oitu-comments'].forEach((selector, i) => {
            const el = card.querySelector(selector);
            if (el) {
              el.classList.add('motion-reveal');
              el.style.setProperty('--motion-delay', (90 + i * 45) + 'ms');
            }
          });
        }
        if (previous.selection !== current.selection && current.selection && !current.confirmed) {
          add('.option.selected, .vf-button.selected', 'motion-picked', card);
        }
        if (previous.status !== current.status && current.status) {
          add('.status-btn.active', 'motion-picked', card);
        }
      }
    }
    previous = current;
  }

  // A aplicação recompõe #app ao navegar. Observar apenas seus filhos diretos
  // impede animações repetitivas por digitação de anotações ou chegada de comentários.
  const observer = new MutationObserver(mutations => {
    if (mutations.some(m => m.type === 'childList')) apply();
  });
  observer.observe(app, { childList: true });
  apply();
})();
