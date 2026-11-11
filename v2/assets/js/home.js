/* ============================================================
   Главная: заставка, пульт (гамма), карусель проектов, этапы работы,
   шторка «чертёж — рендер», бегущая строка, пакеты стопкой.
   Всё, что на GSAP, включается только при VT.motion.ok (motion.js):
   без него страница работает как раньше.
   ============================================================ */
(function(){
"use strict";

var VT=window.VT||{},doc=document,root=doc.documentElement;
function $(s,c){return (c||doc).querySelector(s)}
function $$(s,c){return Array.prototype.slice.call((c||doc).querySelectorAll(s))}
var reduce=!!VT.reduce;
var gsap=window.gsap,ST=window.ScrollTrigger,MOTION=!!(VT.motion&&VT.motion.ok&&gsap&&ST);

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
    if(ok&&MOTION)curtain();
  });
  setTimeout(function(){if(VT.cookieShow)VT.cookieShow()},introOn?2800:1500);
  if(MOTION)setTimeout(function(){ST.refresh()},introOn?1400:60);
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

/* ============ этапы работы ============
   Два режима. С GSAP блок закрепляется на экране, и этапы листает прокрутка:
   пока крутишь колесо, макет проходит замер → план → визуализацию → чертежи.
   Без GSAP (или если блок не помещается в экран) этапы, как раньше, идут по таймеру. */
var proc=$('.proc'),steps=$$('.pstep'),cap=doc.getElementById('procCap');
if(proc&&steps.length){
  var idx=0,auto=!reduce,inView=false,timer=0,DUR=3600,pin=null;
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
      if(pin){
        /* закреплено: шаг выбирает прокрутка — едем к его середине */
        window.scrollTo({top:Math.round(pin.start+(pin.end-pin.start)*((i+.5)/steps.length)),behavior:'smooth'});
        return;
      }
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

  if(MOTION){
    var pinA=doc.getElementById('procPin'),pinB=doc.getElementById('procHold'),
        list=doc.getElementById('procSteps'),pvis=doc.getElementById('procVis'),
        desk=window.matchMedia('(min-width:1100px)'),n=steps.length,lastPop=0,pw=0,ph=0;
    var dockH=function(){return parseFloat(getComputedStyle(root).getPropertyValue('--dock-h'))||0};
    var unpin=function(){
      if(pin){pin.kill(true);pin=null}
      proc.classList.remove('scrolled');proc.style.removeProperty('--p');
      list.style.minHeight='';pvis.style.minHeight='';
    };
    var makePin=function(){
      unpin();
      if(!pinA||!pinB||!list||!pvis)return false;
      var d=desk.matches,el=d?pinA:pinB,top=d?84:10,bottom=d?14:dockH()+16,avail=window.innerHeight-top-bottom;
      /* высота списка — по самому длинному шагу, чтобы блок не «дышал», пока закреплён */
      var ch=12+(n-1)*2,maxPt=0,curPt=0;
      steps.forEach(function(b){
        var pt=b.querySelector('.pt');
        ch+=b.offsetHeight;maxPt=Math.max(maxPt,pt.scrollHeight);
        if(b.getAttribute('aria-pressed')==='true')curPt=pt.offsetHeight;
      });
      list.style.minHeight=Math.ceil(ch-curPt+maxPt)+'px';
      if(!d){
        /* на телефоне макет ужимается под то место, что осталось над доком */
        var gap=parseFloat(getComputedStyle(proc).rowGap)||16,vh=Math.floor(avail-list.offsetHeight-gap);
        if(vh<190){unpin();return false}
        if(vh<pvis.offsetHeight)pvis.style.minHeight=vh+'px';
      }
      if(el.offsetHeight>avail+2){unpin();return false}
      var topPx=Math.max(top,Math.round((window.innerHeight-(d?0:bottom)-el.offsetHeight)/2));
      pin=ST.create({
        trigger:el,pin:el,start:'top '+topPx+'px',end:'+='+Math.round(window.innerHeight*(d?.62:.5)*n),
        anticipatePin:1,refreshPriority:10,
        onUpdate:function(self){
          var p=self.progress*n,i=Math.min(n-1,Math.floor(p));
          proc.style.setProperty('--p',Math.min(1,p-i).toFixed(3));
          if(i!==idx){
            setStep(i);
            var now=Date.now();
            if(VT.sound&&now-lastPop>140){lastPop=now;VT.sound.play('pop')}
          }
        }
      });
      proc.classList.add('scrolled');
      auto=false;proc.classList.remove('auto');clearTimeout(timer);
      return true;
    };
    var timerMode=function(){auto=!reduce;proc.classList.toggle('auto',auto&&inView);tick()};
    var setup=function(){
      pw=window.innerWidth;ph=window.innerHeight;
      if(!makePin())timerMode();
    };
    setup();
    /* шрифты догрузились — высоты могли измениться, меряем заново */
    if(doc.fonts&&doc.fonts.ready)doc.fonts.ready.then(function(){setup();ST.refresh()});
    var rz=0;
    window.addEventListener('resize',function(){
      /* на телефоне высота окна «дышит» из-за адресной строки — это не повод пересобирать */
      var dw=window.innerWidth!==pw,dh=Math.abs(window.innerHeight-ph)>(VT.fine?24:ph*.25);
      if(!dw&&!dh)return;
      clearTimeout(rz);rz=setTimeout(function(){setup();ST.refresh()},260);
    });
  }
}

