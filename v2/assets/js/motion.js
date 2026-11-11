/* ============================================================
   Valentin Testov · v2 — движение (GSAP 3, файлы в assets/vendor/)
   Общие эффекты всех страниц. Подключается после core.js.
   Если GSAP не загрузился или человек просит меньше движения,
   скрипт ничего не делает — страница остаётся как была.

   window.VT.motion:
     ok                — эффекты включены (остальные скрипты смотрят сюда);
     num(el,a,b,opts)  — число «набегает» от a к b;
     sparks(el,n)      — искры света из элемента;
     MM                — миллиметров в одном пикселе экрана.
   ============================================================ */
(function(){
"use strict";

var VT=window.VT=window.VT||{};
var gsap=window.gsap,ST=window.ScrollTrigger;
var doc=document,root=doc.documentElement,body=doc.body;
var M=VT.motion={ok:false,MM:25.4/96};
if(!gsap||!ST||VT.reduce)return;

function each(l,f){Array.prototype.forEach.call(l,f)}
function $(s,c){return (c||doc).querySelector(s)}
function $$(s,c){return (c||doc).querySelectorAll(s)}
var fine=!!VT.fine,MM=M.MM,clamp=gsap.utils.clamp;
function sp(n){var s=String(Math.round(n));return s.length>3?s.replace(/\B(?=(\d{3})+(?!\d))/g,' '):s}

var plugs=[ST];
['DrawSVGPlugin','SplitText','Draggable','InertiaPlugin','Physics2DPlugin'].forEach(function(n){if(window[n])plugs.push(window[n])});
gsap.registerPlugin.apply(gsap,plugs);

/* те же кривые, что в стилях: --ease и --spring */
function bez(x1,y1,x2,y2){
  function cx(t){return 3*(1-t)*(1-t)*t*x1+3*(1-t)*t*t*x2+t*t*t}
  function cy(t){return 3*(1-t)*(1-t)*t*y1+3*(1-t)*t*t*y2+t*t*t}
  return function(x){
    if(x<=0)return 0;if(x>=1)return 1;
    var lo=0,hi=1,m,i;for(i=0;i<18;i++){m=(lo+hi)/2;if(cx(m)<x)lo=m;else hi=m}
    return cy((lo+hi)/2);
  };
}
gsap.registerEase('vt',bez(.2,.8,.2,1));
gsap.registerEase('vtSpring',bez(.34,1.56,.64,1));
gsap.defaults({ease:'vt',duration:.8});
ST.config({ignoreMobileResize:true});
root.classList.add('motion');
M.ok=true;

/* ============================================================
   ЧИСЛА
   ============================================================ */
M.num=function(el,from,to,o){
  o=o||{};
  var s={v:from},f=o.fmt||function(v){return String(Math.round(v))};
  if(el._vtNum)el._vtNum.kill();
  el.textContent=f(from);
  el._vtNum=gsap.to(s,{v:to,duration:o.dur||.7,ease:o.ease||'power2.out',delay:o.delay||0,
    onUpdate:function(){el.textContent=f(s.v)},
    onComplete:function(){el.textContent=f(to);el._vtNum=null}});
  return el._vtNum;
};
/* [data-count]: все числа внутри набегают с нуля, когда блок показался.
   Значение атрибута — длительность в секундах. */
function countUp(el){
  var nodes=[],w=doc.createTreeWalker(el,NodeFilter.SHOW_TEXT,null),n;
  while((n=w.nextNode())){
    if(/\d/.test(n.nodeValue)&&!(n.parentNode.closest&&n.parentNode.closest('.dimu,.dim')))nodes.push({n:n,t:n.nodeValue});
  }
  if(!nodes.length)return;
  var s={p:0};
  function paint(){nodes.forEach(function(o){o.n.nodeValue=o.t.replace(/\d+/g,function(d){return String(Math.round(+d*s.p))})})}
  function end(){s.p=1;paint();el._vtCounting=false;if(el._vtMeasure)el._vtMeasure()}
  el._vtCounting=true;                           /* пока число не досчитано, размерная линия ширину не перемеряет */
  paint();
  ST.create({trigger:el,start:'top 92%',end:'max',once:true,onEnter:function(){
    gsap.to(s,{p:1,duration:+el.getAttribute('data-count')||1.1,ease:'power2.out',onUpdate:paint,onComplete:end});
  }});
  window.addEventListener('beforeprint',end);
}

/* ============================================================
   ЧЕРТЁЖНЫЕ ШТРИХИ
   Под заголовком — размерная линия во всю ширину текста с числом в миллиметрах;
   под ценой — такая же линия без числа (число там — сама цена).
   ============================================================ */
function textWidth(host,before){
  var r=doc.createRange();r.setStart(host,0);
  if(before)r.setEndBefore(before);else r.setEnd(host,host.childNodes.length);
  return Math.round(r.getBoundingClientRect().width);
}
function dimLine(host,withNum){
  var d=doc.createElement('i');d.className=withNum?'dim':'dimu';d.setAttribute('aria-hidden','true');
  d.innerHTML='<i class="dim-t"></i><i class="dim-l"></i>'+(withNum?'<b class="dim-n">0</b><i class="dim-l"></i>':'')+'<i class="dim-t"></i>';
  host.classList.add('dimhost');host.appendChild(d);
  var num=d.querySelector('.dim-n'),w=0,done=false;
  function measure(){
    if(host._vtCounting)return;
    var nw=textWidth(host,d);
    if(!nw||nw===w)return;
    w=nw;d.style.width=w+'px';
    if(done&&num&&!num._vtNum)num.textContent=sp(w*MM);
  }
  measure();host._vtMeasure=measure;
  var tl=gsap.timeline({paused:true});
  tl.fromTo(d.querySelectorAll('.dim-l'),{scaleX:0},{scaleX:1,duration:withNum?.8:.7,stagger:.16},0)
    .fromTo(d.querySelectorAll('.dim-t'),{opacity:0,scale:.2},{opacity:1,scale:1,duration:.45,ease:'vtSpring',stagger:withNum?.75:.5},0);
  if(num)tl.fromTo(num,{opacity:0},{opacity:1,duration:.4},.2);
  ST.create({trigger:host,start:'top 90%',end:'max',once:true,onRefresh:measure,onEnter:function(){
    done=true;tl.play();
    if(num)M.num(num,0,w*MM,{dur:1.1,fmt:sp});
  }});
}

/* ============================================================
   РУЛЕТКА ПРОКРУТКИ
   Шкала справа: лента в масштабе, 4 px ленты = 10 мм страницы.
   Показывает, на сколько миллиметров прокручена страница.
   ============================================================ */
function ruler(){
  if(!fine)return;
  var el=doc.createElement('div');el.className='ruler';el.setAttribute('aria-hidden','true');
  el.innerHTML='<div class="ruler-win"><div class="ruler-tape"></div></div><i class="ruler-ptr"></i><span class="ruler-val"><b>0</b> мм</span>';
  body.appendChild(el);
  var win=el.firstChild,tape=win.firstChild,val=el.querySelector('b'),winH=0,K=.4*MM,last=-1;
  var setY=gsap.quickSetter(tape,'y','px');
  function upd(){
    var y=Math.max(0,window.pageYOffset||0),v=Math.round(y*MM);
    setY(winH/2-y*K);
    if(v!==last){last=v;val.textContent=sp(v)}
  }
  function build(){
    winH=win.clientHeight;
    if(!winH)return;
    var mm=ST.maxScroll(window)*MM,n=Math.floor(mm/100)+1,h='',i;
    for(i=0;i<n;i++)h+='<i style="top:'+(i*40)+'px">'+sp(i*100)+'</i>';
    tape.innerHTML=h;tape.style.height=Math.ceil(mm*.4+1)+'px';
    upd();
  }
  ST.create({start:0,end:'max',onUpdate:upd,onRefresh:build});
  build();
  gsap.delayedCall(1,function(){el.classList.add('on')});
}

/* ============================================================
   МАГНИТНЫЕ КНОПКИ (только мышь)
   Главная кнопка тянется к указателю и пружинит обратно.
   ============================================================ */
function magnet(){
  if(!fine)return;
  var els=[];
  each($$('main .btn.lamp'),function(b){
    if(b.closest('.ck,.intro,.sheet,.nav'))return;
    b.classList.add('mag');
    els.push({el:b,x:0,y:0,s:1,vx:0,vy:0,vs:0,tx:0,ty:0,ts:1,near:false});
  });
  if(!els.length)return;
  var R=64,live=false;
  function tick(){
    var any=false;
    els.forEach(function(o){
      o.vx=(o.vx+(o.tx-o.x)*.15)*.74;o.vy=(o.vy+(o.ty-o.y)*.15)*.74;o.vs=(o.vs+(o.ts-o.s)*.2)*.66;
      o.x+=o.vx;o.y+=o.vy;o.s+=o.vs;
      var rest=Math.abs(o.tx-o.x)<.04&&Math.abs(o.ty-o.y)<.04&&Math.abs(o.ts-o.s)<.002&&Math.abs(o.vx)<.04&&Math.abs(o.vy)<.04;
      if(rest&&!o.tx&&!o.ty&&o.ts===1){
        if(o.el.style.transform)o.el.style.transform='';
        o.x=o.y=0;o.s=1;return;
      }
      if(!rest)any=true;
      o.el.style.transform='translate3d('+o.x.toFixed(2)+'px,'+o.y.toFixed(2)+'px,0) scale('+o.s.toFixed(4)+')';
    });
    if(!any){gsap.ticker.remove(tick);live=false}
  }
  function wake(){if(!live){live=true;gsap.ticker.add(tick)}}
  doc.addEventListener('pointermove',function(e){
    if(e.pointerType&&e.pointerType!=='mouse')return;
    els.forEach(function(o){
      var r=o.el.getBoundingClientRect();
      if(!r.width)return;
      var cx=r.left-o.x+r.width/2,cy=r.top-o.y+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy;
      var ox=Math.max(0,Math.abs(dx)-r.width/2),oy=Math.max(0,Math.abs(dy)-r.height/2),d=Math.sqrt(ox*ox+oy*oy);
      if(d<R){
        var k=1-d/R;k=k*k*(3-2*k);
        o.tx=clamp(-14,14,dx*.24*k);o.ty=clamp(-10,10,dy*.36*k);o.near=true;wake();
      }else if(o.near){o.near=false;o.tx=o.ty=0;o.ts=1;wake()}
    });
  },{passive:true});
  doc.addEventListener('pointerdown',function(e){
    var b=e.target.closest&&e.target.closest('.mag');
    els.forEach(function(o){if(o.el===b){o.ts=.955;wake()}});
  },{passive:true});
  ['pointerup','pointercancel'].forEach(function(n){doc.addEventListener(n,function(){els.forEach(function(o){if(o.ts!==1){o.ts=1;wake()}})},{passive:true})});
  root.addEventListener('mouseleave',function(){els.forEach(function(o){o.near=false;o.tx=o.ty=0;o.ts=1});wake()});
}

/* ============================================================
   КУРСОР-КАПЛЯ (только мышь)
   Над проектом — стеклянная капля «открыть»; над 3D-макетом — подпись
   «крутить» под указателем (капля там своя, её рисует сцена).
   Любому элементу можно задать подпись атрибутом data-cur="текст".
   ============================================================ */
function cursor(){
  if(!fine)return;
  var c=doc.createElement('div');c.className='cur';c.setAttribute('aria-hidden','true');
  c.innerHTML='<span class="cur-in"><b></b></span>';
  body.appendChild(c);root.classList.add('has-cur');
  var lab=c.querySelector('b'),xTo=gsap.quickTo(c,'x',{duration:.3,ease:'power3'}),yTo=gsap.quickTo(c,'y',{duration:.3,ease:'power3'});
  var mode='',lx=-1,ly=-1,q=0;
  function pick(t){
    if(!t||!t.closest||t.closest('[data-cur="off"],.curtain-knob'))return null;
    var x=t.closest('[data-cur]');
    if(x)return {m:'drop',t:x.getAttribute('data-cur')};
    if(t.closest('.work'))return {m:'drop',t:'открыть'};
    if(t.closest('[data-slot]')&&root.classList.contains('has-gl'))return {m:'tag',t:'крутить'};
    return null;
  }
  function apply(p,x,y){
    var key=p?p.m+'|'+p.t:'';
    if(key===mode)return;
    if(!mode&&p){xTo(x,x);yTo(y,y)}      /* появляется под указателем, а не прилетает из угла */
    mode=key;
    c.className='cur'+(p?' on '+p.m:'');
    if(p)lab.textContent=p.t;
  }
  doc.addEventListener('pointermove',function(e){
    if(e.pointerType&&e.pointerType!=='mouse')return;
    lx=e.clientX;ly=e.clientY;
    apply(pick(e.target),lx,ly);
    xTo(lx);yTo(ly);
  },{passive:true});
  /* страница едет под неподвижной мышью — смотрим, что теперь под ней */
  window.addEventListener('scroll',function(){
    if(lx<0||q)return;
    q=requestAnimationFrame(function(){q=0;apply(pick(doc.elementFromPoint(lx,ly)),lx,ly)});
  },{passive:true});
  doc.addEventListener('pointerdown',function(){c.classList.add('down')},{passive:true});
  ['pointerup','pointercancel'].forEach(function(n){doc.addEventListener(n,function(){c.classList.remove('down')},{passive:true})});
  root.addEventListener('mouseleave',function(){lx=-1;apply(null)});
}

/* ============================================================
   САМОЛЁТИК TELEGRAM
   Значок на кнопке «Написать в Telegram» вылетает по дуге с петлёй,
   за ним тянется след; потом значок возвращается на место.
   ============================================================ */
function plane(){
  var D='M20.5 3.5 10.6 13.4M20.5 3.5l-6 17-3.9-7.1-7.1-3.9z',NS='http://www.w3.org/2000/svg',list=[];
  each($$('a[href*="t.me/"]'),function(a){
    var s=a.querySelector('svg'),p=s&&s.querySelector('path');
    if(p&&/^M20\.5 3\.5/.test(p.getAttribute('d')||''))list.push({a:a,svg:s,busy:false,t:0});
  });
  function fly(o){
    var now=Date.now();
    if(o.busy||now-o.t<2600)return;
    var r=o.svg.getBoundingClientRect();
    if(!r.width)return;
    o.busy=true;o.t=now;
    var x0=r.left+r.width/2,y0=r.top+r.height/2,s=r.width/24;
    var k=clamp(.55,1,window.innerWidth/1100),fx=x0+270*k>window.innerWidth-8?-1:1,fy=y0<196*k+6?-1:1;   /* нет места сверху или справа — дуга зеркалится */
    function X(v){return (x0+v*k*fx).toFixed(1)}
    function Y(v){return (y0+v*k*fy).toFixed(1)}
    var d='M'+X(0)+','+Y(0)+' C'+X(46)+','+Y(10)+' '+X(104)+','+Y(-4)+' '+X(124)+','+Y(-56)
      +' C'+X(138)+','+Y(-94)+' '+X(108)+','+Y(-122)+' '+X(82)+','+Y(-106)
      +' C'+X(56)+','+Y(-90)+' '+X(72)+','+Y(-46)+' '+X(120)+','+Y(-54)
      +' C'+X(176)+','+Y(-64)+' '+X(222)+','+Y(-118)+' '+X(262)+','+Y(-190);
    var svg=doc.createElementNS(NS,'svg');
    svg.setAttribute('class','fly');svg.setAttribute('aria-hidden','true');
    svg.innerHTML='<path class="fly-trail" d="'+d+'"/><g class="fly-plane"><path d="'+D+'" transform="translate(-12 -12)"/></g>';
    body.appendChild(svg);
    var path=svg.firstChild,g=svg.lastChild,L=path.getTotalLength(),st={p:0};
    function place(){
      var a=path.getPointAtLength(st.p*L),b=path.getPointAtLength(Math.min(L,st.p*L+2));
      var ang=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI+45;
      g.setAttribute('transform','translate('+a.x.toFixed(1)+' '+a.y.toFixed(1)+') rotate('+ang.toFixed(1)+') scale('+(s*(1-.3*st.p)).toFixed(3)+')');
    }
    place();
    var tl=gsap.timeline({onComplete:function(){svg.remove();o.busy=false}});
    tl.set(o.svg,{opacity:0},0)
      .to(st,{p:1,duration:1.5,ease:'power2.inOut',onUpdate:place},0)
      .to(g,{opacity:0,duration:.3,ease:'power1.in'},1.22);
    if(window.DrawSVGPlugin){
      tl.fromTo(path,{drawSVG:'0% 0%'},{drawSVG:'0% 100%',duration:1.5,ease:'power2.inOut'},0)
        .to(path,{drawSVG:'100% 100%',duration:.5,ease:'power1.in'},1.5);
    }else tl.set(path,{opacity:0},0);
    tl.fromTo(o.svg,{opacity:0,scale:.3,rotate:-35},{opacity:1,scale:1,rotate:0,duration:.6,ease:'vtSpring',clearProps:'opacity,transform,scale,rotate'},1.75);
    if(VT.sound)VT.sound.play('whoosh');
  }
  list.forEach(function(o){
    if(fine)o.a.addEventListener('pointerenter',function(e){if(!e.pointerType||e.pointerType==='mouse')fly(o)});
    o.a.addEventListener('click',function(){fly(o)});
  });
}

/* ============================================================
   СТЕКЛО ГНЁТСЯ (только мышь)
   При быстрой прокрутке плиты слегка скашиваются по ходу движения.
   Угол лежит в переменной --bend, стили — в core.css (.bend).
   ============================================================ */
function bend(){
  if(!fine)return;
  var list=$$('main .stats,main .cells:not(.packs),main .tariffs,main .agroup,main .faq,main .steps,main .cta,main .setup,main .pick,main .frame,main .plist,main .sum,main .prog,main .aarea');
  if(!list.length)return;
  each(list,function(el){el.classList.add('bend')});
  var p={v:0},lim=clamp(-1.5,1.5);
  function paint(){root.style.setProperty('--bend',p.v.toFixed(3))}
  ST.create({start:0,end:'max',onUpdate:function(self){
    var v=lim(self.getVelocity()/-950);
    if(Math.abs(v)>Math.abs(p.v)){
      p.v=v;
      gsap.to(p,{v:0,duration:.9,ease:'power3.out',overwrite:true,onUpdate:paint});
    }
  }});
}

/* ============================================================
   ТЕКСТ ЗАГОРАЕТСЯ
   [data-lit]: слова сначала тусклые и зажигаются по одному, пока листаешь.
   ============================================================ */
function lit(){
  var S=window.SplitText;
  if(!S)return;
  each($$('[data-lit]'),function(el){
    var sp2;
    try{sp2=S.create(el,{type:'words',wordsClass:'lw',aria:'auto'})}catch(e){return}
    var ws=sp2.words||[];
    if(!ws.length)return;
    /* двигать слова не нужно, поэтому оставляем их обычным текстом: перенос строк остаётся прежним */
    ws.forEach(function(w){w.style.display='inline'});
    el.classList.add('lit-on');
    var tl=gsap.timeline({scrollTrigger:{trigger:el,start:'clamp(top 88%)',end:'clamp(top 40%)',scrub:.5}});
    ws.forEach(function(w,i){
      tl.fromTo(w,{'--l':0},{'--l':1,duration:1,ease:'none'},i*.5)
        .fromTo(w,{'--g':0},{'--g':1,duration:.45,ease:'power1.out'},i*.5)
        .to(w,{'--g':0,duration:1,ease:'power1.in'},i*.5+.45);
    });
  });
}

/* ============================================================
   ИСКРЫ СВЕТА
   ============================================================ */
M.sparks=function(el,n){
  if(!el||!window.Physics2DPlugin)return;
  var r=el.getBoundingClientRect();
  if(!r.width)return;
  var box=doc.createElement('div');box.className='sparks';box.setAttribute('aria-hidden','true');
  body.appendChild(box);
  var i,s,d,max=0;
  for(i=0;i<(n||28);i++){
    s=doc.createElement('i');
    var size=2+Math.random()*4;
    s.style.cssText='width:'+size.toFixed(1)+'px;height:'+size.toFixed(1)+'px;left:'+(r.left+r.width*(.18+.64*Math.random())).toFixed(1)+'px;top:'+(r.top+r.height*.3).toFixed(1)+'px';
    if(Math.random()<.3)s.className='hot';
    box.appendChild(s);
    d=.8+Math.random()*.8;max=Math.max(max,d);
    gsap.to(s,{duration:d,ease:'none',physics2D:{velocity:240+Math.random()*420,angle:-90+(Math.random()-.5)*130,gravity:900}});
    gsap.to(s,{opacity:0,scale:.2,duration:d*.55,delay:d*.45,ease:'power1.in'});
  }
  gsap.delayedCall(max+.1,function(){box.remove()});
};

/* ============================================================
   ЗАПУСК
   ============================================================ */
lit();                                           /* до штрихов: заголовок сначала делится на слова */
each($$('.sh h2,.phead h1'),function(h){dimLine(h,true)});
each($$('.pack .pr,.tprice'),function(p){dimLine(p,false)});
each($$('[data-count]'),countUp);
ruler();magnet();cursor();plane();bend();

M.refresh=function(){ST.refresh()};
if(doc.fonts&&doc.fonts.ready)doc.fonts.ready.then(function(){ST.refresh()});
window.addEventListener('load',function(){ST.refresh()});

})();
