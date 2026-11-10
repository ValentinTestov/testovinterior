/* ============================================================
   Конструктор палитры и света
   ============================================================ */
(function(){
"use strict";

var METRIKA_ID=112145522;

/* ============ Telegram Mini App ============ */
var _W=window.Telegram&&window.Telegram.WebApp;
var TG=(_W&&_W.platform&&_W.platform!=='unknown')?_W:null;
if(TG){
  try{
    TG.ready();TG.expand();
    if(TG.setHeaderColor)TG.setHeaderColor('#05070B');
    if(TG.setBackgroundColor)TG.setBackgroundColor('#05070B');
  }catch(e){}
}
function hap(t){if(TG&&TG.HapticFeedback){try{TG.HapticFeedback.impactOccurred(t||'light')}catch(e){}}}

/* цели Метрики: palitra_pick, palitra_light, palitra_copy, palitra_png, palitra_contact */
var sent={};
function goal(n){if(sent[n])return;sent[n]=true;if(window.ym){try{ym(METRIKA_ID,'reachGoal',n)}catch(e){}}}

/* ============ данные ============ */
var ROLES=[
 {r:'основной',p:60,w:'стены и потолок'},
 {r:'вторичный',p:25,w:'пол, крупная мебель'},
 {r:'дополнительный',p:10,w:'мягкая мебель, текстиль'},
 {r:'акцент',p:5,w:'детали, свет, декор'}
];

var PALS=[
 {id:'warmneutral',n:'Тёплый нейтрал',d:'Универсальная база: спокойная, тёплая и не надоедает через год.',
  c:[['молочный','#EDE4D6'],['дуб','#C3A279'],['песочный','#D9C8AD'],['графит','#3A3B38']]},
 {id:'milk',n:'Молочный минимализм',d:'Максимум света и воздуха, мебель читается силуэтами.',
  c:[['белый','#F4F1EA'],['светлый дуб','#DAC5A2'],['тёплый серый','#B9B6AF'],['графит','#43464A']]},
 {id:'graphite',n:'Городской графит',d:'Сдержанный монохром, оживлённый тёплым металлом.',
  c:[['белый','#EEF0F1'],['светло-серый','#C6CACC'],['графит','#3C4145'],['латунь','#B2914E']]},
 {id:'sandterra',n:'Тёплая глина',d:'Южная гамма: земля, солнце и обожжённая глина.',
  c:[['крем','#EFE3D3'],['песочный','#D9C09A'],['терракота','#B5643F'],['глина','#8E6B57']]},
 {id:'deepgreen',n:'Зелёная глубина',d:'Тихий модерн: глубокий зелёный и тёплая латунь.',
  c:[['крем','#EDE7DA'],['шалфей','#A3B29C'],['бутылочный','#2E4237'],['латунь','#B2914E']]},
 {id:'bluegrey',n:'Северный свет',d:'Прохладная дымка — выручает в комнатах с избытком солнца.',
  c:[['лёд','#D8E1E8'],['дымчато-синий','#6E86A0'],['песок','#D5C7AE'],['графит','#3A4147']]},
 {id:'darkwood',n:'Тёплый орех',d:'Тёмное дерево и охра — вечерний, почти клубный характер.',
  c:[['крем','#E8DECB'],['орех','#6B4A32'],['охра','#B5873A'],['графит','#33322F']]},
 {id:'concrete',n:'Бетон и сталь',d:'Честные материалы: бетон, металл и кирпичный акцент.',
  c:[['бетон','#B9B7B0'],['сталь','#6E7378'],['графит','#35393C'],['кирпич','#9E5B4A']]},
 {id:'plaster',n:'Матовая тишина',d:'Средиземноморский покой: матовая штукатурка и фактура.',
  c:[['известь','#EFEBE3'],['беж','#DCD2C2'],['тёплый серый','#A9A296'],['дерево','#C1A47C']]},
 {id:'blackbrass',n:'Чёрный лак',d:'Графика и латунь — камерно и по-вечернему.',
  c:[['крем','#EFE6D4'],['дым','#7C7F84'],['чёрный','#17191B'],['латунь','#C8A253']]},
 {id:'pastel',n:'Пудровый свет',d:'Мягкая пастель: спокойно, но не скучно.',
  c:[['крем','#F2EAE0'],['пудровый','#E6CFC6'],['серо-голубой','#AFC0C6'],['орех','#8A6A52']]},
 {id:'sagecream',n:'Тихий сад',d:'Природная гамма с приглушённой зеленью.',
  c:[['крем','#F0EADD'],['шалфей','#9FAF9B'],['дуб','#C6A97F'],['графит','#3B3E3B']]}
];

var TEMPS=[2700,3000,3500,4000];
var ROOMS=[
 {id:'living',l:'Гостиная',ok:[2700,3000],
  tip:'Главный сценарий здесь вечерний. Общий свет держите тёплым, а вместо одной люстры соберите несколько источников: торшер у дивана, подсветку у ТВ-зоны, бра. Одна яркая точка на потолке делает гостиную похожей на кабинет.'},
 {id:'bed',l:'Спальня',ok:[2700],
  tip:'Только тёплый свет: нейтральный и холодный мешают вечером расслабиться. Обязательно поставьте диммер и отдельные бра у изголовья — верхний свет в спальне включают в основном для уборки.'},
 {id:'kitchen',l:'Кухня',ok:[3000,3500,4000],
  tip:'В кухне два разных сценария. Над рабочей поверхностью нужен нейтральный свет, иначе вы не увидите реальный цвет продуктов, а над обеденным столом — тёплый. Подсветку фартука закладывайте до изготовления гарнитура.'},
 {id:'kids',l:'Детская',ok:[3000,3500,4000],
  tip:'Зона стола и игр — ближе к нейтральному, зона сна — тёплая. Здесь особенно важен индекс цветопередачи Ra 90 и выше: ребёнок должен видеть настоящие цвета красок и книг, а не их искажённую версию.'},
 {id:'bath',l:'Санузел',ok:[3000,3500,4000],
  tip:'У зеркала свет должен падать по бокам, а не сверху: верхний светильник рисует тени под глазами и мешает бриться и краситься. Цветопередача Ra 90+ обязательна, иначе макияж будет выглядеть иначе на улице.'},
 {id:'hall',l:'Прихожая',ok:[3000,3500],
  tip:'Здесь одеваются и в последний раз смотрят в зеркало перед выходом. Слишком тёплый свет врёт по цвету одежды — держитесь ближе к нейтральному, а у зеркала добавьте отдельный источник.'},
 {id:'office',l:'Кабинет',ok:[3500,4000],
  tip:'Нейтральный свет помогает держать концентрацию днём. Но добавьте второй, тёплый сценарий на вечер, иначе комната будет выталкивать вас из себя после заката. Свет на стол ставьте сбоку от рабочей руки.'}
];

var TEMPNOTE={
 2700:'очень тёплый, «домашний» свет ламп накаливания',
 3000:'тёплый свет — универсальный для жилых комнат',
 3500:'нейтрально-тёплый, рабочий и при этом не резкий',
 4000:'нейтральный свет для задач, где важна точность'
};

/* ============ цвет и свет ============ */
function clamp(v){return v<0?0:(v>255?255:v)}
function hex2rgb(h){
  h=h.replace('#','');
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function rgb2hex(c){
  return '#'+c.map(function(v){var s=Math.round(clamp(v)).toString(16);return s.length<2?'0'+s:s}).join('');
}
/* приближение спектра абсолютно чёрного тела: Kelvin -> RGB */
function kelvinRGB(k){
  var t=k/100,r,g,b;
  if(t<=66){r=255;g=99.4708025861*Math.log(t)-161.1195681661}
  else{r=329.698727446*Math.pow(t-60,-0.1332047592);g=288.1221695283*Math.pow(t-60,-0.0755148492)}
  if(t>=66)b=255;else if(t<=19)b=0;else b=138.5177312231*Math.log(t-10)-305.0447927307;
  return [clamp(r),clamp(g),clamp(b)];
}
/* эталон намеренно взят по нейтральной лампе, а не по дневному свету 6500 K:
   в комнате глаз привыкает к тому источнику, который в ней стоит, поэтому
   4000 K воспринимается как белый, а не как тёплый */
var REF=kelvinRGB(4200);
function lum(c){return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]}
/* цвет под лампой: сдвигаем тон, но сохраняем светлоту — так ближе к тому,
   что видит глаз, который частично адаптируется к тёплому свету */
function underLight(hex,k){
  var L=kelvinRGB(k),base=hex2rgb(hex),s=0.55,i,tinted=[];
  for(i=0;i<3;i++){
    var full=base[i]*(L[i]/REF[i]);
    tinted.push(base[i]+(full-base[i])*s);
  }
  var l0=lum(base),l1=lum(tinted);
  if(l1>1){
    var f=l0/l1;
    for(i=0;i<3;i++)tinted[i]=clamp(tinted[i]*f);
  }
  return rgb2hex(tinted);
}

/* ============ состояние ============ */
var st={room:ROOMS[0],pal:PALS[0],temp:3000};
function esc(t){return String(t).replace(/[&<>"']/g,function(m){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function lit(){return st.pal.c.map(function(c){return underLight(c[1],st.temp)})}
/* лампа, выбранная в инструменте, становится светом всего сайта */
function syncLight(){if(window.VT&&VT.light)VT.light.set(st.temp,true)}

/* ============ схема комнаты ============ */
function scene(){
  var c=lit(),L=kelvinRGB(st.temp);
  var glow='rgba('+Math.round(L[0])+','+Math.round(L[1])+','+Math.round(L[2])+',';
  var wall=c[0],floor=c[1],soft=c[2],acc=c[3];
  return '<svg viewBox="0 0 800 420" role="img" aria-label="Схема распределения цветов в комнате">'
    +'<defs><linearGradient id="lamp" x1="0" y1="0" x2="0" y2="1">'
      +'<stop offset="0%" stop-color="'+glow+'.55)"/><stop offset="100%" stop-color="'+glow+'0)"/>'
    +'</linearGradient>'
    +'<linearGradient id="win" x1="0" y1="0" x2="0" y2="1">'
      +'<stop offset="0%" stop-color="#EAF1F6"/><stop offset="100%" stop-color="#C4D3DE"/></linearGradient></defs>'
    /* стены и пол */
    +'<rect x="0" y="0" width="800" height="330" fill="'+wall+'"/>'
    +'<rect x="0" y="330" width="800" height="90" fill="'+floor+'"/>'
    +'<rect x="0" y="322" width="800" height="9" fill="'+acc+'" opacity=".55"/>'
    /* окно */
    +'<rect x="524" y="66" width="196" height="150" fill="url(#win)"/>'
    +'<rect x="524" y="66" width="196" height="150" fill="none" stroke="'+acc+'" stroke-width="5"/>'
    +'<line x1="622" y1="66" x2="622" y2="216" stroke="'+acc+'" stroke-width="4"/>'
    /* подвес и свет */
    +'<line x1="250" y1="0" x2="250" y2="60" stroke="'+acc+'" stroke-width="3"/>'
    +'<path d="M222 60 h56 l12 26 h-80 z" fill="'+acc+'"/>'
    +'<path d="M210 88 L290 88 L354 330 L146 330 Z" fill="url(#lamp)"/>'
    /* картина */
    +'<rect x="92" y="104" width="104" height="82" fill="'+soft+'" stroke="'+acc+'" stroke-width="3"/>'
    /* диван */
    +'<rect x="120" y="236" width="268" height="62" rx="6" fill="'+soft+'"/>'
    +'<rect x="120" y="212" width="268" height="36" rx="8" fill="'+soft+'"/>'
    +'<rect x="140" y="296" width="18" height="34" fill="'+acc+'"/>'
    +'<rect x="350" y="296" width="18" height="34" fill="'+acc+'"/>'
    +'<rect x="168" y="222" width="42" height="32" rx="5" fill="'+acc+'"/>'
    +'<rect x="300" y="222" width="42" height="32" rx="5" fill="'+acc+'"/>'
    /* столик и ковёр */
    +'<ellipse cx="300" cy="352" rx="210" ry="30" fill="'+soft+'" opacity=".45"/>'
    +'<rect x="432" y="268" width="96" height="10" rx="3" fill="'+acc+'"/>'
    +'<rect x="444" y="278" width="8" height="52" fill="'+acc+'"/>'
    +'<rect x="508" y="278" width="8" height="52" fill="'+acc+'"/>'
  +'</svg>'
  +'<div class="scenecap">60% стены · 25% пол · 10% мебель · 5% детали</div>';
}

/* ============ отрисовка ============ */
function paintChips(){
  document.getElementById('rooms').innerHTML=ROOMS.map(function(r){
    return '<button type="button" class="chip" data-room="'+r.id+'" aria-pressed="'+(st.room.id===r.id)+'">'+esc(r.l)+'</button>';
  }).join('');
  document.getElementById('pals').innerHTML=PALS.map(function(p){
    return '<button type="button" class="chip" data-pal="'+p.id+'" aria-pressed="'+(st.pal.id===p.id)+'">'
      +'<span class="sw">'+p.c.map(function(c){return '<i style="background:'+c[1]+'"></i>'}).join('')+'</span>'
      +esc(p.n)+'</button>';
  }).join('');
}
function paintTemps(){
  document.getElementById('temps').innerHTML=TEMPS.map(function(t){
    var ok=st.room.ok.indexOf(t)>=0;
    return '<button type="button" data-temp="'+t+'" aria-pressed="'+(st.temp===t)+'">'+t+' K'
      +(ok?'<span class="ok">подходит</span>':'<span class="ok" style="visibility:hidden">—</span>')+'</button>';
  }).join('');
  var el=document.getElementById('lnote'),ok=st.room.ok.indexOf(st.temp)>=0;
  var hi=Math.max.apply(null,st.room.ok);
  if(ok){
    el.className='lnote';
    el.innerHTML='<b>'+st.temp+' K</b> — '+esc(TEMPNOTE[st.temp])+'. Для этой комнаты подходит.';
  }else{
    el.className='lnote warn';
    el.innerHTML='<b>'+st.temp+' K</b> — '+esc(TEMPNOTE[st.temp])+'. '
      +(st.temp>hi?'Для этой комнаты холодновато: свет будет казаться казённым.'
                  :'Для этой комнаты тепловато: под таким светом сложно работать с деталями.');
  }
}
function paintPal(){
  var c=lit();
  document.getElementById('bar').innerHTML=ROLES.map(function(r,i){
    return '<i style="width:'+r.p+'%;background:'+c[i]+'"></i>';
  }).join('');
  document.getElementById('plist').innerHTML=ROLES.map(function(r,i){
    return '<button type="button" class="prow" data-hex="'+st.pal.c[i][1]+'">'
      +'<span class="pchip" style="background:'+c[i]+'"></span>'
      +'<span class="pname">'+esc(st.pal.c[i][0])
        +'<span class="prole">'+esc(r.r)+' · '+r.p+'% · '+esc(r.w)+'</span></span>'
      +'<span class="phex">'+st.pal.c[i][1].toUpperCase()+'</span>'
    +'</button>';
  }).join('');
  document.getElementById('tip').innerHTML='<b>'+esc(st.pal.n)+' · '+esc(st.room.l)+'</b>'
    +esc(st.pal.d)+' '+esc(st.room.tip);
}
function render(){
  document.getElementById('scene').innerHTML=scene();
  paintTemps();paintPal();
}

/* ============ события ============ */
document.getElementById('rooms').addEventListener('click',function(e){
  var b=e.target.closest('.chip');if(!b)return;
  var id=b.getAttribute('data-room'),i;
  for(i=0;i<ROOMS.length;i++)if(ROOMS[i].id===id)st.room=ROOMS[i];
  if(st.room.ok.indexOf(st.temp)<0){st.temp=st.room.ok[0];syncLight()}
  Array.prototype.forEach.call(this.querySelectorAll('.chip'),function(x){
    x.setAttribute('aria-pressed',String(x===b))});
  goal('palitra_pick');hap('light');render();
});
document.getElementById('pals').addEventListener('click',function(e){
  var b=e.target.closest('.chip');if(!b)return;
  var id=b.getAttribute('data-pal'),i;
  for(i=0;i<PALS.length;i++)if(PALS[i].id===id)st.pal=PALS[i];
  Array.prototype.forEach.call(this.querySelectorAll('.chip'),function(x){
    x.setAttribute('aria-pressed',String(x===b))});
  goal('palitra_pick');hap('light');render();
});
document.getElementById('temps').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  st.temp=parseInt(b.getAttribute('data-temp'),10);syncLight();
  goal('palitra_light');hap('light');render();
});
document.getElementById('roll').addEventListener('click',function(){
  var pool=PALS.filter(function(p){return p.id!==st.pal.id});
  st.pal=pool[Math.floor(Math.random()*pool.length)];
  st.temp=st.room.ok[Math.floor(Math.random()*st.room.ok.length)];syncLight();
  paintChips();goal('palitra_pick');hap('medium');render();
  toast('подобрано: ' + st.pal.n.toLowerCase());
});
document.getElementById('plist').addEventListener('click',function(e){
  var b=e.target.closest('.prow');if(!b)return;
  copyText(b.getAttribute('data-hex').toUpperCase(),'код цвета скопирован');
});

function palText(){
  var out=['Палитра «'+st.pal.n+'» — '+st.room.l.toLowerCase(),st.pal.d,''];
  ROLES.forEach(function(r,i){
    out.push(r.r.charAt(0).toUpperCase()+r.r.slice(1)+' '+r.p+'% — '+st.pal.c[i][0]+' '+st.pal.c[i][1].toUpperCase()+' ('+r.w+')');
  });
  out.push('');
  out.push('Свет: '+st.temp+' K, '+TEMPNOTE[st.temp]+'. Лампы берите с Ra 90 и выше.');
  out.push('');
  out.push('Подобрано в конструкторе палитры · Valentin Testov · t.me/vtestov');
  return out.join('\n');
}
function copyText(t,msg){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(function(){toast(msg)},fb);
  }else fb();
  function fb(){
    var ta=document.createElement('textarea');
    ta.value=t;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');toast(msg)}catch(err){toast('не вышло скопировать')}
    document.body.removeChild(ta);
  }
}
document.getElementById('copy').addEventListener('click',function(){
  goal('palitra_copy');copyText(palText(),'палитра скопирована');
});
Array.prototype.forEach.call(document.querySelectorAll('a[href^="https://t.me/"]'),function(a){
  a.addEventListener('click',function(e){
    goal('palitra_contact');
    if(TG&&TG.openTelegramLink){e.preventDefault();TG.openTelegramLink(a.getAttribute('href'))}
  });
});

/* ============ карточка PNG ============
   Основа карточки (фон, стекло, водяной знак, шапка) — в assets/js/card.js */
function exportPNG(){
  var C=VT.card,b=C.base(st.room.l);
  if(!b){toast('браузер не поддерживает сохранение');return}
  var g=b.g,cv=b.cv,M=C.M,CW=C.CW,H=C.H,LAMP=C.rgba(b.c,1);
  var y=M+92;
  C.mono(g,'палитра и свет',M,y,C.INK3,15);y+=22;
  g.font='300 56px Unbounded, sans-serif';
  var gr=g.createLinearGradient(M,0,M+CW*.8,0);gr.addColorStop(0,'#fff');gr.addColorStop(1,LAMP);g.fillStyle=gr;
  C.wrap(g,st.pal.n,CW).forEach(function(l){y+=58;g.fillText(l,M,y)});
  y+=14;
  g.font='400 22px Onest, sans-serif';g.fillStyle=C.INK2;
  C.wrap(g,st.pal.d,CW).forEach(function(l){y+=30;g.fillText(l,M,y)});

  /* пропорциональная полоса */
  y+=30;
  g.save();C.rr(g,M,y,CW,96,22);g.clip();
  var x=M;
  ROLES.forEach(function(r,i){
    var w=CW*r.p/100;
    g.fillStyle=st.pal.c[i][1];
    g.fillRect(x,y,i===ROLES.length-1?(M+CW-x):w+1,96);
    x+=w;
  });
  g.restore();
  C.rr(g,M,y,CW,96,22);g.strokeStyle='rgba(255,255,255,.2)';g.lineWidth=1;g.stroke();
  y+=96;

  /* строки палитры */
  ROLES.forEach(function(r,i){
    y+=24;
    g.fillStyle='rgba(255,255,255,.10)';g.fillRect(M,y,CW,1);
    y+=42;
    g.fillStyle=st.pal.c[i][1];C.rr(g,M,y-31,56,42,12);g.fill();
    g.strokeStyle='rgba(255,255,255,.2)';g.lineWidth=1;g.stroke();
    g.font='500 26px Onest, sans-serif';g.fillStyle=C.INK;
    g.fillText(st.pal.c[i][0].charAt(0).toUpperCase()+st.pal.c[i][0].slice(1),M+76,y-5);
    C.mono(g,st.pal.c[i][1],M+CW,y-5,LAMP,19,true);
    y+=18;
    C.mono(g,r.r+' · '+r.p+'% · '+r.w,M+76,y,C.INK3,14);
  });

  /* свет */
  y+=40;
  g.fillStyle=LAMP;g.fillRect(M,y,CW,2);
  y+=42;
  C.mono(g,'свет',M,y,C.INK3,15);
  y+=52;
  g.font='300 46px Unbounded, sans-serif';g.fillStyle=C.INK;
  g.fillText(st.temp+' K',M,y);
  y+=12;
  g.font='400 22px Onest, sans-serif';g.fillStyle=C.INK2;
  C.wrap(g,TEMPNOTE[st.temp]+'. Лампы с индексом цветопередачи Ra 90 и выше.',CW).forEach(function(l){
    y+=29;g.fillText(l,M,y);
  });

  y+=30;
  g.fillStyle='rgba(255,255,255,.10)';g.fillRect(M,y,CW,1);
  y+=40;
  C.mono(g,'что учесть · '+st.room.l,M,y,LAMP,15);
  y+=12;
  g.font='400 21px Onest, sans-serif';g.fillStyle=C.INK2;
  C.wrap(g,st.room.tip,CW).forEach(function(l){
    if(y+29>H-M-52)return; /* не наезжаем на подпись внизу карточки */
    y+=29;g.fillText(l,M,y);
  });

  C.foot(g,'палитра и свет · t.me/vtestov');
  if(window.VT&&VT.sound)VT.sound.play('save');
  C.save(cv,'palitra-'+st.pal.id+'-'+st.temp+'k.png',function(ok){toast(ok?'карточка сохранена':'не вышло сохранить')});
}
document.getElementById('png').addEventListener('click',function(){
  goal('palitra_png');
  VT.card.fonts(exportPNG);
});

/* ============ прочее ============ */
var toastEl=document.getElementById('toast');
function toast(msg){
  toastEl.textContent=msg;toastEl.classList.add('on');
  clearTimeout(toast._t);
  toast._t=setTimeout(function(){toastEl.classList.remove('on')},2200);
}

paintChips();render();
})();
