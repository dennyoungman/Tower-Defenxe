import { ERAS, FACTIONS, DEFENCES, TECHNOLOGIES, ENEMIES, CIVILIZATIONS } from './data.js';

const $ = id => document.querySelector('#' + id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const W = 960, H = 600, COLS = 16, ROWS = 10, TW = 60, TH = 60;
const TEST = { towerDamage: 1.85, enemyHp: 0.62, waveHpGrowth: 0.045, reward: 1.3, science: 1.35, startingGold: 650, lives: 30 };

const pathCells = [[0,5],[1,5],[2,5],[2,4],[3,4],[4,4],[5,4],[5,5],[5,6],[6,6],[7,6],[8,6],[8,5],[8,4],[9,4],[10,4],[11,4],[11,3],[12,3],[13,3],[13,4],[13,5],[14,5],[15,5]];
const pathSet = new Set(pathCells.map(p => p.join(',')));
const path = pathCells.map(([x,y]) => ({ x:x*TW+30, y:y*TH+30 }));
const scenerySeed = Array.from({length:72}, (_,i) => ({
  x:(i*137)%W, y:(i*83+47)%H, size:4+(i%5), kind:i%7
}));

let s = {
  gold: TEST.startingGold, science: 0, lives: TEST.lives, wave: 0, era: 0,
  research: new Set(), towers: [], enemies: [], projectiles: [], effects: [],
  selectedBuild: 'archer', selectedTower: null, waveActive: false,
  spawnLeft: 0, spawnTimer: 0, last: performance.now(), faction: 'british',
  gameOver: false, routes: new Set(), civs: CIVILIZATIONS.map(x => ({...x})),
  hover: null, kills: 0
};
let uiKey = '';

const fac = () => FACTIONS[s.faction];
const has = id => s.research.has(id);
const available = d => d.era <= s.era && (!d.requires || has(d.requires)) && (!d.faction || d.faction === s.faction);
const price = d => Math.round(d.cost * (d.kind === 'artillery' ? (fac().artilleryCost || 1) : 1));
const msg = text => $('message').textContent = text;

function routeCap(){ return 1 + (has('markets')?1:0) + (has('banking')?1:0) + (has('corporations')?1:0); }
function tradeIncome(){
  let value = [...s.routes].reduce((sum,id) => sum + (s.civs.find(c=>c.id===id)?.trade || 0), 0);
  if(has('merchant-guilds')) value *= 1.2;
  if(has('global-trade')) value *= 1.25;
  return Math.round(value);
}

function updateUI(force=false){
  $('era').textContent = ERAS[s.era].name.toUpperCase();
  $('gold').textContent = Math.floor(s.gold);
  $('science').textContent = Math.floor(s.science);
  $('lives').textContent = s.lives;
  $('wave').textContent = `${s.wave} / 48`;
  $('faction-desc').textContent = fac().desc;
  $('trade-summary').textContent = `TEST BUILD · Trade ${s.routes.size}/${routeCap()} · +${tradeIncome()} gold/wave`;
  const key = [s.era,s.faction,[...s.research].join(','),s.selectedBuild,s.selectedTower?.cx,s.selectedTower?.cy,s.towers.length].join('|');
  if(force || key !== uiKey){ uiKey = key; renderBuild(); renderSelected(); }
  checkEra();
}

function renderBuild(){
  const list = $('build-list');
  list.innerHTML = '';
  Object.entries(DEFENCES).forEach(([id,d]) => {
    if(d.faction && d.faction !== s.faction) return;
    const b = document.createElement('button');
    b.className = `build-card ${d.unique?'unique':''} ${s.selectedBuild===id?'active':''} ${!available(d)?'locked':''}`;
    b.disabled = !available(d);
    b.innerHTML = `<div class="build-name">${d.unique?'★ ':''}${d.name}</div><div class="build-meta">${price(d)} gold · ${ERAS[d.era].name}</div><div class="build-role">${d.role}</div>`;
    b.onclick = () => { s.selectedBuild=id; s.selectedTower=null; uiKey=''; updateUI(true); msg(`${d.name} selected. Choose a highlighted tile.`); };
    list.appendChild(b);
  });
}

function janissaryBonus(t){
  if(t.type !== 'janissary') return 1;
  return s.towers.some(o => o!==t && o.type==='janissary' && Math.hypot(o.x-t.x,o.y-t.y)<150) ? 1.28 : 1;
}

function renderSelected(){
  const t = s.selectedTower;
  if(!t){ $('selected-info').textContent='No defence selected.'; $('upgrade').disabled=$('sell').disabled=true; return; }
  const d = DEFENCES[t.type];
  $('selected-info').innerHTML = `<strong>${d.name}</strong><br>Level ${t.level}<br>Damage ${Math.round(t.damage)} · Range ${Math.round(t.range)}${t.type==='janissary'?`<br>Discipline: ${janissaryBonus(t)>1?'ACTIVE (+28% fire rate)':'Independent'}`:''}`;
  $('upgrade').disabled = $('sell').disabled = false;
}

function checkEra(){
  if(s.era >= ERAS.length-1){ $('advance-era').disabled=true; return; }
  const n = ERAS[s.era+1];
  const ok = s.wave >= n.start-1 && n.required.every(has) && s.science >= n.science && !s.waveActive;
  $('advance-era').disabled = !ok;
  $('advance-era').textContent = `ADVANCE ERA · ${n.science} SCIENCE`;
}

function cellFromEvent(e){
  const r=canvas.getBoundingClientRect();
  return { cx:Math.floor((e.clientX-r.left)*W/r.width/TW), cy:Math.floor((e.clientY-r.top)*H/r.height/TH) };
}
canvas.onmousemove = e => s.hover = cellFromEvent(e);
canvas.onmouseleave = () => s.hover = null;
canvas.onclick = e => {
  const {cx,cy}=cellFromEvent(e);
  const existing=s.towers.find(t=>t.cx===cx&&t.cy===cy);
  if(existing){ s.selectedTower=existing; s.selectedBuild=null; uiKey=''; updateUI(true); return; }
  if(pathSet.has(`${cx},${cy}`)){ msg('The enemy route cannot be blocked.'); return; }
  if(!s.selectedBuild) return;
  const d=DEFENCES[s.selectedBuild], cost=price(d);
  if(!available(d) || s.gold<cost){ msg('Insufficient Gold or technology.'); return; }
  s.gold-=cost;
  s.towers.push({type:s.selectedBuild,cx,cy,x:cx*TW+30,y:cy*TH+30,level:1,damage:d.damage*TEST.towerDamage,range:d.range*fac().range,cooldown:0,recoil:0});
  burst(cx*TW+30,cy*TH+30,'dust',8);
  uiKey=''; updateUI(true);
};

function enemyType(w,i){
  if(w<5) return i%5 ? 'infantry' : 'runner';
  if(w<10) return i%6 ? 'infantry' : 'heavy';
  if(w<17) return i%6 ? 'heavy' : 'siege';
  if(w<29) return i%5 ? 'heavy' : 'vehicle';
  return i%5 ? 'vehicle' : 'tank';
}
function spawn(){
  const type=enemyType(s.wave,s.spawnLeft), b=ENEMIES[type];
  const scale=TEST.enemyHp*(1+s.wave*TEST.waveHpGrowth);
  s.enemies.push({...b,type,hp:b.hp*scale,maxHp:b.hp*scale,speed:b.speed*(1+s.wave*.004),pathIndex:0,x:path[0].x,y:path[0].y,bob:Math.random()*6.28});
}

function startWave(){
  if(s.waveActive || s.gameOver || s.wave>=48) return;
  s.wave++; s.waveActive=true; s.spawnLeft=5+Math.ceil(s.wave*1.4); s.spawnTimer=0;
  const support = has('economics')?25:0;
  s.gold += Math.round((75+s.wave*6+tradeIncome()+support)*fac().income);
  s.science += 10 + Math.floor(s.wave*1.5);
  $('start-wave').disabled=true;
  $('intel').textContent=`Wave ${s.wave}: testing balance active. Reinforcement treasury and research grants received.`;
  updateUI();
}

function burst(x,y,type,count=6){
  for(let i=0;i<count;i++) s.effects.push({x,y,vx:(Math.random()-.5)*70,vy:(Math.random()-.7)*70,life:.45+Math.random()*.35,max:.8,type,size:2+Math.random()*4});
}

function hit(p){
  const targets=p.splash ? s.enemies.filter(e=>Math.hypot(e.x-p.target.x,e.y-p.target.y)<=p.splash) : [p.target];
  for(const e of targets){
    let armor=p.kind==='antiarmor'?e.armor*.15:e.armor;
    let damage=p.damage*(fac().damage||1);
    if(p.kind==='artillery') damage*=fac().artilleryDamage||1;
    e.hp-=damage*(1-armor);
    burst(e.x,e.y,p.type==='shell'?'smoke':'spark',p.type==='shell'?10:4);
    if(e.hp<=0){
      const i=s.enemies.indexOf(e);
      if(i>=0){
        s.enemies.splice(i,1); s.kills++;
        s.gold += Math.round(e.reward*TEST.reward*(has('logistics')?1.1:1));
        s.science += Math.round(e.science*TEST.science*(has('academies')?1.2:1));
        burst(e.x,e.y,'dust',12);
      }
    }
  }
}

function update(dt){
  if(s.gameOver) return;
  if(s.waveActive && s.spawnLeft){ s.spawnTimer-=dt; if(s.spawnTimer<=0){ spawn(); s.spawnLeft--; s.spawnTimer=.78; } }
  for(let i=s.enemies.length-1;i>=0;i--){
    const e=s.enemies[i], q=path[e.pathIndex+1]; e.bob+=dt*4;
    if(!q){ s.enemies.splice(i,1); s.lives--; burst(e.x,e.y,'smoke',8); if(s.lives<=0){s.gameOver=true;msg('DEFEAT — the defensive line collapsed.');} continue; }
    const dx=q.x-e.x,dy=q.y-e.y,d=Math.hypot(dx,dy),m=e.speed*dt;
    if(d<=m){e.x=q.x;e.y=q.y;e.pathIndex++;}else{e.x+=dx/d*m;e.y+=dy/d*m;}
  }
  for(const t of s.towers){
    const d=DEFENCES[t.type]; t.cooldown-=dt; t.recoil=Math.max(0,t.recoil-dt*4);
    if(t.cooldown>0) continue;
    let target=null,best=-1;
    for(const e of s.enemies){ if(Math.hypot(e.x-t.x,e.y-t.y)<=t.range && e.pathIndex>=best){target=e;best=e.pathIndex;} }
    if(target){
      const rate=d.rate*(d.kind==='infantry'?fac().fireRate:1)*janissaryBonus(t);
      t.cooldown=1/rate; t.recoil=1;
      s.projectiles.push({x:t.x,y:t.y,target,damage:t.damage,kind:d.kind,splash:d.splash||0,type:d.projectile,trail:[]});
      if(['bullet','shell','missile'].includes(d.projectile)) burst(t.x+10,t.y-8,'flash',3);
    }
  }
  for(let i=s.projectiles.length-1;i>=0;i--){
    const p=s.projectiles[i];
    if(!s.enemies.includes(p.target)){s.projectiles.splice(i,1);continue;}
    p.trail.push({x:p.x,y:p.y}); if(p.trail.length>5)p.trail.shift();
    const dx=p.target.x-p.x,dy=p.target.y-p.y,d=Math.hypot(dx,dy),speed=p.type==='missile'?430:720,m=speed*dt;
    if(d<m+8){hit(p);s.projectiles.splice(i,1);}else{p.x+=dx/d*m;p.y+=dy/d*m;}
  }
  for(let i=s.effects.length-1;i>=0;i--){const e=s.effects[i];e.life-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=35*dt;if(e.life<=0)s.effects.splice(i,1);}
  if(s.waveActive&&!s.spawnLeft&&!s.enemies.length){s.waveActive=false;$('start-wave').disabled=false;msg(`Wave ${s.wave} defeated · ${s.kills} total kills. Build, research or negotiate before the next attack.`);}
  updateUI();
}

function terrainPalette(){
  return [
    ['#71805a','#566a45','#9b8c64'],['#6e7a55','#566347','#95835d'],['#77704d','#625b3e','#967b50'],
    ['#706a55','#5e5949','#80735d'],['#5e6253','#4e5549','#726b5b'],['#5b6257','#485148','#69685f']
  ][s.era];
}
function drawTree(x,y,size){ctx.fillStyle='#3b2d1f';ctx.fillRect(x-2,y,4,size);ctx.fillStyle='#334a2f';ctx.beginPath();ctx.arc(x,y-size*.25,size*.7,0,7);ctx.arc(x-size*.4,y,size*.55,0,7);ctx.arc(x+size*.4,y,size*.55,0,7);ctx.fill();}
function drawBuilding(x,y,i){
  const modern=s.era>=3;
  ctx.fillStyle=modern?'#777267':'#b19a70'; ctx.fillRect(x-9,y-8,18,14);
  ctx.fillStyle=modern?'#4f504b':'#72503a'; ctx.beginPath();ctx.moveTo(x-11,y-8);ctx.lineTo(x,y-17);ctx.lineTo(x+11,y-8);ctx.fill();
  ctx.fillStyle='#2f2d27';ctx.fillRect(x-2,y,4,6);
  if(s.era>=4&&i%2===0){ctx.fillStyle='#454842';ctx.fillRect(x+5,y-23,3,12);}
}
function drawTerrain(){
  const [base,dark,road]=terrainPalette();
  const grd=ctx.createLinearGradient(0,0,W,H);grd.addColorStop(0,base);grd.addColorStop(1,dark);ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=.14;
  scenerySeed.forEach((o,i)=>{ctx.fillStyle=i%2?'#d8cb98':'#20331e';ctx.beginPath();ctx.ellipse(o.x,o.y,o.size*2,o.size,0,0,7);ctx.fill();});
  ctx.globalAlpha=1;
  scenerySeed.slice(0,38).forEach((o,i)=>{const cx=Math.floor(o.x/TW),cy=Math.floor(o.y/TH);if(pathSet.has(`${cx},${cy}`))return;if(i%4===0)drawTree(o.x,o.y,8+o.size);else if(i%9===0)drawBuilding(o.x,o.y,i);else{ctx.fillStyle='#4a4a3d88';ctx.beginPath();ctx.arc(o.x,o.y,o.size*.55,0,7);ctx.fill();}});
  ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#2c251b55';ctx.lineWidth=46;ctx.beginPath();path.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  ctx.strokeStyle=road;ctx.lineWidth=38;ctx.stroke();
  ctx.strokeStyle='#c8b48544';ctx.lineWidth=3;ctx.setLineDash([8,15]);ctx.stroke();ctx.setLineDash([]);
  for(let i=2;i<path.length-2;i+=3){const p=path[i],q=path[i+1],a=Math.atan2(q.y-p.y,q.x-p.x);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);ctx.fillStyle='#ded0a044';ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-5,-5);ctx.lineTo(-5,5);ctx.fill();ctx.restore();}
  ctx.fillStyle='#a84538';ctx.fillRect(5,path[0].y-19,4,25);ctx.beginPath();ctx.moveTo(9,path[0].y-19);ctx.lineTo(27,path[0].y-12);ctx.lineTo(9,path[0].y-6);ctx.fill();
  ctx.fillStyle='#d5c392';ctx.fillRect(W-14,path.at(-1).y-18,8,30);ctx.fillStyle='#2b2b27';ctx.fillRect(W-19,path.at(-1).y-25,18,9);
}

