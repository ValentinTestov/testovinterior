/* ============================================================
   Рулетка интерьера
   ============================================================ */
(function(){
"use strict";

/* ============ контакт: замените на свой ============ */
var CONTACT_URL='https://t.me/vtestov';

/* ============ Telegram Mini App ============
   Вне Telegram весь блок молчит: TG===null и страница работает как раньше.
   TG_POSTER_API — адрес твоего бэкенда, который принимает картинку и шлёт
   её пользователю через sendPhoto. Пока пусто — кнопки png в Telegram скрыты.
   ============================================ */
var TG_POSTER_API='';

var _W=window.Telegram&&window.Telegram.WebApp;
var TG=(_W&&_W.platform&&_W.platform!=='unknown')?_W:null;
var CS=(TG&&TG.CloudStorage&&TG.CloudStorage.setItem)?TG.CloudStorage:null;

function hap(t){if(TG&&TG.HapticFeedback){try{TG.HapticFeedback.impactOccurred(t||'light')}catch(e){}}}
function pngOK(){return !TG||!!TG_POSTER_API}

if(TG){
  try{
    TG.ready();
    TG.expand();
    if(TG.disableVerticalSwipes)TG.disableVerticalSwipes();
    if(TG.setHeaderColor)TG.setHeaderColor('#05070B');
    if(TG.setBackgroundColor)TG.setBackgroundColor('#05070B');
  }catch(e){}
  ['aexport'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.style.display='none';
  });
  if(!TG_POSTER_API){
    var _pb=document.getElementById('png');if(_pb)_pb.style.display='none';
  }
}

/* --- CloudStorage: 1024 ключа, 4096 символов на ключ, поэтому режем на куски --- */
var CS_CHUNK=3800, csCount=0, csTimer=null;

function csPack(items){
  var out=[],cur=[],len=2,i,s;
  for(i=0;i<items.length;i++){
    s=JSON.stringify(items[i]);
    if(cur.length&&len+s.length+1>CS_CHUNK){out.push(cur);cur=[];len=2}
    cur.push(items[i]);len+=s.length+1;
  }
  if(cur.length)out.push(cur);
  return out;
}
function csDrop(from,to){
  if(!CS||to<=from||!CS.removeItems)return;
  var ks=[],i;for(i=from;i<to;i++)ks.push('RI_C'+i);
  CS.removeItems(ks,function(){});
}
function csSave(){
  if(!CS)return;
  clearTimeout(csTimer);
  csTimer=setTimeout(function(){
    var chunks=csPack(DB.items),total=chunks.length,done=0,bad=false;
    if(!total){
      CS.setItem('RI_META',JSON.stringify({v:1,n:0}),function(){});
      csDrop(0,csCount);csCount=0;return;
    }
    chunks.forEach(function(c,i){
      CS.setItem('RI_C'+i,JSON.stringify(c),function(err){
        if(err)bad=true;
        if(++done===total){
          if(bad){toast('облако Telegram не приняло — идеи пока только на устройстве');return}
          CS.setItem('RI_META',JSON.stringify({v:1,n:total}),function(){
            csDrop(total,csCount);csCount=total;
          });
        }
      });
    });
  },700);
}
function csLoad(cb){
  if(!CS){cb(false);return}
  CS.getItem('RI_META',function(err,val){
    if(err||!val){cb(true);return}
    var m=null;try{m=JSON.parse(val)}catch(e){}
    var total=(m&&m.n)|0;csCount=total;
    if(!total){cb(true);return}
    var ks=[],i;for(i=0;i<total;i++)ks.push('RI_C'+i);
    CS.getItems(ks,function(e2,vals){
      if(e2||!vals){cb(true);return}
      var items=[],a;
      for(i=0;i<total;i++){
        try{a=JSON.parse(vals['RI_C'+i]||'[]');if(a&&a.length)items=items.concat(a)}catch(x){}
      }
      DB.items=items;cb(true);
    });
  });
}

/* --- постер уходит сообщением от бота, а не скачиванием --- */
function sendPoster(r){
  if(!r){toast('сначала получите идею');return}
  if(!TG_POSTER_API){toast('отправка постера включится вместе с бэкендом');return}
  toast('отправляю…');
  withFonts(function(){
    exportPNG(r,function(blob,cv){
      var fd=new FormData();
      fd.append('initData',TG.initData||'');
      fd.append('n',String(r.n));
      if(blob)fd.append('poster',blob,'ideya-'+r.n+'.png');
      else fd.append('poster_b64',cv.toDataURL('image/png'));
      fetch(TG_POSTER_API,{method:'POST',body:fd}).then(function(res){
        if(!res.ok)throw 0;
        toast('карточка отправлена в чат');hap('medium');
      }).catch(function(){toast('не удалось отправить — попробуйте ещё раз')});
    });
  });
}

/* ============ данные ============ */
var TEMP={
  2700:'Очень тёплый свет — для спален и зон отдыха',
  3000:'Тёплый свет для спокойной жилой атмосферы',
  3500:'Нейтрально-тёплый свет — универсальный сценарий',
  4000:'Нейтральный свет для рабочих и торговых зон',
  4500:'Ровная цветопередача для медицинских кабинетов'
};

var PAL={
 warmneutral:{char:'Тёплая нейтральная',c:[['молочный','#EDE4D6'],['дуб','#C3A279'],['песочный','#D9C8AD'],['графит','#3A3B38']],
   names:['Тёплый нейтрал','Натуральный баланс','Мягкий свет']},
 oakolive:{char:'Тёплая природная',c:[['молочный','#EDE4D6'],['дуб','#C3A279'],['песочный','#D9C8AD'],['оливковый','#7C8465'],['графит','#3A3B38']],
   names:['Природный баланс','Оливковый покой','Тихий сад']},
 milkmin:{char:'Светлая молочная',c:[['белый','#F4F1EA'],['светлый дуб','#DAC5A2'],['тёплый серый','#B9B6AF']],
   names:['Молочный минимализм','Светлый ритм','Белая тишина']},
 graphite:{char:'Графитовая',c:[['белый','#EEF0F1'],['светло-серый','#C6CACC'],['графит','#3C4145'],['чёрный','#1B1D1F']],
   names:['Городской графит','Мягкий контраст','Тихий монохром']},
 sandterra:{char:'Тёплая земляная',c:[['крем','#EFE3D3'],['песочный','#D9C09A'],['терракота','#B5643F'],['глина','#8E6B57']],
   names:['Тёплая глина','Южный вечер','Земляной тон']},
 deepgreen:{char:'Глубокая зелёная',c:[['крем','#EDE7DA'],['шалфей','#A3B29C'],['бутылочный','#2E4237'],['латунь','#B2914E']],
   names:['Тихий модерн','Зелёная глубина','Ботанический вечер']},
 bluegrey:{char:'Прохладная дымчатая',c:[['лёд','#D8E1E8'],['дымчато-синий','#6E86A0'],['песок','#D5C7AE'],['графит','#3A4147']],
   names:['Северный свет','Дымчатая прохлада','Морской воздух']},
 darkwood:{char:'Тёмное дерево',c:[['крем','#E8DECB'],['орех','#6B4A32'],['охра','#B5873A'],['графит','#33322F']],
   names:['Тёмное дерево','Тёплый орех','Клубный вечер']},
 concrete:{char:'Бетон и сталь',c:[['бетон','#B9B7B0'],['сталь','#6E7378'],['графит','#35393C'],['кирпич','#9E5B4A']],
   names:['Городской лофт','Бетонный минимализм','Индустриальный ритм']},
 plaster:{char:'Светлая штукатурка',c:[['известь','#EFEBE3'],['беж','#DCD2C2'],['тёплый серый','#A9A296'],['дерево','#C1A47C']],
   names:['Матовая тишина','Средиземный покой','Мягкий свет']},
 blackbrass:{char:'Чёрный с латунью',c:[['чёрный','#17191B'],['латунь','#C8A253'],['крем','#EFE6D4'],['дым','#7C7F84']],
   names:['Чёрный лак','Латунный акцент','Вечерний бархат']},
 pastel:{char:'Мягкая пастельная',c:[['пудровый','#E6CFC6'],['крем','#F2EAE0'],['серо-голубой','#AFC0C6'],['орех','#8A6A52']],
   names:['Пудровый свет','Тихое утро','Мягкий контраст']},
 rustnavy:{char:'Синий с ржавчиной',c:[['тёмно-синий','#2B3A4A'],['ржавый','#A85C3C'],['крем','#EDE3D2'],['латунь','#B08D4F']],
   names:['Городской курорт','Вечерний синий','Тёплый контраст']},
 sagecream:{char:'Шалфей и крем',c:[['шалфей','#9FAF9B'],['крем','#F0EADD'],['дуб','#C6A97F'],['графит','#3B3E3B']],
   names:['Тихий сад','Мятный покой','Природный баланс']},
 warmgrey:{char:'Тёплая серая',c:[['тёплый серый','#BDB6AC'],['крем','#EDE7DC'],['кофе','#6B5B4E'],['дуб','#C9AE86']],
   names:['Кофейный тон','Спокойный день','Тёплый нейтрал']}
};

var STYLE={
 contemporary:{name:'Contemporary',desc:'Современная база без стилевых крайностей: чистые линии и акцент на планировке',
   pals:['warmneutral','milkmin','graphite','plaster','warmgrey','bluegrey','sagecream'],temps:[3000,3500,4000],tag:'neutral'},
 warmmin:{name:'Warm Minimalism',desc:'Минимум предметов, тёплая нейтральная гамма и много воздуха',
   pals:['warmneutral','milkmin','plaster','warmgrey','oakolive'],temps:[2700,3000,3500],tag:'natural'},
 japandi:{name:'Japandi',desc:'Спокойная база, дерево, природные фактуры и минимум визуального шума',
   pals:['warmneutral','oakolive','sagecream','plaster','milkmin'],temps:[2700,3000],tag:'natural'},
 scandi:{name:'Scandinavian',desc:'Светлая гамма, дерево, простая мебель и много естественного света',
   pals:['milkmin','warmneutral','bluegrey','sagecream','plaster'],temps:[3000,3500],tag:'natural'},
 midcentury:{name:'Mid-century modern',desc:'Мебель на тонких ножках, тёплое дерево и графичные силуэты 50–60-х',
   pals:['darkwood','warmneutral','sagecream','rustnavy','warmgrey'],temps:[2700,3000,3500],tag:'retro'},
 soft:{name:'Soft Contemporary',desc:'Мягкие формы, приглушённый цвет и тактильные материалы',
   pals:['pastel','warmneutral','plaster','warmgrey','milkmin'],temps:[2700,3000,3500],tag:'neutral'},
 organic:{name:'Organic Modern',desc:'Природные материалы, плавные линии и живые фактуры',
   pals:['oakolive','sagecream','plaster','warmneutral','deepgreen','sandterra'],temps:[2700,3000],tag:'natural'},
 modclassic:{name:'Modern Classic',desc:'Классическая геометрия в современном исполнении: пропорции и сдержанный декор',
   pals:['warmgrey','plaster','deepgreen','blackbrass','pastel'],temps:[2700,3000,3500],tag:'classic'},
 neoclass:{name:'Neoclassical',desc:'Молдинги, симметрия и благородная гамма без музейной тяжести',
   pals:['plaster','warmgrey','pastel','deepgreen'],temps:[2700,3000],tag:'classic'},
 wabisabi:{name:'Wabi-Sabi',desc:'Красота неровности: матовые поверхности, ручная фактура, приглушённый цвет',
   pals:['plaster','oakolive','warmneutral','sagecream','sandterra'],temps:[2700,3000],tag:'natural'},
 loft:{name:'Loft',desc:'Открытое пространство, честные материалы и высокие потолки',
   pals:['concrete','darkwood','graphite','rustnavy'],temps:[3000,3500,4000],tag:'raw'},
 industrial:{name:'Industrial',desc:'Бетон, металл и тёмное дерево, контрастный свет и минимум отделки',
   pals:['concrete','graphite','darkwood'],temps:[3500,4000],tag:'raw'},
 artdeco:{name:'Art Deco',desc:'Геометрия, глубокий цвет, латунь и лакированные поверхности',
   pals:['blackbrass','deepgreen','rustnavy','darkwood'],temps:[2700,3000],tag:'classic'},
 eclectic:{name:'Eclectic',desc:'Смешение эпох и фактур, собранное одной цветовой логикой',
   pals:['rustnavy','deepgreen','pastel','darkwood','warmgrey'],temps:[2700,3000,3500],tag:'retro'},
 retro:{name:'Retro / Vintage inspired',desc:'Отсылки к 60–70-м: тёплые цвета, узнаваемые формы, немного игры',
   pals:['darkwood','rustnavy','sandterra','warmgrey'],temps:[2700,3000],tag:'retro'}
};

var KEYS={
 res_s:['встроенное хранение до потолка','мебель-трансформер вместо лишних стен','единое напольное покрытие по всей квартире',
  'зеркальная плоскость, зрительно удлиняющая комнату','спальня за стеклянной перегородкой','подиум с системой хранения',
  'компактное рабочее место в нише','скрытые двери в цвет стен','кухня без верхних шкафов','мягкое зонирование светом вместо перегородок'],
 res_m:['визуальное объединение кухни и гостиной','сценарное освещение в общей зоне','акцентная фактура дерева',
  'гардеробная вместо шкафа в спальне','единое напольное покрытие в общей зоне','скрытые двери',
  'ниша с подсветкой в зоне ТВ','отдельное место для работы из дома','приглушённый тихий цвет в спальне','встроенное хранение в прихожей'],
 res_l:['анфилада общественных зон','панорамное остекление как главный акцент','каминная зона как центр гостиной',
  'приватное крыло отдельно от общих зон','домашний кабинет со звукоизоляцией','гардеробная-комната',
  'терраса как продолжение гостиной','лестница как скульптурный объект','несколько групп сценарного света','прихожая с полноценным хранением'],
 cafe:['акцентная входная группа','барная стойка как главный объект','фотогеничная зона у окна',
  'износостойкие материалы в проходной зоне','тёплый акцентный свет над столами','посадка разной высоты','акустические панели в потолке'],
 rest:['сценарное освещение по зонам','приглушённый свет над столами','акустика мягкими материалами',
  'выделенный маршрут гостя','барная зона как центр зала','полуприватные ниши','фактурный акцент на главной стене'],
 office:['акустические панели в открытом пространстве','переговорные со стеклом и шторой','зона тихой работы',
  'понятная навигация по этажу','сочетание общего и локального света','гибкая мебель под перестановки','кухня-лаунж как точка притяжения'],
 shop:['акцентная входная группа','свет на товаре, а не на проходе','понятная навигация по залу',
  'фотогеничная зона примерочной','гибкие торговые модули','брендовый цвет в деталях','витрина как сцена'],
 beauty:['индивидуальный свет у каждого рабочего места','нейтральная цветопередача у зеркал','износостойкие поверхности',
  'зона ожидания с мягким светом','фотогеничная зона для съёмки работ','акцентный цвет бренда в деталях'],
 fit:['износостойкие покрытия','акустические решения в зале','зеркала и свет без бликов',
  'понятная навигация между зонами','раздевалка как отдельный сценарий','акцентный цвет в активной зоне'],
 clinic:['ровная цветопередача света','понятная навигация для пациента','моющиеся износостойкие материалы',
  'спокойная зона ожидания','приватность кабинетов','мягкий свет в ожидании и рабочий в кабинете'],
 hotel:['акцентная входная группа','ресепшн как первый визуальный акцент','сценарное освещение в лобби',
  'зона ожидания с несколькими сценариями','фотогеничная деталь у входа','износостойкие материалы в проходной зоне'],
 fun:['сценарное освещение с несколькими режимами','фотогеничная зона','акустические панели',
  'гибкая мебель под разные форматы','акцентный цвет как узнаваемая деталь','выделенный маршрут посетителя'],
 studio_com:['гибкая планировка под перестановки','ровный рабочий свет','износостойкие поверхности',
  'зона хранения оборудования','фотогеничный фон для съёмки','акустическая обработка']
};
var KEYS_TAG={
 raw:['открытые коммуникации как часть эстетики','бетон и металл в отделке'],
 natural:['натуральные фактуры без глянца','матовая штукатурка на стенах'],
 classic:['латунные детали в свете и фурнитуре','молдинги в упрощённой геометрии'],
 retro:['винтажный предмет как акцент','тёплое дерево в мебели'],
 neutral:['скрытые источники света','единая линия фасадов без ручек']
};

var OBJ={
 res:[
  {id:'studio',l:'Студия',keys:'res_s',temps:[2700,3000,3500],
   styles:['contemporary','warmmin','japandi','scandi','soft','loft','midcentury','organic']},
  {id:'k1',l:'1-комнатная квартира',keys:'res_s',temps:[2700,3000,3500],
   styles:['contemporary','warmmin','japandi','scandi','soft','midcentury','organic','loft']},
  {id:'k2',l:'2-комнатная квартира',keys:'res_m',temps:[2700,3000,3500],
   styles:['contemporary','warmmin','japandi','scandi','soft','midcentury','organic','modclassic','loft','eclectic']},
  {id:'k3',l:'3-комнатная квартира',keys:'res_m',temps:[2700,3000,3500],
   styles:['contemporary','warmmin','japandi','scandi','soft','midcentury','organic','modclassic','neoclass','eclectic','artdeco']},
  {id:'k4',l:'4+ комнат',keys:'res_l',temps:[2700,3000,3500],
   styles:['contemporary','modclassic','neoclass','organic','midcentury','artdeco','eclectic','warmmin']},
  {id:'pent',l:'Апартаменты / пентхаус',keys:'res_l',temps:[2700,3000,3500],
   styles:['contemporary','soft','artdeco','modclassic','loft','midcentury','organic']},
  {id:'house',l:'Загородный дом',keys:'res_l',temps:[2700,3000,3500],
   styles:['organic','wabisabi','japandi','scandi','modclassic','warmmin','midcentury','eclectic']},
  {id:'town',l:'Таунхаус',keys:'res_l',temps:[2700,3000,3500],
   styles:['contemporary','scandi','modclassic','organic','warmmin','midcentury']},
  {id:'room',l:'Отдельная комната / зона',keys:'res_s',temps:[2700,3000],
   styles:['contemporary','warmmin','japandi','scandi','soft','organic','wabisabi','midcentury']}
 ],
 com:[
  {id:'cafe',l:'Кафе / кофейня',keys:'cafe',temps:[2700,3000,3500],
   styles:['contemporary','japandi','organic','loft','industrial','midcentury','retro','wabisabi','soft','scandi']},
  {id:'rest',l:'Ресторан / бар',keys:'rest',temps:[2700,3000],
   styles:['artdeco','loft','eclectic','midcentury','contemporary','organic','retro','modclassic']},
  {id:'office',l:'Офис',keys:'office',temps:[3500,4000],
   styles:['contemporary','soft','scandi','loft','industrial','midcentury','organic']},
  {id:'shop',l:'Магазин / шоурум',keys:'shop',temps:[3000,3500,4000],
   styles:['contemporary','soft','loft','industrial','midcentury','artdeco','organic','scandi']},
  {id:'beauty',l:'Салон красоты / барбершоп',keys:'beauty',temps:[3000,3500,4000],
   styles:['contemporary','soft','artdeco','loft','midcentury','organic','industrial']},
  {id:'fit',l:'Фитнес / wellness',keys:'fit',temps:[3500,4000],
   styles:['contemporary','loft','industrial','organic','soft','japandi']},
  {id:'clinic',l:'Клиника / медпространство',keys:'clinic',temps:[4000,4500],
   styles:['contemporary','soft','scandi','warmmin','organic']},
  {id:'hotel',l:'Отель / лобби',keys:'hotel',temps:[2700,3000,3500],
   styles:['contemporary','artdeco','modclassic','midcentury','organic','soft','eclectic']},
  {id:'fun',l:'Развлекательное пространство',keys:'fun',temps:[2700,3000,3500],
   styles:['artdeco','loft','eclectic','retro','industrial','midcentury','contemporary']},
  {id:'studio_com',l:'Студия / сервисное помещение',keys:'studio_com',temps:[3500,4000],
   styles:['contemporary','loft','industrial','scandi','soft']}
 ]
};
var AREAS={
 res:[{id:'',l:'не важно'},{id:'s',l:'до 40 м²'},{id:'m',l:'40–70 м²'},{id:'l',l:'70–120 м²'},{id:'xl',l:'120+ м²'}],
 com:[{id:'',l:'не важно'},{id:'s',l:'до 50 м²'},{id:'m',l:'50–100 м²'},{id:'l',l:'100–200 м²'},{id:'xl',l:'200+ м²'}]
};

var CELLS=[
 {k:'concept',ix:'I',label:'Концепция'},
 {k:'style',ix:'II',label:'Стиль'},
 {k:'pal',ix:'III',label:'Палитра и свет',wide:true},
 {k:'keys',ix:'IV',label:'Ключевые решения',wide:true}
];

/* ============ состояние ============ */
var grid=document.getElementById('grid');
var spinBtn=document.getElementById('spin');
var countEl=document.getElementById('count');
var toastEl=document.getElementById('toast');
var hintEl=document.getElementById('hint');
var wildBtn=document.getElementById('wild');

var state={grp:'res',obj:null,area:'',wild:false,n:0,cur:{},locks:{}};
var sessionSpins=0;
var busy=false;
var reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ============ звук ============
   Звук общий для всего сайта (assets/js/core.js): кнопка «звук» здесь и в шапке —
   одна настройка. Здесь только свои звуки барабанов, пущенные в общий выход. */
var AC=null,NB=null;
function ac(){
  var S=window.VT&&VT.sound,c=S&&S.ctx();
  if(!c)return null;
  if(c!==AC){
    AC=c;
    var n=Math.floor(c.sampleRate*0.05),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0),i;
    for(i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.6);
    NB=b;
  }
  return c;
}
function tick(at,gain,freq){
  var c=ac();if(!c)return;
  var t=c.currentTime+at,s=c.createBufferSource();s.buffer=NB;
  var f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=1.3;
  var g=c.createGain();
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(gain,t+0.004);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.05);
  s.connect(f);f.connect(g);g.connect(VT.sound.out());
  s.start(t);s.stop(t+0.06);
}
function thunk(at){
  var c=ac();if(!c)return;
  var t=c.currentTime+at,o=c.createOscillator(),g=c.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(200,t);
  o.frequency.exponentialRampToValueAtTime(84,t+0.14);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.13,t+0.008);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);
  o.connect(g);g.connect(VT.sound.out());o.start(t);o.stop(t+0.2);
  tick(at,0.05,1100);
  VT.sound.glass(1318.5,at,.22,.02,.6);
}
function chime(){if(window.VT&&VT.sound)VT.sound.play('chime')}
function bezier(x1,y1,x2,y2){
  function cx(t){return 3*(1-t)*(1-t)*t*x1+3*(1-t)*t*t*x2+t*t*t}
  function cy(t){return 3*(1-t)*(1-t)*t*y1+3*(1-t)*t*t*y2+t*t*t}
  return function(x){var lo=0,hi=1,m,i;for(i=0;i<22;i++){m=(lo+hi)/2;if(cx(m)<x)lo=m;else hi=m}return cy((lo+hi)/2)};
}
var EASE=bezier(.1,.55,.3,1.07);
/* С GSAP (VT.motion.ok) барабан останавливается с отскоком: идёт почти ровно, на доле HIT
   упирается в стопор, проскакивает на десяток пикселей и пружинит на месте.
   Скорость в момент удара у обеих частей кривой одна, поэтому рывка нет.
   Без GSAP остаётся прежний плавный переход на CSS. */
