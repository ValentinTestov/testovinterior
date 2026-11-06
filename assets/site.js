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
