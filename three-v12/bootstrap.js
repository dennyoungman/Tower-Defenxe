const status=document.getElementById('load-status');
try{
  const r=await fetch('game.js?v=12',{cache:'no-store'});
  if(!r.ok)throw new Error(`game source ${r.status}`);
  let src=await r.text();
  src=src.replace("e.obj.material.opacity=(1-q)*(e.kind==='flash'?.95:.78)","e.obj.material.opacity=(1-q)*(e.kind==='flash' ? .95 : .78)");
  src=src.replace("d.ghost.traverse(o=>{if(o.geometry&&!o.userData.shared)o.geometry.dispose?.()});","");
  src=src.replace("if(e.dead){e.removeIn-=dt*state.speed;","if(e.dead){e.anim?.mixer?.update(dt*state.speed);e.removeIn-=dt*state.speed;");
  src=src.replace("function updateTowers(dt){for(const t of state.towers){t.cd-=dt*state.speed;","function updateTowers(dt){for(const t of state.towers){t.anim?.mixer?.update(dt*state.speed);t.cd-=dt*state.speed;");
  const url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));
  await import(url);
}catch(e){
  console.error(e);
  if(status)status.textContent='Unable to start 3D proof.';
  const box=document.getElementById('fatal'),txt=document.getElementById('fatal-text');
  if(txt)txt.textContent=e?.message||String(e);
  box?.classList.remove('hidden');
}