var G=window.gsap,MO=!!(window.VT&&VT.motion&&VT.motion.ok&&G),HIT=.8;
function bounceEase(x){
  if(x<=0)return 0;if(x>=1)return 1;
  var c=.66,w=3*Math.PI;
  if(x<HIT){var q=x/HIT;return c*q+(1-c)*(1-Math.pow(1-q,3))}
  var t=(x-HIT)/(1-HIT);
  return 1+c*(1-HIT)/(HIT*w)*Math.exp(-4.2*t)*Math.sin(w*t);
}
var SPIN=MO?bounceEase:EASE;
function ticksFor(n,delay,dur){
  if(!ac()||n<2)return;
  var steps=700,k=1,i,x,y;
  for(i=1;i<=steps&&k<n;i++){
    x=i/steps;y=SPIN(x);
    while(k<n&&y>=k/(n-1)){tick((delay+x*dur)/1000,0.016+0.03*(k/n),2100+Math.random()*700);k++}
  }
}

/* ============ генерация концепции ============ */
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function esc(t){return String(t).replace(/[&<>"']/g,function(m){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function objById(id){
  var g,i;
  for(g in OBJ)for(i=0;i<OBJ[g].length;i++)if(OBJ[g][i].id===id)return OBJ[g][i];
  return null;
}
function allStyles(){var r=[],k;for(k in STYLE)r.push(k);return r}

function pickStyle(obj,palId){
  var pool=state.wild?allStyles():(obj.styles||allStyles()).slice();
  if(palId){
    var fit=pool.filter(function(s){return STYLE[s].pals.indexOf(palId)>=0});
    if(fit.length)pool=fit;
  }
  if(!pool.length)pool=allStyles();
  return pick(pool);
}
function pickPal(styleId){
  if(state.wild){var all=[],k;for(k in PAL)all.push(k);return pick(all)}
  return pick(STYLE[styleId].pals);
}
function pickTemp(styleId,obj){
  var st=STYLE[styleId].temps,ok=obj.temps.filter(function(t){return st.indexOf(t)>=0});
  return pick(ok.length?ok:obj.temps);
}
function pickConcept(palId,styleId,avoid){
  var pool=PAL[palId].names.filter(function(n){return n!==avoid});
  if(!pool.length)pool=PAL[palId].names;
  return pick(pool);
}
function keysPool(obj){
  if(obj.keys.indexOf('res_')===0){
    if(state.area==='s')return 'res_s';
    if(state.area==='xl')return 'res_l';
  }
  return obj.keys;
}
function pickKeys(obj,styleId){
  var base=(KEYS[keysPool(obj)]||[]).slice(),out=[],extra=KEYS_TAG[STYLE[styleId].tag]||[];
  if(extra.length&&Math.random()<0.6)out.push(pick(extra));
  var want=out.length?2:3,i;
  for(i=0;i<want&&base.length;i++)out.push(base.splice(Math.floor(Math.random()*base.length),1)[0]);
  if(out.length<3&&base.length)out.push(base.splice(Math.floor(Math.random()*base.length),1)[0]);
  return out.slice(0,3);
}
function makeIdea(){
  var obj=state.obj,cur=state.cur,L=state.locks;
  var styleId=(L.style&&cur.style)?cur.style:pickStyle(obj,(L.pal&&cur.pal)?cur.pal:null);
  var palId=(L.pal&&cur.pal)?cur.pal:pickPal(styleId);
  var temp=(L.pal&&cur.temp)?cur.temp:pickTemp(styleId,obj);
  var concept=(L.concept&&cur.concept)?cur.concept:pickConcept(palId,styleId,cur.concept);
  var keys=(L.keys&&cur.keys)?cur.keys:pickKeys(obj,styleId);
  return {style:styleId,pal:palId,temp:temp,concept:concept,keys:keys};
}

/* ============ барабаны ============ */
function sizeCls(t){var n=t.length;return n<=13?'s1':(n<=22?'s2':'s3')}
function slotHTML(k,v){
  if(k==='concept')return '<div class="slot"><div class="v '+sizeCls(v)+'">'+esc(v)+'</div><div class="m">направление интерьера</div></div>';
  if(k==='style'){var s=STYLE[v];
    return '<div class="slot"><div class="v '+sizeCls(s.name)+'">'+esc(s.name)+'</div><div class="m">'+esc(s.desc)+'</div></div>'}
  if(k==='pal'){
    var p=PAL[v.pal],sw=p.c.map(function(c){return '<i style="background:'+esc(c[1])+'"></i>'}).join('');
    return '<div class="slot"><div class="sw">'+sw+'</div><div class="m">'+esc(p.c.map(function(c){return c[0]}).join(' / '))
      +'<span class="wideonly"> · '+esc(p.char.toLowerCase())+'</span> · <b>'+v.temp+' K</b></div></div>';
  }
  return '<div class="slot"><ul class="keys">'+v.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul></div>';
}
function idleHTML(k){
  if(k==='pal')return '<div class="slot"><div class="sw"><i class="empty"></i><i class="empty"></i><i class="empty"></i></div><div class="m">выберите объект и нажмите «получить идею»</div></div>';
  if(k==='keys')return '<div class="slot"><div class="m">здесь появятся решения под ваш объект</div></div>';
  return '<div class="slot"><div class="v s1 idle">• • •</div><div class="m">ждёт запуска</div></div>';
}
function cellVal(k){
  var c=state.cur;
  if(c.concept===undefined)return undefined;
  if(k==='concept')return c.concept;
  if(k==='style')return c.style;
  if(k==='pal')return {pal:c.pal,temp:c.temp};
  return c.keys;
}
function randVal(k){
  var obj=state.obj||OBJ.res[2];
  var st=pickStyle(obj,null),pl=pickPal(st);
  if(k==='concept')return pick(PAL[pl].names);
  if(k==='style')return st;
  if(k==='pal')return {pal:pl,temp:pickTemp(st,obj)};
  return pickKeys(obj,st);
}
function buildBoard(){
  grid.innerHTML=CELLS.map(function(c){
    return '<div class="cell'+(c.wide?' wide':'')+'" data-k="'+c.k+'" tabindex="0" role="button" aria-pressed="false" aria-label="'+c.label+', нажмите чтобы зафиксировать">'
      +'<div class="head"><span class="ix">'+c.ix+'</span><span>'+c.label+'</span><span class="lk">зафиксировано</span></div>'
      +'<div class="window"><div class="veil"></div><div class="pay"></div><div class="sheen"></div><div class="reel"></div></div></div>';
  }).join('');
  paintAll();
}
function cellEl(k){return grid.querySelector('.cell[data-k="'+k+'"]')}
function reelEl(k){var c=cellEl(k);return c?c.querySelector('.reel'):null}
function paintAll(){
  CELLS.forEach(function(c){
    var r=reelEl(c.k);if(!r)return;
    var v=cellVal(c.k);
    r.style.transition='none';
    r.style.transform='translate3d(0,0,0)';
    r.innerHTML=v!==undefined?slotHTML(c.k,v):idleHTML(c.k);
  });
}
function spinReel(k,finalVal,delay,dur,done){
  var cell=cellEl(k),r=reelEl(k);
  if(!cell||!r){done();return}
  var win=cell.querySelector('.window');
  function hit(){
    hap('light');
    cell.classList.remove('spinning');
    cell.classList.add('stopped');
    setTimeout(function(){cell.classList.remove('stopped')},760);
  }
  function land(quiet){
    if(quiet!==true)hit();
    r.style.transition='none';
    r.style.willChange='auto';
    r.style.transform='translate3d(0,0,0)';
    r.innerHTML=slotHTML(k,finalVal);
    done();
  }
  if(reduce){r.innerHTML=slotHTML(k,finalVal);thunk(delay/1000);land();return}
  var h=win.getBoundingClientRect().height||win.clientHeight;
  var seq=[],i;
  for(i=0;i<12;i++)seq.push(randVal(k));
  seq.push(finalVal);
  seq.push(randVal(k));
  var stop=seq.length-2;
  r.innerHTML=seq.map(function(v){return slotHTML(k,v)}).join('');
  r.style.transition='none';
  r.style.transform='translate3d(0,0,0)';
  void r.offsetHeight;
  cell.classList.add('spinning');
  ticksFor(stop+1,delay,dur);
  if(MO){
    /* удар и вспышка — в момент, когда барабан упёрся; потом он ещё пружинит */
    thunk((delay+dur*HIT)/1000);
    G.killTweensOf(r);
    G.fromTo(r,{y:0},{y:-stop*h,duration:dur/1000,delay:delay/1000,ease:bounceEase,force3D:true,
      onComplete:function(){G.set(r,{clearProps:'transform'});land(true)}});
    G.delayedCall((delay+dur*HIT)/1000,hit);
    return;
  }
  thunk((delay+dur)/1000);
  var guard=null;
  function finish(e){
    if(e&&e.propertyName&&e.propertyName!=='transform')return;
    r.removeEventListener('transitionend',finish);
    clearTimeout(guard);
    requestAnimationFrame(land);
  }
  r.addEventListener('transitionend',finish);
  guard=setTimeout(finish,delay+dur+320);
  setTimeout(function(){
    r.style.transition='transform '+dur+'ms cubic-bezier(.1,.55,.3,1.07)';
    r.style.transform='translate3d(0,-'+(stop*h).toFixed(2)+'px,0)';
  },delay);
}
function spinLabel(t){spinBtn.innerHTML='<span class="d">◆</span>&nbsp;&nbsp;'+t+'&nbsp;&nbsp;<span class="d">◆</span>'}

function spin(){
  if(busy)return;
  if(!state.obj){
    toast('сначала выберите объект');
    var pk=document.querySelector('.pick');
    if(pk&&pk.scrollIntoView)pk.scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  busy=true;spinBtn.disabled=true;spinLabel('собираем');
  var idea=makeIdea();
  var keys=CELLS.map(function(c){return c.k});
  var active=keys.filter(function(k){return !state.locks[k]});
  if(!active.length){
    busy=false;spinBtn.disabled=false;spinLabel('крутить ещё');
    toast('все элементы зафиксированы — снимите фиксацию');return;
  }
  state.cur=idea;state.n++;sessionSpins++;
  countEl.textContent='идей: '+state.n;
  hideCard();
  var left=active.length;
  active.forEach(function(k,i){
    spinReel(k,cellVal(k),i*150,1450+i*240,function(){
      left--;
      if(left===0){
        busy=false;spinBtn.disabled=false;spinLabel('крутить ещё');
        chime();
        if(MO&&VT.motion.sparks)VT.motion.sparks(spinBtn,30);     /* идея выпала — из кнопки летят искры света */
        var rec=recFromState();dbAdd(rec);showCard(rec);renderArchive();
        maybeCTA();
      }
    });
  });
}

/* ============ выбор объекта ============ */
function paintTypes(){
  var list=OBJ[state.grp];
  document.getElementById('types').innerHTML=list.map(function(o){
    return '<button type="button" class="chip" data-obj="'+o.id+'" aria-pressed="'+(state.obj&&state.obj.id===o.id?'true':'false')+'">'+esc(o.l)+'</button>';
  }).join('');
  document.getElementById('areas').innerHTML=(AREAS[state.grp]||AREAS.res).map(function(a){
    return '<button type="button" class="chip" data-area="'+a.id+'" aria-pressed="'+(state.area===a.id?'true':'false')+'">'+esc(a.l)+'</button>';
  }).join('');
}
function resetBoard(){
  state.cur={};state.locks={};
  Array.prototype.forEach.call(grid.querySelectorAll('.cell'),function(c){
    c.classList.remove('locked');c.setAttribute('aria-pressed','false');
  });
  paintAll();hideCard();
}
document.getElementById('grp').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b||busy)return;
  state.grp=b.getAttribute('data-grp');
  Array.prototype.forEach.call(this.querySelectorAll('button'),function(x){
    x.setAttribute('aria-pressed',x===b?'true':'false')});
  state.obj=null;state.area='';paintTypes();lockUI();resetBoard();
});
document.getElementById('types').addEventListener('click',function(e){
  var b=e.target.closest('.chip');if(!b||busy)return;
  var id=b.getAttribute('data-obj'),prev=state.obj&&state.obj.id;
  state.obj=objById(id);
  Array.prototype.forEach.call(this.querySelectorAll('.chip'),function(x){
    x.setAttribute('aria-pressed',x===b?'true':'false')});
  lockUI();
  if(prev&&prev!==id&&state.cur.concept){resetBoard();toast('объект изменён — запустите рулетку заново')}
});
document.getElementById('areas').addEventListener('click',function(e){
  var b=e.target.closest('.chip');if(!b)return;
  state.area=b.getAttribute('data-area');
  Array.prototype.forEach.call(this.querySelectorAll('.chip'),function(x){
    x.setAttribute('aria-pressed',x===b?'true':'false')});
});
function lockUI(){
  var ok=!!state.obj;
  spinBtn.disabled=!ok;
  hintEl.textContent=ok
    ?(state.cur.concept?'нажмите на блок, чтобы зафиксировать · пробел — крутить':'нажмите «получить идею» · пробел — крутить')
    :'Выберите объект выше';
}
wildBtn.addEventListener('click',function(){
  state.wild=!state.wild;
  wildBtn.setAttribute('aria-pressed',state.wild?'true':'false');
  toast(state.wild?'смелые сочетания включены':'обычный режим');
});

