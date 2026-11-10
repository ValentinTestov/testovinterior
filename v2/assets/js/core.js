/* ============================================================
   Valentin Testov · v2 — общий скрипт всех страниц
   window.VT: звук, свет сайта, уведомления.
   ============================================================ */
(function(){
"use strict";

var VT=window.VT=window.VT||{};
var doc=document,root=doc.documentElement,body=doc.body;
var fine=!!(window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches);
var reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
VT.reduce=reduce;VT.fine=fine;

function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){}}
function each(list,fn){Array.prototype.forEach.call(list,fn)}
function $(s,c){return (c||doc).querySelector(s)}
function $$(s,c){return (c||doc).querySelectorAll(s)}
VT.ls={get:lsGet,set:lsSet};

/* слабое устройство или просьба системы уменьшить прозрачность — стекло без размытия */
try{
  var conn=navigator.connection;
  if((conn&&conn.saveData)||(window.matchMedia&&matchMedia('(prefers-reduced-transparency: reduce)').matches))root.classList.add('lite');
}catch(e){}

/* ============================================================
   СВЕТ САЙТА
   Одна температура на весь сайт: от неё считаются акцент (--lamp)
   и встречный оттенок (--lamp-2). Значение помнится в браузере.
   Шкала намеренно ярче реальных ламп — на экране иначе не видно разницы.
   ============================================================ */
var KMIN=2700,KMAX=6500,KDEF=3000;
var KSTOPS=[[2700,[255,176,104]],[3200,[255,198,140]],[4000,[255,226,196]],[4800,[236,236,240]],[5600,[190,216,255]],[6500,[150,198,255]]];
function kRGB(k){
  var i,a,b,t;
  if(k<=KSTOPS[0][0])return KSTOPS[0][1].slice();
  for(i=1;i<KSTOPS.length;i++){
    if(k<=KSTOPS[i][0]){
      a=KSTOPS[i-1];b=KSTOPS[i];t=(k-a[0])/(b[0]-a[0]);
      return [0,1,2].map(function(j){return Math.round(a[1][j]+(b[1][j]-a[1][j])*t)});
    }
  }
  return KSTOPS[KSTOPS.length-1][1].slice();
}
var K=parseInt(lsGet('vt_k'),10);
if(!(K>=KMIN&&K<=KMAX))K=KDEF;

function paintLight(){
  var c=kRGB(K),c2=kRGB(KMIN+KMAX-K);
  root.style.setProperty('--lamp',c.join(' '));
  root.style.setProperty('--lamp-2',c2.join(' '));
  each($$('[data-kval]'),function(el){el.textContent=K});
  each($$('[data-krange]'),function(el){if(+el.value!==K)el.value=K});
  each($$('[data-kelvin]'),function(el){el.setAttribute('aria-pressed',String(+el.getAttribute('data-kelvin')===K))});
  try{window.dispatchEvent(new CustomEvent('vt:light',{detail:{k:K,rgb:c,rgb2:c2}}))}catch(e){}
}
function setK(k,quiet){
  k=+k;if(!isFinite(k))return;
  k=Math.max(KMIN,Math.min(KMAX,Math.round(k/100)*100));
  if(k===K)return;
  K=k;lsSet('vt_k',String(K));paintLight();
  if(!quiet)Snd.play('slide',{k:K});
}
VT.light={get:function(){return K},set:setK,rgb:kRGB,min:KMIN,max:KMAX};
paintLight();

doc.addEventListener('input',function(e){
  var t=e.target;
  if(t&&t.hasAttribute&&t.hasAttribute('data-krange'))setK(+t.value);
});
doc.addEventListener('click',function(e){
  /* пресеты света: атрибут data-kelvin (data-k занят ячейками рулетки) */
  var b=e.target.closest&&e.target.closest('[data-kelvin]');
  if(b){setK(+b.getAttribute('data-kelvin'),true);Snd.play('on')}
});

