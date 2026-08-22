(()=>{
'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const mapCanvas=document.getElementById('map');
const mctx=mapCanvas.getContext('2d');
const ui={cash:document.getElementById('cash'),speed:document.getElementById('speed'),wanted:document.getElementById('wanted'),objective:document.getElementById('objective'),toast:document.getElementById('toast'),loading:document.getElementById('loading')};
const DPR=Math.min(window.devicePixelRatio||1,2);
let vw=innerWidth,vh=innerHeight,last=performance.now(),toastTimer=0,ready=false;
function resize(){vw=innerWidth;vh=innerHeight;canvas.width=Math.round(vw*DPR);canvas.height=Math.round(vh*DPR);canvas.style.width=vw+'px';canvas.style.height=vh+'px';ctx.setTransform(DPR,0,0,DPR,0,0);mapCanvas.width=300;mapCanvas.height=224;}
addEventListener('resize',resize);resize();

// Real OSM extraction box: Sliema, Balluta, St Julian's, Paceville edge.
const B={s:35.9040,w:14.4810,n:35.9250,e:14.5150};
const SCALE=1.15;
const latMid=(B.s+B.n)*.5*Math.PI/180;
const M_LON=111320*Math.cos(latMid),M_LAT=110540;
const WORLD={w:(B.e-B.w)*M_LON*SCALE,h:(B.n-B.s)*M_LAT*SCALE};
const project=(lat,lon)=>({x:(lon-B.w)*M_LON*SCALE,y:(B.n-lat)*M_LAT*SCALE});

// OSM world units are close to metres after projection. Keep vehicles proportionate to streets.
const CAR_W=10,CAR_L=22,CAR_R=6,CAR_GAP=13.5,BASE_ZOOM=1.20;
let roads=[],roadSegs=[],buildings=[],traffic=[],roadLabels=[];
const input={left:false,right:false,gas:false,brake:false};
const camera={x:WORLD.w*.65,y:WORLD.h*.66,zoom:BASE_ZOOM,shake:0};
const player={x:camera.x,y:camera.y,a:-Math.PI/2,v:0,r:CAR_R,cash:1250,heat:0,wanted:0};
const missionDefs=[
  {name:'BALLUTA BAY',lat:35.9144,lon:14.4935},
  {name:'SPINOLA BAY',lat:35.9191,lon:14.4923},
  {name:'PACEVILLE',lat:35.9230,lon:14.4907},
  {name:'SLIEMA FERRIES',lat:35.9082,lon:14.5056}
];
let missions=[],missionIndex=0;

const roadWidth={motorway:78,trunk:74,primary:68,secondary:61,tertiary:54,unclassified:46,residential:42,living_street:38,service:32,road:42};
const allowed=new Set(Object.keys(roadWidth));
const major=new Set(['motorway','trunk','primary','secondary','tertiary']);
const carColors=['#d9473f','#d8b44b','#4f83a9','#6d8d58','#d8d2c8','#806aa0','#3b7777','#b36b4d'];

function segDist(px,py,a,b){const vx=b.x-a.x,vy=b.y-a.y,wx=px-a.x,wy=py-a.y,c1=wx*vx+wy*vy;if(c1<=0)return Math.hypot(px-a.x,py-a.y);const c2=vx*vx+vy*vy;if(c2<=c1)return Math.hypot(px-b.x,py-b.y);const t=c1/c2,qx=a.x+t*vx,qy=a.y+t*vy;return Math.hypot(px-qx,py-qy);}
function routeLength(pts){let n=0;for(let i=0;i<pts.length-1;i++)n+=Math.hypot(pts[i+1].x-pts[i].x,pts[i+1].y-pts[i].y);return n;}
function sampleRoute(route,d){const pts=route.pts,total=route.len;d=Math.max(0,Math.min(total,d));for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],len=Math.hypot(b.x-a.x,b.y-a.y);if(d<=len){const t=len?d/len:0;return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,a:Math.atan2(b.y-a.y,b.x-a.x)};}d-=len;}const p=pts[pts.length-1],q=pts[pts.length-2]||p;return{x:p.x,y:p.y,a:Math.atan2(p.y-q.y,p.x-q.x)};}
function nearestRoadPoint(x,y){let best=null,bd=Infinity;for(const s of roadSegs){const a=s.a,b=s.b,vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy;let t=l2?((x-a.x)*vx+(y-a.y)*vy)/l2:0;t=Math.max(0,Math.min(1,t));const qx=a.x+t*vx,qy=a.y+t*vy,d=Math.hypot(x-qx,y-qy);if(d<bd){bd=d;best={x:qx,y:qy,a:Math.atan2(vy,vx),width:s.width};}}return best;}
function onRoad(x,y){for(const s of roadSegs){if(x<Math.min(s.a.x,s.b.x)-s.width||x>Math.max(s.a.x,s.b.x)+s.width||y<Math.min(s.a.y,s.b.y)-s.width||y>Math.max(s.a.y,s.b.y)+s.width)continue;if(segDist(x,y,s.a,s.b)<s.width*.58)return true;}return false;}
function pointInPoly(x,y,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if(((a.y>y)!=(b.y>y))&&(x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x))c=!c;}return c;}
function circleBuilding(x,y,r,b){if(x+r<b.minx||x-r>b.maxx||y+r<b.miny||y-r>b.maxy)return false;if(pointInPoly(x,y,b.pts))return true;for(let i=0;i<b.pts.length-1;i++)if(segDist(x,y,b.pts[i],b.pts[i+1])<r)return true;return false;}
function solidCollision(x,y,r){for(const b of buildings)if(circleBuilding(x,y,r,b))return true;return false;}