/* ============ фиксация ============ */
grid.addEventListener('click',function(e){
  var cell=e.target.closest('.cell');if(!cell)return;
  toggleLock(cell);
});
grid.addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ')return;
  var cell=e.target.closest('.cell');if(!cell)return;
  e.preventDefault();e.stopPropagation();
  toggleLock(cell);
});
function toggleLock(cell){
  if(busy)return;
  var k=cell.getAttribute('data-k');
  if(state.cur.concept===undefined){toast('сначала получите идею');return}
  hap('rigid');
  if(window.VT&&VT.sound)VT.sound.play('lock');
  state.locks[k]=!state.locks[k];
  cell.classList.toggle('locked',!!state.locks[k]);
  cell.setAttribute('aria-pressed',state.locks[k]?'true':'false');
  toast(state.locks[k]?'зафиксировано — при следующем запуске не изменится':'фиксация снята');
}
document.addEventListener('keydown',function(e){
  if(e.code==='Space'&&!/^(BUTTON|INPUT|TEXTAREA|SELECT|A)$/.test(e.target.tagName)){e.preventDefault();spin()}
});
spinBtn.addEventListener('click',spin);

/* ============ карточка ============ */
var cardEl=document.getElementById('card'),rowsEl=document.getElementById('crows'),cnumEl=document.getElementById('cnum');
var favBtn=document.getElementById('fav'),curRec=null;