/* выпадающая панель «свет сайта» */
var lightBtn=$('#lightBtn'),lightPop=$('#lightPop');
function lightOpen(on){
  if(!lightPop)return;
  lightPop.classList.toggle('on',on);
  if(lightBtn)lightBtn.setAttribute('aria-expanded',String(on));
  if(on)sheetOpen(false);
  Snd.play(on?'open':'close');
}
if(lightBtn&&lightPop){
  lightBtn.addEventListener('click',function(e){e.stopPropagation();lightOpen(!lightPop.classList.contains('on'))});
  doc.addEventListener('click',function(e){
    if(lightPop.classList.contains('on')&&!lightPop.contains(e.target)&&!(e.target.closest&&e.target.closest('[data-light-open]')))lightOpen(false);
  });
  each($$('[data-light-open]'),function(b){b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();lightOpen(true)})});
}

/* ============================================================
   ЗВУК
   Всё синтезируется на лету (Web Audio), файлов нет.
   Тембр — «стекло»: синус и два негармонических обертона + короткий хвост.
   vt_sound: 'on' | 'off'. Пока выбора нет, звук выключен — кроме рулетки,
   где он был включён и раньше (data-sound-default на <body>).
   ============================================================ */
var Snd=(function(){
  var ctx=null,master=null,send=null,amb=null,unlocked=false,lastHover=0,lastSlide=0;
  var pref=lsGet('vt_sound');
  var on=pref?pref==='on':(body.hasAttribute('data-sound-default')&&lsGet('ri_mute')!=='1');

  function ensure(){
    if(ctx)return ctx;
    var C=window.AudioContext||window.webkitAudioContext;
    if(!C)return null;
    try{ctx=new C()}catch(e){return null}
    var comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-16;comp.knee.value=18;comp.ratio.value=5;comp.attack.value=.004;comp.release.value=.2;
    master=ctx.createGain();master.gain.value=.9;
    master.connect(comp);comp.connect(ctx.destination);
    /* «комната»: две линии задержки с обратной связью — дешёвый хвост вместо реверберации */
    send=ctx.createGain();send.gain.value=1;
    var d1=ctx.createDelay(1),d2=ctx.createDelay(1),fb=ctx.createGain(),lp=ctx.createBiquadFilter(),wet=ctx.createGain();
    d1.delayTime.value=.113;d2.delayTime.value=.179;fb.gain.value=.46;lp.type='lowpass';lp.frequency.value=2400;wet.gain.value=.5;
    send.connect(d1);d1.connect(d2);d2.connect(lp);lp.connect(fb);fb.connect(d1);
    d1.connect(wet);d2.connect(wet);wet.connect(master);
    return ctx;
  }
  function live(){
    if(!on||!unlocked)return null;
    var c=ensure();if(!c)return null;
    if(c.state==='suspended'){try{c.resume()}catch(e){}}
    return c;
  }
  /* стеклянная нота */
  function glass(f,at,dur,vol,rev,type){
    var c=live();if(!c)return;
    var t=c.currentTime+(at||0),g=c.createGain(),parts=[1,2.756,5.404],amps=[1,.3,.1],i,o,og;
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+.006);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    for(i=0;i<parts.length;i++){
      if(f*parts[i]>12000)continue;
      o=c.createOscillator();o.type=type||'sine';o.frequency.value=f*parts[i];
      og=c.createGain();og.gain.value=amps[i];
      o.connect(og);og.connect(g);o.start(t);o.stop(t+dur+.03);
    }
    g.connect(master);
    if(rev){var s=c.createGain();s.gain.value=rev;g.connect(s);s.connect(send)}
  }
  /* шум через фильтр: щелчки и «воздух» */
  var nbuf=null;
  function noise(at,dur,f0,f1,vol,q,rev){
    var c=live();if(!c)return;
    if(!nbuf){
      var n=Math.floor(c.sampleRate*1.2),d;nbuf=c.createBuffer(1,n,c.sampleRate);d=nbuf.getChannelData(0);
      for(var i=0;i<n;i++)d[i]=Math.random()*2-1;
    }
    var t=c.currentTime+(at||0),s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
    s.buffer=nbuf;s.loop=true;
    f.type='bandpass';f.Q.value=q||1.2;
    f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+Math.min(.04,dur*.3));
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f);f.connect(g);g.connect(master);
    if(rev){var w=c.createGain();w.gain.value=rev;g.connect(w);w.connect(send)}
    s.start(t,Math.random()*.9);s.stop(t+dur+.05);
  }
  function sub(at,f0,f1,dur,vol){
    var c=live();if(!c)return;
    var t=c.currentTime+(at||0),o=c.createOscillator(),g=c.createGain();
    o.type='sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur*.8);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.03);
  }
  var BANK={
    hover:function(){glass(1568+Math.random()*240,0,.07,.011,.25)},
    tap:function(){glass(880,0,.16,.045,.3);glass(1320,.012,.11,.02,.3);noise(0,.03,3200,1800,.02,1.4)},
    on:function(){glass(659.25,0,.2,.045,.5);glass(987.77,.075,.34,.05,.6)},
    off:function(){glass(987.77,0,.16,.04,.4);glass(587.33,.075,.3,.045,.5)},
    open:function(){noise(0,.28,500,3200,.035,.9,.5);glass(1174.66,.05,.3,.022,.7)},
    close:function(){noise(0,.22,2600,420,.03,.9,.4)},
    pop:function(){sub(0,320,150,.12,.11);glass(1396.9,0,.09,.02,.3)},
    lock:function(){sub(0,190,95,.16,.14);noise(0,.04,1400,900,.035,1.6)},
    err:function(){glass(233.08,0,.2,.05,.3,'triangle');glass(196,.09,.28,.05,.3,'triangle')},
    chime:function(){[523.25,783.99,1046.5,1567.98].forEach(function(f,i){glass(f,.03+i*.085,.75+i*.12,.05-.006*i,.8)})},
    save:function(){noise(0,.05,5200,2600,.045,2);glass(1975.5,.03,.22,.022,.5);glass(2637,.09,.3,.018,.6)},
    whoosh:function(){noise(0,.9,180,2400,.05,.7,.7);sub(.05,70,42,.8,.1)},
    build:function(){noise(0,1.5,160,3600,.04,.8,.8);[293.66,440,587.33,880,1174.66].forEach(function(f,i){glass(f,.12+i*.22,.9,.03,.9)})},
    slide:function(o){
      var c=live();if(!c)return;
      var now=c.currentTime;if(now-lastSlide<.055)return;lastSlide=now;
      var p=((o&&o.k)||KDEF)-KMIN,f=392*Math.pow(2,p/(KMAX-KMIN)*1.5);
      glass(f,0,.12,.03,.45);
    }
  };
  function play(name,o){
    var fn=BANK[name];if(!fn)return;
    if(name==='hover'){
      var n=Date.now();if(n-lastHover<70)return;lastHover=n;
    }
    try{fn(o)}catch(e){}
  }

  /* фон: открытый аккорд из пяти голосов, каждый «дышит» своим медленным LFO.
     Тембр следует за светом: холоднее свет — ярче фильтр. Только на главной. */
  function ambStart(){
    var c=live();if(!c||amb||!body.hasAttribute('data-amb'))return;
    amb={g:c.createGain(),lp:c.createBiquadFilter(),nodes:[]};
    amb.g.gain.value=.0001;amb.lp.type='lowpass';amb.lp.Q.value=.4;
    amb.lp.connect(amb.g);amb.g.connect(master);
    var w=c.createGain();w.gain.value=.9;amb.g.connect(w);w.connect(send);
    [73.42,110,146.83,220,329.63].forEach(function(f,i){
      var o=c.createOscillator(),g=c.createGain(),l=c.createOscillator(),lg=c.createGain(),base=[.5,.34,.2,.11,.06][i];
      o.type=i<2?'sine':'triangle';o.frequency.value=f;o.detune.value=(i%2?5:-5);
      g.gain.value=base;l.frequency.value=.031+.019*i;lg.gain.value=base*.55;
      l.connect(lg);lg.connect(g.gain);o.connect(g);g.connect(amb.lp);
      o.start();l.start();amb.nodes.push(o,l);
    });
    ambTone();
    amb.g.gain.setValueAtTime(.0001,c.currentTime);amb.g.gain.exponentialRampToValueAtTime(.05,c.currentTime+4);
  }
  function ambTone(){
    if(!amb||!ctx)return;
    var t=(K-KMIN)/(KMAX-KMIN);
    amb.lp.frequency.setTargetAtTime(520+t*1500,ctx.currentTime,.5);
  }
  function ambStop(){
    if(!amb||!ctx)return;
    var a=amb;amb=null;
    a.g.gain.cancelScheduledValues(ctx.currentTime);
    a.g.gain.setTargetAtTime(.0001,ctx.currentTime,.25);
    setTimeout(function(){a.nodes.forEach(function(n){try{n.stop()}catch(e){}})},1500);
  }
  window.addEventListener('vt:light',ambTone);

  function paint(){
    each($$('[data-sound]'),function(b){
      b.setAttribute('aria-pressed',String(on));
      var t=b.querySelector('[data-sound-text]');
      if(t)t.textContent=on?(t.getAttribute('data-on')||'звук'):(t.getAttribute('data-off')||'звук выкл');
    });
  }
  function set(v,silent){
    v=!!v;
    if(!v&&on&&!silent)play('off');
    on=v;pref=on?'on':'off';lsSet('vt_sound',pref);
    paint();
    if(on){unlocked=true;live();if(!silent)play('on');ambStart()}
    else ambStop();
    try{window.dispatchEvent(new CustomEvent('vt:sound',{detail:{on:on}}))}catch(e){}
  }
  function unlock(){
    if(unlocked)return;unlocked=true;
    if(on){live();ambStart()}
  }
  doc.addEventListener('pointerdown',unlock,{passive:true});
  doc.addEventListener('keydown',unlock);
  /* iOS разрешает звук только по отпусканию пальца или клику — «будим» контекст и на них */
  function wake(){if(on&&ctx&&ctx.state==='suspended'){try{ctx.resume()}catch(e){}}}
  doc.addEventListener('touchend',wake,{passive:true});
  doc.addEventListener('click',wake,true);
  doc.addEventListener('visibilitychange',function(){
    if(!ctx)return;
    try{if(doc.hidden)ctx.suspend();else if(on)ctx.resume()}catch(e){}
  });
  doc.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-sound]');
    if(b)set(!on);
  });
  paint();
  return {
    play:play,set:set,enabled:function(){return on},chosen:function(){return !!pref},
    /* для рулетки: живой контекст и выход (null, если звук выключен или ещё нет жеста) */
    ctx:live,out:function(){return master},send:function(){return send},glass:glass,noise:noise,sub:sub
  };
})();
VT.sound=Snd;

