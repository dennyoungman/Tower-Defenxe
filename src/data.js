export const ERAS = [
  {id:'ancient',name:'Ancient',start:1,science:0,required:[]},
  {id:'medieval',name:'Medieval',start:7,science:150,required:['fortifications','crossbow']},
  {id:'gunpowder',name:'Gunpowder',start:15,science:300,required:['gunpowder']},
  {id:'industrial',name:'Industrial',start:23,science:500,required:['rifling']},
  {id:'mechanized',name:'Mechanized',start:31,science:750,required:['automatic-weapons']},
  {id:'modern',name:'Modern',start:40,science:1100,required:['guided-weapons']},
];

export const FACTIONS={
 british:{name:'British',desc:'Long-range doctrine. +12% range and +10% wave income.',range:1.12,income:1.10,fireRate:1},
 ottoman:{name:'Ottoman',desc:'Siege doctrine. Artillery costs 15% less and deals +15% damage.',range:1,income:1,fireRate:1,artilleryCost:.85,artilleryDamage:1.15},
 german:{name:'German',desc:'Engineering doctrine. Upgrades cost 15% less and all defences deal +5% damage.',range:1,income:1,fireRate:1,upgradeCost:.85,damage:1.05},
 japanese:{name:'Japanese',desc:'Infantry doctrine. Infantry positions fire 18% faster.',range:1,income:1,fireRate:1.18}
};

export const DEFENCES={
 archer:{name:'Archer Position',era:0,cost:80,damage:18,range:125,rate:.72,role:'Fast anti-infantry fire',kind:'infantry',projectile:'arrow'},
 ballista:{name:'Ballista',era:0,cost:130,damage:48,range:165,rate:.34,role:'Heavy bolt / armored targets',kind:'artillery',projectile:'bolt'},
 tower:{name:'Watchtower',era:0,cost:105,damage:13,range:190,rate:.58,role:'Long range observation & fire',kind:'infantry',projectile:'arrow'},
 crossbow:{name:'Crossbow Position',era:1,cost:155,damage:34,range:145,rate:.55,role:'Armor-piercing infantry fire',kind:'infantry',requires:'crossbow',projectile:'bolt'},
 trebuchet:{name:'Trebuchet',era:1,cost:240,damage:105,range:225,rate:.16,role:'Slow area bombardment',kind:'artillery',requires:'siege-engineering',splash:50,projectile:'stone'},
 cannon:{name:'Cannon Battery',era:2,cost:330,damage:145,range:230,rate:.22,role:'Heavy artillery',kind:'artillery',requires:'gunpowder',splash:42,projectile:'shell'},
 rifle:{name:'Rifle Position',era:3,cost:260,damage:42,range:170,rate:.8,role:'Accurate infantry defence',kind:'infantry',requires:'rifling',projectile:'bullet'},
 machinegun:{name:'Machine Gun Nest',era:4,cost:410,damage:25,range:155,rate:3.2,role:'Exceptional vs infantry',kind:'infantry',requires:'automatic-weapons',projectile:'bullet'},
 howitzer:{name:'Howitzer Battery',era:4,cost:620,damage:260,range:275,rate:.18,role:'Long-range area artillery',kind:'artillery',requires:'modern-artillery',splash:65,projectile:'shell'},
 atgm:{name:'ATGM Position',era:5,cost:780,damage:520,range:245,rate:.25,role:'Dedicated anti-armor weapon',kind:'antiarmor',requires:'guided-weapons',projectile:'missile'},
};

export const TECHNOLOGIES=[
 {id:'archery',branch:'Infantry',name:'Organized Archery',cost:40,requires:[],effect:'Improves projectile doctrine.'},
 {id:'crossbow',branch:'Infantry',name:'Crossbow',cost:80,requires:['archery'],effect:'Unlocks Crossbow Positions.'},
 {id:'rifling',branch:'Infantry',name:'Rifling',cost:220,requires:['gunpowder'],effect:'Unlocks Rifle Positions.'},
 {id:'automatic-weapons',branch:'Infantry',name:'Automatic Weapons',cost:400,requires:['rifling'],effect:'Unlocks Machine Gun Nests.'},
 {id:'fortifications',branch:'Engineering',name:'Fortifications',cost:55,requires:[],effect:'Required for Medieval advancement.'},
 {id:'siege-engineering',branch:'Engineering',name:'Siege Engineering',cost:100,requires:['fortifications'],effect:'Unlocks Trebuchets.'},
 {id:'gunpowder',branch:'Engineering',name:'Gunpowder',cost:180,requires:['crossbow','siege-engineering'],effect:'Unlocks Cannon Batteries and Gunpowder Era.'},
 {id:'modern-artillery',branch:'Engineering',name:'Modern Artillery',cost:470,requires:['rifling'],effect:'Unlocks Howitzer Batteries.'},
 {id:'commerce',branch:'Statecraft',name:'Organized Commerce',cost:65,requires:[],effect:'+15 starting Gold on each future wave.'},
 {id:'academies',branch:'Statecraft',name:'Academies',cost:110,requires:['commerce'],effect:'+20% Science from kills.'},
 {id:'logistics',branch:'Statecraft',name:'Military Logistics',cost:210,requires:['academies'],effect:'+10% Gold from kills.'},
 {id:'guided-weapons',branch:'Statecraft',name:'Guided Weapons',cost:650,requires:['automatic-weapons','modern-artillery'],effect:'Unlocks ATGM Positions and Modern Era.'},
];

export const ENEMIES={
 infantry:{name:'Infantry',hp:95,speed:42,reward:14,science:5,armor:0,color:'#4b392c'},
 runner:{name:'Fast Infantry',hp:65,speed:72,reward:16,science:6,armor:0,color:'#6b5133'},
 heavy:{name:'Armored Infantry',hp:220,speed:34,reward:24,science:9,armor:.15,color:'#37362f'},
 siege:{name:'Siege Unit',hp:480,speed:24,reward:42,science:15,armor:.25,color:'#514632'},
 vehicle:{name:'Light Vehicle',hp:800,speed:52,reward:58,science:20,armor:.42,color:'#4d5142'},
 tank:{name:'Heavy Armor',hp:1900,speed:30,reward:95,science:32,armor:.62,color:'#343b32'},
};
