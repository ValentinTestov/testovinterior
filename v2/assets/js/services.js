/* ============================================================
   Услуги и цены: калькулятор чертежей по отдельности
   и живой план — у каждого отмеченного чертежа свой слой на схеме квартиры.
   ============================================================ */
(function(){
"use strict";

var METRIKA_ID=112145522;
/* цели Метрики: services_calc, services_copy, services_tg */
var sent={};
function goal(n){if(sent[n])return;sent[n]=true;if(window.ym){try{ym(METRIKA_ID,'reachGoal',n)}catch(e){}}}

var root=document.getElementById('otdelno');
if(!root)return;
function each(list,fn){Array.prototype.forEach.call(list,fn)}

/* ============ данные из разметки ============
   Цены не дублируются в коде: калькулятор читает их из текста строк и тарифов,
   поэтому достаточно поправить цифру на странице. */
function num(t){var d=String(t).split('₽')[0].replace(/\D/g,'');return d?parseInt(d,10):NaN}

var GROUPS=[],ITEMS=[],BYID={};
each(root.querySelectorAll('.agroup'),function(g,gi){
  var tar=document.querySelector('.tar[data-pkg="'+g.getAttribute('data-pkg')+'"]');
  GROUPS.push({
    name:tar?tar.querySelector('.tarhead b').textContent.trim():'',
    price:tar?num(tar.querySelector('.tprice').textContent):NaN
  });
  each(g.querySelectorAll('.arow'),function(r){
    var it={
      id:r.querySelector('input').value,
      name:r.querySelector('.atxt b').textContent.trim(),
      price:num(r.querySelector('.ap b').textContent),
      rank:gi,
      needs:(r.getAttribute('data-needs')||'').split(/\s+/).filter(Boolean),
      row:r,inp:r.querySelector('input'),amt:r.querySelector('.ap i')
    };
    if(!isFinite(it.price))it.price=0;
    ITEMS.push(it);BYID[it.id]=it;
  });
});

/* ============ формат ============ */
var NB=' ';
/* как в тарифах: 1500, но 10 000 */
function fmt(n){var s=String(Math.round(n));return s.length>4?s.replace(/\B(?=(\d{3})+(?!\d))/g,NB):s}
function plural(n,one,few,many){
  var a=n%10,b=n%100;
  if(a===1&&b!==11)return one;
  if(a>=2&&a<=4&&(b<12||b>14))return few;
  return many;
}
function poz(n){return n+NB+plural(n,'позиция','позиции','позиций')}
function low(s){return s.charAt(0).toLowerCase()+s.slice(1)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

var areaEl=document.getElementById('area');
function area(){
  var v=parseFloat(String(areaEl.value).replace(/\s/g,'').replace(',','.'));
  return isFinite(v)&&v>0&&v<=100000?Math.round(v*10)/10:0;
}
function fmtArea(a){return String(a).replace('.',',')}

/* ============ расчёт ============ */
function calc(){
  var c={a:area(),sel:[],m2:0,rank:-1,pkg:null,extra:[],miss:[]},need={};
  ITEMS.forEach(function(i){
    if(!i.inp.checked)return;
    c.sel.push(i);c.m2+=i.price;
    if(i.rank>c.rank)c.rank=i.rank;
    i.needs.forEach(function(n){need[n]=1});
  });
  c.unit=c.a?'₽':'₽/м²';
  c.sep=c.a?Math.round(c.m2*c.a):c.m2;
  /* пакеты накопительные: подходит пакет самой «старшей» из отмеченных групп,
     и в нём есть всё из младших групп */
  if(c.sel.length&&isFinite(GROUPS[c.rank].price)){
    c.pkg=GROUPS[c.rank];
    c.pk=c.a?Math.round(c.pkg.price*c.a):c.pkg.price;
    c.extra=ITEMS.filter(function(i){return i.rank<=c.rank&&!i.inp.checked});
  }
  c.miss=ITEMS.filter(function(i){return need[i.id]&&!i.inp.checked});
  return c;
}

function cmpHTML(){
  var rows='',acc=0;
  GROUPS.forEach(function(g,gi){
    ITEMS.forEach(function(i){if(i.rank===gi)acc+=i.price});
    if(!isFinite(g.price))return;
    rows+='<div><span class="n">«'+esc(g.name)+'»</span><span class="v"><s><span class="sr">отдельно </span>'+fmt(acc)+'</s> '
      +'<b><span class="sr">пакетом </span>'+fmt(g.price)+NB+'₽/м²</b></span></div>';
  });
  return rows?'<div class="acmp"><p class="asub">Пакетом выгоднее, чем все его позиции по одной:</p>'+rows+'</div>':'';
}

function verdict(c){
  var diff=c.pk-c.sep,n=c.extra.length,u=NB+c.unit,
      more=n===1?'ещё '+esc(low(c.extra[0].name)):'ещё '+poz(n);
  if(diff<0)return 'Пакетом выгоднее на <b>'+fmt(-diff)+u+'</b>'+(n?', и в нём '+more:'')+'.';
  if(diff===0)return 'Пакетом — столько же'+(n?', но в нём '+more:'')+'.';
  if(n&&diff<=c.pk*0.15)return 'Пакет дороже всего на <b>'+fmt(diff)+u+'</b>, зато в нём '+more+'.';
  return 'Отдельно дешевле пакета на <b>'+fmt(diff)+u+'</b>.';
}

function hintHTML(c){
  var ids=c.miss.map(function(i){return i.id}).join(' '),t;
  if(ids==='obmer plan')t='Эти чертежи строятся по обмерам и расстановке мебели. Если своих нет — добавьте:';
  else if(ids==='obmer')t='Чертежи строятся по обмерам. Если своих нет — добавьте:';
  else if(ids==='plan')t='Эти чертежи привязываются к расстановке мебели. Если своей планировки нет — добавьте:';
  else t='Для этих чертежей нужна основа. Если своей нет — добавьте:';
  return '<div class="ahint">'+t+'<span class="aadd">'+c.miss.map(function(i){
    return '<button type="button" data-add="'+esc(i.id)+'">+ '+esc(low(i.name))+'</button>';
  }).join('')+'</span></div>';
}

function text(c){
  var a=c.a,out=['Чертежи по отдельности'+(a?' — площадь '+fmtArea(a)+' м²':''),''];
  c.sel.forEach(function(i,k){
    out.push((k+1)+'. '+i.name+' — '+(a?fmt(i.price*a)+' ₽ ('+i.price+' ₽/м²)':i.price+' ₽/м²'));
  });
  out.push('');
  out.push('Итого отдельно: '+fmt(c.sep)+' '+c.unit+(a?' ('+fmt(c.m2)+' ₽/м²)':''));
  if(c.pkg)out.push('Для сравнения, пакет «'+c.pkg.name+'»: '+fmt(c.pk)+' '+c.unit+(a?' ('+fmt(c.pkg.price)+' ₽/м²)':''));
  out.push('');
  out.push('Расчёт со страницы «Услуги и цены» · Valentin Testov');
  return out.join('\n').replace(/ /g,' ');
}

/* ============ движение (GSAP) ============
   Есть VT.motion.ok — суммы перекатываются, слои плана прорисовываются линиями.
   Нет — всё то же самое появляется сразу. */
var G=window.gsap,MO=!!(window.VT&&VT.motion&&VT.motion.ok&&G),DRAW=MO&&!!window.DrawSVGPlugin;

/* сумма не прыгает, а перекатывается от прежнего значения к новому.
   key — что это за число; els — все места, где оно показано. */
var disp={},rolls={};
function roll(key,els,to,suffix,unit){
  els=els.filter(Boolean);
  var d=disp[key],from=d&&d.unit===unit?d.v:0;
  if(rolls[key]){rolls[key].kill();rolls[key]=null}
  disp[key]=d={v:from,unit:unit};
  function paint(){els.forEach(function(e){e.textContent=fmt(d.v)+suffix})}
  if(!MO||from===to||!els.length){d.v=to;return}
  paint();
  rolls[key]=G.to(d,{v:to,duration:.65,ease:'power2.out',onUpdate:paint,onComplete:function(){d.v=to;paint();rolls[key]=null}});
}

/* ============ живой план ============ */
var planBox=document.getElementById('aplan'),planN=document.getElementById('apN'),planNow=document.getElementById('apNow'),
    LAYERS={},planOn={},planDirty={},nowT=0,NOW0=planNow?planNow.textContent:'';
if(planBox)each(planBox.querySelectorAll('.pl[data-l]'),function(g){LAYERS[g.getAttribute('data-l')]=g});
function planSeen(){
  var r=planBox.getBoundingClientRect();
  return r.bottom>60&&r.top<(window.innerHeight||0)-60;
}
function drawLayer(g,delay){
  if(!DRAW)return;
  var lines=g.querySelectorAll('path:not(.nf),rect:not(.nf),circle:not(.nf),ellipse:not(.nf),line:not(.nf)'),fills=g.querySelectorAll('.nf');
  if(lines.length)G.killTweensOf(lines);
  if(fills.length)G.killTweensOf(fills);
  g.classList.add('fresh');
  clearTimeout(g._fresh);g._fresh=setTimeout(function(){g.classList.remove('fresh')},(delay||0)*1000+1500);
  /* пунктир на время прорисовки становится сплошной линией; в конце возвращаем как было */
  if(lines.length)G.fromTo(lines,{drawSVG:'0%'},{drawSVG:'100%',duration:.9,delay:delay||0,ease:'power2.out',stagger:{amount:Math.min(.7,lines.length*.05)},
    clearProps:'strokeDasharray,strokeDashoffset'});
  if(fills.length)G.fromTo(fills,{opacity:0},{opacity:1,duration:.5,delay:(delay||0)+.25,stagger:.04,clearProps:'opacity'});
}
function planSay(t,hot){
  if(!planNow)return;
  planNow.textContent=t;planNow.classList.toggle('hot',!!hot);
  clearTimeout(nowT);
  if(hot)nowT=setTimeout(function(){planNow.classList.remove('hot')},1600);
}
function planSync(quiet){
  if(!planBox)return;
  var n=0,seen=planSeen(),last=null;
  ITEMS.forEach(function(i){
    var g=LAYERS[i.id],on=i.inp.checked;
    if(on)n++;
    if(!g||!!planOn[i.id]===on)return;
    planOn[i.id]=on;g.classList.toggle('on',on);
    if(on){
      last=i;
      if(quiet)return;
      if(seen)drawLayer(g,0);else planDirty[i.id]=1;     /* план не на экране — дорисуем, когда до него долистают */
    }else{
      delete planDirty[i.id];
      if(!last)last={off:i};
    }
  });
  planBox.classList.toggle('walls',!!planOn.obmer);
  if(planN)planN.textContent=n;
  if(quiet)return;
  if(last&&last.off)planSay(n?'убрано: '+low(last.off.name):NOW0,false);
  else if(last)planSay('+ '+low(last.name),true);
  else if(!n)planSay(NOW0,false);
}
/* телефон: план стоит под списком. Долистали — отмеченные слои прорисовываются по очереди. */
if(planBox&&MO&&window.ScrollTrigger){
  ScrollTrigger.create({trigger:planBox,start:'top 78%',end:'bottom 12%',onToggle:function(self){
    if(!self.isActive)return;
    var k=0;
    ITEMS.forEach(function(i){if(planDirty[i.id]&&planOn[i.id]){drawLayer(LAYERS[i.id],k*.3);k++}});
    planDirty={};
  }});
}

/* ============ отрисовка ============ */
var body=document.getElementById('asBody'),acts=document.getElementById('aActs'),
    bar=document.getElementById('abar'),live=document.getElementById('aLive'),
    tg=document.getElementById('aTg'),TG_URL=tg.getAttribute('href'),first=true;

function render(){
  var c=calc(),a=c.a,h;
  ITEMS.forEach(function(i){
    i.row.classList.toggle('on',i.inp.checked);
    var to=a?i.price*a:0,from=i.shown||0;
    i.shown=to;
    if(!to){if(i.amt._vtNum)i.amt._vtNum.kill();i.amt.textContent='';i.now=0}
    else if(MO&&!first&&from&&from!==to){
      /* площадь изменилась — суммы в строках перекатываются */
      VT.motion.num(i.amt,i.now||from,to,{dur:.5,fmt:function(v){i.now=v;return fmt(v)+NB+'₽'}});
    }else{if(i.amt._vtNum)i.amt._vtNum.kill();i.amt.textContent=fmt(to)+NB+'₽';i.now=to}
  });
  planSync(first);first=false;
  if(!c.sel.length){
    body.innerHTML='<p class="aempty">Отметьте нужные чертежи — посчитаю сумму для вашей площади и сравню с пакетом.</p>'+cmpHTML();
    acts.hidden=true;bar.hidden=true;live.textContent='';
    tg.setAttribute('href',TG_URL);
    roll('sep',[],0,'','');roll('pk',[],0,'','');disp={};
    return;
  }
  var u=NB+c.unit;
  h='<div class="atot"><span class="alab">отдельно · '+poz(c.sel.length)+'</span>'
    +'<b class="abig">'+fmt(c.sep)+u+'</b>'
    +'<span class="asub">'+(a?fmt(c.m2)+NB+'₽/м² × '+fmtArea(a)+NB+'м²':'укажите площадь — посчитаю в рублях')+'</span></div>';
  if(c.pkg){
    h+='<div class="apk"><div class="apkh"><span class="alab">пакет «'+esc(c.pkg.name)+'»</span><b>'+fmt(c.pk)+u+'</b></div>'
      +'<span class="asub">'+(a?fmt(c.pkg.price)+NB+'₽/м² · ':'')
      +(c.extra.length?'всё отмеченное и ещё '+poz(c.extra.length):'ровно то, что отмечено')+'</span></div>'
      +'<p class="averd'+(c.pk<=c.sep?' pk':'')+'">'+verdict(c)+'</p>';
  }
  if(c.miss.length)h+=hintHTML(c);
  body.innerHTML=h;
  acts.hidden=false;bar.hidden=false;
  bar.innerHTML='<span><b>'+fmt(c.sep)+u+'</b><small>'+poz(c.sel.length)
    +(c.pkg?' · пакет «'+esc(c.pkg.name)+'» — '+fmt(c.pk)+u:'')+'</small></span><span class="go">расчёт ↓</span>';
  live.textContent='Отдельно '+fmt(c.sep)+' '+c.unit+(c.pkg?', пакет «'+c.pkg.name+'» — '+fmt(c.pk)+' '+c.unit:'');
  roll('sep',[body.querySelector('.abig'),bar.querySelector('b')],c.sep,u,c.unit);
  if(c.pkg)roll('pk',[body.querySelector('.apkh b')],c.pk,u,c.unit);else{roll('pk',[],0,'','');delete disp.pk}
  tg.setAttribute('href',TG_URL+'?text='+encodeURIComponent(text(c)));
}

/* ============ события ============ */
root.addEventListener('change',function(e){
  if(e.target.type!=='checkbox')return;
  goal('services_calc');render();
});
areaEl.addEventListener('input',render);
body.addEventListener('click',function(e){
  var b=e.target.closest('[data-add]'),it=b&&BYID[b.getAttribute('data-add')];
  if(!it)return;
  it.inp.checked=true;render();
  toast('добавлено: '+low(it.name));
});
document.getElementById('aCopy').addEventListener('click',function(){
  goal('services_copy');copyText(text(calc()),'расчёт скопирован');
});
/* ссылка сама подставляет расчёт в чат; копия в буфере — на случай старого Telegram */
tg.addEventListener('click',function(){
  goal('services_tg');copyText(text(calc()),'расчёт скопирован — отправьте его в чате');
});
document.getElementById('aReset').addEventListener('click',function(){
  ITEMS.forEach(function(i){i.inp.checked=false});
  render();
});

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
var toastEl=document.getElementById('toast');
function toast(msg){
  toastEl.textContent=msg;toastEl.classList.add('on');
  clearTimeout(toast._t);
  toast._t=setTimeout(function(){toastEl.classList.remove('on')},2200);
}

render();
})();