function bind(id,key){const el=document.getElementById(id),held=new Set();el.style.touchAction='none';const sync=()=>{input[key]=held.size>0;el.classList.toggle('active',input[key]);};const down=e=>{e.preventDefault();held.add(e.pointerId??'m');try{el.setPointerCapture(e.pointerId);}catch(_){}sync();};const up=e=>{e.preventDefault();held.delete(e.pointerId??'m');sync();};el.addEventListener('pointerdown',down,{passive:false});el.addEventListener('pointerup',up,{passive:false});el.addEventListener('pointercancel',up,{passive:false});el.addEventListener('lostpointercapture',up,{passive:false});}
['left','right','gas','brake'].forEach(k=>bind(k,k));
const keyMap={arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'gas',w:'gas',arrowdown:'brake',s:'brake'};
addEventListener('keydown',e=>{const k=keyMap[e.key.toLowerCase()];if(k){input[k]=true;e.preventDefault();}});addEventListener('keyup',e=>{const k=keyMap[e.key.toLowerCase()];if(k){input[k]=false;e.preventDefault();}});

function showToast(t){ui.toast.textContent=t;ui.toast.classList.add('show');toastTimer=1.25;}

async function loadOSM(){
  const bbox=`${B.s},${B.w},${B.n},${B.e}`;
  const q=`[out:json][timeout:30];(way["highway"](${bbox});way["building"](${bbox}););out tags geom;`;
  const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  let data=null,lastErr=null;
  for(const ep of endpoints){
    try{const res=await fetch(ep,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(q)});if(!res.ok)throw new Error('HTTP '+res.status);data=await res.json();break;}catch(e){lastErr=e;}
  }
  if(!data)throw lastErr||new Error('OSM request failed');
  parseOSM(data.elements||[]);
}

function parseOSM(elements){
  const names=new Set();
  for(const el of elements){
    if(!el.geometry||el.geometry.length<2)continue;
    const pts=el.geometry.map(g=>project(g.lat,g.lon));
    const t=el.tags||{};
    if(t.highway&&allowed.has(t.highway)){
      const width=roadWidth[t.highway]||40,len=routeLength(pts);if(len<18)continue;
      const r={pts,width,type:t.highway,name:t.name||'',oneway:t.oneway==='yes',len};roads.push(r);
      for(let i=0;i<pts.length-1;i++)roadSegs.push({a:pts[i],b:pts[i+1],width});
      if(r.name&&!names.has(r.name)&&(major.has(r.type)||/Tower Road|Triq it-Torri|Manwel Dimech|Rudolf|Spinola|Balluta|George Borg Olivier|Sliema Road/i.test(r.name))){names.add(r.name);roadLabels.push(r);}
    }else if(t.building&&pts.length>=4){
      const first=pts[0],last=pts[pts.length-1];if(Math.hypot(first.x-last.x,first.y-last.y)>8)continue;
      let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;for(const p of pts){minx=Math.min(minx,p.x);miny=Math.min(miny,p.y);maxx=Math.max(maxx,p.x);maxy=Math.max(maxy,p.y);}if((maxx-minx)*(maxy-miny)<80)continue;
      buildings.push({pts,minx,miny,maxx,maxy});
    }
  }
  if(roads.length<20)throw new Error('OSM returned too few roads');

  const spawnRaw=project(35.9082,14.5056),spawn=nearestRoadPoint(spawnRaw.x,spawnRaw.y);if(spawn){player.x=spawn.x;player.y=spawn.y;player.a=spawn.a;camera.x=player.x;camera.y=player.y;}
  missions=missionDefs.map(m=>{const p=project(m.lat,m.lon),q=nearestRoadPoint(p.x,p.y)||p;return{name:m.name,x:q.x,y:q.y};});

  const eligible=roads.filter(r=>r.len>240&&(major.has(r.type)||r.type==='residential'));
  for(let i=0;i<Math.min(26,eligible.length*2);i++){
    const route=eligible[(i*7)%eligible.length],dir=i%2?1:-1;
    traffic.push({route,dist:(route.len*((i*0.173)%1)),dir,speed:48+(i%6)*7,lane:(i%2?1:-1)*Math.min(10,route.width*.22),color:carColors[i%carColors.length]});
  }
  const n=missions[0];ui.objective.innerHTML='<b>JOB</b><span>Drive to '+n.name+'.</span>';
  ready=true;if(ui.loading)ui.loading.remove();
}