function areaLabel(grp,id){
  if(!id)return '';
  var list=AREAS[grp]||AREAS.res,i;
  for(i=0;i<list.length;i++)if(list[i].id===id)return list[i].l;
  return '';
}
function objLabel(rec){
  var o=objById(rec.objId),a=areaLabel(rec.grp,rec.area);
  return (o?o.l:'помещение')+(a?' · '+a:'');
}
function cardRows(r){
  var p=PAL[r.pal],s=STYLE[r.style];
  return [
    ['Тип объекта',objLabel(r),'',0],
    ['Концепция',r.concept,'',1],
    ['Стиль',s.name,s.desc,0],
    ['Палитра','',p.c.map(function(c){return c[0]}).join(' / ')+' · '+p.char.toLowerCase(),2],
    ['Освещение',r.temp+' K',TEMP[r.temp],0],
    ['Ключевые решения','','',3]
  ];
}
function hideCard(){cardEl.classList.remove('on')}
function showCard(r){
  if(!r)return;
  curRec=r;
  var p=PAL[r.pal];
  rowsEl.innerHTML=cardRows(r).map(function(row,i){
    var val;
    if(row[3]===2)val='<span class="sw">'+p.c.map(function(c){return '<i style="background:'+esc(c[1])+'"></i>'}).join('')+'</span>';
    else if(row[3]===3)val='<ul class="keys">'+r.keys.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>';
    else val='<span class="cval'+(row[3]===1?' big':'')+'">'+esc(row[1])+'</span>';
    return '<div class="crow" style="animation-delay:'+(0.06+i*0.08).toFixed(2)+'s">'
      +'<span class="clbl">'+esc(row[0])+'</span>'
      +'<span>'+val+(row[2]?'<span class="cmeta">'+esc(row[2])+'</span>':'')+'</span></div>';
  }).join('');
  cnumEl.textContent='ваша идея №'+r.n;
  paintFav();lockUI();
  requestAnimationFrame(function(){requestAnimationFrame(function(){cardEl.classList.add('on')})});
}
function ideaText(r){
  if(!r)return '';
  var p=PAL[r.pal],s=STYLE[r.style];
  return ['Идея интерьера №'+r.n,
    'Объект: '+objLabel(r),
    'Концепция: '+r.concept,
    'Стиль: '+s.name+' — '+s.desc,
    'Палитра: '+p.c.map(function(c){return c[0]+' '+c[1]}).join(', ')+' ('+p.char.toLowerCase()+')',
    'Освещение: '+r.temp+' K — '+TEMP[r.temp],
    'Ключевые решения: '+r.keys.join('; ')].join('\n');
}
document.getElementById('copy').addEventListener('click',function(){
  var t=ideaText(curRec);
  if(!t){toast('сначала получите идею');return}
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(function(){toast('идея скопирована')},fb);
  }else fb();
  function fb(){
    var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');toast('идея скопирована')}catch(err){toast('не вышло скопировать')}
    document.body.removeChild(ta);
  }
});

