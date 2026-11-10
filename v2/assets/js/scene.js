/* ============================================================
   Valentin Testov · v2 — 3D-сцена главной (three.js)
   Макет комнаты собирается процедурно: моделей и текстур нет.
   Что умеет:
   · «строится» из чертежа снизу вверх (uBuild);
   · слушает свет сайта (vt:light) и гамму (VTScene.setPalette);
   · показывает этапы работы: замер → план → визуализация → развёртка;
   · встаёт в «слоты» разметки ([data-slot]) и уходит в размытый фон между ними;
   · поверх сцены плавает капля жидкого стекла (постобработка).
   Отладка: ?q=0 — зафиксировать максимальное качество.
   ============================================================ */
import * as THREE from '../vendor/three.module.min.js';

const root=document.documentElement;
const canvas=document.getElementById('scene');
const hudEl=document.getElementById('hud');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse=matchMedia('(pointer: coarse)').matches;
const qs=new URLSearchParams(location.search);
const lockQ=qs.has('q')?+qs.get('q'):-1;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
const rad=THREE.MathUtils.degToRad;

function fail(){
  root.classList.add('no-gl');window.VTScene=null;
  window.dispatchEvent(new CustomEvent('vt:scene',{detail:{ok:false}}));
}

/* гаммы — те же, что в конструкторе палитры: [стены 60, пол 25, мягкая мебель 10, акцент 5] */
const PALS=[
  {n:'Тёплый нейтрал',c:['#EDE4D6','#C3A279','#D9C8AD','#3A3B38']},
  {n:'Зелёная глубина',c:['#EDE7DA','#A3B29C','#2E4237','#B2914E']},
  {n:'Северный свет',c:['#D8E1E8','#6E86A0','#D5C7AE','#3A4147']},
  {n:'Тёплый орех',c:['#E8DECB','#6B4A32','#B5873A','#33322F']},
  {n:'Тёплая глина',c:['#EFE3D3','#D9C09A','#B5643F','#8E6B57']},
  {n:'Городской графит',c:['#EEF0F1','#C6CACC','#3C4145','#B2914E']},
  {n:'Чёрный лак',c:['#EFE6D4','#7C7F84','#17191B','#C8A253']}
];

/* этапы: что видно и откуда смотрит камера */
const ST={
  viz:    {build:1,shell:.2,furn:.12,az:38,el:25,lamp:1,  dW:0,dD:0,dH:0,dS:0,area:0,zones:0,klab:1,elev:0,spin:1},
  measure:{build:0,shell:1, furn:0,  az:40,el:30,lamp:0,  dW:1,dD:1,dH:1,dS:0,area:1,zones:0,klab:0,elev:0,spin:.4},
  plan:   {build:0,shell:1, furn:1,  az:0, el:89,lamp:0,  dW:1,dD:1,dH:0,dS:0,area:0,zones:1,klab:0,elev:0,spin:0},
  render: {build:1,shell:.2,furn:.12,az:30,el:22,lamp:1,  dW:0,dD:0,dH:0,dS:0,area:0,zones:0,klab:1,elev:0,spin:.5},
  docs:   {build:1,shell:.9,furn:.6, az:0, el:5, lamp:.5, dW:1,dD:0,dH:1,dS:1,area:0,zones:0,klab:0,elev:1,spin:0}
};

