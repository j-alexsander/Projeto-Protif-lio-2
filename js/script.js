'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const pad = n => String(n).padStart(2, '0');


function bindTabs(group, onChange) {
  group.addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    $$('.tab', group).forEach(tab => {
      const active = tab === btn;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-pressed', active);
    });
    onChange(btn.dataset);
  });
}


const menu = $('#menu');
const toggle = $('#navToggle');

function setMenu(open) {
  menu.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
}
toggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.addEventListener('click', e => { if (e.target.matches('a')) setMenu(false); }); 
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

const header = $('#header');
const bar = $('#progress');

function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const pct = max > 0 ? (scrollY / max) * 100 : 0;
  header.classList.toggle('scrolled', scrollY > 20);          
  bar.style.setProperty('--rest', (100 - pct) + '%');        
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const links = $$('.menu a');
const spy = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) links.forEach(a => a.classList.toggle('active', a.hash === '#' + en.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main section').forEach(section => spy.observe(section));

const FORMATS = {
  sprint:   { swim: 0.75, bike: 20,  run: 5 },
  olimpico: { swim: 1.5,  bike: 40,  run: 10 },
  half:     { swim: 1.9,  bike: 90,  run: 21.1 },
  full:     { swim: 3.8,  bike: 180, run: 42.2 }
};
const fmtKm = km => (km < 1 ? `${Math.round(km * 1000)} m` : `${nf.format(km)} km`);

function showFormat(key) {
  const f = FORMATS[key];
  Object.entries(f).forEach(([leg, km]) => {
    const el = $(`[data-leg="${leg}"]`);
    el.textContent = fmtKm(km);
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); 
  });
  $('#totalDist').textContent = nf.format(f.swim + f.bike + f.run) + ' km';
}
bindTabs($('#formatTabs'), data => showFormat(data.format));


let mode = 'run';
bindTabs($('#modeTabs'), data => { mode = data.mode; $('#result').innerHTML = ''; });

function fmtTime(totalSec) {
  const s = Math.round(totalSec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

$('#paceForm').addEventListener('submit', e => {
  e.preventDefault();
  const out = $('#result');
  const km = parseFloat($('#distance').value);
  const secs = (+$('#hh').value || 0) * 3600 + (+$('#mm').value || 0) * 60 + (+$('#ss').value || 0);

  if (!(km > 0) || !(secs > 0)) {
    out.innerHTML = '<p class="msg-err">Preencha a distância e o tempo com valores maiores que zero.</p>';
    return;
  }

  const pace = secs / km;          
  const speed = km / (secs / 3600);
  const isRun = mode === 'run';
  const targets = isRun ? [5, 10, 21.1, 42.2] : [20, 40, 90, 180];

  out.innerHTML = `
    <small>${isRun ? 'Seu pace médio' : 'Sua velocidade média'}</small>
    <p class="big">${isRun ? fmtTime(pace) + ' /km' : nf.format(speed) + ' km/h'}</p>
    <small>Equivale a ${isRun ? nf.format(speed) + ' km/h' : fmtTime(pace) + ' /km'}. Nesse ritmo você faria:</small>
    <div class="proj">${targets.map(d => `<span>${nf.format(d)} km: <b>${fmtTime(pace * d)}</b></span>`).join('')}</div>`;
});


const form = $('#contactForm');
const fields = $$('input, textarea', form);


const RULES = {
  name:    v => (v.trim().length >= 3 ? '' : 'Digite seu nome com pelo menos 3 letras.'),
  email:   v => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Digite um e-mail válido, como nome@dominio.com.'),
  message: v => (v.trim().length >= 10 ? '' : 'Escreva uma mensagem com pelo menos 10 caracteres.')
};

function validate(input) {
  const error = RULES[input.name](input.value);
  const field = input.closest('.field');
  field.classList.toggle('field--error', !!error);
  field.classList.toggle('field--ok', !error);
  $('.error', field).textContent = error;
  input.setAttribute('aria-invalid', !!error);
  return !error;
}

fields.forEach(input => {
  input.addEventListener('input', () => {
    validate(input);
    if (input.name === 'message') $('#counter').textContent = `${input.value.length}/500`;
  });
  input.addEventListener('blur', () => validate(input));
});

form.addEventListener('submit', e => {
  e.preventDefault();
  const feedback = $('#feedback');
  const btn = $('#sendBtn');
  const results = fields.map(validate);

  if (results.includes(false)) {
    feedback.className = 'feedback err';
    feedback.textContent = 'Corrija os campos destacados e envie de novo.';
    fields[results.indexOf(false)].focus();
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando...';
  feedback.textContent = '';

  setTimeout(() => {
    form.reset();
    fields.forEach(i => i.removeAttribute('aria-invalid'));
    $$('.field', form).forEach(f => f.classList.remove('field--ok', 'field--error'));
    $('#counter').textContent = '0/500';
    btn.disabled = false;
    btn.textContent = 'Enviar mensagem';
    feedback.className = 'feedback ok';
    feedback.textContent = 'Mensagem enviada. Obrigado pelo contato!';
  }, 1200);
});

$('#year').textContent = new Date().getFullYear();
