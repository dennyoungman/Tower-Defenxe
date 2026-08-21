export const ERAS=[
{id:'ancient',name:'Ancient',maps:3,science:450,medals:6},
{id:'medieval',name:'Medieval',maps:6,science:1400,medals:18},
{id:'gunpowder',name:'Gunpowder',maps:8,science:3200,medals:34},
{id:'industrial',name:'Industrial',maps:10,science:6500,medals:54},
{id:'modern',name:'Modern',maps:10,science:0,medals:0}
];
export const MAPS=[
{id:'constantinople',name:'Constantinople',era:0,region:'Bosphorus',theme:'strait',desc:'Defend the imperial heartland beside the Bosphorus.'},
{id:'bursa',name:'Bursa',era:0,region:'Marmara',theme:'hills',desc:'Hold the road through wooded Anatolian foothills.'},
{id:'edirne',name:'Edirne',era:0,region:'Thrace',theme:'plains',desc:'Open plains reward range and careful artillery placement.'},
{id:'gallipoli',name:'Gallipoli',era:1,region:'Dardanelles',theme:'coast',desc:'A narrow coastal battlefield with limited build space.'},
{id:'thessaloniki',name:'Thessaloniki',era:1,region:'Macedonia',theme:'harbor',desc:'Protect the harbor approaches and city walls.'},
{id:'sofia',name:'Sofia',era:1,region:'Balkans',theme:'valley',desc:'Mountain passes funnel heavier enemy columns.'},
{id:'athens',name:'Athens',era:2,region:'Attica',theme:'dry',desc:'Long open lanes favor gunpowder-era defenses.'},
{id:'skopje',name:'Skopje',era:2,region:'Vardar',theme:'river',desc:'Cross-river fire lanes create unusual tower positions.'},
{id:'belgrade',name:'Belgrade',era:3,region:'Danube',theme:'fortress',desc:'A fortified junction with armored assaults.'},
{id:'budapest',name:'Buda',era:4,region:'Danube',theme:'city',desc:'Modern combined-arms waves push through a dense urban approach.'}
];
export const DIFFICULTIES={
recruit:{name:'Recruit',waves:12,rewardScience:90,rewardCoins:180,medal:'bronze',hp:0.72,speed:0.94,startGold:900},
veteran:{name:'Veteran',waves:18,rewardScience:170,rewardCoins:320,medal:'silver',hp:1,speed:1,startGold:780},
general:{name:'General',waves:24,rewardScience:290,rewardCoins:520,medal:'gold',hp:1.34,speed:1.05,startGold:690},
legendary:{name:'Legendary',waves:30,rewardScience:480,rewardCoins:800,medal:'elite',hp:1.78,speed:1.1,startGold:620}
};
export const ARSENAL={
archer:{name:'Archer Post',era:0,cost:180,role:'Fast infantry fire',requires:'archery',damage:17,range:132,rate:.85,kind:'infantry'},
ballista:{name:'Ballista',era:0,cost:270,role:'Heavy armor-piercing bolts',requires:'ballistae',damage:48,range:165,rate:.38,kind:'artillery'},
watchtower:{name:'Watchtower',era:0,cost:145,role:'Long-range support',requires:null,damage:12,range:192,rate:.62,kind:'infantry'},
crossbow:{name:'Crossbow Company',era:1,cost:220,role:'Armor-piercing infantry',requires:'crossbows',damage:36,range:150,rate:.65,kind:'infantry'},
trebuchet:{name:'Trebuchet',era:1,cost:350,role:'Long-range area damage',requires:'trebuchets',damage:115,range:235,rate:.18,kind:'artillery',splash:54},
janissary:{name:'Janissary Corps',era:2,cost:320,role:'Elite Ottoman firearm infantry',requires:'janissaries',damage:58,range:176,rate:1.05,kind:'infantry'},
bombard:{name:'Great Bombard',era:2,cost:520,role:'Ottoman super-heavy artillery',requires:'great-bombards',damage:240,range:250,rate:.14,kind:'artillery',splash:76},
rifle:{name:'Rifle Redoubt',era:3,cost:360,role:'Accurate industrial infantry',requires:'rifles',damage:54,range:182,rate:.95,kind:'infantry'},
howitzer:{name:'Howitzer Battery',era:3,cost:680,role:'Heavy area artillery',requires:'howitzers',damage:285,range:285,rate:.19,kind:'artillery',splash:72},
machinegun:{name:'Machine Gun Nest',era:4,cost:510,role:'Extreme anti-infantry fire',requires:'machineguns',damage:27,range:164,rate:3.3,kind:'infantry'},
atgm:{name:'ATGM Position',era:4,cost:850,role:'Dedicated anti-armor',requires:'guided-weapons',damage:520,range:250,rate:.28,kind:'antiarmor'}
};
export const RESEARCH=[
{id:'archery',era:0,branch:'Warfare',name:'Organized Archery',cost:120,effect:'+8% infantry tower range.'},
{id:'ballistae',era:0,branch:'Artillery',name:'Counterweight Ballistae',cost:160,effect:'Unlock Ballista.'},
{id:'fieldcraft',era:0,branch:'Command',name:'Fieldcraft',cost:140,effect:'+80 starting Gold.'},
{id:'coinage',era:0,branch:'Economy',name:'Military Coinage',cost:150,effect:'+8% battle kill Gold.'},
{id:'crossbows',era:1,branch:'Warfare',name:'Crossbow Corps',cost:260,effect:'Unlock Crossbow Company.'},
{id:'trebuchets',era:1,branch:'Engineering',name:'Siege Engineering',cost:300,effect:'Unlock Trebuchet.'},
{id:'fortified-posts',era:1,branch:'Engineering',name:'Fortified Posts',cost:280,effect:'+12% tower durability.'},
{id:'supply-officers',era:1,branch:'Command',name:'Supply Officers',cost:310,effect:'+120 starting Gold.'},
{id:'janissaries',era:2,branch:'Warfare',name:'Janissary Corps',cost:520,effect:'Unlock Janissary Corps.'},
{id:'great-bombards',era:2,branch:'Artillery',name:'Great Bombards',cost:600,effect:'Unlock Great Bombard.'},
{id:'powder-drills',era:2,branch:'Command',name:'Powder Drills',cost:540,effect:'+10% firearm rate of fire.'},
{id:'war-treasury',era:2,branch:'Economy',name:'War Treasury',cost:500,effect:'+12% first-clear coin rewards.'},
{id:'rifles',era:3,branch:'Warfare',name:'Rifled Arms',cost:900,effect:'Unlock Rifle Redoubt.'},
{id:'howitzers',era:3,branch:'Artillery',name:'Modern Artillery',cost:1100,effect:'Unlock Howitzer Battery.'},
{id:'logistics',era:3,branch:'Command',name:'Rail Logistics',cost:980,effect:'+180 starting Gold.'},
{id:'machineguns',era:4,branch:'Warfare',name:'Automatic Weapons',cost:1500,effect:'Unlock Machine Gun Nest.'},
{id:'guided-weapons',era:4,branch:'Artillery',name:'Guided Weapons',cost:1850,effect:'Unlock ATGM Position.'},
{id:'network-command',era:4,branch:'Command',name:'Networked Command',cost:1650,effect:'+12% all tower range.'}
];
export function newProfile(){return{version:1,faction:'ottoman',era:0,science:0,coins:500,medals:0,totalScienceEarned:0,research:['archery'],mastery:{},mapResults:{},unlockedMaps:['constantinople'],created:Date.now()}}
export function loadProfile(){try{return JSON.parse(localStorage.getItem('chronicle_ottoman_v1'))||newProfile()}catch{return newProfile()}}
export function saveProfile(p){localStorage.setItem('chronicle_ottoman_v1',JSON.stringify(p))}
export function completedMaps(p){return MAPS.filter(m=>Object.keys(p.mapResults[m.id]||{}).length>0).length}
export function earnedMedals(p){return MAPS.reduce((n,m)=>n+Object.values(p.mapResults[m.id]||{}).filter(Boolean).length,0)}
export function refreshUnlocks(p){const done=completedMaps(p);MAPS.forEach((m,i)=>{if(i===0||done>=i||MAPS.slice(0,i).some(x=>Object.keys(p.mapResults[x.id]||{}).length))if(m.era<=p.era&&!p.unlockedMaps.includes(m.id))p.unlockedMaps.push(m.id)});p.medals=earnedMedals(p)}
export function eraStatus(p){const n=ERAS[p.era+1];if(!n)return null;return{next:n,maps:completedMaps(p),medals:earnedMedals(p),science:p.totalScienceEarned,ready:completedMaps(p)>=n.maps&&earnedMedals(p)>=n.medals&&p.totalScienceEarned>=n.science}}