/* ============ PNG ============
   Основа карточки (фон, стекло, водяной знак, шапка) — в assets/js/card.js */
function exportPNG(r,onBlob){
  r=r||curRec;
  if(!r){toast('сначала получите идею');return}
  var C=VT.card,b=C.base('идея № '+r.n);
  if(!b){toast('браузер не поддерживает сохранение');return}
  var g=b.g,cv=b.cv,M=C.M,CW=C.CW,LAMP=C.rgba(b.c,1);
  var p=PAL[r.pal],s=STYLE[r.style];
  var y=M+92;
  function lab(t){C.mono(g,t,M,y,C.INK3,15);y+=14}
  function rule(){y+=14;g.fillStyle='rgba(255,255,255,.10)';g.fillRect(M,y,CW,1);y+=36}
  function big(t,sizes,maxLines,weight,color){
    var i,size=26,lines=[],mx=maxLines||1;
    for(i=0;i<sizes.length;i++){
      size=sizes[i];g.font=(weight||400)+' '+size+'px Unbounded, sans-serif';
      lines=C.wrap(g,t,CW);
      if(lines.length<=mx)break;
    }
    g.fillStyle=color||C.INK;
    lines.forEach(function(l,j){g.fillText(l,M,y+size*0.92+j*size*1.16)});
    y+=lines.length*size*1.16+10;
  }
  function small(t){
    g.font='400 22px Onest, sans-serif';g.fillStyle=C.INK2;
    C.wrap(g,t,CW).forEach(function(l){y+=28;g.fillText(l,M,y)});
    y+=8;
  }
  var gr=g.createLinearGradient(M,0,M+CW*.8,0);gr.addColorStop(0,'#fff');gr.addColorStop(1,LAMP);
  lab('тип объекта');big(objLabel(r),[28,25,22],2);y+=4;
  rule();lab('концепция');big(r.concept,[60,52,44,36],1,300,gr);y+=4;
  rule();lab('стиль');big(s.name,[32,28,25]);small(s.desc);
  rule();lab('палитра');
  var n=p.c.length,gap=10,sw=(CW-gap*(n-1))/n;
  p.c.forEach(function(c,j){
    g.fillStyle=c[1];C.rr(g,M+j*(sw+gap),y+6,sw,96,18);g.fill();
    g.strokeStyle='rgba(255,255,255,.2)';g.lineWidth=1;g.stroke();
  });
  y+=112;small(p.c.map(function(c){return c[0]}).join(' / ')+' · '+p.char.toLowerCase());
  rule();lab('освещение');big(r.temp+' K',[34,30],1,400,LAMP);small(TEMP[r.temp]);
  rule();lab('ключевые решения');y+=4;
  g.font='400 24px Onest, sans-serif';
  r.keys.forEach(function(x){
    var lines=C.wrap(g,x,CW-30);
    lines.forEach(function(l,j){
      y+=31;
      if(j===0){g.fillStyle=LAMP;g.beginPath();g.arc(M+6,y-8,5,0,Math.PI*2);g.fill()}
      g.fillStyle=C.INK;g.fillText(l,M+30,y);
    });
    y+=5;
  });
  C.foot(g,'рулетка интерьера · t.me/vtestov');

  cardEl.classList.add('shot');
  setTimeout(function(){cardEl.classList.remove('shot')},620);
  if(window.VT&&VT.sound)VT.sound.play('save');
  if(onBlob){
    if(cv.toBlob){cv.toBlob(function(bl){onBlob(bl,cv)},'image/png')}
    else onBlob(null,cv);
    return;
  }
  C.save(cv,'ideya-interiera-'+r.n+'.png',function(ok){toast(ok?'карточка сохранена':'не вышло сохранить')});
}
function withFonts(fn){VT.card.fonts(fn)}
document.getElementById('png').addEventListener('click',function(){
  if(TG){sendPoster(curRec);return}
  withFonts(function(){exportPNG(curRec)});
});