function updatePlayer(dt){
  if(!ready)return;
  const road=onRoad(player.x,player.y),accel=road?315:125,max=road?300:105;
  if(input.gas)player.v+=accel*dt;
  if(input.brake){if(player.v>12)player.v-=430*dt;else player.v-=205*dt;}
  if(!input.gas&&!input.brake)player.v*=Math.pow(road?.984:.955,dt*60);
  player.v=Math.max(-82,Math.min(max,player.v));
  const steer=(input.right?1:0)-(input.left?1:0),grip=Math.min(1,Math.abs(player.v)/42);
  player.a+=steer*2.15*grip*dt*(player.v>=0?1:-1);
  const steps=Math.max(1,Math.ceil(Math.abs(player.v)*dt/5));
  for(let s=0;s<steps;s++){
    const ox=player.x,oy=player.y;player.x+=Math.cos(player.a)*(player.v*dt/steps);player.y+=Math.sin(player.a)*(player.v*dt/steps);
    if(solidCollision(player.x,player.y,player.r)){player.x=ox;player.y=oy;player.v*=-.12;camera.shake=4;showToast('CRUNCH');break;}
  }
  player.x=Math.max(12,Math.min(WORLD.w-12,player.x));player.y=Math.max(12,Math.min(WORLD.h-12,player.y));
}

