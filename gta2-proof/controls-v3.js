(()=>{
'use strict';
const bindings={left:'ArrowLeft',right:'ArrowRight',gas:'ArrowUp',brake:'ArrowDown'};
const active=new Map();
function fire(type,key){window.dispatchEvent(new KeyboardEvent(type,{key,bubbles:true,cancelable:true}));}
function setPressed(el,on){el.classList.toggle('active',on);}
Object.entries(bindings).forEach(([id,key])=>{
  const el=document.getElementById(id);
  if(!el)return;
  el.style.touchAction='none';
  el.style.webkitUserSelect='none';
  el.style.userSelect='none';
  const press=(e)=>{
    e.preventDefault();
    if(e.pointerId!==undefined){try{el.setPointerCapture(e.pointerId)}catch(_){} active.set(e.pointerId,{el,key});}
    fire('keydown',key);
    setPressed(el,true);
  };
  const release=(e)=>{
    e.preventDefault();
    if(e.pointerId!==undefined)active.delete(e.pointerId);
    fire('keyup',key);
    setPressed(el,false);
  };
  el.addEventListener('pointerdown',press,{passive:false});
  el.addEventListener('pointerup',release,{passive:false});
  el.addEventListener('pointercancel',release,{passive:false});
  el.addEventListener('lostpointercapture',release,{passive:false});
  el.addEventListener('contextmenu',e=>e.preventDefault());
});
window.addEventListener('blur',()=>{
  for(const {el,key} of active.values()){fire('keyup',key);setPressed(el,false)}
  active.clear();
});
})();
