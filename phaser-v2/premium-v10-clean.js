(()=>{
  if(!window.Phaser||window.__chroniclePremiumV10Clean)return;
  window.__chroniclePremiumV10Clean=true;
  const NativeGame=Phaser.Game;
  const BG_KEY='chronicle-premium-bg-v10';
  const BG_DATA=window.__premiumBGData;
  function textureKey(obj){try{return obj&&obj.texture&&obj.texture.key||''}catch{return''}}
  function hasTexture(obj,prefix){try{return obj&&obj.list&&obj.list.some(c=>textureKey(c).startsWith(prefix))}catch{return false}}
  function lift(scene){
    for(const obj of scene.children.list){
      if(obj.__premiumBackground)continue;
      const key=textureKey(obj);
      if(key.startsWith('enemy-')||hasTexture(obj,'enemy-'))obj.setDepth(80);
      else if(key.startsWith('k-')||hasTexture(obj,'k-'))obj.setDepth(Math.max(60,obj.depth||0));
      else if((obj.depth||0)>=20)obj.setDepth(Math.max(60,obj.depth||0));
    }
  }
  function install(scene){
    if(!scene.textures.exists(BG_KEY))throw new Error('Premium battlefield texture did not initialize.');
    const map=(document.getElementById('battle-map-name')?.textContent||'CONSTANTINOPLE').toUpperCase();
    const bg=scene.add.image(480,300,BG_KEY).setDisplaySize(960,600).setDepth(12);
    bg.__premiumBackground=true;
    if(map==='BURSA')bg.setTint(0xd6caa5).setFlipX(true);
    const vignette=scene.add.graphics().setDepth(13);vignette.__premiumBackground=true;
    vignette.fillGradientStyle(0x000000,0x000000,0x000000,0x000000,.04,.04,.19,.19);vignette.fillRect(0,0,960,600);
    const stamp=scene.add.text(20,74,map==='BURSA'?'BURSA · IMPERIAL FRONTIER':'CONSTANTINOPLE · 1453',{fontFamily:'Georgia,serif',fontSize:'16px',fontStyle:'bold',color:'#f4d598',stroke:'#090807',strokeThickness:6}).setDepth(90);
    stamp.setAlpha(.92);
    scene.time.addEvent({delay:50,loop:true,callback:()=>lift(scene)});
    lift(scene);
  }
  function WrappedGame(config){
    const sc=config&&config.scene;
    if(sc&&typeof sc==='object'&&!Array.isArray(sc)){
      const preload=sc.preload,create=sc.create;
      sc.preload=function(){if(!BG_DATA)throw new Error('Premium battlefield art data is missing.');this.load.image(BG_KEY,BG_DATA);return preload&&preload.call(this)};
      sc.create=function(){const out=create&&create.call(this);install(this);return out};
    }
    return new NativeGame(config);
  }
  WrappedGame.prototype=NativeGame.prototype;
  Object.setPrototypeOf(WrappedGame,NativeGame);
  Phaser.Game=WrappedGame;
})();