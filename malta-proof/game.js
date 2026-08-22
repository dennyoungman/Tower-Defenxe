(()=>{
'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const mapCanvas=document.getElementById('map');
const mctx=mapCanvas.getContext('2d');
const ui={cash:document.getElementById('cash'),speed:document.getElementById('speed'),wanted:document.getElementById('wanted'),objective:document.getElementById('objective'),toast:document.getElementById('toast')};
const DPR=Math.min(window.devicePixelRatio||1,2);
let vw=innerWidth,vh=innerHeight,last=performance.now(),toastTimer=0;
function resize(){vw=innerWidth;vh=innerHeight;canvas.width=Math.round(vw*DPR);canvas.height=Math.round(vh*DPR);canvas.style.width=vw+'px';canvas.style.height=vh+'px';ctx.setTransform(DPR,0,0,DPR,0,0);mapCanvas.width=300;mapCanvas.height=224;}
addEventListener('resize',resize);resize();

const WORLD={w:2800,h:1900};
const coast=[{x:2180,y:0},{x:2130,y:170},{x:2220,y:330},{x:2130,y:520},{x:2260,y:700},{x:2160,y:900},{x:2280,y:1090},{x:2190,y:1280},{x:2310,y:1470},{x:2470,y:1630},{x:2800,y:1750},{x:2800,y:0}];
const coastRoad=[{x:1990,y:1650},{x:2100,y:1490},{x:2115,y:1300},{x:2025,y:1130},{x:2070,y:980},{x:2170,y:840},{x:2140,y:700},{x:2240,y:565},{x:2180,y:430},{x:2280,y:300},{x:2320,y:150}];
const innerRoad=[{x:1660,y:1660},{x:1740,y:1460},{x:1760,y:1250},{x:1680,y:1080},{x:1730,y:900},{x:1830,y:760},{x:1820,y:600},{x:1940,y:470},{x:1910,y:310},{x:2010,y:170}];
const valleyRoad=[{x:1210,y:1590},{x:1370,y:1460},{x:1510,y:1300},{x:1630,y:1160},{x:1760,y:1040},{x:1910,y:980},{x:2070,y:980}];
const crossRoads=[
  [{x:1600,y:1430},{x:2055,y:1450}],
  [{x:1650,y:1210},{x:2085,y:1260}],
  [{x:1690,y:1030},{x:2050,y:1100}],
  [{x:1760,y:820},{x:2160,y:845}],
  [{x:1810,y:620},{x:2220,y:620}],
  [{x:1910,y:390},{x:2230,y:420}]
];
const roads=[{pts:coastRoad,w:115},{pts:innerRoad,w:95},{pts:valleyRoad,w:88},...crossRoads.map(pts=>({pts,w:76}))];

const buildings=[
  {x:1180,y:1320,w:280,h:220,c:'#b79c75',label:'GŻIRA EDGE'},
  {x:1240,y:980,w:260,h:240,c:'#c8ad82'},
  {x:1320,y:680,w:260,h:230,c:'#b3916d'},
  {x:1430,y:390,w:280,h:220,c:'#c4a77c'},
  {x:1490,y:1460,w:160,h:150,c:'#cdb38a'},
  {x:1540,y:1240,w:130,h:150,c:'#bfa176'},
  {x:1535,y:900,w:150,h:140,c:'#d0b98e'},
  {x:1600,y:650,w:150,h:145,c:'#c29e70'},
  {x:1640,y:430,w:150,h:145,c:'#d0b385'},
  {x:1790,y:1490,w:180,h:120,c:'#c5a276'},
  {x:1810,y:1290,w:170,h:120,c:'#b8966f'},
  {x:1810,y:1080,w:170,h:120,c:'#d1b68a'},
  {x:1880,y:865,w:145,h:120,c:'#c5a173'},
  {x:1900,y:655,w:145,h:115,c:'#d0b288'},
  {x:1990,y:470,w:115,h:105,c:'#c8a97b'},
  {x:1960,y:245,w:145,h:120,c:'#b7946d'},
  {x:2125,y:1260,w:90,h:115,c:'#c8a97d'},
  {x:2180,y:1040,w:90,h:120,c:'#d0b58a'},
  {x:2200,y:770,w:95,h:120,c:'#c19e72'},
  {x:2250,y:520,w:90,h:115,c:'#d2b88e'},
  {x:2310,y:230,w:90,h:120,c:'#c29f74'}
];
const landmarks=[
  {x:2040,y:1530,name:'SLIEMA FERRIES'},
  {x:2040,y:1135,name:'TOWER ROAD'},
  {x:2080,y:920,name:'BALLUTA BAY'},
  {x:2200,y:520,name:'SPINOLA BAY'},
  {x:2250,y:300,name:'ST JULIAN’S'}
];
const trees=[];for(let i=0;i<34;i++)trees.push({x:1080+(i*137)%1040,y:150+(i*211)%1600,r:11+(i%4)*3});

function segDist(px,py,a,b){const vx=b.x-a.x,vy=b.y-a.y,wx=px-a.x,wy=py-a.y,c1=wx*vx+wy*vy;if(c1<=0)return Math.hypot(px-a.x,py-a.y);const c2=vx*vx+vy*vy;if(c2<=c1)return Math.hypot(px-b.x,py-b.y);const t=c1/c2,qx=a.x+t*vx,qy=a.y+t*vy;return Math.hypot(px-qx,py-qy);}
function onRoad(x,y){return roads.some(r=>{for(let i=0;i<r.pts.length-1;i++)if(segDist(x,y,r.pts[i],r.pts[i+1])<r.w/2)return true;return false;});}
function pointInPoly(x,y,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a.y>y)!=(b.y>y))&&(x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x))c=!c;}return c;}
function circleRect(x,y,r,b){const nx=Math.max(b.x,Math.min(x,b.x+b.w)),ny=Math.max(b.y,Math.min(y,b.y+b.h));return Math.hypot(x-nx,y-ny)<r;}
function solidCollision(x,y,r){if(pointInPoly(x,y,coast))return true;for(const b of buildings)if(circleRect(x,y,r,b))return true;return false;}

