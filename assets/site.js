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
})();