/* звуки интерфейса: наведение (только мышь) и нажатие */
var SNDSEL='a,button,summary,.chip,[role="button"],label.arow,label.opt';
if(fine){
  doc.addEventListener('pointerover',function(e){
    var t=e.target.closest&&e.target.closest(SNDSEL);
    if(!t||t===e.relatedTarget||(e.relatedTarget&&t.contains(e.relatedTarget)))return;
    Snd.play('hover');
  },{passive:true});
}
doc.addEventListener('click',function(e){
  var t=e.target.closest&&e.target.closest(SNDSEL);
  if(!t)return;
  var s=t.getAttribute('data-snd');
  if(s==='none'||t.hasAttribute('data-sound')||t.hasAttribute('data-kelvin'))return;
  Snd.play(s||'tap');
});
doc.addEventListener('toggle',function(e){
  if(e.target&&e.target.tagName==='DETAILS')Snd.play(e.target.open?'open':'close');
},true);

/* ============================================================
   УВЕДОМЛЕНИЕ
   ============================================================ */
VT.toast=function(msg){
  var el=doc.getElementById('toast');
  if(!el){el=doc.createElement('div');el.className='toast';el.id='toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');body.appendChild(el)}
  el.textContent=msg;el.classList.add('on');
  clearTimeout(VT.toast._t);
  VT.toast._t=setTimeout(function(){el.classList.remove('on')},2300);
};