const input={left:false,right:false,gas:false,brake:false};
const keyMap={arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'gas',w:'gas',arrowdown:'brake',s:'brake'};
addEventListener('keydown',e=>{const k=keyMap[e.key.toLowerCase()];if(k){input[k]=true;e.preventDefault();}});addEventListener('keyup',e=>{const k=keyMap[e.key.toLowerCase()];if(k){input[k]=false;e.preventDefault();}});
function bind(id,key){const el=document.getElementById(id),held=new Set();el.style.touchAction='none';const sync=()=>{input[key]=held.size>0;el.classList.toggle('active',input[key]);};const down=e=>{e.preventDefault();held.add(e.pointerId??'m');try{el.setPointerCapture(e.pointerId);}catch(_){}sync();};const up=e=>{e.preventDefault();held.delete(e.pointerId??'m');sync();};el.addEventListener('pointerdown',down,{passive:false});el.addEventListener('pointerup',up,{passive:false});el.addEventListener('pointercancel',up,{passive:false});el.addEventListener('lostpointercapture',up,{passive:false});}
['left','right','gas','brake'].forEach(k=>bind(k,k));

const player={x:1995,y:1585,a:-1.0,v:0,r:24,cash:1250,heat:0,wanted:0};
const camera={x:player.x,y:player.y,zoom:1,shake:0};
const missions=[{x:2090,y:930,label:'BALLUTA BAY'},{x:2200,y:535,label:'SPINOLA BAY'},{x:2020,y:1530,label:'SLIEMA FERRIES'}];let missionIndex=0;
const traffic=[];
function routeLen(pts){let n=0;for(let i=0;i<pts.length-1;i++)n+=Math.hypot(pts[i+1].x-pts[i].x,pts[i+1].y-pts[i].y);return n;}
function sampleRoute(pts,d){const total=routeLen(pts);d=((d%total)+total)%total;for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],len=Math.hypot(b.x-a.x,b.y-a.y);if(d<=len){const t=d/len;return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,a:Math.atan2(b.y-a.y,b.x-a.x)};}d-=len;}return{...pts[pts.length-1],a:0};}
for(let i=0;i<16;i++)traffic.push({route:i<10?coastRoad:innerRoad,dist:i*175,dir:i%2?1:-1,speed:70+(i%5)*11,lane:i%2?22:-22,color:['#d4473d','#d8b44b','#4e83a7','#5e8a60','#d8d2c8','#7b6b9c'][i%6]});
function trafficPose(c){const p=sampleRoute(c.route,c.dist),p2=sampleRoute(c.route,c.dist+5*c.dir);const a=Math.atan2(p2.y-p.y,p2.x-p.x),nx=-Math.sin(a),ny=Math.cos(a);return{x:p.x+nx*c.lane,y:p.y+ny*c.lane,a};}

