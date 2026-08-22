(()=>{
'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const mapCanvas=document.getElementById('map');
const mctx=mapCanvas.getContext('2d');
const ui={cash:document.getElementById('cash'),speed:document.getElementById('speed'),wanted:document.getElementById('wanted'),objective:document.getElementById('objective'),toast:document.getElementById('toast')};

const DPR=Math.min(window.devicePixelRatio||1,2);
let vw=innerWidth,vh=innerHeight,last=performance.now();
function resize(){vw=innerWidth;vh=innerHeight;canvas.width=Math.round(vw*DPR);canvas.height=Math.round(vh*DPR);canvas.style.width=vw+'px';canvas.style.height=vh+'px';ctx.setTransform(DPR,0,0,DPR,0,0);mapCanvas.width=300;mapCanvas.height=224;}
addEventListener('resize',resize);resize();

const WORLD={w:3200,h:2400,road:250};
const vRoads=[420,1120,1820,2520];
const hRoads=[380,1080,1780];
const blocks=[];
for(let ix=0;ix<vRoads.length-1;ix++)for(let iy=0;iy<hRoads.length-1;iy++){
  const x=vRoads[ix]+WORLD.road/2+42,y=hRoads[iy]+WORLD.road/2+42;
  const w=vRoads[ix+1]-vRoads[ix]-WORLD.road-84,h=hRoads[iy+1]-hRoads[iy]-WORLD.road-84;
  blocks.push({x,y,w,h,seed:ix*13+iy*19});
}
blocks.push({x:40,y:40,w:250,h:245,seed:40},{x:2760,y:50,w:360,h:250,seed:41},{x:45,y:2000,w:300,h:315,seed:42},{x:2750,y:2000,w:370,h:300,seed:43});

const palette=['#966e54','#766b73','#7f745e','#6e7882','#9b8068','#657884','#806a58','#776f60'];
const carColors=['#c3453f','#d6b54d','#447aa9','#6f8d4e','#8d5e8b','#d7d2c8','#3c6267','#9a7b4f'];

const input={left:false,right:false,gas:false,brake:false};
const keyMap={arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'gas',w:'gas',arrowdown:'brake',s:'brake'};
addEventListener('keydown',e=>{const k=keyMap[e.key.toLowerCase()];if(k){input[k]=true;e.preventDefault();}});
addEventListener('keyup',e=>{const k=keyMap[e.key.toLowerCase()];if(k){input[k]=false;e.preventDefault();}});
function bindButton(id,key){const el=document.getElementById(id);const held=new Set();el.style.touchAction='none';const sync=()=>{input[key]=held.size>0;el.classList.toggle('active',input[key]);};const down=e=>{e.preventDefault();held.add(e.pointerId??'mouse');try{el.setPointerCapture(e.pointerId);}catch(_){}sync();};const up=e=>{e.preventDefault();held.delete(e.pointerId??'mouse');sync();};el.addEventListener('pointerdown',down,{passive:false});el.addEventListener('pointerup',up,{passive:false});el.addEventListener('pointercancel',up,{passive:false});el.addEventListener('lostpointercapture',up,{passive:false});el.addEventListener('contextmenu',e=>e.preventDefault());}
bindButton('left','left');bindButton('right','right');bindButton('gas','gas');bindButton('brake','brake');
addEventListener('blur',()=>{input.left=input.right=input.gas=input.brake=false;document.querySelectorAll('.controls button').forEach(b=>b.classList.remove('active'));});

const player={x:760,y:1080,a:0,v:0,r:25,cash:1250,heat:0,wanted:0};
const camera={x:player.x,y:player.y,zoom:1,shake:0};
const missionPoints=[{x:1820,y:380},{x:2520,y:1780},{x:420,y:1780},{x:1120,y:380}];
let missionIndex=0,toastTimer=0;
const mission={...missionPoints[0],phase:0};
const skid=[];

function onRoad(x,y){return vRoads.some(v=>Math.abs(x-v)<WORLD.road/2)||hRoads.some(h=>Math.abs(y-h)<WORLD.road/2);}
function circleRect(cx,cy,r,b){const nx=Math.max(b.x,Math.min(cx,b.x+b.w)),ny=Math.max(b.y,Math.min(cy,b.y+b.h));const dx=cx-nx,dy=cy-ny;return dx*dx+dy*dy<r*r;}
function solidAt(x,y,r=player.r){if(x-r<0||y-r<0||x+r>WORLD.w||y+r>WORLD.h)return true;return blocks.some(b=>circleRect(x,y,r,b));}
function showToast(t){ui.toast.textContent=t;ui.toast.classList.add('show');toastTimer=1.25;}
function addHeat(v){player.heat=Math.min(5.9,player.heat+v);}

const traffic=[];
function addTraffic(axis,lane,pos,dir,color,speed){traffic.push({axis,lane,pos,dir,color,base:speed,speed,x:0,y:0,a:axis==='h'?(dir>0?0:Math.PI):(dir>0?Math.PI/2:-Math.PI/2),r:27});}
for(let i=0;i<12;i++){
  if(i%2===0){const y=hRoads[(i/2)%hRoads.length]+(i%4===0?-48:48);addTraffic('h',y,(190+i*227)%WORLD.w,i%3?1:-1,carColors[i%carColors.length],76+(i*11)%42);}
  else{const x=vRoads[Math.floor(i/2)%vRoads.length]+(i%4===1?-48:48);addTraffic('v',x,(140+i*193)%WORLD.h,i%3?1:-1,carColors[i%carColors.length],74+(i*13)%40);}
}

const peds=[];const pedColors=['#d9b27c','#8aa6c4','#c27569','#84a06d','#d1c2a8','#8d79aa'];
for(let i=0;i<30;i++){
  if(i%2===0){const x=vRoads[(i/2)%vRoads.length]+(i%4===0?155:-155);peds.push({x,y:100+(i*157)%(WORLD.h-200),axis:'y',dir:i%3?1:-1,speed:25+(i*7)%18,color:pedColors[i%pedColors.length],step:i});}
  else{const y=hRoads[Math.floor(i/2)%hRoads.length]+(i%4===1?155:-155);peds.push({x:100+(i*181)%(WORLD.w-200),y,axis:'x',dir:i%3?1:-1,speed:25+(i*9)%18,color:pedColors[i%pedColors.length],step:i});}
}
const trees=[];for(const b of blocks)for(let i=0;i<3;i++)trees.push({x:b.x+30+(i*137+b.seed*17)%Math.max(50,b.w-60),y:b.y+28+(i*101+b.seed*23)%Math.max(50,b.h-56),r:15+(i%2)*4});
const police=[];

function movePlayer(dt){
  const road=onRoad(player.x,player.y);
  const maxForward=road?305:150,maxReverse=95;
  if(input.gas)player.v+= (road?260:135)*dt;
  if(input.brake){if(player.v>8)player.v-=420*dt;else player.v-=150*dt;}
  if(!input.gas&&!input.brake)player.v*=Math.pow(road?0.984:0.955,dt*60);
  if(Math.abs(player.v)<0.35&&!input.gas&&!input.brake)player.v=0;
  player.v=Math.max(-maxReverse,Math.min(maxForward,player.v));

  const steer=(input.right?1:0)-(input.left?1:0);
  const steerGrip=Math.min(1,Math.abs(player.v)/70);
  if(steer&&steerGrip>0)player.a+=steer*2.15*steerGrip*dt*(player.v>=0?1:-1);

  const distance=player.v*dt;
  const steps=Math.max(1,Math.ceil(Math.abs(distance)/7));
  const step=distance/steps;
  let collided=false;
  for(let i=0;i<steps;i++){
    const nx=player.x+Math.cos(player.a)*step,ny=player.y+Math.sin(player.a)*step;
    if(solidAt(nx,ny)){collided=true;break;}
    player.x=nx;player.y=ny;
  }
  if(collided){player.v*=-0.12;camera.shake=6;showToast('CRUNCH');}
  if(Math.abs(steer)>.5&&Math.abs(player.v)>165){skid.push({x:player.x,y:player.y,life:1});if(skid.length>140)skid.shift();}
  for(const s of skid)s.life-=dt*.3;
}

function carSeparation(car){
  const dx=player.x-car.x,dy=player.y-car.y,d=Math.hypot(dx,dy),min=player.r+car.r;
  if(d>=min)return;
  const nx=d>0?dx/d:1,ny=d>0?dy/d:0,over=min-d+1;
  const ox=player.x,oy=player.y;
  player.x+=nx*over;player.y+=ny*over;
  if(solidAt(player.x,player.y)){player.x=ox;player.y=oy;}
  player.v*=0.38;camera.shake=5;addHeat(.08);
}

function updateTraffic(dt){
  for(const c of traffic){
    let target=c.base;
    for(const o of traffic){if(o===c||o.axis!==c.axis||Math.abs(o.lane-c.lane)>4)continue;const gap=(o.pos-c.pos)*c.dir;if(gap>0&&gap<105)target=Math.min(target,Math.max(0,(gap-35)*1.3));}
    c.speed+=(target-c.speed)*Math.min(1,dt*4);
    c.pos+=c.speed*c.dir*dt;
    if(c.axis==='h'){if(c.pos<-120)c.pos=WORLD.w+120;if(c.pos>WORLD.w+120)c.pos=-120;c.x=c.pos;c.y=c.lane;}
    else{if(c.pos<-120)c.pos=WORLD.h+120;if(c.pos>WORLD.h+120)c.pos=-120;c.x=c.lane;c.y=c.pos;}
    carSeparation(c);
  }
}

function updatePeds(dt){for(const p of peds){p.step+=dt*p.speed*.13;if(p.axis==='x'){p.x+=p.speed*p.dir*dt;if(p.x<60||p.x>WORLD.w-60)p.dir*=-1;}else{p.y+=p.speed*p.dir*dt;if(p.y<60||p.y>WORLD.h-60)p.dir*=-1;}if(Math.hypot(player.x-p.x,player.y-p.y)<31&&Math.abs(player.v)>45){p.dir*=-1;p.speed=55;player.v*=.82;addHeat(.5);camera.shake=4;}}}

function spawnPolice(){if(police.length>=Math.min(3,player.wanted+1))return;const a=Math.random()*Math.PI*2,d=560;let x=player.x+Math.cos(a)*d,y=player.y+Math.sin(a)*d;if(solidAt(x,y,28)){x=player.x+500;y=player.y;}police.push({x,y,a:Math.atan2(player.y-y,player.x-x),v:120,r:28,flash:0});}
function updatePolice(dt){if(player.wanted&&Math.random()<dt*(.35+player.wanted*.18))spawnPolice();for(let i=police.length-1;i>=0;i--){const p=police[i];p.flash+=dt*8;const target=Math.atan2(player.y-p.y,player.x-p.x),diff=((target-p.a+Math.PI*3)%(Math.PI*2))-Math.PI;p.a+=Math.max(-1.7*dt,Math.min(1.7*dt,diff));p.v+=(175+player.wanted*18-p.v)*dt*.9;const nx=p.x+Math.cos(p.a)*p.v*dt,ny=p.y+Math.sin(p.a)*p.v*dt;if(!solidAt(nx,ny,p.r)){p.x=nx;p.y=ny;}else p.a+=Math.PI*.6;carSeparation(p);if(player.wanted===0||Math.hypot(player.x-p.x,player.y-p.y)>1500)police.splice(i,1);}}

function updateMission(dt){mission.phase+=dt;if(Math.hypot(player.x-mission.x,player.y-mission.y)<82){missionIndex=(missionIndex+1)%missionPoints.length;Object.assign(mission,missionPoints[missionIndex]);player.cash+=500;showToast('JOB COMPLETE  +$500');ui.objective.innerHTML='<b>JOB</b><span>New pickup marked on the map.</span>';}}

function update(dt){movePlayer(dt);updateTraffic(dt);updatePeds(dt);updateMission(dt);if(player.heat>0)player.heat=Math.max(0,player.heat-dt*.06);player.wanted=Math.min(5,Math.floor(player.heat));updatePolice(dt);camera.x+=(player.x-camera.x)*Math.min(1,dt*6);camera.y+=(player.y-camera.y)*Math.min(1,dt*6);camera.zoom+=(1+Math.min(.1,Math.abs(player.v)/2600)-camera.zoom)*dt*3;camera.shake=Math.max(0,camera.shake-dt*18);ui.cash.textContent='$'+player.cash.toLocaleString();ui.speed.textContent=Math.round(Math.abs(player.v)*.72);ui.wanted.textContent='★'.repeat(player.wanted)+'☆'.repeat(5-player.wanted);if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show');}}

function rr(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);}
function drawRoads(){ctx.fillStyle='#293237';ctx.fillRect(0,0,WORLD.w,WORLD.h);ctx.fillStyle='#22292d';for(const x of vRoads)ctx.fillRect(x-WORLD.road/2,0,WORLD.road,WORLD.h);for(const y of hRoads)ctx.fillRect(0,y-WORLD.road/2,WORLD.w,WORLD.road);ctx.strokeStyle='#928b79';ctx.lineWidth=4;ctx.setLineDash([30,26]);for(const x of vRoads){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD.h);ctx.stroke();}for(const y of hRoads){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD.w,y);ctx.stroke();}ctx.setLineDash([]);ctx.strokeStyle='#d3c9a9';ctx.lineWidth=3;for(const x of vRoads)for(const o of[-76,76]){ctx.beginPath();ctx.moveTo(x+o,0);ctx.lineTo(x+o,WORLD.h);ctx.stroke();}for(const y of hRoads)for(const o of[-76,76]){ctx.beginPath();ctx.moveTo(0,y+o);ctx.lineTo(WORLD.w,y+o);ctx.stroke();}ctx.fillStyle='#bdb6a5';for(const x of vRoads)for(const y of hRoads)for(let i=-4;i<=4;i++){ctx.fillRect(x-100+i*24,y-112,13,44);ctx.fillRect(x-100+i*24,y+68,13,44);ctx.fillRect(x-112,y-100+i*24,44,13);ctx.fillRect(x+68,y-100+i*24,44,13);}}
function drawBuilding(b,i){ctx.fillStyle='#0006';rr(ctx,b.x+13,b.y+15,b.w,b.h,10);ctx.fill();ctx.fillStyle=palette[i%palette.length];rr(ctx,b.x,b.y,b.w,b.h,10);ctx.fill();ctx.fillStyle='rgba(255,255,255,.09)';ctx.fillRect(b.x+12,b.y+12,b.w-24,10);ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(b.x+12,b.y+b.h-24,b.w-24,12);ctx.fillStyle='#bbb6a7';for(let k=0;k<3;k++){const rx=b.x+34+(k*97+b.seed*13)%Math.max(60,b.w-90),ry=b.y+30+(k*73+b.seed*9)%Math.max(60,b.h-90);ctx.fillRect(rx,ry,36,24);ctx.fillStyle='#686c6d';ctx.fillRect(rx+5,ry+4,26,16);ctx.fillStyle='#bbb6a7';}}
function drawBlocks(){blocks.forEach((b,i)=>{ctx.fillStyle='#aaa79d';ctx.fillRect(b.x-24,b.y-24,b.w+48,b.h+48);ctx.fillStyle='#74736d';ctx.fillRect(b.x-18,b.y-18,b.w+36,b.h+36);drawBuilding(b,i);});}
function drawTrees(){for(const t of trees){ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(t.x+8,t.y+10,t.r*.95,t.r*.55,.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5a4635';ctx.fillRect(t.x-3,t.y-3,6,16);ctx.fillStyle='#315f47';ctx.beginPath();ctx.arc(t.x,t.y-8,t.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#47775a';ctx.beginPath();ctx.arc(t.x-7,t.y-15,t.r*.55,0,Math.PI*2);ctx.fill();}}
function drawCar(c,kind='traffic'){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a+Math.PI/2);ctx.fillStyle='#0007';rr(ctx,-18+7,-33+9,36,66,8);ctx.fill();ctx.fillStyle=kind==='police'?'#edf1f3':kind==='player'?'#d9473e':c.color;rr(ctx,-18,-33,36,66,8);ctx.fill();ctx.fillStyle='#8cc5d4';ctx.fillRect(-13,-16,26,18);ctx.fillStyle='#14313b';ctx.fillRect(-11,-14,22,14);ctx.fillStyle='#8cc5d4';ctx.fillRect(-12,8,24,15);ctx.fillStyle='#f5d77c';ctx.fillRect(-14,-31,8,4);ctx.fillRect(6,-31,8,4);ctx.fillStyle='#c93e3e';ctx.fillRect(-14,27,8,4);ctx.fillRect(6,27,8,4);if(kind==='police'){ctx.fillStyle='#2f83d6';ctx.fillRect(-9,-3,9,5);ctx.fillStyle='#e44a48';ctx.fillRect(0,-3,9,5);}ctx.restore();}
function drawPed(p){ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(4,7,6,3,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3d332c';ctx.beginPath();ctx.arc(0,-5,3,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawMission(){const pulse=1+Math.sin(mission.phase*5)*.15;ctx.save();ctx.translate(mission.x,mission.y);ctx.strokeStyle='#f5d54d';ctx.lineWidth=8;ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(0,0,38*pulse,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=.18;ctx.fillStyle='#f5d54d';ctx.beginPath();ctx.arc(0,0,58*pulse,0,Math.PI*2);ctx.fill();ctx.restore();}

function renderWorld(){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,vw,vh);ctx.save();const sx=(Math.random()-.5)*camera.shake,sy=(Math.random()-.5)*camera.shake;ctx.translate(vw/2+sx,vh/2+sy);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);drawRoads();drawBlocks();drawTrees();drawMission();ctx.strokeStyle='#151719';ctx.lineWidth=4;for(const s of skid){if(s.life<=0)continue;ctx.globalAlpha=Math.max(0,s.life*.35);ctx.beginPath();ctx.moveTo(s.x-6,s.y);ctx.lineTo(s.x+6,s.y);ctx.stroke();}ctx.globalAlpha=1;for(const p of peds)drawPed(p);for(const c of traffic)drawCar(c,'traffic');for(const p of police)drawCar(p,'police');drawCar(player,'player');ctx.restore();}
function renderMap(){const w=mapCanvas.width,h=mapCanvas.height;mctx.clearRect(0,0,w,h);mctx.fillStyle='#10181d';mctx.fillRect(0,0,w,h);mctx.strokeStyle='#59656b';mctx.lineWidth=9;for(const x of vRoads){mctx.beginPath();mctx.moveTo(x/WORLD.w*w,0);mctx.lineTo(x/WORLD.w*w,h);mctx.stroke();}for(const y of hRoads){mctx.beginPath();mctx.moveTo(0,y/WORLD.h*h);mctx.lineTo(w,y/WORLD.h*h);mctx.stroke();}mctx.fillStyle='#f2d24d';mctx.beginPath();mctx.arc(mission.x/WORLD.w*w,mission.y/WORLD.h*h,4,0,Math.PI*2);mctx.fill();mctx.fillStyle='#e14b43';mctx.beginPath();mctx.arc(player.x/WORLD.w*w,player.y/WORLD.h*h,4,0,Math.PI*2);mctx.fill();mctx.fillStyle='#6ba9df';for(const p of police){mctx.beginPath();mctx.arc(p.x/WORLD.w*w,p.y/WORLD.h*h,2.5,0,Math.PI*2);mctx.fill();}}
function frame(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);renderWorld();renderMap();requestAnimationFrame(frame);}requestAnimationFrame(frame);

})();