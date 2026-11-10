(function(){
"use strict";

/* мобильное меню */
var burger=document.querySelector('.burger'),nav=document.getElementById('nav');
if(burger&&nav){
  burger.addEventListener('click',function(){
    var open=nav.classList.toggle('open');
    burger.setAttribute('aria-expanded',open?'true':'false');
  });
  nav.addEventListener('click',function(e){
    if(e.target.tagName==='A'){nav.classList.remove('open');burger.setAttribute('aria-expanded','false')}
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&nav.classList.contains('open')){
      nav.classList.remove('open');burger.setAttribute('aria-expanded','false');burger.focus();
    }
  });
}

/* фильтр портфолио */
var filters=document.querySelector('.filters');
if(filters){
  filters.addEventListener('click',function(e){
    var b=e.target.closest('button');
    if(!b)return;
    var f=b.getAttribute('data-filter');
    Array.prototype.forEach.call(this.querySelectorAll('button'),function(x){
      x.setAttribute('aria-pressed',x===b?'true':'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.work'),function(w){
      w.style.display=(f==='all'||w.getAttribute('data-type')===f)?'':'none';
    });
  });
}
/* плашка cookie: «Принять» — запоминаем; «Отказаться» — запоминаем,
   выключаем Метрику на этой странице и стираем её cookie; со следующей
   страницы счётчик вообще не грузится (проверка в <head>) */
function ckGet(){try{return localStorage.getItem('ck')}catch(e){return null}}
function ckSet(v){try{if(v===null)localStorage.removeItem('ck');else localStorage.setItem('ck',v)}catch(e){}}
function ckWipe(){
  window['disableYaCounter112145522']=true;
  var host=location.hostname,parts=host.split('.'),doms=['',host];
  for(var i=1;i<parts.length-1;i++)doms.push('.'+parts.slice(i).join('.'));
  document.cookie.split(';').forEach(function(c){
    var n=c.split('=')[0].trim();
    if(n.indexOf('_ym')!==0)return;
    doms.forEach(function(d){
      document.cookie=n+'=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'+(d?'; domain='+d:'');
    });
  });
}
function ckShow(){
  if(document.getElementById('ck'))return;
  var box=document.createElement('div');
  box.className='ck';box.id='ck';box.setAttribute('role','region');box.setAttribute('aria-label','Файлы cookie');
  box.innerHTML='<p>Сайт использует cookie Яндекс.Метрики, чтобы считать посещения. '+
    'Подробнее — в <a href="pravila.html#konfidencialnost">политике конфиденциальности</a>.</p>'+
    '<div class="ckb"><button type="button" class="btn quiet" data-ck="no">Отказаться</button>'+
    '<button type="button" class="btn solid" data-ck="yes">Принять</button></div>';
  document.body.appendChild(box);
  requestAnimationFrame(function(){requestAnimationFrame(function(){box.classList.add('on')})});
  box.addEventListener('click',function(e){
    var b=e.target.closest('button[data-ck]');
    if(!b)return;
    var v=b.getAttribute('data-ck');
    ckSet(v);
    if(v==='no')ckWipe();
    box.classList.remove('on');
    setTimeout(function(){box.remove()},320);
  });
}
if(ckGet()===null)ckShow();

/* «изменить выбор» на странице правил */
var ckReset=document.getElementById('ckreset');
if(ckReset){
  ckReset.addEventListener('click',function(){
    var was=ckGet();ckSet(null);ckShow();
    if(was==='no'){/* чтобы счётчик снова заработал после «Принять», нужна перезагрузка */
      document.getElementById('ck').addEventListener('click',function(e){
        var b=e.target.closest('button[data-ck="yes"]');if(b)setTimeout(function(){location.reload()},330);
      });
    }
  });
}
})();

/* ============ новая версия сайта (v2) ============
   Под шапкой каждой страницы — приглашение, оформленное уже в новом стиле (стили в конце
   assets/base.css). Кнопка ведёт на этот же раздел в новой версии. Крестик прячет плашку
   до конца визита. Кто сам вернулся из новой версии по ссылке «прежняя версия сайта»,
   плашку в этот визит не видит. В подвале — постоянная ссылка.
   Цели Метрики: v2_open — перешли в новую версию, v2_hide — скрыли плашку. */
(function(){
"use strict";

var KEY='vt_v2promo',off=false;
try{off=sessionStorage.getItem(KEY)==='off'}catch(e){}

/* адрес той же страницы в новой версии */
var file=location.pathname.split('/').pop()||'index.html';
if(!/^(index|portfolio|ruletka|palitra|priemka|services|pravila)\.html$/.test(file))file='index.html';
var href='v2/'+(file==='index.html'?'':file)+(/^#[\w-]+$/.test(location.hash)?location.hash:'');
function goal(n){if(window.ym){try{ym(112145522,'reachGoal',n)}catch(e){}}}

var legal=document.querySelector('.flegal');
if(legal){
  var link=document.createElement('a');
  link.className='v2l';link.href=href;link.textContent='Новая версия сайта';
  link.addEventListener('click',function(){goal('v2_open')});
  legal.appendChild(link);
}

/* Плавный переход между страницами включён в base.css (@view-transition) ради одного случая —
   смены версии сайта: старая страница растворяется в новой и обратно. Внутри этой версии
   страницы открываются как раньше, поэтому переход на любой адрес, кроме v2, тут же отменяем. */
window.addEventListener('pageswap',function(e){
  var t=e.viewTransition;
  if(!t)return;
  var to=e.activation&&e.activation.entry&&e.activation.entry.url,v2=false;
  try{v2=!!to&&/\/v2\//.test(new URL(to,location.href).pathname)}catch(x){}
  if(v2)return;
  ['ready','finished','updateCallbackDone'].forEach(function(k){if(t[k]&&t[k].catch)t[k].catch(function(){})});
  t.skipTransition();
});

var main=document.querySelector('main');
if(off||!main)return;

var box=document.createElement('aside');
box.className='v2p';box.setAttribute('aria-label','Новая версия сайта');
box.innerHTML='<i class="v2g a" aria-hidden="true"></i><i class="v2g b" aria-hidden="true"></i>'
  +'<span class="v2m" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5 16 27 27.5 6.5"/><path d="M10.5 6.5h11M16 6.5v12.5"/></svg></span>'
  +'<span class="v2t"><b>Новая версия сайта</b><span>Сайт в новом интерфейсе: свет, стекло и объёмный макет интерьера. Откроется этот же раздел.</span></span>'
  +'<a class="v2b" href="'+href+'">Оценить новую версию<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>'
  +'<button type="button" class="v2x" aria-label="Скрыть приглашение" title="Не сейчас">✕</button>';
main.insertBefore(box,main.firstChild);
requestAnimationFrame(function(){requestAnimationFrame(function(){box.classList.add('on')})});

box.querySelector('.v2b').addEventListener('click',function(){goal('v2_open')});
box.querySelector('.v2x').addEventListener('click',function(){
  try{sessionStorage.setItem(KEY,'off')}catch(e){}
  goal('v2_hide');
  /* плашка схлопывается, а не исчезает рывком: страница под ней не прыгает */
  box.style.height=box.offsetHeight+'px';
  requestAnimationFrame(function(){requestAnimationFrame(function(){box.classList.add('bye')})});
  setTimeout(function(){if(box.parentNode)box.parentNode.removeChild(box)},520);
});
})();