function drawTower(t){
  const d=DEFENCES[t.type];ctx.save();ctx.translate(t.x,t.y);ctx.translate(-t.recoil*2,t.recoil);
  ctx.fillStyle='#00000045';ctx.beginPath();ctx.ellipse(4,16,23,9,0,0,7);ctx.fill();
  ctx.fillStyle='#7c704f';ctx.beginPath();ctx.ellipse(0,10,22,10,0,0,7);ctx.fill();ctx.strokeStyle='#413b2c';ctx.stroke();
  if(t.type==='janissary'){
    for(let x=-10;x<=10;x+=10){ctx.fillStyle='#ddd0ad';ctx.fillRect(x-3,-7,6,19);ctx.fillStyle='#9f2d2d';ctx.beginPath();ctx.arc(x,-10,5,0,7);ctx.fill();ctx.fillStyle='#ede1bd';ctx.fillRect(x-1,-17,2,5);ctx.strokeStyle='#33271e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+2,-4);ctx.lineTo(x+16,-11);ctx.stroke();}
  } else if(d.kind==='artillery'||d.kind==='antiarmor'){
    ctx.fillStyle=t.type==='bombard'?'#272824':'#4e4a3b';ctx.beginPath();ctx.arc(-6,7,8,0,7);ctx.arc(8,7,8,0,7);ctx.fill();ctx.fillStyle='#36362e';ctx.fillRect(-15,-7,30,13);ctx.strokeStyle='#1e1e1b';ctx.lineWidth=t.type==='bombard'?10:6;ctx.beginPath();ctx.moveTo(2,-3);ctx.lineTo(t.type==='bombard'?32:27,-16);ctx.stroke();
  } else if(t.type==='tower'){
    ctx.fillStyle='#735a3d';ctx.fillRect(-10,-19,20,31);ctx.fillStyle='#342d24';ctx.fillRect(-14,-21,28,7);ctx.fillStyle='#bda36d';ctx.fillRect(-2,-12,4,9);
  } else {
    ctx.fillStyle='#4c513d';ctx.fillRect(-13,-5,26,17);ctx.fillStyle='#2b3027';ctx.beginPath();ctx.arc(-5,-7,6,0,7);ctx.arc(6,-7,6,0,7);ctx.fill();ctx.strokeStyle='#30271f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(2,-5);ctx.lineTo(18,-13);ctx.stroke();
  }
  ctx.fillStyle='#f0d98e';ctx.font='bold 8px Inter';ctx.textAlign='center';ctx.fillText(`L${t.level}`,0,29);ctx.restore();
}

function drawEnemy(e){
  ctx.save();ctx.translate(e.x,e.y+Math.sin(e.bob)*1.5);ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(4,10,15,6,0,0,7);ctx.fill();
  if(['tank','vehicle'].includes(e.type)){
    ctx.fillStyle=e.type==='tank'?'#424a3d':'#565949';ctx.fillRect(-17,-9,34,18);ctx.fillStyle='#2c332b';ctx.fillRect(-8,-14,16,9);ctx.strokeStyle='#20241f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(1,-11);ctx.lineTo(23,-13);ctx.stroke();ctx.fillStyle='#262820';ctx.fillRect(-18,7,36,5);
  } else if(e.type==='siege'){
    ctx.fillStyle='#5a4934';ctx.fillRect(-15,-7,30,13);ctx.strokeStyle='#33271e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-5,-4);ctx.lineTo(18,-19);ctx.stroke();ctx.beginPath();ctx.arc(-10,8,6,0,7);ctx.arc(10,8,6,0,7);ctx.stroke();
  } else {
    for(let x=-7;x<=7;x+=7){ctx.fillStyle=e.color;ctx.fillRect(x-3,-3,6,14);ctx.fillStyle='#c5aa80';ctx.beginPath();ctx.arc(x,-7,4,0,7);ctx.fill();ctx.strokeStyle='#33291f';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+2,-2);ctx.lineTo(x+9,-8);ctx.stroke();}
  }
  ctx.fillStyle='#171610';ctx.fillRect(-18,-25,36,5);ctx.fillStyle=e.hp/e.maxHp>.6?'#718d57':e.hp/e.maxHp>.3?'#b18b42':'#a55043';ctx.fillRect(-18,-25,36*Math.max(0,e.hp/e.maxHp),5);ctx.restore();
}