function trafficPose(c){const p=sampleRoute(c.route,c.dist);let a=p.a;if(c.dir<0)a+=Math.PI;const nx=-Math.sin(a),ny=Math.cos(a);return{x:p.x+nx*c.lane,y:p.y+ny*c.lane,a};}
function updateTraffic(dt){
  if(!ready)return;
  for(const c of traffic){c.dist+=c.speed*c.dir*dt;if(c.dist>c.route.len){c.dist=c.route.len;c.dir=-1;}if(c.dist<0){c.dist=0;c.dir=1;}const p=trafficPose(c);c.x=p.x;c.y=p.y;c.a=p.a;const dx=player.x-c.x,dy=player.y-c.y,d=Math.hypot(dx,dy);if(d<CAR_GAP){const nx=dx/(d||1),ny=dy/(d||1),push=CAR_GAP-d;player.x+=nx*push*.75;player.y+=ny*push*.75;player.v*=-.08;c.dist-=c.dir*push*.2;camera.shake=3;}}
}
function updateMission(){if(!ready||!missions.length)return;const m=missions[missionIndex];if(Math.hypot(player.x-m.x,player.y-m.y)<34){player.cash+=500;showToast('JOB COMPLETE  +€500');missionIndex=(missionIndex+1)%missions.length;const n=missions[missionIndex];ui.objective.innerHTML='<b>JOB</b><span>Drive to '+n.name+'.</span>';}}
function update(dt){updatePlayer(dt);updateTraffic(dt);updateMission();camera.x+=(player.x-camera.x)*Math.min(1,dt*5);camera.y+=(player.y-camera.y)*Math.min(1,dt*5);camera.zoom+=(BASE_ZOOM+Math.min(.09,Math.abs(player.v)/2600)-camera.zoom)*dt*3;camera.shake=Math.max(0,camera.shake-dt*18);ui.cash.textContent='€'+player.cash.toLocaleString();ui.speed.textContent=Math.round(Math.abs(player.v)*.72);ui.wanted.textContent='☆☆☆☆☆';if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show');}}

function rr(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
function drawRoad(r){ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#d8cfb8';ctx.lineWidth=r.width+10;ctx.beginPath();r.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.strokeStyle='#30383d';ctx.lineWidth=r.width;ctx.stroke();if(r.width>44){ctx.strokeStyle='#a9a18d';ctx.lineWidth=2;ctx.setLineDash([15,14]);ctx.stroke();ctx.setLineDash([]);}}
function drawBuilding(b){ctx.fillStyle='#0003';ctx.beginPath();b.pts.forEach((p,i)=>i?ctx.lineTo(p.x+4,p.y+5):ctx.moveTo(p.x+4,p.y+5));ctx.closePath();ctx.fill();ctx.fillStyle='#c6aa7f';ctx.beginPath();b.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.strokeStyle='#e7d5b3';ctx.lineWidth=2;ctx.stroke();}
function drawCar(c,playerCar=false){
  const hw=CAR_W/2,hl=CAR_L/2;
  ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a+Math.PI/2);
  ctx.fillStyle='#0006';rr(-hw+2,-hl+2,CAR_W,CAR_L,2.4);ctx.fill();
  ctx.fillStyle=playerCar?'#d9473f':c.color;rr(-hw,-hl,CAR_W,CAR_L,2.4);ctx.fill();
  ctx.fillStyle='#9bc9d7';ctx.fillRect(-hw*.66,-hl*.48,CAR_W*.66,CAR_L*.24);
  ctx.fillStyle='#19343b';ctx.fillRect(-hw*.56,-hl*.44,CAR_W*.56,CAR_L*.18);
  ctx.fillStyle='#9bc9d7';ctx.fillRect(-hw*.62,hl*.12,CAR_W*.62,CAR_L*.20);
  ctx.fillStyle='#f5da84';ctx.fillRect(-hw*.72,-hl*.96,CAR_W*.28,1.5);ctx.fillRect(hw*.44,-hl*.96,CAR_W*.28,1.5);
  ctx.restore();
}
function drawMission(){if(!ready||!missions.length)return;const m=missions[missionIndex],pulse=7+Math.sin(performance.now()/180)*2;ctx.strokeStyle='#ffd94a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(m.x,m.y,18+pulse,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ffe26a';ctx.font='700 12px system-ui';ctx.textAlign='center';ctx.fillText(m.name,m.x,m.y-30);}
function drawLabels(){ctx.save();ctx.font='700 11px system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(225,231,232,.48)';let count=0;for(const r of roadLabels){if(count++>18)break;const p=sampleRoute(r,r.len*.5);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.fillText(r.name,0,-r.width*.6-4);ctx.restore();}ctx.restore();}
function renderWorld(){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,vw,vh);ctx.save();const sx=(Math.random()-.5)*camera.shake,sy=(Math.random()-.5)*camera.shake;ctx.translate(vw/2+sx,vh/2+sy);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);ctx.fillStyle='#8f9886';ctx.fillRect(0,0,WORLD.w,WORLD.h);if(ready){roads.forEach(drawRoad);buildings.forEach(drawBuilding);drawLabels();drawMission();traffic.forEach(c=>drawCar(c,false));drawCar(player,true);}ctx.restore();}
function renderMap(){const w=mapCanvas.width,h=mapCanvas.height;mctx.clearRect(0,0,w,h);mctx.fillStyle='#899282';mctx.fillRect(0,0,w,h);if(!ready)return;const sx=w/WORLD.w,sy=h/WORLD.h;mctx.strokeStyle='#31393d';mctx.lineCap='round';for(const r of roads){mctx.lineWidth=Math.max(1.5,r.width*sx);mctx.beginPath();r.pts.forEach((p,i)=>i?mctx.lineTo(p.x*sx,p.y*sy):mctx.moveTo(p.x*sx,p.y*sy));mctx.stroke();}mctx.fillStyle='#e64a42';mctx.beginPath();mctx.arc(player.x*sx,player.y*sy,3,0,Math.PI*2);mctx.fill();if(missions.length){const m=missions[missionIndex];mctx.fillStyle='#ffd94a';mctx.beginPath();mctx.arc(m.x*sx,m.y*sy,3,0,Math.PI*2);mctx.fill();}}
function loop(now){const dt=Math.min(.04,(now-last)/1000);last=now;update(dt);renderWorld();renderMap();requestAnimationFrame(loop);}requestAnimationFrame(loop);

loadOSM().catch(err=>{console.error(err);if(ui.loading){ui.loading.innerHTML='<b>MAP DATA FAILED TO LOAD</b><span>'+String(err.message||err)+'</span><small>Reload to retry the OpenStreetMap connection.</small>';}});
})();