function init(){
  if(!canvas)return;
  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,depth:false,stencil:false,powerPreference:'high-performance'});
  }catch(e){fail();return}
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;

  /* ---------- качество ---------- */
  let tier=lockQ>=0?lockQ:(coarse?1:0);
  const TIERS=[{dpr:2,msaa:4,shadow:1024},{dpr:1.6,msaa:2,shadow:512},{dpr:1.1,msaa:0,shadow:0}];
  let dpr=1,W=0,H=0;

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(28,1,.1,120);
  const target=new THREE.Vector3(0,.95,0);

  /* ---------- свет ---------- */
  const lampCol=new THREE.Color(),lampCol2=new THREE.Color(),tmpCol=new THREE.Color(),white=new THREE.Color(1,1,1);
  const hemi=new THREE.HemisphereLight(0xc7d8ff,0x1c1712,.42);scene.add(hemi);
  const fill=new THREE.DirectionalLight(0xffffff,1.05);fill.position.set(6,9,7);scene.add(fill);
  const day=new THREE.PointLight(0xbcd6ff,7,7.5,2);day.position.set(1.6,1.7,-1.55);scene.add(day);
  const lamp=new THREE.SpotLight(0xffffff,46,9,.98,.75,1.6);
  lamp.position.set(-1.22,1.84,-.58);lamp.target.position.set(-1.26,0,-.5);
  lamp.castShadow=true;lamp.shadow.bias=-.0012;lamp.shadow.normalBias=.03;lamp.shadow.radius=5;
  lamp.shadow.camera.near=.2;lamp.shadow.camera.far=7;
  scene.add(lamp,lamp.target);

  /* ---------- материалы ---------- */
  const uBuild={value:0},uEdgeCol={value:new THREE.Color()};
  function patch(m){
    m.onBeforeCompile=sh=>{
      sh.uniforms.uBuild=uBuild;sh.uniforms.uEdgeCol=uEdgeCol;
      sh.vertexShader=sh.vertexShader
        .replace('#include <common>','#include <common>\nvarying vec3 vWp;')
        .replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWp=(modelMatrix*vec4(transformed,1.0)).xyz;');
      sh.fragmentShader=sh.fragmentShader
        .replace('#include <common>','#include <common>\nvarying vec3 vWp;\nuniform float uBuild;\nuniform vec3 uEdgeCol;')
        .replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat vtH=uBuild*3.5-.22;\nif(vWp.y>vtH)discard;')
        .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=uEdgeCol*smoothstep(.26,0.,vtH-vWp.y)*step(uBuild,.995)*2.4;');
    };
    m.customProgramCacheKey=()=>'vt-build';
    m.polygonOffset=true;m.polygonOffsetFactor=1;m.polygonOffsetUnits=1;
    return m;
  }
  const std=(hex,rough,metal)=>patch(new THREE.MeshStandardMaterial({color:hex,roughness:rough===undefined?.88:rough,metalness:metal||0}));
  const M={
    wall:std('#EDE4D6',.95),floor:std('#C3A279',.72),wood:std('#9A7E5B',.6),soft:std('#D9C8AD',.98),softHi:std('#E3D6C1',.98),
    rug:std('#E2D6C2',1),curt:std('#E7DCCB',1),acc:std('#3A3B38',.5,.25),pil:std('#8A8275',.95),
    trim:std('#F2EFE9',.8),metal:std('#24272C',.38,.7),plant:std('#587A56',.9),art:null
  };
  M.plant.flatShading=true;
  M.acc2=std('#3A3B38',.5,.25);M.acc2.side=THREE.DoubleSide;
  /* роли гаммы → материалы; цвета плавно перетекают к цели */
  const ROLE=[
    [M.wall,p=>p[0]],[M.floor,p=>p[1]],[M.wood,p=>p[1].clone().multiplyScalar(.74)],[M.soft,p=>p[2]],
    [M.softHi,p=>p[2].clone().lerp(white,.14)],[M.rug,p=>p[2].clone().lerp(p[0],.6)],[M.curt,p=>p[0].clone().lerp(p[2],.28)],
    [M.acc,p=>p[3]],[M.acc2,p=>p[3]],[M.pil,p=>p[2].clone().lerp(p[3],.55)]
  ];
  let palIdx=0,palLerp=1;
  const palTargets=ROLE.map(()=>new THREE.Color());
  function palSet(i,instant){
    palIdx=((i%PALS.length)+PALS.length)%PALS.length;
    const cols=PALS[palIdx].c.map(h=>new THREE.Color(h));
    ROLE.forEach((r,k)=>{palTargets[k].copy(r[1](cols));if(instant)r[0].color.copy(palTargets[k])});
    palLerp=instant?1:0;
  }
  palSet(0,true);

  /* линии чертежа */
  const lineShell=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:1,depthWrite:false});
  const lineFurn=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false});
  const dimMat={};
  ['W','D','H','S'].forEach(k=>{dimMat[k]=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,depthTest:false})});

  /* ---------- сборка комнаты ---------- */
  const room=new THREE.Group();scene.add(room);
  const T=.12,HT=2.7;
  function add(geo,mat,x,y,z,o){
    o=o||{};
    const m=new THREE.Mesh(geo,mat);
    m.position.set(x,y,z);
    if(o.ry)m.rotation.y=o.ry;if(o.rx)m.rotation.x=o.rx;if(o.rz)m.rotation.z=o.rz;
    m.castShadow=o.cast!==false;m.receiveShadow=o.recv!==false;
    (o.parent||room).add(m);
    if(o.edges!==false)m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,o.ea||24),o.shell?lineShell:lineFurn));
    return m;
  }
  const box=(w,h,d,mat,x,y,z,o)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y+h/2,z,o);
  const cyl=(r,h,mat,x,y,z,o)=>add(new THREE.CylinderGeometry(r,(o&&o.r2)||r,h,(o&&o.seg)||32),mat,x,y+h/2,z,o);
  const grp=(x,y,z,ry)=>{const g=new THREE.Group();g.position.set(x,y,z);if(ry)g.rotation.y=ry;room.add(g);return g};

  /* пол и стены (с проёмами — одной фигурой, чтобы линии были чистыми) */
  box(6+T,.14,4.6+T,M.floor,-T/2,-.14,-T/2,{shell:true,cast:false});
  {
    const s=new THREE.Shape();
    s.moveTo(-3-T,0);s.lineTo(3,0);s.lineTo(3,HT);s.lineTo(-3-T,HT);s.closePath();
    const h=new THREE.Path();h.moveTo(.6,.85);h.lineTo(.6,2.25);h.lineTo(2.6,2.25);h.lineTo(2.6,.85);h.closePath();s.holes.push(h);
    add(new THREE.ExtrudeGeometry(s,{depth:T,bevelEnabled:false}),M.wall,0,0,-2.3-T,{shell:true});
    const l=new THREE.Shape();
    l.moveTo(-2.3,0);l.lineTo(1,0);l.lineTo(1,2.1);l.lineTo(1.9,2.1);l.lineTo(1.9,0);l.lineTo(2.3,0);l.lineTo(2.3,HT);l.lineTo(-2.3,HT);l.closePath();
    add(new THREE.ExtrudeGeometry(l,{depth:T,bevelEnabled:false}),M.wall,-3,0,0,{shell:true,ry:-Math.PI/2});
  }
  /* окно: рама, подоконник, «день» за стеклом, шторы */
  box(2.06,.05,.06,M.trim,1.6,.85,-2.33);box(2.06,.05,.06,M.trim,1.6,2.2,-2.33);
  box(.05,1.4,.06,M.trim,.625,.85,-2.33);box(.05,1.4,.06,M.trim,2.575,.85,-2.33);box(.04,1.4,.05,M.trim,1.6,.85,-2.33);
  box(2.2,.04,.26,M.trim,1.6,.83,-2.2);
  const paneMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0});
  const pane=new THREE.Mesh(new THREE.PlaneGeometry(1.96,1.36),paneMat);pane.position.set(1.6,1.55,-2.36);room.add(pane);
  box(.36,2.34,.07,M.curt,.36,.1,-2.24);box(.36,2.34,.07,M.curt,2.84,.1,-2.24);
  /* диван */
  {
    const g=grp(-1.35,0,-1.8),p={parent:g};
    box(2.2,.1,.8,M.acc,0,0,0,p);box(1.9,.3,.9,M.soft,0,.1,0,p);box(2.3,.52,.2,M.soft,0,.4,-.35,p);
    box(.2,.54,.9,M.soft,-1.05,.1,0,p);box(.2,.54,.9,M.soft,1.05,.1,0,p);
    [-.635,0,.635].forEach(x=>box(.61,.13,.66,M.softHi,x,.4,.1,p));
    box(.5,.34,.13,M.pil,-.55,.55,-.18,{parent:g,rx:-.22});box(.5,.34,.13,M.acc,.55,.55,-.18,{parent:g,rx:-.22});
  }
  /* ковёр и столики */
  box(2.7,.02,1.8,M.rug,-1.3,0,-.45,{cast:false});
  cyl(.24,.02,M.metal,-1.3,.02,-.5);cyl(.05,.3,M.metal,-1.3,.04,-.5,{edges:false});cyl(.46,.04,M.trim,-1.3,.34,-.5);
  cyl(.03,.24,M.metal,-.82,.02,-.18,{edges:false});cyl(.28,.03,M.wood,-.82,.26,-.18);
  /* торшер-дуга: он и есть «лампа» сайта */
  cyl(.22,.035,M.acc,.2,0,-2);
  {
    const c=new THREE.CatmullRomCurve3([new THREE.Vector3(.2,.03,-2),new THREE.Vector3(.2,1.2,-2),new THREE.Vector3(.12,1.95,-1.86),
      new THREE.Vector3(-.36,2.3,-1.36),new THREE.Vector3(-.9,2.24,-.86),new THREE.Vector3(-1.2,2.04,-.6)]);
    add(new THREE.TubeGeometry(c,56,.017,8,false),M.acc,0,0,0,{edges:false});
    add(new THREE.SphereGeometry(.25,32,14,0,Math.PI*2,0,Math.PI/2),M.acc2,-1.22,1.8,-.58,{ea:60});
  }
  const bulbMat=new THREE.MeshBasicMaterial({color:0xffffff});
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.075,16,12),bulbMat);bulb.position.set(-1.22,1.83,-.58);room.add(bulb);
  const glowTex=(()=>{
    const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);
    gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.18,'rgba(255,255,255,.55)');gr.addColorStop(.5,'rgba(255,255,255,.12)');gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
  })();
  const glowMat=new THREE.SpriteMaterial({map:glowTex,color:0xffffff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0});
  const glow=new THREE.Sprite(glowMat);glow.position.copy(bulb.position);glow.scale.setScalar(1.9);room.add(glow);
  /* комод, полка с вещами, картины */
  box(.42,.5,1.7,M.wood,-2.77,.07,-.2);
  box(.2,.05,.28,M.acc,-2.77,.57,-.75);box(.18,.04,.25,M.trim,-2.77,.62,-.73);
  cyl(.07,.26,M.trim,-2.77,.57,-.25,{r2:.05});
  cyl(.12,.2,M.acc,-2.75,.57,.38,{r2:.09});
  add(new THREE.IcosahedronGeometry(.3,1),M.plant,-2.72,1.02,.38,{edges:false});
  box(.03,.62,.9,M.acc,-2.975,1.25,-.2);
  box(1.4,.86,.035,M.acc,-1.35,1.32,-2.28);
  {
    const c=document.createElement('canvas');c.width=384;c.height=224;const g=c.getContext('2d');
    g.fillStyle='#efe9df';g.fillRect(0,0,384,224);
    [['#c9a66b',120,150,95],['#33443a',250,95,70],['#b5643f',205,170,42],['#6e86a0',85,70,36]].forEach(a=>{
      g.fillStyle=a[0];g.globalAlpha=.9;g.beginPath();g.arc(a[1],a[2],a[3],0,7);g.fill()});
    g.globalAlpha=1;g.strokeStyle='#1c1d1f';g.lineWidth=3;g.beginPath();g.moveTo(20,196);g.bezierCurveTo(120,60,230,230,364,40);g.stroke();
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    M.art=patch(new THREE.MeshStandardMaterial({map:t,roughness:.9}));
    add(new THREE.PlaneGeometry(1.28,.74),M.art,-1.35,1.75,-2.258,{edges:false,cast:false});
  }
  /* рабочее место у окна */
  box(1.5,.04,.62,M.wood,1.6,.72,-1.95);box(.04,.72,.56,M.wood,.88,0,-1.95);box(.04,.72,.56,M.wood,2.32,0,-1.95);
  cyl(.03,.14,M.metal,1.6,.76,-2.1,{edges:false});box(.62,.38,.025,M.metal,1.6,.88,-2.1);
  const scrMat=new THREE.MeshBasicMaterial({color:0x9fc4ff,transparent:true,opacity:0});
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(.58,.34),scrMat);scr.position.set(1.6,1.07,-2.085);room.add(scr);
  {
    const g=grp(1.62,0,-1.3,.22),p={parent:g};
    box(.46,.06,.46,M.acc,0,.42,0,p);box(.46,.46,.05,M.acc,0,.5,.21,p);
    [[-.19,-.19],[.19,-.19],[-.19,.19],[.19,.19]].forEach(q=>box(.035,.42,.035,M.metal,q[0],0,q[1],{parent:g,edges:false}));
  }
  /* кресло, столик и растение */
  {
    const g=grp(1.55,0,.75,-1.985),p={parent:g};
    box(.8,.3,.76,M.soft,0,.1,0,p);box(.8,.5,.18,M.soft,0,.4,-.29,p);
    box(.16,.28,.76,M.soft,-.32,.4,0,p);box(.16,.28,.76,M.soft,.32,.4,0,p);box(.48,.12,.56,M.softHi,0,.4,.06,p);
  }
  cyl(.025,.5,M.metal,2.4,0,.15,{edges:false});cyl(.2,.03,M.trim,2.4,.5,.15);
  cyl(.19,.36,M.acc,2.62,0,-.75,{r2:.15});cyl(.02,.5,M.plant,2.62,.36,-.75,{edges:false});
  add(new THREE.IcosahedronGeometry(.48,1),M.plant,2.62,1.18,-.75,{edges:false});
  /* дверь и дуга её открывания (обозначение на плане) */
  {
    const g=grp(-2.98,0,1.9,-1.31);
    box(.04,2.05,.9,M.trim,0,0,-.45,{parent:g});
    const pts=[];for(let i=0;i<24;i++){const a=-i/24*Math.PI/2,b=-(i+1)/24*Math.PI/2;
      pts.push(-2.98-Math.sin(a)*.9,.012,1.9-Math.cos(a)*.9,-2.98-Math.sin(b)*.9,.012,1.9-Math.cos(b)*.9)}
    const ge=new THREE.BufferGeometry();ge.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
    room.add(new THREE.LineSegments(ge,lineFurn));
  }

  /* размерные линии */
  function dimLine(k,a,b,tick){
    const p=[a[0],a[1],a[2],b[0],b[1],b[2]];
    [a,b].forEach(q=>p.push(q[0]-tick[0],q[1]-tick[1],q[2]-tick[2],q[0]+tick[0],q[1]+tick[1],q[2]+tick[2]));
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    const l=new THREE.LineSegments(g,dimMat[k]);l.renderOrder=5;room.add(l);
  }
  dimLine('W',[-3,0,2.78],[3,0,2.78],[0,0,.13]);
  dimLine('D',[3.42,0,-2.3],[3.42,0,2.3],[.13,0,0]);
  dimLine('H',[3.14,0,-2.36],[3.14,HT,-2.36],[.13,0,0]);
  dimLine('S',[2.92,0,-2.18],[2.92,.85,-2.18],[.1,0,0]);

  /* стол-проектор под макетом: метровая сетка, гаснет к краям */
  const gridMat=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{uCol:{value:new THREE.Color()},uOn:{value:1}},
    vertexShader:'varying vec3 vW;void main(){vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}',
    fragmentShader:`varying vec3 vW;uniform vec3 uCol;uniform float uOn;
      void main(){vec2 w=vW.xz;vec2 g=abs(fract(w-.5)-.5)/fwidth(w);float l=1.-min(min(g.x,g.y),1.);
      vec2 g5=abs(fract(w/5.-.5)-.5)/fwidth(w/5.);float l5=1.-min(min(g5.x,g5.y),1.);
      float f=smoothstep(9.,2.2,length(w));gl_FragColor=vec4(uCol*(l*.5+l5*.9)*f*uOn,1.);}`
  });
  const grid=new THREE.Mesh(new THREE.PlaneGeometry(22,22),gridMat);grid.rotation.x=-Math.PI/2;grid.position.y=-.16;scene.add(grid);

  /* фон: два пятна света за макетом, рисуется первым */
  const tri=new THREE.BufferGeometry();
  tri.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
  tri.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,2,0,0,2],2));
  const bgMat=new THREE.ShaderMaterial({
    depthTest:false,depthWrite:false,
    uniforms:{uRes:{value:new THREE.Vector2(1,1)},uTime:{value:0},uLamp:{value:lampCol},uLamp2:{value:lampCol2},uC:{value:new THREE.Vector2(.5,.5)},uGlow:{value:1}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}',
    fragmentShader:`varying vec2 vUv;uniform vec2 uRes,uC;uniform float uTime,uGlow;uniform vec3 uLamp,uLamp2;
      float g(vec2 p,vec2 c,float r){float d=length(p-c)/r;return exp(-d*d*2.2);}
      void main(){float a=uRes.x/uRes.y;vec2 p=vec2(vUv.x*a,vUv.y),c=vec2(uC.x*a,uC.y);float t=uTime*.06;
      vec3 col=vec3(.0036,.0052,.0092);
      col+=uLamp*g(p,c+vec2(.16*sin(t*1.3),.12+.05*cos(t)),.6)*.075*uGlow;
      col+=uLamp2*g(p,c+vec2(-.46+.1*cos(t*.9),-.3),.72)*.055;
      col+=uLamp*g(p,vec2(a*.95,1.05),.85)*.03;
      col+=uLamp2*g(p,vec2(a*.02,-.08),.95)*.04;
      gl_FragColor=vec4(col,1.);}`
  });
  const bg=new THREE.Mesh(tri,bgMat);bg.frustumCulled=false;bg.renderOrder=-1000;scene.add(bg);

  /* ---------- постобработка: фокус, затемнение, капля стекла ---------- */
  let rt=null;
  function makeRT(){
    if(rt)rt.dispose();
    const t=TIERS[tier];
    rt=new THREE.WebGLRenderTarget(Math.max(2,Math.round(W*dpr)),Math.max(2,Math.round(H*dpr)),
      {type:THREE.HalfFloatType,samples:t.msaa,depthBuffer:true,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter});
    postMat.uniforms.tScene.value=rt.texture;
  }
  const postMat=new THREE.ShaderMaterial({
    depthTest:false,depthWrite:false,
    uniforms:{tScene:{value:null},uRes:{value:new THREE.Vector2(1,1)},uTime:{value:0},uDefocus:{value:0},uDim:{value:0},uLensOn:{value:0},uPx:{value:1},
      uL0:{value:new THREE.Vector3()},uL1:{value:new THREE.Vector3()},uL2:{value:new THREE.Vector3()},uLamp:{value:lampCol}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`varying vec2 vUv;uniform sampler2D tScene;uniform vec2 uRes;uniform float uTime,uDefocus,uDim,uLensOn,uPx;uniform vec3 uL0,uL1,uL2,uLamp;
      float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
      float sdf(vec2 p){float k=uL0.z*.9;float d=length(p-uL0.xy)-uL0.z;d=smin(d,length(p-uL1.xy)-uL1.z,k);d=smin(d,length(p-uL2.xy)-uL2.z,k);return d;}
      float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      vec3 soft(vec2 uv,float lod,float r){vec2 o=r/uRes;
        return (textureLod(tScene,uv+o*vec2(.7,.7),lod).rgb+textureLod(tScene,uv+o*vec2(-.7,.7),lod).rgb
          +textureLod(tScene,uv+o*vec2(.7,-.7),lod).rgb+textureLod(tScene,uv+o*vec2(-.7,-.7),lod).rgb)*.25;}
      void main(){
        vec2 px=gl_FragCoord.xy;float lod=uDefocus*4.4;
        vec3 col=soft(vUv,lod,uDefocus*13.*uPx);
        if(uLensOn>.003){
          float d=sdf(px);
          if(d<2.5*uPx){
            float R=uL0.z;vec2 e=vec2(1.5*uPx,0.);
            vec2 n=normalize(vec2(sdf(px+e.xy)-sdf(px-e.xy),sdf(px+e.yx)-sdf(px-e.yx))+1e-6);
            float depth=clamp(-d/(R*.66),0.,1.);float bend=pow(1.-depth,2.3);
            vec2 off=(-n*bend*R*.5-(px-uL0.xy)*.09*depth)*uLensOn;
            float ll=lod*.5+.35;vec3 g;
            g.r=textureLod(tScene,(px+off*1.1)/uRes,ll).r;
            g.g=textureLod(tScene,(px+off)/uRes,ll).g;
            g.b=textureLod(tScene,(px+off*.9)/uRes,ll).b;
            float hl=pow(max(dot(n,normalize(vec2(-.55,.83))),0.),2.4)*pow(bend,1.4);
            float hl2=pow(max(dot(n,normalize(vec2(.55,-.83))),0.),3.)*pow(bend,1.8);
            g*=1.-.3*pow(bend,3.)*(1.-hl);
            g+=vec3(1.)*hl*.75+uLamp*hl2*.65+uLamp*.012*depth;
            col=mix(col,g,smoothstep(1.2*uPx,-1.2*uPx,d)*uLensOn);
          }
        }
        col=mix(col,vec3(dot(col,vec3(.3,.59,.11))),uDim*.3);
        col=mix(col,col/(1.+col*3.),uDim);
        col*=mix(1.,.3,uDim);
        vec2 q=vUv-.5;col*=1.-dot(q,q)*.5;
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb+=(hash(px+fract(uTime)*91.7)-.5)*.026;
      }`
  });
  const post=new THREE.Mesh(tri,postMat);post.frustumCulled=false;
  const postScene=new THREE.Scene();postScene.add(post);
  const postCam=new THREE.Camera();

  /* ---------- подписи поверх сцены ---------- */
  const labels=[];
  function label(key,txt,pos,cls){
    if(!hudEl)return null;
    const el=document.createElement('span');el.className='hl'+(cls?' '+cls:'');el.innerHTML=txt;hudEl.appendChild(el);
    const L={key,el,pos:new THREE.Vector3(pos[0],pos[1],pos[2]),o:0};labels.push(L);return L;
  }
  label('dW','6 000',[0,0,2.78]);label('dD','4 600',[3.42,0,0]);label('dH','2 700',[3.14,1.35,-2.36]);label('dS','850',[2.92,.42,-2.18]);
  label('area','27,6 м²',[.7,0,1.25]);
  const kLab=label('klab','3000 K<i>Ra 90+</i>',[-1.22,2.42,-.58],'k');
  label('zones','гостиная',[-1.3,0,.85],'z');label('zones','рабочее место',[1.6,0,-.95],'z');label('zones','вход',[-2.35,0,1.45],'z');
  label('elev','развёртка · стена А',[-1.6,3.02,-2.3]);

  /* ---------- свет сайта ---------- */
  function applyLight(rgb,rgb2,k){
    lampCol.setRGB(rgb[0]/255,rgb[1]/255,rgb[2]/255,THREE.SRGBColorSpace);
    lampCol2.setRGB(rgb2[0]/255,rgb2[1]/255,rgb2[2]/255,THREE.SRGBColorSpace);
    lamp.color.copy(lampCol);
    bulbMat.color.copy(lampCol).multiplyScalar(5);
    glowMat.color.copy(lampCol);
    fill.color.copy(white).lerp(lampCol2,.3);
    uEdgeCol.value.copy(lampCol);
    tmpCol.copy(white).lerp(lampCol,.5);
    lineShell.color.copy(tmpCol).multiplyScalar(1.9);lineFurn.color.copy(tmpCol).multiplyScalar(1.5);
    Object.values(dimMat).forEach(m=>m.color.copy(lampCol).multiplyScalar(1.6));
    gridMat.uniforms.uCol.value.copy(tmpCol).multiplyScalar(.2);
    if(kLab)kLab.el.innerHTML=k+' K<i>Ra 90+</i>';
  }
  const VT=window.VT;
  if(VT&&VT.light){const k=VT.light.get();applyLight(VT.light.rgb(k),VT.light.rgb(VT.light.min+VT.light.max-k),k)}
  else applyLight([255,190,128],[128,186,255],3000);
  window.addEventListener('vt:light',e=>applyLight(e.detail.rgb,e.detail.rgb2,e.detail.k));

  /* ---------- слоты, этап, камера ---------- */
  const slots=[...document.querySelectorAll('[data-slot]')].map(el=>({el,name:el.getAttribute('data-slot'),v:0,r:null}));
  let procStage='measure',held=true;
  const cur=Object.assign({},ST.measure,{build:0,lamp:0});
  const fr={cx:0,cy:0,ppu:60,focus:0,inited:false};
  let mx=0,my=0,pmx=0,pmy=0,pIn=false,dragAz=0,dragV=0,dragging=false,lastX=0,time=0;
  const dir=new THREE.Vector3(),v3=new THREE.Vector3();
  /* капля: основная и два «хвоста» */
  const L=[{x:0,y:0,vx:0,vy:0},{x:0,y:0},{x:0,y:0}];let lensR=70;

  addEventListener('pointermove',e=>{
    pmx=e.clientX;pmy=e.clientY;pIn=e.pointerType==='mouse'||dragging;
    mx=clamp(e.clientX/Math.max(1,W)*2-1,-1,1);my=clamp(e.clientY/Math.max(1,H)*2-1,-1,1);
    if(dragging){const dx=e.clientX-lastX;lastX=e.clientX;dragAz+=dx*.32;dragV=dx*.32}
  },{passive:true});
  slots.forEach(s=>{
    s.el.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;pmx=e.clientX;pmy=e.clientY;pIn=true;
      const h=document.getElementById('hero');if(h)h.classList.add('dragged')});
  });
  ['pointerup','pointercancel'].forEach(n=>addEventListener(n,e=>{dragging=false;if(e.pointerType!=='mouse')pIn=false},{passive:true}));
  document.addEventListener('mouseleave',()=>{pIn=false});

  function resize(){
    const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
    const t=TIERS[tier],nd=Math.min(window.devicePixelRatio||1,t.dpr);
    if(w===W&&Math.abs(h-H)<2&&nd===dpr&&rt)return;
    W=w;H=h;dpr=nd;
    renderer.setPixelRatio(dpr);renderer.setSize(W,H,false);
    camera.aspect=W/H;
    makeRT();
    const rw=Math.round(W*dpr),rh=Math.round(H*dpr);
    postMat.uniforms.uRes.value.set(rw,rh);postMat.uniforms.uPx.value=dpr;bgMat.uniforms.uRes.value.set(rw,rh);
  }
  function applyTier(){
    const t=TIERS[tier];
    lamp.castShadow=t.shadow>0;
    if(t.shadow){lamp.shadow.mapSize.set(t.shadow,t.shadow);if(lamp.shadow.map){lamp.shadow.map.dispose();lamp.shadow.map=null}}
    renderer.shadowMap.needsUpdate=true;
    Object.values(M).forEach(m=>{if(m)m.needsUpdate=true});
    rt=null;resize();
  }

  function update(dt){
    time+=dt;
    /* какой слот сейчас на экране */
    let best=null,bv=0;
    for(const s of slots){
      const r=s.el.getBoundingClientRect();s.r=r;
      s.v=r.width>0?clamp((Math.min(r.bottom,H)-Math.max(r.top,0))/Math.max(1,r.height),0,1):0;
      if(s.v>bv){bv=s.v;best=s}
    }
    const focusT=best?sstep(.1,.55,bv):0;
    const k=x=>1-Math.exp(-dt*x);
    fr.focus+=(focusT-fr.focus)*k(6);
    const stage=held?ST.measure:(best&&best.name==='process'&&bv>.1?ST[procStage]:ST.viz);
    for(const key in stage){
      const rate=key==='build'?(stage.build>cur.build?1.5:2.6):key==='az'||key==='el'?3.2:4.5;
      cur[key]+=(stage[key]-cur[key])*k(rate);
    }
    if(held){cur.build=0;cur.lamp=0;cur.shell=1;cur.furn=0;['dW','dD','dH','area'].forEach(q=>cur[q]=0)}
    /* гамма */
    if(palLerp<1){palLerp=Math.min(1,palLerp+dt*1.6);const t=k(5);ROLE.forEach((r,i)=>r[0].color.lerp(palTargets[i],palLerp>=1?1:t))}

    /* куда встать: центр слота или «фон» */
    const sw=best?best.r.width:W,sh=best?best.r.height:H;
    const tcx=mix(W*.5,best?best.r.left+sw/2:W*.5,fr.focus),tcy=mix(H*.56,best?best.r.top+sh/2:H*.56,fr.focus);
    const ppuSlot=Math.min(sw/7.7,sh/5.5),ppuBack=Math.max(W,H)/5.2;
    const tppu=Math.exp(mix(Math.log(ppuBack),Math.log(Math.max(8,ppuSlot)),fr.focus));
    if(!fr.inited){fr.cx=tcx;fr.cy=tcy;fr.ppu=tppu;fr.inited=true}
    fr.cx+=(tcx-fr.cx)*k(16);fr.cy+=(tcy-fr.cy)*k(16);fr.ppu+=(tppu-fr.ppu)*k(7);

    /* камера */
    if(!dragging){dragAz+=dragV;dragV*=Math.pow(.02,dt);dragAz*=Math.pow(.8,dt)}
    dragAz=clamp(dragAz,-80,80);
    const sp=reduce?0:cur.spin;
    const az=rad(cur.az+sp*(Math.sin(time*.23)*9+mx*6)+dragAz*Math.min(1,cur.spin*2+.25));
    const el=rad(clamp(cur.el+sp*(-my*3+Math.sin(time*.17)*1.5),2,89.4));
    dir.set(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));
    const dist=H/(2*fr.ppu*Math.tan(rad(camera.fov)/2));
    camera.position.copy(target).addScaledVector(dir,dist);
    camera.lookAt(target);
    camera.setViewOffset(W,H,W/2-fr.cx,H/2-fr.cy,W,H);
    camera.updateMatrixWorld();

    /* состояние сцены */
    uBuild.value=cur.build;
    lineShell.opacity=cur.shell;lineFurn.opacity=cur.furn;
    dimMat.W.opacity=cur.dW;dimMat.D.opacity=cur.dD;dimMat.H.opacity=cur.dH;dimMat.S.opacity=cur.dS;
    const lit=cur.lamp*sstep(.55,.95,cur.build);
    lamp.intensity=46*lit;bulbMat.color.copy(lampCol).multiplyScalar(.25+5*lit);glowMat.opacity=.9*lit;
    paneMat.opacity=sstep(.35,.8,cur.build);paneMat.color.setRGB(1.5,1.9,2.6);scrMat.opacity=.8*sstep(.6,.9,cur.build);
    day.intensity=7*sstep(.3,.8,cur.build);
    hemi.intensity=.42;fill.intensity=mix(.5,1.05,cur.build);
    gridMat.uniforms.uOn.value=mix(.45,1,1-cur.build*.6);
    bgMat.uniforms.uTime.value=time;bgMat.uniforms.uC.value.set(fr.cx/W,1-fr.cy/H);bgMat.uniforms.uGlow.value=.5+lit*.8;

    /* капля */
    const lensOn=reduce?0:fr.focus*sstep(.02,.3,cur.build+cur.shell);
    lensR=clamp(Math.min(sw,sh)*.16,44,104);
    let tx,ty;
    if(pIn&&best&&pmx>best.r.left-90&&pmx<best.r.right+90&&pmy>best.r.top-90&&pmy<best.r.bottom+90){tx=pmx;ty=pmy}
    else{tx=fr.cx+Math.cos(time*.43)*sw*.3;ty=fr.cy+Math.sin(time*.61)*sh*.22-sh*.04}
    const a=L[0];
    a.vx+=(tx-a.x)*70*dt;a.vy+=(ty-a.y)*70*dt;const dmp=Math.pow(.0009,dt);a.vx*=dmp;a.vy*=dmp;a.x+=a.vx*dt;a.y+=a.vy*dt;
    L[1].x+=(a.x-L[1].x)*k(6.5);L[1].y+=(a.y-L[1].y)*k(6.5);
    L[2].x+=(L[1].x-L[2].x)*k(4);L[2].y+=(L[1].y-L[2].y)*k(4);
    const u=postMat.uniforms;
    u.uL0.value.set(a.x*dpr,(H-a.y)*dpr,lensR*dpr);
    u.uL1.value.set(L[1].x*dpr,(H-L[1].y)*dpr,lensR*.6*dpr);
    u.uL2.value.set(L[2].x*dpr,(H-L[2].y)*dpr,lensR*.38*dpr);
    u.uLensOn.value=lensOn;u.uTime.value=time;
    u.uDefocus.value=1-fr.focus;u.uDim.value=(1-fr.focus)*.9;

    /* подписи */
    for(const l of labels){
      const want=(cur[l.key]||0)*fr.focus*(held?0:1);
      l.o+=(want-l.o)*k(8);
      if(l.o<.02){if(l.el.style.opacity!=='0')l.el.style.opacity='0';continue}
      v3.copy(l.pos).project(camera);
      if(v3.z>1){l.el.style.opacity='0';continue}
      const x=(v3.x*.5+.5)*W,y=(-v3.y*.5+.5)*H;
      l.el.style.opacity=l.o.toFixed(2);
      l.el.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0) translate(-50%,-50%)';
    }
  }

  /* ---------- цикл ---------- */
  let last=0,frames=0,acc=0,first=true,skip=false;
  function frame(t){
    requestAnimationFrame(frame);
    if(document.hidden){last=t;return}
    const dt=Math.min(.05,(t-last)/1000||.016);last=t;
    resize();
    /* в роли размытого фона хватает 30 кадров в секунду */
    if(fr.focus<.04&&!first){skip=!skip;if(skip){time+=dt;return}}
    update(skip?dt*2:dt);
    renderer.setRenderTarget(rt);renderer.render(scene,camera);
    renderer.setRenderTarget(null);renderer.render(postScene,postCam);
    if(first){
      first=false;root.classList.add('has-gl');
      window.dispatchEvent(new CustomEvent('vt:scene',{detail:{ok:true}}));
    }
    /* слишком медленно — ступень ниже */
    if(lockQ<0&&fr.focus>.5){
      frames++;acc+=dt;
      if(frames>=70){
        if(acc/frames>.034&&tier<TIERS.length-1){tier++;applyTier()}
        frames=0;acc=0;
      }
    }
  }

  window.VTScene={
    ok:true,palettes:PALS,
    palette:()=>palIdx,
    setPalette:i=>palSet(i,false),
    setStage:n=>{if(ST[n])procStage=n},
    start:()=>{held=false;if(reduce)Object.assign(cur,ST.viz)},
    held:()=>held,
    /* для снимка-заглушки и отладки */
    debug:()=>({tier,dpr,W,H,focus:fr.focus,build:cur.build})
  };
  applyTier();
  try{renderer.compile(scene,camera)}catch(e){}
  requestAnimationFrame(frame);

  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();root.classList.remove('has-gl');root.classList.add('no-gl')});
}

try{init()}catch(e){console.error(e);fail()}