/* ============ CTA ============ */
var ctaEl=document.getElementById('cta'),ctaShown=false;
function contactHref(){return CONTACT_URL}
function bindContact(el){
  el.setAttribute('href',contactHref());
  el.addEventListener('click',function(e){
    if(CONTACT_URL.indexOf('USERNAME')>=0){e.preventDefault();toast('укажите CONTACT_URL в коде страницы');return}
    if(TG&&TG.openTelegramLink){e.preventDefault();TG.openTelegramLink(CONTACT_URL)}
  });
}
bindContact(document.getElementById('ctago'));
bindContact(document.getElementById('cardcta'));
function openCTA(){
  ctaShown=true;
  ctaEl.hidden=false;
  requestAnimationFrame(function(){ctaEl.classList.add('on')});
  setTimeout(function(){document.getElementById('ctax').focus()},60);
}
function closeCTA(){
  ctaEl.classList.remove('on');
  setTimeout(function(){ctaEl.hidden=true},260);
}
function maybeCTA(){if(!ctaShown&&sessionSpins>=3)openCTA()}
document.getElementById('ctax').addEventListener('click',closeCTA);
document.getElementById('ctano').addEventListener('click',closeCTA);
ctaEl.addEventListener('click',function(e){if(e.target===ctaEl)closeCTA()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!ctaEl.hidden)closeCTA()});