/* ============ шторка «чертёж — рендер» ============
   Стеклянная перегородка на макете первого экрана: левее — комната в линиях
   с размерами, правее — готовая. Тянется за ручку (Draggable), сцена получает
   долю ширины слота через VTScene.setSplit. */
var curtainOn=false;
function curtain(){
  var el=doc.getElementById('curtain'),knob=doc.getElementById('curtainKnob'),vis=doc.getElementById('heroVis'),D=window.Draggable;
  if(curtainOn||!el||!knob||!vis||!D||!window.VTScene||!window.VTScene.setSplit)return;
  curtainOn=true;
  var frac=0,w=vis.clientWidth,touched=false,demo=null,drag;
  var paint=function(f,move){
    frac=Math.max(0,Math.min(1,f));
    if(move!==false)gsap.set(el,{x:frac*w});
    window.VTScene.setSplit(frac<.012?0:frac);
    knob.setAttribute('aria-valuenow',String(Math.round(frac*100)));
    knob.setAttribute('aria-valuetext','чертёж '+Math.round(frac*100)+'%');
    el.classList.toggle('at-l',frac<.16);el.classList.toggle('at-r',frac>.84);
  };
  var grab=function(){touched=true;if(demo){demo.kill();demo=null}if(hero)hero.classList.add('dragged')};
  el.hidden=false;paint(0);
  drag=D.create(el,{
    type:'x',trigger:knob,bounds:{minX:0,maxX:w},inertia:!!window.InertiaPlugin,edgeResistance:.92,throwResistance:2600,
    cursor:'ew-resize',activeCursor:'ew-resize',zIndexBoost:false,
    onPress:grab,
    onDrag:function(){paint(this.x/w,false)},
    onThrowUpdate:function(){paint(this.x/w,false)}
  })[0];
  knob.addEventListener('keydown',function(e){
    var st=e.key==='ArrowLeft'?-.05:e.key==='ArrowRight'?.05:e.key==='Home'?-1:e.key==='End'?1:0;
    if(!st)return;
    e.preventDefault();grab();paint(frac+st);
  });
  var fit=function(){
    var nw=vis.clientWidth;
    if(!nw||nw===w)return;
    w=nw;drag.applyBounds({minX:0,maxX:w});paint(frac);
  };
  window.addEventListener('resize',fit);
  ST.addEventListener('refresh',fit);
  /* комната достроилась — шторка сама заезжает и останавливается, показывая, что её можно тянуть */
  gsap.delayedCall(2.3,function(){
    el.classList.add('on');
    if(touched)return;
    var o={f:0};
    demo=gsap.timeline({onUpdate:function(){paint(o.f)}})
      .to(o,{f:.5,duration:1.3,ease:'power2.inOut'})
      .to(o,{f:.24,duration:1.1,ease:'vt'});
  });
}

/* ============ бегущая строка ============
   Едет сама, а от прокрутки ускоряется и меняет направление вслед за ней. */
if(MOTION){(function(){
  var box=doc.getElementById('mq'),track=box&&box.firstElementChild;
  if(!track)return;
  track.innerHTML+=track.innerHTML;                 /* две копии подряд — лента замыкается */
  var tw=gsap.to(track,{xPercent:-50,duration:46,ease:'none',repeat:-1,paused:true}),dir=1;
  tw.totalTime(tw.duration()*200);                  /* запас, чтобы лента могла ехать и назад */
  ST.create({trigger:box,start:'top bottom',end:'bottom top',
    onToggle:function(self){if(self.isActive)tw.play();else tw.pause()},
    onUpdate:function(self){
      var v=self.getVelocity();
      if(Math.abs(v)<30)return;
      dir=v<0?-1:1;
      gsap.to(tw,{timeScale:dir*(1+Math.min(9,Math.abs(v)/220)),duration:.2,ease:'power1.out',overwrite:true,
        onComplete:function(){gsap.to(tw,{timeScale:dir,duration:1.2,ease:'power2.out',overwrite:true})}});
    }});
})()}

/* ============ пакеты стопкой ============
   Вместо одной плиты с четырьмя ячейками — четыре стеклянные плиты, которые при
   прокрутке ложатся друг на друга: у нижних остаётся видна полоса с названием
   и ценой. Так видно, что каждый следующий пакет включает предыдущий.
   Прилипание — CSS (position:sticky), скрипт только гасит накрытые плиты. */
if(MOTION){(function(){
  var box=$('.packs'),cards=box?$$('.pack',box):[];
  if(cards.length<2)return;
  box.classList.remove('cells','four','keep2','glass');box.classList.add('stack');
  cards.forEach(function(c,i){c.classList.remove('hover');c.classList.add('glass');c.style.setProperty('--i',i)});
  var paint=function(){
    var r=cards.map(function(c){return c.getBoundingClientRect()}),step=parseFloat(getComputedStyle(box).getPropertyValue('--stk-step'))||60;
    cards.forEach(function(c,i){
      var v=0;
      if(i<cards.length-1)v=Math.max(0,Math.min(1,(r[i].bottom-r[i+1].top)/Math.max(1,r[i].height-step)));
      c.style.setProperty('--cov',v.toFixed(3));
    });
  };
  ST.create({trigger:box,start:'top bottom',end:'bottom top',onUpdate:paint,onRefresh:paint});
})()}

})();
