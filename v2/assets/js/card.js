/* ============================================================
   Карточка PNG (1080×1350) — общая основа для «Рулетки» и «Палитры»:
   фон со светом, стеклянная панель, водяной знак, шапка и подпись.
   Акцент карточки — текущий свет сайта.
   ============================================================ */
(function(){
"use strict";
var VT=window.VT=window.VT||{};
var W=1080,H=1350,M=76,CW=W-M*2;
var INK='#F3F6FB',INK2='#BCC5D3',INK3='#8791A4';

function lamp(){return (VT.light&&VT.light.rgb)?VT.light.rgb(VT.light.get()):[255,190,128]}
function lamp2(){return (VT.light&&VT.light.rgb)?VT.light.rgb(VT.light.min+VT.light.max-VT.light.get()):[128,186,255]}
function rgba(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'}
function rr(g,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();
}
/* текст вразрядку (letter-spacing в canvas есть не везде) */
function trackedW(g,t,sp){var w=0,i;for(i=0;i<t.length;i++)w+=g.measureText(t[i]).width+sp;return w-sp}
function tracked(g,t,x,y,sp,right){
  var i;if(right)x-=trackedW(g,t,sp);
  for(i=0;i<t.length;i++){g.fillText(t[i],x,y);x+=g.measureText(t[i]).width+sp}
}
function mono(g,t,x,y,color,size,right){
  g.font='400 '+(size||17)+'px "Martian Mono", monospace';g.fillStyle=color||INK3;
  tracked(g,String(t).toUpperCase(),x,y,(size||17)*.1,right);
}
function wrap(g,t,maxW){
  var words=String(t).split(' '),lines=[],cur='';
  words.forEach(function(w){
    var tst=cur?cur+' '+w:w;
    if(g.measureText(tst).width>maxW&&cur){lines.push(cur);cur=w}else cur=tst;
  });
  if(cur)lines.push(cur);
  return lines;
}
/* знак VT */
function mark(g,x,y,s,color,lw){
  var k=s/32;
  g.save();g.translate(x,y);g.strokeStyle=color;g.lineWidth=lw||2.2;g.lineCap='round';g.lineJoin='round';
  g.beginPath();g.moveTo(4.5*k,6.5*k);g.lineTo(16*k,27*k);g.lineTo(27.5*k,6.5*k);
  g.moveTo(10.5*k,6.5*k);g.lineTo(21.5*k,6.5*k);g.moveTo(16*k,6.5*k);g.lineTo(16*k,19*k);g.stroke();
  g.restore();
}
/* водяной знак: знак и имя диагональным узором, соседние ряды сдвинуты на полшага.
   Рисуется под содержимым — плашки палитры и текст ложатся поверх. */
function watermark(g,c){
  var ww=430,wh=64,sx=ww+150,sy=wh+170,R=Math.sqrt(W*W+H*H)/2;
  var rows=Math.ceil(R/sy)+1,cols=Math.ceil(R/sx)+1,r,q,x,y;
  g.save();
  rr(g,M-22,M-22,W-(M-22)*2,H-(M-22)*2,46);g.clip();
  g.globalAlpha=.2;
  g.translate(W/2,H/2);g.rotate(-Math.PI/3);
  g.font='300 30px Unbounded, sans-serif';g.fillStyle=rgba(c,1);g.textBaseline='middle';
  for(r=-rows;r<=rows;r++){
    for(q=-cols;q<=cols;q++){
      x=q*sx+(r&1?sx/2:0)-ww/2;y=r*sy;
      mark(g,x,y-24,48,rgba(c,1),2);
      g.fillText('VALENTIN TESTOV',x+62,y+2);
    }
  }
  g.restore();
}
/* основа: возвращает холст и контекст */
function base(headRight){
  var cv=document.createElement('canvas');cv.width=W;cv.height=H;
  var g=cv.getContext&&cv.getContext('2d');
  if(!g)return null;
  var c=lamp(),c2=lamp2(),gr;
  g.textBaseline='alphabetic';
  g.fillStyle='#05070B';g.fillRect(0,0,W,H);
  gr=g.createRadialGradient(W*.92,H*.02,0,W*.92,H*.02,820);gr.addColorStop(0,rgba(c,.34));gr.addColorStop(1,rgba(c,0));
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  gr=g.createRadialGradient(W*.04,H*1.0,0,W*.04,H*1.0,760);gr.addColorStop(0,rgba(c2,.24));gr.addColorStop(1,rgba(c2,0));
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  /* стеклянная панель */
  var px=M-22,py=M-22,pw=W-px*2,ph=H-py*2;
  rr(g,px,py,pw,ph,46);
  gr=g.createLinearGradient(px,py,px+pw,py+ph);gr.addColorStop(0,'rgba(255,255,255,.085)');gr.addColorStop(.5,'rgba(255,255,255,.028)');gr.addColorStop(1,'rgba(255,255,255,.05)');
  g.fillStyle='rgba(9,12,18,.55)';g.fill();g.fillStyle=gr;g.fill();
  watermark(g,c);
  rr(g,px,py,pw,ph,46);
  gr=g.createLinearGradient(px,py,px+pw,py+ph);gr.addColorStop(0,'rgba(255,255,255,.6)');gr.addColorStop(.3,'rgba(255,255,255,.08)');gr.addColorStop(.62,'rgba(255,255,255,.04)');gr.addColorStop(1,rgba(c,.6));
  g.strokeStyle=gr;g.lineWidth=1.5;g.stroke();
  /* шапка */
  mark(g,M,M-2,34,rgba(c,1),2.4);
  g.font='400 21px Unbounded, sans-serif';g.fillStyle=INK;g.fillText('Valentin Testov',M+48,M+22);
  if(headRight)mono(g,headRight,M+CW,M+21,rgba(c,1),16,true);
  g.fillStyle='rgba(255,255,255,.12)';g.fillRect(M,M+46,CW,1);
  return {cv:cv,g:g,c:c,c2:c2};
}
function foot(g,left){
  var d=new Date(),ds=('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+'.'+d.getFullYear();
  g.fillStyle='rgba(255,255,255,.12)';g.fillRect(M,H-M-38,CW,1);
  mono(g,left,M,H-M-6,INK3,15);
  mono(g,ds,M+CW,H-M-6,INK3,15,true);
}
function fonts(fn,extra){
  var f=document.fonts,list;
  if(f&&f.load){
    list=[f.load('300 60px Unbounded'),f.load('400 22px Unbounded'),f.load('400 22px Onest'),f.load('500 22px Onest'),f.load('400 16px "Martian Mono"')];
    if(extra)list.push(extra);
    Promise.all(list).then(function(){fn()},function(){fn()});
  }else fn();
}
function save(cv,name,done){
  function go(url,rev){
    var a=document.createElement('a');
    a.href=url;a.download=name;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    if(rev)setTimeout(function(){try{URL.revokeObjectURL(url)}catch(e){}},4000);
    if(done)done(true);
  }
  if(cv.toBlob)cv.toBlob(function(b){if(!b){if(done)done(false);return}go(URL.createObjectURL(b),true)},'image/png');
  else go(cv.toDataURL('image/png'),false);
}
VT.card={W:W,H:H,M:M,CW:CW,INK:INK,INK2:INK2,INK3:INK3,base:base,foot:foot,fonts:fonts,save:save,rr:rr,mono:mono,wrap:wrap,rgba:rgba,tracked:tracked,trackedW:trackedW};
})();
