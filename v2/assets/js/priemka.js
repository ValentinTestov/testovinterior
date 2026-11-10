/* ============================================================
   Чек-лист приёмки квартиры
   ============================================================ */
(function(){
"use strict";

var METRIKA_ID=112145522;

/* ============ Telegram Mini App ============
   Вне Telegram блок молчит и страница работает как обычная веб-страница. */
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

/* цели Метрики: priemka_start, priemka_copy, priemka_print, priemka_contact */
var goalsSent={};
function goal(name){
  if(goalsSent[name])return;
  goalsSent[name]=true;
  if(window.ym){try{ym(METRIKA_ID,'reachGoal',name)}catch(e){}}
}

/* ============ данные ============
   f — для какой отделки пункт актуален: bez — без отделки, pred — предчистовая, chist — с отделкой.
   Без f пункт показывается всегда. */
var SECTIONS=[
{id:'doc',ix:'I',t:'Документы и подготовка',items:[
 {id:'doc1',t:'Паспорт, договор и доверенность на руках',h:'Если на приёмку едет представитель, доверенность обязательна — без неё осмотр не состоится.'},
 {id:'doc2',t:'Смотровой лист получен в двух экземплярах',h:'Один экземпляр с подписью представителя застройщика и датой остаётся у вас.'},
 {id:'doc3',t:'Номер квартиры, этаж и подъезд совпадают с договором'},
 {id:'doc4',t:'Фактическая площадь сверена с договором',h:'Промерьте все помещения. Расхождение с проектной площадью — основание для перерасчёта.'},
 {id:'doc5',t:'Осмотр идёт при дневном свете',h:'От дизайнера: при искусственном свете не видно ни разнотона покраски, ни волн на стенах. Назначайте приёмку на день.'},
 {id:'doc6',t:'Паспорта и гарантии на окна, дверь, счётчики и оборудование переданы'}
]},
{id:'door',ix:'II',t:'Входная дверь',items:[
 {id:'dr1',t:'Дверь открывается и закрывается без усилия, не задевает пол и коробку'},
 {id:'dr2',t:'Замки работают всеми ключами, ручка не люфтит'},
 {id:'dr3',t:'Полотно и коробка без вмятин, царапин и сколов покрытия'},
 {id:'dr4',t:'Притвор плотный по всему периметру',h:'Зажмите дверью лист бумаги: он должен вытаскиваться с заметным усилием в любой точке периметра.'},
 {id:'dr5',t:'Зазоры между полотном и коробкой одинаковые'},
 {id:'dr6',t:'Дверь стоит вертикально и не открывается сама',h:'Приоткрытая створка, которая уезжает сама, — признак перекоса коробки.'},
 {id:'dr7',t:'Монтажный шов запенен и закрыт, наличники установлены'},
 {id:'dr8',t:'Глазок, петли и фурнитура на месте, петли не скрипят'}
]},
{id:'win',ix:'III',t:'Окна и остекление',items:[
 {id:'w1',t:'Створки открываются во всех режимах, фурнитура работает без заеданий'},
 {id:'w2',t:'Стеклопакеты без царапин, сколов и трещин',h:'Дефекты стекла оценивают при рассеянном дневном свете примерно с 2 метров: то, что видно с этой дистанции, — брак.'},
 {id:'w3',t:'Внутри стеклопакета нет запотевания и пыли',h:'Конденсат между стёклами означает разгерметизацию — меняют за счёт застройщика.'},
 {id:'w4',t:'Створки прижимаются плотно, уплотнители целые',h:'Тот же тест листом бумаги по периметру каждой створки.'},
 {id:'w5',t:'Нет продувания по раме и примыканиям',h:'Проведите вдоль стыков ладонью или пламенем зажигалки — в холодную погоду сквозняк заметен сразу.'},
 {id:'w6',t:'Рама установлена вертикально',h:'Ориентир по ГОСТ — отклонение не более 1,5 мм на 1 метр высоты. Проверяется уровнем.'},
 {id:'w7',t:'Монтажные швы запенены, откосы без трещин'},
 {id:'w8',t:'Отлив закреплён, с уклоном наружу, без вмятин'},
 {id:'w9',t:'Подоконник закреплён, не прогибается, без царапин'},
 {id:'w10',t:'Ручки, заглушки и дренажные отверстия на месте',h:'Дренаж в нижней части рамы должен быть открыт, иначе вода пойдёт внутрь.'}
]},
{id:'balc',ix:'IV',t:'Балкон и лоджия',opt:'balc',items:[
 {id:'b1',t:'Остекление открывается и закрывается без перекосов'},
 {id:'b2',t:'Нет трещин в стёклах и щелей в примыканиях к стенам'},
 {id:'b3',t:'Пол без трещин и провалов'},
 {id:'b4',t:'Козырёк и отливы без вмятин, следов протечек нет'},
 {id:'b5',t:'Ограждение закреплено жёстко, не шатается'},
 {id:'b6',t:'На стенах и потолке нет следов влаги и промерзания'}
]},
{id:'wall',ix:'V',t:'Стены и перегородки',items:[
 {id:'s1',t:'Стены без трещин, отслоений и следов протечек'},
 {id:'s2',t:'Перегородки и проёмы на местах по плану',h:'От дизайнера: сверьте ширину проёмов с планировкой — от этого зависит, какая мебель вообще пройдёт в комнату.'},
 {id:'s3',t:'Стены вертикальны',h:'Правило 2 м с уровнем. Для улучшенной штукатурки ориентир — не более 2 мм на 1 метр и не более 10 мм на всю высоту.',f:['pred','chist']},
 {id:'s4',t:'Углы прямые там, где предусмотрено проектом',h:'Косой угол потом упрётся в кухонный гарнитур или шкаф — переделывать придётся за свой счёт.'},
 {id:'s5',t:'Штукатурка без пустот и бухтения',h:'Простучите стены костяшками: глухой гулкий звук — отслоение.',f:['pred','chist']},
 {id:'s6',t:'Нет плесени, сырости и высолов'},
 {id:'s7',t:'Покраска или обои без пузырей, пятен, разнотона и расхождений на стыках',f:['chist']},
 {id:'s8',t:'Плитка не бухтит, швы ровные, затирка без пропусков',f:['chist']}
]},
{id:'floor',ix:'VI',t:'Полы',items:[
 {id:'f1',t:'Плита перекрытия без трещин, сколов и провалов',f:['bez']},
 {id:'f2',t:'Стяжка без трещин и бухтения',h:'Простучите всю площадь, особенно у стен и в дверных проёмах.',f:['pred','chist']},
 {id:'f3',t:'Пол горизонтален',h:'Ориентир: перепад не более 0,2% от размера помещения и не более 50 мм.'},
 {id:'f4',t:'Просветы под двухметровым правилом в норме',h:'Ориентир: под стяжкой — не более 4 мм, под ламинат и линолеум — не более 2 мм.',f:['pred','chist']},
 {id:'f5',t:'Стяжка доходит до стен, у примыканий нет пустот',f:['pred','chist']},
 {id:'f6',t:'Покрытие без вздутий, царапин и щелей, плинтус прилегает',f:['chist']},
 {id:'f7',t:'Стыки покрытий и пороги выполнены аккуратно',f:['chist']},
 {id:'f8',t:'В санузле выполнена гидроизоляция с заходом на стены'}
]},
{id:'ceil',ix:'VII',t:'Потолки',items:[
 {id:'c1',t:'Нет трещин, перепадов между плитами и следов протечек'},
 {id:'c2',t:'Стыки плит перекрытия заделаны'},
 {id:'c3',t:'Высота потолка соответствует договору',h:'От дизайнера: замерьте в нескольких точках. Именно высота решает, влезут ли шкафы до потолка и останется ли место на подсветку.'},
 {id:'c4',t:'Потолок ровный по горизонту',f:['pred','chist']},
 {id:'c5',t:'Покраска без пятен и разнотона, натяжной без провисаний и зазоров',f:['chist']}
]},
{id:'el',ix:'VIII',t:'Электрика',items:[
 {id:'e1',t:'Щиток установлен, автоматы подписаны, УЗО или дифавтомат есть'},
 {id:'e2',t:'Все автоматы включаются и держат нагрузку'},
 {id:'e3',t:'Каждая розетка под напряжением',h:'Проверяйте тестером или зарядкой с индикатором — на глаз это не определить.'},
 {id:'e4',t:'Выключатели работают, свет включается',h:'Возьмите свою лампочку: патроны часто оставляют пустыми.'},
 {id:'e5',t:'Количество и расположение точек совпадает с проектом',h:'От дизайнера: сфотографируйте все выводы с рулеткой до отделки — сэкономите день на разметке и не попадёте сверлом в кабель.'},
 {id:'e6',t:'Заземление подключено',h:'Проверяется индикаторной отвёрткой или тестером по третьему контакту розетки.'},
 {id:'e7',t:'Оголённых проводов нет, распаячные коробки закрыты'},
 {id:'e8',t:'Счётчик электроэнергии: номер, показания и пломба зафиксированы'},
 {id:'e9',t:'Звонок, домофон и слаботочные выводы работают'}
]},
{id:'heat',ix:'IX',t:'Отопление',items:[
 {id:'h1',t:'Радиаторы закреплены жёстко, без вмятин и сколов краски'},
 {id:'h2',t:'Количество секций соответствует проекту'},
 {id:'h3',t:'Краны Маевского на месте и работают'},
 {id:'h4',t:'Терморегуляторы установлены и вращаются'},
 {id:'h5',t:'На соединениях нет подтёков и следов ржавчины'},
 {id:'h6',t:'Радиатор установлен с нормальными зазорами',h:'Ориентир: около 60 мм от пола, 50 мм до подоконника, 25 мм до стены — иначе он греет подоконник, а не комнату.'},
 {id:'h7',t:'Тёплый пол работает, коллектор и терморегулятор доступны'}
]},
{id:'water',ix:'X',t:'Вода и канализация',items:[
 {id:'v1',t:'Счётчики ХВС и ГВС: номера, показания и пломбы записаны',h:'Сфотографируйте табло и пломбы — это ваш аргумент при первом же споре по начислениям.'},
 {id:'v2',t:'Запорные краны на стояках работают и не текут'},
 {id:'v3',t:'Фильтры грубой очистки установлены'},
 {id:'v4',t:'В сантехшкафу и на стояках нет протечек и следов влаги'},
 {id:'v5',t:'Канализационные выпуски заглушены, ревизия доступна'},
 {id:'v6',t:'Сантехника установлена и подключена без протечек',f:['chist']},
 {id:'v7',t:'Полотенцесушитель закреплён, без подтёков'}
]},
{id:'vent',ix:'XI',t:'Вентиляция',items:[
 {id:'n1',t:'Есть тяга в кухне и санузлах',h:'Приложите лист А4 к решётке при приоткрытом окне: он должен прилипнуть. Без притока воздуха тест ничего не покажет.'},
 {id:'n2',t:'Вентканалы не забиты строительным мусором',h:'Посветите фонариком в канал — мешки и обрезки внутри встречаются чаще, чем кажется.'},
 {id:'n3',t:'Вентиляционные решётки установлены'},
 {id:'n4',t:'Нет обратной тяги и запахов от соседей'}
]},
{id:'fin',ix:'XII',t:'Финал осмотра',items:[
 {id:'z1',t:'Все дефекты сфотографированы с привязкой к месту',h:'Снимайте сначала общий план комнаты, потом дефект крупно: иначе через месяц не докажете, где именно это было.'},
 {id:'z2',t:'Каждое замечание внесено в акт конкретно: что и где'},
 {id:'z3',t:'Второй экземпляр акта с подписью и датой у вас на руках'},
 {id:'z4',t:'Показания всех счётчиков зафиксированы'},
 {id:'z5',t:'Срок устранения замечаний согласован письменно'},
 {id:'z6',t:'Акт приёма-передачи не подписан, пока замечания не урегулированы',h:'Подпись без оговорок означает, что квартиру вы приняли в текущем состоянии.'}
]}
];

/* ============ состояние ============ */
var KEY='pk_store_v1';
var st={fin:'pred',balc:true,marks:{},notes:{},meta:{obj:'',flat:'',date:''},filter:'all'};
var canStore=true;

function storageOK(){try{localStorage.setItem('__pk','1');localStorage.removeItem('__pk');return true}catch(e){return false}}
function load(){
  canStore=storageOK();
  if(!canStore)return;
  try{
    var raw=localStorage.getItem(KEY);
    if(!raw)return;
    var d=JSON.parse(raw);
    if(!d)return;
    if(d.fin)st.fin=d.fin;
    if(typeof d.balc==='boolean')st.balc=d.balc;
    if(d.marks)st.marks=d.marks;
    if(d.notes)st.notes=d.notes;
    if(d.meta)st.meta=d.meta;
  }catch(e){}
}
var saveTimer=null;
function save(){
  if(!canStore)return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(function(){
    try{localStorage.setItem(KEY,JSON.stringify({v:1,fin:st.fin,balc:st.balc,marks:st.marks,notes:st.notes,meta:st.meta}))}
    catch(e){canStore=false;paintSaveMode();toast('браузер не даёт сохранять — скопируйте список, чтобы не потерять')}
  },350);
}

/* ============ вспомогательное ============ */
function esc(t){return String(t).replace(/[&<>"']/g,function(m){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function applies(it){return !it.f||it.f.indexOf(st.fin)>=0}
function sectionOn(s){return !s.opt||(s.opt==='balc'&&st.balc)}
function eachItem(fn){
  SECTIONS.forEach(function(s){
    if(!sectionOn(s))return;
    s.items.forEach(function(it){if(applies(it))fn(it,s)});
  });
}

/* ============ отрисовка ============ */
var listEl=document.getElementById('list');

function itemHTML(it){
  var v=st.marks[it.id]||'';
  var note=st.notes[it.id]||'';
  return '<div class="it" data-id="'+esc(it.id)+'"'+(v?' data-v="'+esc(v)+'"':'')+'>'
    +'<span class="pbox" aria-hidden="true"></span>'
    +'<div class="itxt"><b>'+esc(it.t)+'</b>'+(it.h?'<span class="ih">'+esc(it.h)+'</span>':'')+'</div>'
    +'<div class="ist">'
      +'<button type="button" class="sb" data-v="ok" data-snd="pop" aria-pressed="'+(v==='ok')+'" aria-label="Норма: '+esc(it.t)+'">ок</button>'
      +'<button type="button" class="sb" data-v="bad" data-snd="lock" aria-pressed="'+(v==='bad')+'" aria-label="Дефект: '+esc(it.t)+'">дефект</button>'
    +'</div>'
    +'<div class="inote"'+(v==='bad'?'':' hidden')+'>'
      +'<textarea placeholder="Что именно не так и где — комната, стена, окно">'+esc(note)+'</textarea>'
      +'<span class="pnote">'+(note?esc(note):'&nbsp;')+'</span>'
    +'</div>'
  +'</div>';
}
function render(){
  listEl.innerHTML=SECTIONS.map(function(s){
    if(!sectionOn(s))return '';
    var items=s.items.filter(applies);
    if(!items.length)return '';
    return '<section class="sect" data-s="'+esc(s.id)+'">'
      +'<div class="shead"><span class="six">'+esc(s.ix)+'</span><span class="stitle">'+esc(s.t)+'</span>'
      +'<span class="scount"></span></div>'
      +items.map(itemHTML).join('')
    +'</section>';
  }).join('');
  paintCounts();
  applyFilter();
  renderSum();
}
function paintCounts(){
  var all=0,done=0,bad=0;
  SECTIONS.forEach(function(s){
    if(!sectionOn(s))return;
    var sec=listEl.querySelector('.sect[data-s="'+s.id+'"]');
    var sa=0,sd=0,sb=0;
    s.items.forEach(function(it){
      if(!applies(it))return;
      var v=st.marks[it.id];
      sa++;if(v)sd++;if(v==='bad')sb++;
    });
    all+=sa;done+=sd;bad+=sb;
    if(sec){
      var c=sec.querySelector('.scount');
      c.textContent=sd+' из '+sa+(sb?' · замечаний '+sb:'');
      c.className='scount'+(sb?' has':'');
    }
  });
  document.getElementById('pAll').textContent=all;
  document.getElementById('pDone').textContent=done;
  document.getElementById('pBad').textContent=bad;
  document.getElementById('pFill').style.width=(all?Math.round(done/all*100):0)+'%';
}
function applyFilter(){
  listEl.className='list'+(st.filter==='all'?'':' f-'+st.filter);
  Array.prototype.forEach.call(listEl.querySelectorAll('.sect'),function(sec){
    var vis=0;
    Array.prototype.forEach.call(sec.querySelectorAll('.it'),function(it){
      var v=it.getAttribute('data-v');
      if(st.filter==='todo'&&v)return;
      if(st.filter==='bad'&&v!=='bad')return;
      vis++;
    });
    sec.classList.toggle('empty',vis===0);
  });
}

/* ============ итоговый список ============ */
var sumListEl=document.getElementById('sumList');
function badGroups(){
  var out=[];
  SECTIONS.forEach(function(s){
    if(!sectionOn(s))return;
    var items=s.items.filter(function(it){return applies(it)&&st.marks[it.id]==='bad'});
    if(items.length)out.push({s:s,items:items});
  });
  return out;
}
function renderSum(){
  var groups=badGroups();
  if(!groups.length){
    sumListEl.innerHTML='<p class="sempty">Пока ничего не отмечено как дефект. Отмечайте пункты кнопкой «дефект» — они соберутся сюда списком, готовым к переносу в акт осмотра.</p>';
    return;
  }
  var n=0;
  sumListEl.innerHTML=groups.map(function(g){
    return '<div class="sgroup"><div class="sgt">'+esc(g.s.ix)+' · '+esc(g.s.t)+'</div><ol start="'+(n+1)+'">'
      +g.items.map(function(it){
        n++;
        var note=st.notes[it.id]||'';
        return '<li>'+esc(it.t)+(note?'<span>'+esc(note)+'</span>':'')+'</li>';
      }).join('')
    +'</ol></div>';
  }).join('');
}
function metaLines(){
  var out=[];
  if(st.meta.obj)out.push('Объект: '+st.meta.obj);
  if(st.meta.flat)out.push('Квартира: '+st.meta.flat);
  if(st.meta.date){
    var p=st.meta.date.split('-');
    out.push('Дата осмотра: '+(p.length===3?p[2]+'.'+p[1]+'.'+p[0]:st.meta.date));
  }
  return out;
}
function finLabel(){
  return st.fin==='bez'?'без отделки':(st.fin==='chist'?'с отделкой от застройщика':'предчистовая отделка');
}
function sumText(){
  var groups=badGroups(),all=0,done=0;
  eachItem(function(it){all++;if(st.marks[it.id])done++});
  var out=['СПИСОК ЗАМЕЧАНИЙ ПО ОСМОТРУ КВАРТИРЫ'];
  var m=metaLines();
  if(m.length)out=out.concat(m);
  out.push('Тип отделки: '+finLabel());
  out.push('');
  if(!groups.length)out.push('Замечаний не зафиксировано.');
  else{
    var n=0;
    groups.forEach(function(g){
      out.push(g.s.ix+'. '+g.s.t.toUpperCase());
      g.items.forEach(function(it){
        n++;
        var note=st.notes[it.id]||'';
        out.push(n+'. '+it.t+(note?' — '+note:''));
      });
      out.push('');
    });
    out.push('Всего замечаний: '+n);
  }
  out.push('Проверено пунктов: '+done+' из '+all);
  out.push('');
  out.push('Составлено по чек-листу приёмки · Valentin Testov · t.me/vtestov');
  return out.join('\n');
}
function paintPrintHead(){
  var m=metaLines();
  m.push('Тип отделки: '+finLabel());
  document.getElementById('printhead').innerHTML=m.map(esc).join('<br>');
}

/* ============ события ============ */
listEl.addEventListener('click',function(e){
  var b=e.target.closest('.sb');
  if(!b)return;
  var row=b.closest('.it'),id=row.getAttribute('data-id'),v=b.getAttribute('data-v');
  var cur=st.marks[id]||'';
  var next=(cur===v)?'':v;
  if(next)st.marks[id]=next;else delete st.marks[id];
  if(next)row.setAttribute('data-v',next);else row.removeAttribute('data-v');
  Array.prototype.forEach.call(row.querySelectorAll('.sb'),function(x){
    x.setAttribute('aria-pressed',String(x.getAttribute('data-v')===next));
  });
  row.querySelector('.inote').hidden=(next!=='bad');
  hap(next==='bad'?'medium':'light');
  goal('priemka_start');
  paintCounts();applyFilter();renderSum();save();
});
listEl.addEventListener('input',function(e){
  if(e.target.tagName!=='TEXTAREA')return;
  var row=e.target.closest('.it'),id=row.getAttribute('data-id'),val=e.target.value;
  st.notes[id]=val;
  row.querySelector('.pnote').textContent=val||' ';
  clearTimeout(renderSum._t);
  renderSum._t=setTimeout(renderSum,300);
  save();
});

document.getElementById('fin').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  st.fin=b.getAttribute('data-fin');
  Array.prototype.forEach.call(this.querySelectorAll('button'),function(x){
    x.setAttribute('aria-pressed',String(x===b));
  });
  render();paintPrintHead();save();
});
document.getElementById('balc').addEventListener('change',function(){
  st.balc=this.checked;render();save();
});
function setFilter(f){
  st.filter=f;
  Array.prototype.forEach.call(document.querySelectorAll('.filters2 button'),function(x){
    x.setAttribute('aria-pressed',String(x.getAttribute('data-f')===f));
  });
  applyFilter();
}
document.querySelector('.filters2').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  setFilter(b.getAttribute('data-f'));
});

['mObj','mFlat','mDate'].forEach(function(id){
  var el=document.getElementById(id),key=id.slice(1).toLowerCase();
  el.addEventListener('input',function(){st.meta[key]=el.value;paintPrintHead();save()});
});

document.getElementById('btnCopy').addEventListener('click',function(){
  var t=sumText();
  goal('priemka_copy');
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(function(){toast('список скопирован')},fb);
  }else fb();
  function fb(){
    var ta=document.createElement('textarea');
    ta.value=t;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');toast('список скопирован')}catch(err){toast('не вышло скопировать')}
    document.body.removeChild(ta);
  }
});
document.getElementById('btnPrint').addEventListener('click',function(){
  goal('priemka_print');
  setFilter('all');
  paintPrintHead();
  window.print();
});
document.getElementById('btnClear').addEventListener('click',function(){
  if(!Object.keys(st.marks).length&&!Object.keys(st.notes).length){toast('отмечать пока нечего');return}
  if(!window.confirm('Очистить все отметки и заметки? Отменить это будет нельзя.'))return;
  st.marks={};st.notes={};
  render();save();toast('отметки очищены');
});
Array.prototype.forEach.call(document.querySelectorAll('a[href^="https://t.me/"]'),function(a){
  a.addEventListener('click',function(e){
    goal('priemka_contact');
    if(TG&&TG.openTelegramLink){e.preventDefault();TG.openTelegramLink(a.getAttribute('href'))}
  });
});

/* ============ прочее ============ */
var toastEl=document.getElementById('toast');
function toast(msg){
  toastEl.textContent=msg;toastEl.classList.add('on');
  clearTimeout(toast._t);
  toast._t=setTimeout(function(){toastEl.classList.remove('on')},2200);
}
function paintSaveMode(){
  document.getElementById('pSave').textContent=canStore
    ?'сохраняется на этом устройстве'
    :'браузер не даёт сохранять — скопируйте список';
}

/* ============ старт ============ */
load();
Array.prototype.forEach.call(document.querySelectorAll('#fin button'),function(b){
  b.setAttribute('aria-pressed',String(b.getAttribute('data-fin')===st.fin));
});
document.getElementById('balc').checked=st.balc;
if(!st.meta.date){
  var d=new Date();
  st.meta.date=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
}
document.getElementById('mObj').value=st.meta.obj||'';
document.getElementById('mFlat').value=st.meta.flat||'';
document.getElementById('mDate').value=st.meta.date||'';
paintSaveMode();
paintPrintHead();
render();
})();