/* ============================================================
   ШАПКА: жидкий пузырь под пунктом меню
   ============================================================ */
var links=$('.nav-links');
if(links){
  var bub=doc.createElement('span');bub.className='nav-bubble';bub.setAttribute('aria-hidden','true');links.appendChild(bub);
  var cur=$('a[aria-current="page"]',links);
  var place=function(a){
    if(!a){bub.style.opacity='0';return}
    bub.style.width=a.offsetWidth+'px';
    bub.style.transform='translateX('+a.offsetLeft+'px)';
    bub.style.opacity='1';
  };
  each($$('a',links),function(a){
    a.addEventListener('pointerenter',function(){place(a)});
    a.addEventListener('focus',function(){place(a)});
  });
  links.addEventListener('pointerleave',function(){place(cur)});
  links.addEventListener('focusout',function(){place(cur)});
  var first=function(){bub.style.transition='none';place(cur);void bub.offsetWidth;bub.style.transition=''};
  first();
  if(doc.fonts&&doc.fonts.ready)doc.fonts.ready.then(first);
  window.addEventListener('resize',first);
}

/* ============================================================
   ДОК (телефон): пузырь текущего раздела и шторка инструментов
   ============================================================ */
var dock=$('.dock'),sheet=$('#toolsSheet'),scrim=$('.scrim'),dockTools=$('#dockTools'),dbub=$('.dock-bubble');
function dockIndex(){
  if(!dock)return -1;
  var items=$$('a,button',dock),i;
  for(i=0;i<items.length;i++)if(items[i].getAttribute('aria-current')==='page'||items[i].hasAttribute('data-current'))return i;
  return -1;
}
function dockPaint(open){
  if(!dbub)return;
  var i=open?2:dockIndex();
  dbub.classList.toggle('off',i<0);
  if(i>=0)dbub.style.setProperty('--i',i);
}
function sheetOpen(on){
  if(!sheet)return;
  var was=sheet.classList.contains('on');
  if(was===on)return;
  sheet.classList.toggle('on',on);
  if(scrim)scrim.classList.toggle('on',on);
  if(dockTools)dockTools.setAttribute('aria-expanded',String(on));
  sheet.setAttribute('aria-hidden',String(!on));
  dockPaint(on);
  if(on&&lightPop)lightPop.classList.remove('on');
  Snd.play(on?'open':'close');
}
if(dockTools&&sheet){
  dockTools.addEventListener('click',function(e){e.preventDefault();sheetOpen(!sheet.classList.contains('on'))});
  if(scrim)scrim.addEventListener('click',function(){sheetOpen(false)});
  sheet.addEventListener('click',function(e){if(e.target.closest('a'))sheetOpen(false)});
}
dockPaint(false);
doc.addEventListener('keydown',function(e){
  if(e.key!=='Escape')return;
  if(sheet&&sheet.classList.contains('on')){sheetOpen(false);if(dockTools)dockTools.focus()}
  if(lightPop&&lightPop.classList.contains('on')){lightOpen(false);if(lightBtn)lightBtn.focus()}
});

