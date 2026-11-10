/* ============================================================
   Главная: заставка, пульт (гамма), карусель проектов, этапы работы
   ============================================================ */
(function(){
"use strict";

var VT=window.VT||{},doc=document,root=doc.documentElement;
function $(s,c){return (c||doc).querySelector(s)}
function $$(s,c){return Array.prototype.slice.call((c||doc).querySelectorAll(s))}
var reduce=!!VT.reduce;

var hero=doc.getElementById('hero'),intro=doc.getElementById('intro');

/* ============ готовность 3D-сцены ============ */
var sceneOK=null,waiters=[];
function sceneDone(ok){
  if(sceneOK!==null)return;
  sceneOK=ok;waiters.forEach(function(f){f(ok)});waiters=[];
}
function onScene(fn){if(sceneOK!==null)fn(sceneOK);else waiters.push(fn)}
window.addEventListener('vt:scene',function(e){sceneDone(!!(e.detail&&e.detail.ok))});
/* если сцена так и не ответила (нет WebGL, скрипт не загрузился) — живём без неё */
setTimeout(function(){sceneDone(!!window.VTScene)},7000);

/* ============ вход ============ */
var introOn=!!(intro&&!intro.hidden),started=false;
function start(){
  if(started)return;started=true;
  if(hero)hero.classList.add('on');
  onScene(function(ok){
    if(ok&&window.VTScene)window.VTScene.start();
    if(VT.sound&&VT.sound.enabled())VT.sound.play('build');
  });
  setTimeout(function(){if(VT.cookieShow)VT.cookieShow()},introOn?2800:1500);
}
if(introOn){
  var bar=doc.getElementById('introBar'),t0=Date.now();
  if(bar){
    requestAnimationFrame(function(){bar.style.width='38%'});
    setTimeout(function(){if(sceneOK===null)bar.style.width='72%'},700);
  }
  onScene(function(){
    /* не раньше, чем успеет нарисоваться знак */
    setTimeout(function(){
      if(bar)bar.style.width='100%';
      intro.classList.add('ready');
      var b=$('[data-enter="on"]',intro);
      if(b){try{b.focus({preventScroll:true})}catch(e){}}
    },Math.max(0,1500-(Date.now()-t0)));
  });
  intro.addEventListener('click',function(e){
    var b=e.target.closest('[data-enter]');
    if(!b)return;
    if(VT.ls)VT.ls.set('vt_intro','1');
    if(VT.sound)VT.sound.set(b.getAttribute('data-enter')==='on',true);
    root.classList.remove('intro-on');
    intro.classList.add('out');
    setTimeout(function(){if(intro.parentNode)intro.parentNode.removeChild(intro)},1300);
    setTimeout(start,180);
  });
}else{
  if(intro&&intro.parentNode)intro.parentNode.removeChild(intro);
  start();
}

/* ============ пульт: гамма макета ============ */
/* те же гаммы, что в сцене и в конструкторе палитры */
var PALS=[
  {n:'Тёплый нейтрал',c:['#EDE4D6','#C3A279','#D9C8AD','#3A3B38']},
  {n:'Зелёная глубина',c:['#EDE7DA','#A3B29C','#2E4237','#B2914E']},
  {n:'Северный свет',c:['#D8E1E8','#6E86A0','#D5C7AE','#3A4147']},
  {n:'Тёплый орех',c:['#E8DECB','#6B4A32','#B5873A','#33322F']},
  {n:'Тёплая глина',c:['#EFE3D3','#D9C09A','#B5643F','#8E6B57']},
  {n:'Городской графит',c:['#EEF0F1','#C6CACC','#3C4145','#B2914E']},
  {n:'Чёрный лак',c:['#EFE6D4','#7C7F84','#17191B','#C8A253']}
];
var palBtn=doc.getElementById('palBtn'),palName=doc.getElementById('palName'),palSw=$$('#palSw i'),pi=0;
function paintPal(){
  var p=PALS[pi];
  if(palName)palName.textContent=p.n;
  palSw.forEach(function(el,i){el.style.background=p.c[i]});
}
paintPal();
if(palBtn){
  palBtn.addEventListener('click',function(){
    pi=(pi+1)%PALS.length;paintPal();
    if(window.VTScene)window.VTScene.setPalette(pi);
  });
}

/* ============ карусель проектов ============ */
var reel=doc.getElementById('reel');
if(reel){
  var cards=$$('.work',reel),rq=0;
  var paint=function(){
    rq=0;
    var half=reel.clientWidth/2,mid=reel.scrollLeft+half;
    cards.forEach(function(el){
      var o=(el.offsetLeft+el.offsetWidth/2-mid)/half;
      o=Math.max(-1.5,Math.min(1.5,o));
      el.style.setProperty('--o',o.toFixed(3));
      el.style.setProperty('--a',Math.min(1,Math.abs(o)).toFixed(3));
    });
  };
  var ask=function(){if(!rq)rq=requestAnimationFrame(paint)};
  if(!reduce){
    reel.addEventListener('scroll',ask,{passive:true});
    window.addEventListener('resize',ask);
    paint();
  }
  var step=function(d){
    var w=cards[0]?cards[0].offsetWidth+24:400;
    reel.scrollBy({left:d*w,behavior:reduce?'auto':'smooth'});
  };
  var prev=doc.getElementById('reelPrev'),next=doc.getElementById('reelNext');
  if(prev)prev.addEventListener('click',function(){step(-1)});
  if(next)next.addEventListener('click',function(){step(1)});
  /* мышью карусель можно тянуть; клик после протяжки не открывает проект */
  var down=false,sx=0,sl=0,moved=0;
  reel.addEventListener('pointerdown',function(e){
    if(e.pointerType!=='mouse'||e.button!==0)return;
    down=true;sx=e.clientX;sl=reel.scrollLeft;moved=0;
  });
  window.addEventListener('pointermove',function(e){
    if(!down)return;
    var dx=e.clientX-sx;moved=Math.max(moved,Math.abs(dx));
    if(moved>5){reel.style.scrollSnapType='none';reel.style.scrollBehavior='auto';reel.scrollLeft=sl-dx}
  });
  window.addEventListener('pointerup',function(){
    if(!down)return;down=false;
    reel.style.scrollSnapType='';reel.style.scrollBehavior='';
  });
  reel.addEventListener('click',function(e){if(moved>5){e.preventDefault();e.stopPropagation();moved=0}},true);
  reel.addEventListener('dragstart',function(e){e.preventDefault()});
}

/* ============ этапы работы ============ */
var proc=$('.proc'),steps=$$('.pstep'),cap=doc.getElementById('procCap');
if(proc&&steps.length){
  var idx=0,auto=!reduce,inView=false,timer=0,DUR=3600;
  proc.style.setProperty('--dur',DUR+'ms');
  var setStep=function(i){
    idx=i;
    steps.forEach(function(b,j){b.setAttribute('aria-pressed',String(j===i))});
    if(cap)cap.textContent=steps[i].getAttribute('data-cap');
    if(window.VTScene)window.VTScene.setStage(steps[i].getAttribute('data-stage'));
  };
  var tick=function(){
    clearTimeout(timer);
    if(!auto||!inView)return;
    timer=setTimeout(function(){setStep((idx+1)%steps.length);tick()},DUR);
  };
  steps.forEach(function(b,i){
    b.addEventListener('click',function(){
      auto=false;proc.classList.remove('auto');clearTimeout(timer);setStep(i);
    });
  });
  onScene(function(ok){if(ok)setStep(idx)});
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){
      inView=es[0].isIntersecting;
      proc.classList.toggle('auto',auto&&inView);
      if(inView)tick();else clearTimeout(timer);
    },{threshold:.35}).observe(proc);
  }
}

})();