function drawProjectiles(){
  for(const p of s.projectiles){
    if(p.trail.length>1){ctx.strokeStyle=p.type==='missile'?'#d8d1bd77':'#f3ca6666';ctx.lineWidth=p.type==='missile'?3:1;ctx.beginPath();p.trail.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke();}
    ctx.fillStyle=p.type==='shell'?'#302e28':p.type==='missile'?'#d6d2c8':'#f1ce76';ctx.beginPath();ctx.arc(p.x,p.y,p.type==='shell'?4:p.type==='missile'?3:2,0,7);ctx.fill();
  }
}
function drawEffects(){
  for(const e of s.effects){const a=Math.max(0,e.life/e.max);ctx.globalAlpha=a;ctx.fillStyle=e.type==='flash'?'#ffd36b':e.type==='spark'?'#f0c66c':e.type==='smoke'?'#5b5952':'#7a6444';ctx.beginPath();ctx.arc(e.x,e.y,e.size*(1+(1-a)),0,7);ctx.fill();ctx.globalAlpha=1;}
}
function draw(){
  drawTerrain();
  if(s.hover && !pathSet.has(`${s.hover.cx},${s.hover.cy}`)){ctx.fillStyle='#e4d49a22';ctx.fillRect(s.hover.cx*TW+2,s.hover.cy*TH+2,TW-4,TH-4);ctx.strokeStyle='#e8d59688';ctx.strokeRect(s.hover.cx*TW+3,s.hover.cy*TH+3,TW-6,TH-6);}
  s.towers.forEach(drawTower);s.enemies.forEach(drawEnemy);drawProjectiles();drawEffects();
  if(s.selectedTower){ctx.strokeStyle='#e0c77a88';ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.selectedTower.x,s.selectedTower.y,s.selectedTower.range,0,7);ctx.stroke();}
}

