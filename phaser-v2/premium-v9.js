(()=>{
  if(!window.Phaser||window.__chroniclePremiumV9)return;
  window.__chroniclePremiumV9=true;
  const NativeGame=Phaser.Game;
  const BG_KEY='chronicle-premium-constantinople';
  const BG_URL='assets/constantinople-premium-bg.jpg';
  function textureKey(obj){try{return obj&&obj.texture&&obj.texture.key||''}catch{return''}}
  function containerHasKey(obj,prefix){try{return obj&&obj.list&&obj.list.some(c=>textureKey(c).startsWith(prefix))}catch{return false}}
  function liftGameplay(scene){
    for(const obj of scene.children.list){
      const key=textureKey(obj);
      if(key.startsWith('enemy-')) obj.setDepth(52);
      else if(key.startsWith('k-')) obj.setDepth(Math.max(34,obj.depth||0));
      else if(containerHasKey(obj,'enemy-')) obj.setDepth(52);
      else if(containerHasKey(obj,'k-')) obj.setDepth(Math.max(34,obj.depth||0));
    }
  }
  function installPremiumScene(scene){
    const map=(document.getElementById('battle-map-name')?.textContent||'').toUpperCase();
    if(!scene.textures.exists(BG_KEY))return;
    const bg=scene.add.image(480,300,BG_KEY).setDisplaySize(960,600).setDepth(8);
    if(map==='BURSA') bg.setTint(0xd7c89d).setFlipX(true);
    const shade=scene.add.graphics().setDepth(9);
    shade.fillGradientStyle(0x071015,0x071015,0x000000,0x000000,.02,.02,.24,.24);shade.fillRect(0,0,960,600);
    shade.lineStyle(2,0xe7b85c,.16);shade.strokeRect(8,8,944,584);
    const ambience=scene.add.graphics().setDepth(11);
    for(const [x,y,r,a] of [[220,120,90,.035],[705,150,120,.03],[520,500,150,.025]]){ambience.fillStyle(0xffc66d,a);ambience.fillCircle(x,y,r)}
    scene.tweens.add({targets:ambience,alpha:{from:.65,to:1},duration:2800,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    const stamp=scene.add.text(24,82,map==='BURSA'?'BURSA · IMPERIAL FRONTIER':'CONSTANTINOPLE · 1453',{fontFamily:'Georgia,serif',fontSize:'14px',fontStyle:'bold',color:'#f2d69a',stroke:'#120d08',strokeThickness:5,letterSpacing:1}).setDepth(14).setAlpha(.9);
    scene.time.addEvent({delay:80,loop:true,callback:()=>liftGameplay(scene)});
    liftGameplay(scene);
  }
  function WrappedGame(config){
    const sc=config&&config.scene;
    if(sc&&typeof sc==='object'&&!Array.isArray(sc)){
      const originalPreload=sc.preload;
      const originalCreate=sc.create;
      sc.preload=function(){this.load.image(BG_KEY,BG_URL);if(originalPreload)return originalPreload.call(this)};
      sc.create=function(){const out=originalCreate&&originalCreate.call(this);installPremiumScene(this);return out};
    }
    return new NativeGame(config);
  }
  WrappedGame.prototype=NativeGame.prototype;
  Object.setPrototypeOf(WrappedGame,NativeGame);
  Phaser.Game=WrappedGame;
})();
