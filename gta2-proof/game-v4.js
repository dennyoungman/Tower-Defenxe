(()=>{
'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const mapCanvas=document.getElementById('map');
const mctx=mapCanvas.getContext('2d');
const ui={
  cash:document.getElementById('cash'),
  speed:document.getElementById('speed'),
  wanted:document.getElementById('wanted'),
  objective:document.getElementById('objective'),
  toast:document.getElementById('toast')
};

const DPR=Math.min(window.devicePixelRatio||1,2);
let vw=window.innerWidth,vh=window.innerHeight;
function resize(){
  vw=window.innerWidth;vh=window.innerHeight;
  canvas.width=Math.round(vw*DPR);canvas.height=Math.round(vh*DPR);
  canvas.style.width=vw+'px';canvas.style.height=vh+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  mapCanvas.width=300;mapCanvas.height=224;
}
window.addEventListener('resize',resize);resize();

const WORLD={w:3200,h:2400,road:250};
const vRoads=[420,1120,1820,2520];
const hRoads=[380,1080,1780];
const blocks=[];
for(let ix=0;ix<vRoads.length-1;ix++){
  for(let iy=0;iy<hRoads.length-1;iy++){
    const x=vRoads[ix]+WORLD.road/2+36;
    const y=hRoads[iy]+WORLD.road/2+36;
    const w=vRoads[ix+1]-vRoads[ix]-WORLD.road-72;
    const h=hRoads[iy+1]-hRoads[iy]-WORLD.road-72;
    blocks.push({x,y,w,h,seed:ix*11+iy*17});
  }
}
blocks.push({x:35,y:35,w:260,h:250,seed:40},{x:2740,y:55,w:390,h:260,seed:41},{x:45,y:1980,w:300,h:340,seed:42},{x:2730,y:1990,w:410,h:320,seed:43});

const palette=['#966e54','#766b73','#7f745e','#6e7882','#9b8068','#657884','#806a58','#776f60'];
const carColors=['#c3453f','#d6b54d','#447aa9','#6f8d4e','#8d5e8b','#d7d2c8','#3c6267','#9a7b4f'];

const input={left:false,right:false,gas:false,brake:false};
const keyMap={arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'gas',w:'gas',arrowdown:'brake',s:'brake'};
window.addEventListener('keydown',e=>{const k=keyMap[e.key.toLowerCase()];if(k){input[k]=true;e.preventDefault();}});
window.addEventListener('keyup',e=>{const k=keyMap[e.key.toLowerCase()];if(k){input[k]=false;e.preventDefault();}});

function bindTouchButton(id,key){
  const el=document.getElementById(id);
  if(!el)return;
  const held=new Set();
  el.style.touchAction='none';
  const sync=()=>{input[key]=held.size>0;el.classList.toggle('active',input[key]);};
  const down=e=>{
    e.preventDefault();
    const id=e.pointerId!=null?e.pointerId:'mouse';
    held.add(id);
    try{if(e.pointerId!=null)el.setPointerCapture(e.pointerId);}catch(_){ }
    sync();
  };
  const up=e=>{
    e.preventDefault();
    const id=e.pointerId!=null?e.pointerId:'mouse';
    held.delete(id);
    sync();
  };
  el.addEventListener('pointerdown',down,{passive:false});
  el.addEventListener('pointerup',up,{passive:false});
  el.addEventListener('pointercancel',up,{passive:false});
  el.addEventListener('lostpointercapture',up,{passive:false});
  el.addEventListener('contextmenu',e=>e.preventDefault());
}
bindTouchButton('left','left');bindTouchButton('right','right');bindTouchButton('gas','gas');bindTouchButton('brake','brake');
window.addEventListener('blur',()=>{input.left=input.right=input.gas=input.brake=false;document.querySelectorAll('.controls button').forEach(b=>b.classList.remove('active'));});

const player={x:760,y:1000,a:-Math.PI/2,v:0,w:34,h:66,cash:1250,wanted:0,heat:0,damage:0};
const camera={x:player.x,y:player.y,zoom:1,shake:0};
const mission={x:2370,y:1550,stage:0,phase:0};
const skid=[];
const traffic=[];
const police=[];
const peds=[];
const trees=[];
let toastTimer=0;

function onRoad(x,y){return vRoads.some(v=>Math.abs(x-v)<WORLD.road/2)||hRoads.some(h=>Math.abs(y-h)<WORLD.road/2);}
function buildingCollision(x,y){for(const b of blocks){const i=18;if(x>b.x+i&&x<b.x+b.w-i&&y>b.y+i&&y<b.y+b.h-i)return true;}return false;}
function addHeat(v){player.heat=Math.min(5.8,player.heat+v);}
function showToast(t){ui.toast.textContent=t;ui.toast.classList.add('show');toastTimer=1.4;}

function routeCar(horizontal,lane,pos,dir,color,i){
  traffic.push({horizontal,lane,pos,dir,speed:76+((i*31)%46),color,x:0,y:0,a:horizontal?(dir>0?0:Math.PI):(dir>0?Math.PI/2:-Math.PI/2),r:28});
}
for(let i=0;i<14;i++){
  if(i%2){const y=hRoads[(i>>1)%hRoads.length]+(i%4<2?-48:48);routeCar(true,y,(i*201)%WORLD.w,i%3?1:-1,carColors[i%carColors.length],i);}
  else{const x=vRoads[(i>>1)%vRoads.length]+(i%4<2?-48:48);routeCar(false,x,(i*173)%WORLD.h,i%3?1:-1,carColors[i%carColors.length],i);}
}

function nearestSidewalkPoint(seed){
  const r=seed%7;
  if(r<4){const x=vRoads[r%vRoads.length]+(seed%2?155:-155);return{x,y:120+(seed*113)%(WORLD.h-240),axis:'y',dir:seed%3?1:-1};}
  const y=hRoads[r%hRoads.length]+(seed%2?155:-155);return{x:100+(seed*181)%(WORLD.w-200),y,axis:'x',dir:seed%3?1:-1};
}
const pedColors=['#d9b27c','#8aa6c4','#c27569','#84a06d','#d1c2a8','#8d79aa'];
for(let i=0;i<34;i++){const p=nearestSidewalkPoint(i*7+3);peds.push({...p,speed:24+(i*9)%22,color:pedColors[i%pedColors.length],step:i*.7});}
for(const b of blocks){for(let i=0;i<4;i++){trees.push({x:b.x+35+(i*131+b.seed*17)%Math.max(70,b.w-70),y:b.y+28+(i*97+b.seed*29)%Math.max(70,b.h-60),r:16+(i%3)*3});}}

function resolveTrafficCollision(c){
  const dx=player.x-c.x,dy=player.y-c.y;
  const d=Math.hypot(dx,dy);const min=46;
  if(d>=min)return;
  const nx=d>0?dx/d:1,ny=d>0?dy/d:0;
  const overlap=min-d;
  player.x+=nx*overlap*0.72;player.y+=ny*overlap*0.72;
  if(c.horizontal)c.pos-=nx*overlap*0.28;else c.pos-=ny*overlap*0.28;
  player.v*=-0.18;c.speed=Math.max(45,c.speed*0.72);camera.shake=7;addHeat(.15);
}

function updateTraffic(dt){
  for(const c of traffic){
    c.pos+=c.speed*c.dir*dt;
    if(c.horizontal){if(c.pos<-100)c.pos=WORLD.w+100;if(c.pos>WORLD.w+100)c.pos=-100;c.x=c.pos;c.y=c.lane;}
    else{if(c.pos<-100)c.pos=WORLD.h+100;if(c.pos>WORLD.h+100)c.pos=-100;c.x=c.lane;c.y=c.pos;}
    resolveTrafficCollision(c);
  }
  for(let i=0;i<traffic.length;i++)for(let j=i+1;j<traffic.length;j++){
    const a=traffic[i],b=traffic[j];const d=Math.hypot(a.x-b.x,a.y-b.y);
    if(d<46){a.speed=Math.max(42,a.speed*.92);b.speed=Math.max(42,b.speed*.92);}
  }
}

function updatePlayer(dt){
  const road=onRoad(player.x,player.y);
  const accel=road?305:155,max=road?305:145;
  if(input.gas)player.v+=accel*dt;
  if(input.brake)player.v-=350*dt;
  if(!input.gas&&!input.brake)player.v*=Math.pow(road?0.985:0.968,dt*60);
  player.v=Math.max(-115,Math.min(max,player.v));
  const steer=(input.right?1:0)-(input.left?1:0);
  const grip=Math.min(1,Math.abs(player.v)/55);
  player.a+=steer*2.25*grip*dt*(player.v>=0?1:-1);
  const ox=player.x,oy=player.y;
  player.x+=Math.cos(player.a)*player.v*dt;
  player.y+=Math.sin(player.a)*player.v*dt;
  player.x=Math.max(26,Math.min(WORLD.w-26,player.x));player.y=Math.max(26,Math.min(WORLD.h-26,player.y));
  if(buildingCollision(player.x,player.y)){
    player.x=ox;player.y=oy;player.v*=-.24;camera.shake=7;addHeat(.25);showToast('CRUNCH');
  }
  if(Math.abs(steer)>.5&&Math.abs(player.v)>175){skid.push({x:player.x,y:player.y,life:1});if(skid.length>160)skid.shift();}
  skid.forEach(s=>s.life-=dt*.25);
}

function spawnPolice(){
  if(police.length>=Math.min(4,player.wanted+1))return;
  const a=Math.random()*Math.PI*2,d=620;
  police.push({x:player.x+Math.cos(a)*d,y:player.y+Math.sin(a)*d,a:a+Math.PI,v:115,flash:0});
}
function updatePolice(dt){
  if(player.wanted>0&&Math.random()<dt*(.45+player.wanted*.2))spawnPolice();
  for(let i=police.length-1;i>=0;i--){
    const p=police[i];p.flash+=dt*9;
    const target=Math.atan2(player.y-p.y,player.x-p.x);
    let da=((target-p.a+Math.PI*3)%(Math.PI*2))-Math.PI;
    p.a+=Math.max(-1.8*dt,Math.min(1.8*dt,da));
    p.v+=(180+player.wanted*18-p.v)*dt*.9;
    p.x+=Math.cos(p.a)*p.v*dt;p.y+=Math.sin(p.a)*p.v*dt;
    const d=Math.hypot(player.x-p.x,player.y-p.y);
    if(d<46){const nx=(player.x-p.x)/(d||1),ny=(player.y-p.y)/(d||1);player.x+=nx*5;player.y+=ny*5;player.v*=.74;camera.shake=6;}
    if(player.wanted===0||d>1500)police.splice(i,1);
  }
}

function updatePeds(dt){
  for(const p of peds){
    p.step+=dt*p.speed*.12;
    if(p.axis==='x'){p.x+=p.speed*p.dir*dt;if(p.x<70||p.x>WORLD.w-70)p.dir*=-1;}
    else{p.y+=p.speed*p.dir*dt;if(p.y<70||p.y>WORLD.h-70)p.dir*=-1;}
    const d=Math.hypot(player.x-p.x,player.y-p.y);
    if(d<28&&Math.abs(player.v)>60){p.dir*=-1;p.speed=58;player.v*=.86;addHeat(.65);camera.shake=6;}
  }
}

function updateMission(dt){
  mission.phase+=dt;
  if(Math.hypot(player.x-mission.x,player.y-mission.y)<80){
    mission.stage++;player.cash+=500;showToast('JOB COMPLETE  +$500');
    if(mission.stage%3===1){mission.x=620;mission.y=2070;}else if(mission.stage%3===2){mission.x=2780;mission.y=570;}else{mission.x=2370;mission.y=1550;}
    ui.objective.innerHTML='<b>JOB</b><span>New pickup marked on the map.</span>';
  }
}

function update(dt){
  updatePlayer(dt);updateTraffic(dt);updatePeds(dt);updateMission(dt);
  if(player.heat>0)player.heat=Math.max(0,player.heat-dt*.055);
  const wanted=Math.min(5,Math.floor(player.heat));
  if(wanted!==player.wanted){player.wanted=wanted;if(wanted>0)showToast('POLICE ALERT');}
  updatePolice(dt);
  camera.x+=(player.x-camera.x)*Math.min(1,dt*5.5);camera.y+=(player.y-camera.y)*Math.min(1,dt*5.5);
  camera.zoom+=(1+Math.min(.12,Math.abs(player.v)/2400)-camera.zoom)*dt*3;camera.shake=Math.max(0,camera.shake-dt*20);
  ui.cash.textContent='$'+player.cash.toLocaleString();ui.speed.textContent=Math.round(Math.abs(player.v)*.72);ui.wanted.textContent='★'.repeat(player.wanted)+'☆'.repeat(5-player.wanted);
  if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show');}
}

function rr(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else{c.rect(x,y,w,h);} }
function drawRoads(){
  ctx.fillStyle='#2d3438';ctx.fillRect(0,0,WORLD.w,WORLD.h);
  ctx.fillStyle='#23292d';vRoads.forEach(x=>ctx.fillRect(x-WORLD.road/2,0,WORLD.road,WORLD.h));hRoads.forEach(y=>ctx.fillRect(0,y-WORLD.road/2,WORLD.w,WORLD.road));
  ctx.strokeStyle='#8b8372';ctx.lineWidth=4;ctx.setLineDash([30,26]);
  vRoads.forEach(x=>{ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD.h);ctx.stroke();});hRoads.forEach(y=>{ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD.w,y);ctx.stroke();});ctx.setLineDash([]);
  ctx.strokeStyle='#d5caa8';ctx.lineWidth=3;vRoads.forEach(x=>[-76,76].forEach(o=>{ctx.beginPath();ctx.moveTo(x+o,0);ctx.lineTo(x+o,WORLD.h);ctx.stroke();}));hRoads.forEach(y=>[-76,76].forEach(o=>{ctx.beginPath();ctx.moveTo(0,y+o);ctx.lineTo(WORLD.w,y+o);ctx.stroke();}));
  ctx.fillStyle='#bbb4a3';vRoads.forEach(x=>hRoads.forEach(y=>{for(let i=-4;i<=4;i++){ctx.fillRect(x-100+i*24,y-112,13,44);ctx.fillRect(x-100+i*24,y+68,13,44);ctx.fillRect(x-112,y-100+i*24,44,13);ctx.fillRect(x+68,y-100+i*24,44,13);}}));
}
function drawBuilding(b,i){
  ctx.fillStyle='#0005';rr(ctx,b.x+12,b.y+14,b.w,b.h,10);ctx.fill();
  ctx.fillStyle=palette[i%palette.length];rr(ctx,b.x,b.y,b.w,b.h,10);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(b.x+12,b.y+12,b.w-24,10);
  ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(b.x+12,b.y+b.h-24,b.w-24,12);
  ctx.fillStyle='#bbb6a7';for(let k=0;k<3;k++){const rx=b.x+34+(k*97+b.seed*13)%Math.max(60,b.w-90),ry=b.y+30+(k*73+b.seed*9)%Math.max(60,b.h-90);ctx.fillRect(rx,ry,36,24);ctx.fillStyle='#686c6d';ctx.fillRect(rx+5,ry+4,26,16);ctx.fillStyle='#bbb6a7';}
}
function drawBlocks(){blocks.forEach((b,i)=>{ctx.fillStyle='#a7a49a';ctx.fillRect(b.x-24,b.y-24,b.w+48,b.h+48);ctx.fillStyle='#73736e';ctx.fillRect(b.x-18,b.y-18,b.w+36,b.h+36);drawBuilding(b,i);});}
function drawTrees(){for(const t of trees){ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(t.x+8,t.y+10,t.r*.95,t.r*.55,.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#594635';ctx.fillRect(t.x-3,t.y-3,6,16);ctx.fillStyle='#315f47';ctx.beginPath();ctx.arc(t.x,t.y-8,t.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#47775a';ctx.beginPath();ctx.arc(t.x-7,t.y-15,t.r*.55,0,Math.PI*2);ctx.fill();}}
function drawCar(c,policeCar=false,playerCar=false){
  ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);
  ctx.fillStyle='#0007';rr(ctx,-18+7,-33+9,36,66,8);ctx.fill();
  ctx.fillStyle=policeCar?'#edf1f3':(playerCar?'#d9473e':c.color);rr(ctx,-18,-33,36,66,8);ctx.fill();
  ctx.fillStyle='#8cc5d4';ctx.fillRect(-13,-16,26,18);ctx.fillStyle='#14313b';ctx.fillRect(-11,-14,22,14);ctx.fillStyle='#8cc5d4';ctx.fillRect(-12,8,24,15);
  ctx.fillStyle='#f5d77c';ctx.fillRect(-14,-31,8,4);ctx.fillRect(6,-31,8,4);ctx.fillStyle='#c93e3e';ctx.fillRect(-14,27,8,4);ctx.fillRect(6,27,8,4);
  if(policeCar){ctx.fillStyle='#2476bf';ctx.fillRect(-11,-3,10,5);ctx.fillStyle='#d94b48';ctx.fillRect(1,-3,10,5);}
  ctx.restore();
}
function drawPed(p){ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(3,7,8,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2e2c2b';ctx.fillRect(-3,6,2,7);ctx.fillRect(2,6,2,7);ctx.restore();}
function drawMission(){const pulse=1+Math.sin(mission.phase*4)*.12;ctx.save();ctx.translate(mission.x,mission.y);ctx.strokeStyle='#ffd85e';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,34*pulse,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ffd85e33';ctx.beginPath();ctx.arc(0,0,25*pulse,0,Math.PI*2);ctx.fill();ctx.restore();}
function renderWorld(){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,vw,vh);ctx.save();
  const sx=(Math.random()-.5)*camera.shake,sy=(Math.random()-.5)*camera.shake;ctx.translate(vw/2+sx,vh/2+sy);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);
  drawRoads();drawBlocks();drawTrees();drawMission();
  ctx.strokeStyle='#151719';ctx.lineWidth=4;ctx.globalAlpha=.45;for(const s of skid){if(s.life<=0)continue;ctx.globalAlpha=Math.max(0,s.life*.4);ctx.beginPath();ctx.moveTo(s.x-5,s.y);ctx.lineTo(s.x+5,s.y);ctx.stroke();}ctx.globalAlpha=1;
  peds.forEach(drawPed);traffic.forEach(c=>drawCar(c,false,false));police.forEach(c=>drawCar(c,true,false));drawCar(player,false,true);
  ctx.restore();
}
function renderMap(){
  const w=mapCanvas.width,h=mapCanvas.height;mctx.clearRect(0,0,w,h);mctx.fillStyle='#10181d';mctx.fillRect(0,0,w,h);mctx.strokeStyle='#59656b';mctx.lineWidth=9;
  vRoads.forEach(x=>{mctx.beginPath();mctx.moveTo(x/WORLD.w*w,0);mctx.lineTo(x/WORLD.w*w,h);mctx.stroke();});hRoads.forEach(y=>{mctx.beginPath();mctx.moveTo(0,y/WORLD.h*h);mctx.lineTo(w,y/WORLD.h*h);mctx.stroke();});
  mctx.fillStyle='#ffd85e';mctx.beginPath();mctx.arc(mission.x/WORLD.w*w,mission.y/WORLD.h*h,4,0,Math.PI*2);mctx.fill();mctx.fillStyle='#d9473e';mctx.beginPath();mctx.arc(player.x/WORLD.w*w,player.y/WORLD.h*h,4,0,Math.PI*2);mctx.fill();mctx.fillStyle='#6aa7d5';for(const p of police){mctx.beginPath();mctx.arc(p.x/WORLD.w*w,p.y/WORLD.h*h,3,0,Math.PI*2);mctx.fill();}
}

let last=performance.now();
function frame(now){const dt=Math.min(.035,(now-last)/1000||0);last=now;update(dt);renderWorld();renderMap();requestAnimationFrame(frame);}requestAnimationFrame(frame);
showToast('DRIVE');
})();