/* ============ сохранённые идеи ============ */
var KEY='ri_store_v1',storeMode='local';
var DB={v:1,items:[]};
var arch={filter:'all',limit:8};
var listEl=document.getElementById('alist'),statEl=document.getElementById('astat'),
    modeEl=document.getElementById('amode'),moreBtn=document.getElementById('amore'),
    fallBtn=document.getElementById('fall'),ffavBtn=document.getElementById('ffav');

function storageOK(){try{localStorage.setItem('__ri','1');localStorage.removeItem('__ri');return true}catch(e){return false}}
function dbLoadLocal(){
  if(!storageOK()){storeMode='session';return}
  try{var raw=localStorage.getItem(KEY);if(raw){var d=JSON.parse(raw);if(d&&d.items)DB.items=d.items}}
  catch(e){DB.items=[]}
}
function dbLoad(cb){
  if(CS){storeMode='cloud';csLoad(function(){if(cb)cb()});return}
  dbLoadLocal();if(cb)cb();
}
function dbSave(){
  if(CS){csSave();return}
  if(storeMode!=='local')return;
  try{localStorage.setItem(KEY,JSON.stringify(DB))}
  catch(e){storeMode='session';paintMode();toast('память браузера кончилась — выгрузите идеи файлом')}
}
function trim(){
  while(DB.items.length>200){
    var idx=-1,i;
    for(i=DB.items.length-1;i>=0;i--){if(!DB.items[i].fav){idx=i;break}}
    if(idx<0)break;
    DB.items.splice(idx,1);
  }
}
function recFromState(){
  var c=state.cur;
  return {id:'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),ts:Date.now(),n:state.n,
    objId:state.obj.id,grp:state.grp,area:state.area,
    concept:c.concept,style:c.style,pal:c.pal,temp:c.temp,keys:c.keys.slice(),fav:false};
}
function dbAdd(r){DB.items.unshift(r);trim();dbSave()}
function findRec(id){for(var i=0;i<DB.items.length;i++)if(DB.items[i].id===id)return DB.items[i];return null}
function paintMode(){
  var note=document.getElementById('exnote');
  if(storeMode==='cloud'){
    modeEl.className='amode';modeEl.textContent='сохраняется в вашем Telegram';
    note.textContent='Идеи лежат в облаке Telegram и привязаны к вашему аккаунту — переедут на любое устройство.';
    return;
  }
  if(storeMode==='local'){modeEl.className='amode';modeEl.textContent='сохраняется на этом устройстве'}
  else{modeEl.className='amode warn';modeEl.textContent='браузер не даёт сохранять — идеи живут до перезагрузки'}
  note.textContent=storeMode==='local'
    ?'Идеи хранятся только в этом браузере. Выгрузите файл, чтобы перенести их на другое устройство.'
    :'Этот браузер не разрешает локальное хранение. Чтобы не потерять идеи, выгрузите их файлом или сохраняйте карточки в PNG.';
}
function paintFav(){
  var on=curRec&&curRec.fav;
  favBtn.textContent=on?'★ в избранном':'☆ в избранное';
  favBtn.style.color=on?'rgb(var(--lamp))':'';
  favBtn.style.borderColor=on?'rgb(var(--lamp) / .6)':'';
}
function stamp(ts){
  var d=new Date(ts);
  return ('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
}
function rowHTML(r){
  var p=PAL[r.pal],s=STYLE[r.style];
  return '<div class="arow" data-id="'+esc(r.id)+'">'
    +'<span class="asw">'+p.c.map(function(c){return '<i style="background:'+esc(c[1])+'"></i>'}).join('')+'</span>'
    +'<span class="amain"><span class="aval">'+esc(r.concept)+' · '+esc(s.name)+'</span>'
    +'<span class="ameta">'+esc(objLabel(r))+' · '+r.temp+' K · '+stamp(r.ts)+'</span></span>'
    +'<span class="aact">'
    +'<button type="button" class="astar'+(r.fav?' on':'')+'" data-act="fav" title="избранное">★</button>'
    +'<button type="button" data-act="open" title="показать">открыть</button>'
    +(pngOK()?'<button type="button" data-act="png" title="сохранить png">png</button>':'')
    +'<button type="button" data-act="del" title="удалить">✕</button>'
    +'</span></div>';
}
function filtered(){return DB.items.filter(function(r){return arch.filter!=='fav'||r.fav})}
function renderArchive(){
  paintMode();
  var favN=0,i;
  for(i=0;i<DB.items.length;i++)if(DB.items[i].fav)favN++;
  statEl.textContent='всего '+DB.items.length+' · избранное '+favN;
  var list=filtered();
  if(!list.length){
    listEl.innerHTML='<div class="aempty">'+(DB.items.length?'в избранном пока пусто':'здесь появятся все идеи, которые вы получите')+'</div>';
    moreBtn.style.display='none';return;
  }
  listEl.innerHTML=list.slice(0,arch.limit).map(rowHTML).join('');
  moreBtn.style.display=list.length>arch.limit?'':'none';
}
listEl.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  var row=e.target.closest('.arow');if(!row)return;
  var r=findRec(row.getAttribute('data-id'));if(!r)return;
  var act=b.getAttribute('data-act');
  if(act==='fav'){r.fav=!r.fav;dbSave();if(curRec&&curRec.id===r.id)paintFav();renderArchive()}
  else if(act==='del'){DB.items.splice(DB.items.indexOf(r),1);dbSave();renderArchive();toast('идея удалена')}
  else if(act==='png'){if(TG){sendPoster(r);return}withFonts(function(){exportPNG(r)})}
  else if(act==='open'){
    showCard(r);
    if(cardEl.scrollIntoView)cardEl.scrollIntoView({behavior:'smooth',block:'center'});
  }
});
favBtn.addEventListener('click',function(){
  if(!curRec){toast('сначала получите идею');return}
  curRec.fav=!curRec.fav;dbSave();paintFav();renderArchive();
  toast(curRec.fav?'добавлено в избранное':'убрано из избранного');
});
fallBtn.addEventListener('click',function(){
  arch.filter='all';arch.limit=8;fallBtn.setAttribute('aria-pressed','true');ffavBtn.setAttribute('aria-pressed','false');renderArchive();
});
ffavBtn.addEventListener('click',function(){
  arch.filter='fav';arch.limit=8;ffavBtn.setAttribute('aria-pressed','true');fallBtn.setAttribute('aria-pressed','false');renderArchive();
});
moreBtn.addEventListener('click',function(){arch.limit+=8;renderArchive()});
document.getElementById('aexport').addEventListener('click',function(){
  if(!DB.items.length){toast('идей пока нет');return}
  var d=new Date(),ds=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
  var txt=JSON.stringify(DB,null,2),url,a=document.createElement('a');
  try{url=URL.createObjectURL(new Blob([txt],{type:'application/json'}))}
  catch(e){url='data:application/json;charset=utf-8,'+encodeURIComponent(txt)}
  a.href=url;a.download='moi-idei-'+ds+'.json';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){try{URL.revokeObjectURL(url)}catch(e){}},4000);
  toast('файл сохранён');
});
document.getElementById('aclear').addEventListener('click',function(){
  if(!DB.items.length){toast('идей пока нет');return}
  if(!window.confirm('Удалить все сохранённые идеи? Избранное тоже.'))return;
  DB.items=[];curRec=null;dbSave();renderArchive();toast('история очищена');
});

/* ============ прочее ============ */
function toast(msg){
  toastEl.textContent=msg;toastEl.classList.add('on');
  clearTimeout(toast._t);
  toast._t=setTimeout(function(){toastEl.classList.remove('on')},2100);
}
var rt;
window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){if(!busy)paintAll()},150)});

paintTypes();buildBoard();lockUI();
dbLoad(function(){
  DB.items.forEach(function(r){if(r.n>state.n)state.n=r.n});
  if(state.n)countEl.textContent='идей: '+state.n;
  renderArchive();
});
if(document.fonts&&document.fonts.ready&&document.fonts.ready.then){
  document.fonts.ready.then(function(){if(!busy)paintAll()});
}
})();