/* ============================================================
   ПОЯВЛЕНИЕ БЛОКОВ
   ============================================================ */
var rv=$$('[data-rv]');
if(rv.length){
  if('IntersectionObserver' in window&&!reduce){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(en){
        if(!en.isIntersecting)return;
        var el=en.target;
        el.classList.add('in');io.unobserve(el);
        /* когда блок проявился, снимаем метку: дальше у него свои переходы (наклон карточек и т.п.) */
        setTimeout(function(){el.removeAttribute('data-rv')},1700);
      });
    },{rootMargin:'0px 0px -8% 0px',threshold:.08});
    each(rv,function(el){io.observe(el)});
    /* страховка: если наблюдатель не сработал (печать, скриншот всей страницы) */
    window.addEventListener('beforeprint',function(){each(rv,function(el){el.classList.add('in')})});
  }else each(rv,function(el){el.classList.add('in')});
}
VT.revealAll=function(){each($$('[data-rv]'),function(el){el.classList.add('in')})};

/* ============================================================
   СВЕТ ОТ УКАЗАТЕЛЯ: блик на стекле, пятно на фоне, наклон карточек
   ============================================================ */
if(fine&&!reduce){
  var spot=doc.createElement('div');spot.className='spot';spot.setAttribute('aria-hidden','true');body.appendChild(spot);
  var px=0,py=0,sx=0,sy=0,litEl=null,tiltEl=null,raf=0,moved=false;
  var frame=function(){
    raf=0;
    sx+=(px-sx)*.14;sy+=(py-sy)*.14;
    spot.style.transform='translate3d('+sx.toFixed(1)+'px,'+sy.toFixed(1)+'px,0)';
    if(Math.abs(px-sx)>.4||Math.abs(py-sy)>.4)raf=requestAnimationFrame(frame);
  };
  doc.addEventListener('pointermove',function(e){
    if(e.pointerType&&e.pointerType!=='mouse')return;
    px=e.clientX;py=e.clientY;
    if(!moved){moved=true;sx=px;sy=py;spot.classList.add('on')}
    if(!raf)raf=requestAnimationFrame(frame);
    var g=e.target.closest&&e.target.closest('.glass,.work'),r;
    if(g!==litEl){
      if(litEl)litEl.classList.remove('lit');
      litEl=g;if(g)g.classList.add('lit');
    }
    if(g){
      r=g.getBoundingClientRect();
      g.style.setProperty('--mx',(e.clientX-r.left).toFixed(0)+'px');
      g.style.setProperty('--my',(e.clientY-r.top).toFixed(0)+'px');
    }
    var w=e.target.closest&&e.target.closest('[data-tilt]');
    if(w!==tiltEl){if(tiltEl)tiltEl.style.transform='';tiltEl=w}
    if(w){
      r=w.getBoundingClientRect();
      var nx=(e.clientX-r.left)/r.width-.5,ny=(e.clientY-r.top)/r.height-.5;
      w.style.transform='rotateY('+(nx*7).toFixed(2)+'deg) rotateX('+(-ny*6).toFixed(2)+'deg) translateZ(0)';
    }
  },{passive:true});
  root.addEventListener("mouseleave",function(){spot.classList.remove('on');moved=false;if(tiltEl){tiltEl.style.transform='';tiltEl=null}});
}