function renderTech(){
  const tree=$('tech-tree');tree.innerHTML='';
  for(const branch of ['Military','Engineering','Economy','Science','Statecraft']){
    const col=document.createElement('section');col.className='tech-column';col.innerHTML=`<h3>${branch}</h3>`;
    TECHNOLOGIES.filter(t=>t.branch===branch).forEach(t=>{
      const done=has(t.id),req=t.requires.every(has),card=document.createElement('div');card.className=`tech-card ${done?'researched':req?'available':''}`;
      card.innerHTML=`<h4>${t.name}</h4><p>${t.effect}</p><div class="tech-cost">${done?'RESEARCHED':`${t.cost} SCIENCE${!req?' · '+t.requires.join(', '):''}`}</div>`;
      if(!done){const b=document.createElement('button');b.textContent=req?'RESEARCH':'LOCKED';b.disabled=!req||s.science<t.cost;b.onclick=()=>{s.science-=t.cost;s.research.add(t.id);uiKey='';renderTech();updateUI(true);};card.appendChild(b);}
      col.appendChild(card);
    });tree.appendChild(col);
  }
}
function relationName(n){return n>=70?'Allied':n>=50?'Friendly':n>=30?'Neutral':'Hostile';}
function renderWorld(){
  const grid=$('world-grid');grid.innerHTML='';
  s.civs.forEach(c=>{
    const card=document.createElement('div');card.className='civ-card';
    card.innerHTML=`<h3>${c.name}</h3><div class="relation">${relationName(c.relation)} · ${c.relation}/100</div><div class="civ-meta">${c.trait}<br>Trade value: +${c.trade} Gold/wave<br>Known technology: ${TECHNOLOGIES.find(t=>t.id===c.tech)?.name||c.tech}<br><span class="resource-chip">${c.resource}</span></div><div class="civ-actions"></div>`;
    const actions=card.querySelector('.civ-actions');
    const trade=document.createElement('button');trade.textContent=s.routes.has(c.id)?'CANCEL TRADE':'ESTABLISH TRADE';trade.disabled=!s.routes.has(c.id)&&(s.routes.size>=routeCap()||!has('currency'));trade.onclick=()=>{s.routes.has(c.id)?s.routes.delete(c.id):s.routes.add(c.id);renderWorld();updateUI();};actions.appendChild(trade);
    const dip=document.createElement('button');dip.textContent='DIPLOMATIC MISSION';dip.disabled=!has('diplomacy')||s.gold<30;dip.onclick=()=>{s.gold-=30;c.relation=Math.min(100,c.relation+12);renderWorld();updateUI();};actions.appendChild(dip);
    const spy=document.createElement('button');spy.textContent='STEAL TECHNOLOGY';spy.disabled=!has('espionage')||has(c.tech)||s.gold<60;spy.onclick=()=>{s.gold-=60;const chance=.45+(has('intelligence')?.18:0)+(has('codebreaking')?.15:0);if(Math.random()<chance){s.research.add(c.tech);msg(`Espionage success: acquired ${TECHNOLOGIES.find(t=>t.id===c.tech)?.name||c.tech}.`);}else{c.relation=Math.max(0,c.relation-18);msg(`Spy mission failed in ${c.name}. Relations damaged.`);}uiKey='';renderWorld();updateUI(true);};actions.appendChild(spy);
    grid.appendChild(card);
  });
}
function renderEconomy(){
  $('economy-content').innerHTML=`<div class="economy-row"><span>Trade route capacity</span><strong>${s.routes.size} / ${routeCap()}</strong></div><div class="economy-row"><span>Trade revenue per wave</span><strong>+${tradeIncome()} Gold</strong></div><div class="economy-row"><span>Testing treasury subsidy</span><strong>+75 base Gold/wave</strong></div><div class="economy-row"><span>Merchant Guild multiplier</span><strong>${has('merchant-guilds')?'+20%':'Not researched'}</strong></div><div class="economy-row"><span>Strategic resources imported</span><strong>${[...s.routes].map(id=>s.civs.find(c=>c.id===id)?.resource).filter(Boolean).join(', ')||'None'}</strong></div>`;
}