function showToast(t){ui.toast.textContent=t;ui.toast.classList.add('show');toastTimer=1.2;}
function updatePlayer(dt){const road=onRoad(player.x,player.y),accel=road?310:145,max=road?310:135;if(input.gas)player.v+=accel*dt;if(input.brake){if(player.v>15)player.v-=420*dt;else player.v-=220*dt;}if(!input.gas&&!input.brake)player.v*=Math.pow(road?.984:.96,dt*60);player.v=Math.max(-90,Math.min(max,player.v));const steer=(input.right?1:0)-(input.left?1:0),grip=Math.min(1,Math.abs(player.v)/50);player.a+=steer*2.3*grip*dt*(player.v>=0?1:-1);const steps=Math.max(1,Math.ceil(Math.abs(player.v)*dt/12));for(let s=0;s<steps;s++){const ox=player.x,oy=player.y;player.x+=Math.cos(player.a)*(player.v*dt/steps);player.y+=Math.sin(player.a)*(player.v*dt/steps);if(solidCollision(player.x,player.y,player.r)){player.x=ox;player.y=oy;player.v*=-.18;camera.shake=5;showToast('CRUNCH');break;}}player.x=Math.max(30,Math.min(WORLD.w-30,player.x));player.y=Math.max(30,Math.min(WORLD.h-30,player.y));}
function updateTraffic(dt){for(const c of traffic){c.dist+=c.speed*c.dir*dt;const p=trafficPose(c);c.x=p.x;c.y=p.y;c.a=p.a;const dx=player.x-c.x,dy=player.y-c.y,d=Math.hypot(dx,dy);if(d<48){const nx=dx/(d||1),ny=dy/(d||1),push=48-d;player.x+=nx*push*.75;player.y+=ny*push*.75;player.v*=-.12;c.dist-=c.dir*push*.25;camera.shake=5;}}}
function updateMission(){const m=missions[missionIndex];if(Math.hypot(player.x-m.x,player.y-m.y)<70){player.cash+=500;showToast('JOB COMPLETE  +€500');missionIndex=(missionIndex+1)%missions.length;const n=missions[missionIndex];ui.objective.innerHTML='<b>JOB</b><span>Drive to '+n.label+'.</span>';}}
function update(dt){updatePlayer(dt);updateTraffic(dt);updateMission();camera.x+=(player.x-camera.x)*Math.min(1,dt*5);camera.y+=(player.y-camera.y)*Math.min(1,dt*5);camera.zoom+=(1+Math.min(.1,Math.abs(player.v)/2600)-camera.zoom)*dt*3;camera.shake=Math.max(0,camera.shake-dt*18);ui.cash.textContent='€'+player.cash.toLocaleString();ui.speed.textContent=Math.round(Math.abs(player.v)*.72);ui.wanted.textContent='☆☆☆☆☆';if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show');}}

function strokeRoad(r){ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#d2c7aa';ctx.lineWidth=r.w+18;ctx.beginPath();r.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.strokeStyle='#30383c';ctx.lineWidth=r.w;ctx.stroke();ctx.strokeStyle='#8f8877';ctx.lineWidth=3;ctx.setLineDash([24,20]);ctx.stroke();ctx.setLineDash([]);}
function drawSea(){ctx.fillStyle='#5ea7bd';ctx.beginPath();coast.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=3;for(let y=140;y<1800;y+=95){ctx.beginPath();ctx.moveTo(2240,y);ctx.lineTo(2730,y+20);ctx.stroke();}}
function rr(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
function drawBuilding(b){ctx.fillStyle='#0004';rr(b.x+9,b.y+11,b.w,b.h,8);ctx.fill();ctx.fillStyle=b.c;rr(b.x,b.y,b.w,b.h,8);ctx.fill();ctx.fillStyle='#f0dfbe';ctx.fillRect(b.x+10,b.y+10,b.w-20,8);ctx.fillStyle='#745e4b';for(let yy=b.y+34;yy<b.y+b.h-18;yy+=34)for(let xx=b.x+18;xx<b.x+b.w-18;xx+=40){ctx.fillRect(xx,yy,16,10);ctx.fillStyle='#a9d3db';ctx.fillRect(xx+3,yy+2,10,6);ctx.fillStyle='#745e4b';}}
function drawTree(t){ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(t.x+7,t.y+9,t.r,t.r*.55,.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#6f533c';ctx.fillRect(t.x-2,t.y,4,12);ctx.fillStyle='#3d7658';ctx.beginPath();ctx.arc(t.x,t.y-8,t.r,0,Math.PI*2);ctx.fill();}
function drawCar(c,playerCar=false){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a+Math.PI/2);ctx.fillStyle='#0006';rr(-18+6,-34+8,36,68,8);ctx.fill();ctx.fillStyle=playerCar?'#d9473f':c.color;rr(-18,-34,36,68,8);ctx.fill();ctx.fillStyle='#8bc7d8';ctx.fillRect(-12,-15,24,17);ctx.fillStyle='#18343c';ctx.fillRect(-10,-13,20,13);ctx.fillStyle='#8bc7d8';ctx.fillRect(-11,7,22,15);ctx.fillStyle='#f6d77b';ctx.fillRect(-14,-32,8,4);ctx.fillRect(6,-32,8,4);ctx.restore();}
function drawMission(){const m=missions[missionIndex],pulse=8+Math.sin(performance.now()/180)*4;ctx.strokeStyle='#ffd94a';ctx.lineWidth=5;ctx.beginPath();ctx.arc(m.x,m.y,38+pulse,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(255,217,74,.16)';ctx.beginPath();ctx.arc(m.x,m.y,38,0,Math.PI*2);ctx.fill();}
function drawLabels(){ctx.font='700 18px system-ui';ctx.fillStyle='rgba(255,255,255,.72)';ctx.textAlign='center';for(const l of landmarks)ctx.fillText(l.name,l.x,l.y-46);ctx.font='700 14px system-ui';ctx.fillStyle='rgba(25,38,42,.58)';ctx.fillText('TRIQ IT-TORRI',2050,1180);ctx.fillText('IX-XATT',2020,1500);}
function renderWorld(){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,vw,vh);ctx.save();const sx=(Math.random()-.5)*camera.shake,sy=(Math.random()-.5)*camera.shake;ctx.translate(vw/2+sx,vh/2+sy);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);ctx.fillStyle='#8a927d';ctx.fillRect(0,0,WORLD.w,WORLD.h);drawSea();roads.forEach(strokeRoad);buildings.forEach(drawBuilding);trees.forEach(drawTree);drawLabels();drawMission();traffic.forEach(c=>drawCar(c,false));drawCar(player,true);ctx.restore();}
function renderMap(){const w=mapCanvas.width,h=mapCanvas.height;mctx.clearRect(0,0,w,h);mctx.fillStyle='#87917c';mctx.fillRect(0,0,w,h);mctx.fillStyle='#5ea7bd';mctx.beginPath();coast.forEach((p,i)=>{const x=p.x/WORLD.w*w,y=p.y/WORLD.h*h;i?mctx.lineTo(x,y):mctx.moveTo(x,y);});mctx.closePath();mctx.fill();mctx.lineCap='round';for(const r of roads){mctx.strokeStyle='#3b4448';mctx.lineWidth=Math.max(2,r.w/WORLD.w*w);mctx.beginPath();r.pts.forEach((p,i)=>{const x=p.x/WORLD.w*w,y=p.y/WORLD.h*h;i?mctx.lineTo(x,y):mctx.moveTo(x,y);});mctx.stroke();}const m=missions[missionIndex];mctx.fillStyle='#ffd94a';mctx.beginPath();mctx.arc(m.x/WORLD.w*w,m.y/WORLD.h*h,4,0,Math.PI*2);mctx.fill();mctx.fillStyle='#f34f42';mctx.beginPath();mctx.arc(player.x/WORLD.w*w,player.y/WORLD.h*h,4,0,Math.PI*2);mctx.fill();}
function frame(now){const dt=Math.min(.033,(now-last)/1000||.016);last=now;update(dt);renderWorld();renderMap();requestAnimationFrame(frame);}requestAnimationFrame(frame);
})();