/* ============================================================
   ЖИДКОЕ СТЕКЛО: преломление фона по кромке
   Работает в Chromium (Chrome, Яндекс Браузер, Edge, Samsung): только там
   backdrop-filter принимает SVG-фильтр. В остальных остаётся обычное размытие.
   Карта смещений рисуется под размер элемента: у кромки фон «затягивает» внутрь.
   ============================================================ */
(function(){
  var chromium=false;
  try{
    chromium=!!(navigator.userAgentData&&navigator.userAgentData.brands&&navigator.userAgentData.brands.some(function(b){return /Chromium/i.test(b.brand)}));
    if(!chromium)chromium=!!window.chrome&&/Chrome\//.test(navigator.userAgent)&&!/Firefox|FxiOS|CriOS/.test(navigator.userAgent);
  }catch(e){}
  var els=$$('[data-liquid]');
  if(!chromium||!els.length||root.classList.contains('lite')||!(window.CSS&&CSS.supports&&CSS.supports('backdrop-filter','blur(1px)')))return;
  var NS='http://www.w3.org/2000/svg',svg=doc.createElementNS(NS,'svg');
  svg.setAttribute('aria-hidden','true');svg.setAttribute('width','0');svg.setAttribute('height','0');
  svg.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
  body.appendChild(svg);
  var n=0;
  function map(w,h,r,bez){
    var sc=Math.min(1,360/Math.max(w,h)),cw=Math.max(2,Math.round(w*sc)),ch=Math.max(2,Math.round(h*sc));
    var cv=doc.createElement('canvas');cv.width=cw;cv.height=ch;
    var g=cv.getContext('2d'),im=g.createImageData(cw,ch),d=im.data,x,y,i=0;
    var hw=w/2,hh=h/2;r=Math.min(r,hw,hh);
    for(y=0;y<ch;y++){
      for(x=0;x<cw;x++){
        var X=(x+.5)/sc-hw,Y=(y+.5)/sc-hh,qx=Math.abs(X)-(hw-r),qy=Math.abs(Y)-(hh-r),nx=0,ny=0,dist;
        if(qx>0&&qy>0){var l=Math.sqrt(qx*qx+qy*qy)||1;dist=r-l;nx=qx/l*(X<0?-1:1);ny=qy/l*(Y<0?-1:1)}
        else if(qx>qy){dist=-qx+r;nx=X<0?-1:1}
        else{dist=-qy+r;ny=Y<0?-1:1}
        var t=1-Math.max(0,Math.min(1,dist/bez)),m=t*t*(3-2*t);
        d[i++]=Math.round(128-nx*m*127);d[i++]=Math.round(128-ny*m*127);d[i++]=128;d[i++]=255;
      }
    }
    g.putImageData(im,0,0);
    return cv.toDataURL('image/png');
  }
  function build(el){
    var w=el.offsetWidth,h=el.offsetHeight;
    if(!w||!h)return;
    var cs=getComputedStyle(el),r=parseFloat(cs.borderTopLeftRadius)||0;
    var bez=+el.getAttribute('data-liquid')||Math.min(26,Math.min(w,h)*.42),str=+el.getAttribute('data-liquid-k')||46,blur=el.getAttribute('data-liquid-blur');
    blur=blur===null?5:+blur;
    var id=el._lq||(el._lq='lq'+(++n)),f=doc.getElementById(id);
    if(!f){f=doc.createElementNS(NS,'filter');f.setAttribute('id',id);f.setAttribute('color-interpolation-filters','sRGB');svg.appendChild(f)}
    f.setAttribute('x','0');f.setAttribute('y','0');f.setAttribute('width',w);f.setAttribute('height',h);f.setAttribute('filterUnits','userSpaceOnUse');
    f.innerHTML='<feImage x="0" y="0" width="'+w+'" height="'+h+'" preserveAspectRatio="none" result="m" href="'+map(w,h,r,bez)+'"/>'
      +'<feDisplacementMap in="SourceGraphic" in2="m" scale="'+str+'" xChannelSelector="R" yChannelSelector="G" result="d"/>'
      +'<feGaussianBlur in="d" stdDeviation="'+blur+'" result="b"/>'
      +'<feColorMatrix in="b" type="saturate" values="1.7"/>';
    el.style.backdropFilter='url(#'+id+')';
    el.classList.add('liquid');
  }
  var timer=0;
  function all(){each(els,build)}
  all();
  if(doc.fonts&&doc.fonts.ready)doc.fonts.ready.then(all);
  window.addEventListener('resize',function(){clearTimeout(timer);timer=setTimeout(all,180)});
  VT.liquid=build;
})();