$('start-wave').onclick=startWave;
$('faction').onchange=()=>{s.faction=$('faction').value;uiKey='';updateUI(true);};
$('upgrade').onclick=()=>{const t=s.selectedTower;if(!t)return;const cost=Math.round((45+t.level*35)*(fac().upgradeCost||1));if(s.gold<cost)return msg(`Upgrade requires ${cost} Gold.`);s.gold-=cost;t.level++;t.damage*=1.38;t.range*=1.06;burst(t.x,t.y,'flash',6);uiKey='';updateUI(true);};
$('sell').onclick=()=>{const t=s.selectedTower;if(!t)return;s.gold+=Math.round(price(DEFENCES[t.type])*.65);s.towers=s.towers.filter(x=>x!==t);s.selectedTower=null;uiKey='';updateUI(true);};
function openTech(){renderTech();$('tech-dialog').showModal();}
$('research-button').onclick=openTech;$('research-top').onclick=openTech;$('close-tech').onclick=()=>$('tech-dialog').close();
$('world-button').onclick=()=>{renderWorld();$('world-dialog').showModal();};$('close-world').onclick=()=>$('world-dialog').close();
$('economy-button').onclick=()=>{renderEconomy();$('economy-dialog').showModal();};$('close-economy').onclick=()=>$('economy-dialog').close();
$('advance-era').onclick=()=>{const n=ERAS[s.era+1];if(!n)return;s.science-=n.science;s.era++;s.gold+=200;uiKey='';msg(`A new age begins: ${ERAS[s.era].name}. The treasury grants 200 Gold for modernization.`);updateUI(true);};

function loop(now){const dt=Math.min(.033,(now-s.last)/1000);s.last=now;update(dt);draw();requestAnimationFrame(loop);}
updateUI(true);requestAnimationFrame(loop);