/* ============================================================
   ПОРТФОЛИО: фильтр
   ============================================================ */
var filters=$('.filters');
if(filters){
  filters.addEventListener('click',function(e){
    var b=e.target.closest('button');
    if(!b)return;
    var f=b.getAttribute('data-filter');
    each($$('button',filters),function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
    each($$('.work[data-type]'),function(w,i){
      var show=(f==='all'||w.getAttribute('data-type')===f);
      w.classList.toggle('gone',!show);
      if(show&&!reduce&&w.animate){
        w.animate([{opacity:0,transform:'translateY(18px) scale(.97)',filter:'blur(8px)'},{opacity:1,transform:'none',filter:'none'}],
          {duration:620,delay:i*45,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'});
      }
    });
  });
}

/* ============================================================
   ПЛАШКА COOKIE
   «Принять» — запоминаем; «Отказаться» — запоминаем, выключаем Метрику на
   этой странице и стираем её cookie; со следующей страницы счётчик вообще
   не грузится (проверка в <head>).
   ============================================================ */
function ckGet(){return lsGet('ck')}
function ckSet(v){lsSet('ck',v)}
function ckWipe(){
  window['disableYaCounter112145522']=true;
  var host=location.hostname,parts=host.split('.'),doms=['',host],i;
  for(i=1;i<parts.length-1;i++)doms.push('.'+parts.slice(i).join('.'));
  doc.cookie.split(';').forEach(function(c){
    var n=c.split('=')[0].trim();
    if(n.indexOf('_ym')!==0)return;
    doms.forEach(function(d){
      doc.cookie=n+'=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'+(d?'; domain='+d:'');
    });
  });
}
function ckShow(){
  if(doc.getElementById('ck'))return;
  var box=doc.createElement('div');
  box.className='ck glass';box.id='ck';box.setAttribute('role','region');box.setAttribute('aria-label','Файлы cookie');
  box.innerHTML='<p>Сайт использует cookie Яндекс.Метрики, чтобы считать посещения. '+
    'Подробнее — в <a href="pravila.html#konfidencialnost">политике конфиденциальности</a>.</p>'+
    '<div class="ckb"><button type="button" class="btn" data-ck="no">Отказаться</button>'+
    '<button type="button" class="btn lamp" data-ck="yes">Принять</button></div>';
  body.appendChild(box);
  requestAnimationFrame(function(){requestAnimationFrame(function(){box.classList.add('on')})});
  box.addEventListener('click',function(e){
    var b=e.target.closest('button[data-ck]');
    if(!b)return;
    var v=b.getAttribute('data-ck');
    ckSet(v);
    if(v==='no')ckWipe();
    box.classList.remove('on');
    setTimeout(function(){box.remove()},420);
  });
}
VT.cookieShow=function(){if(ckGet()===null)ckShow()};
/* на главной плашку показывает home.js — после заставки */
if(!body.hasAttribute('data-intro'))VT.cookieShow();

/* переход на прежнюю версию сайта (ссылка в подвале): в этот визит старый сайт
   не будет звать обратно плашкой «новая версия» — человек ушёл туда сам */
var oldv=$('[data-oldv]');
if(oldv)oldv.addEventListener('click',function(){try{sessionStorage.setItem('vt_v2promo','off')}catch(e){}});

/* «изменить выбор» на странице правил */
var ckReset=doc.getElementById('ckreset');
if(ckReset){
  ckReset.addEventListener('click',function(){
    var was=ckGet();ckSet(null);ckShow();
    if(was==='no'){/* чтобы счётчик снова заработал после «Принять», нужна перезагрузка */
      doc.getElementById('ck').addEventListener('click',function(e){
        var b=e.target.closest('button[data-ck="yes"]');if(b)setTimeout(function(){location.reload()},430);
      });
    }
  });
}

})();
