export const SERVICE_WINDOWS={
archer:{min:0,max:1},ballista:{min:0,max:1},tower:{min:0,max:2},
crossbow:{min:1,max:2},trebuchet:{min:1,max:2},
janissary:{min:2,max:2},bombard:{min:2,max:2},cannon:{min:2,max:3},
rifle:{min:3,max:4},machinegun:{min:4,max:5},howitzer:{min:4,max:5},atgm:{min:5,max:5}
};
export const UPGRADE_PATHS={
infantry:{
2:[{id:'precision',name:'Veteran Marksmen',desc:'+32% damage · +12% range',cost:.72,damage:1.32,range:1.12,rate:1},{id:'volley',name:'Rapid Formation',desc:'+38% fire rate · +12% damage',cost:.68,damage:1.12,range:1,rate:1.38}],
3:{precision:{id:'precision3',name:'Elite Sharpshooters',desc:'+45% damage · +18% range',cost:1.05,damage:1.45,range:1.18,rate:1.08},volley:{id:'volley3',name:'Disciplined Barrage',desc:'+62% fire rate · +20% damage',cost:1.02,damage:1.2,range:1.03,rate:1.62}}
},
artillery:{
2:[{id:'heavy',name:'Heavy Battery',desc:'+48% damage · +18% blast',cost:.78,damage:1.48,range:1.02,rate:.92,splash:1.18},{id:'field',name:'Field Battery',desc:'+20% range · +25% reload',cost:.72,damage:1.15,range:1.2,rate:1.25,splash:1.05}],
3:{heavy:{id:'heavy3',name:'Siege Battery',desc:'+72% damage · +35% blast',cost:1.12,damage:1.72,range:1.06,rate:.9,splash:1.35},field:{id:'field3',name:'Grand Battery',desc:'+32% range · +45% reload',cost:1.08,damage:1.28,range:1.32,rate:1.45,splash:1.12}}
},
antiarmor:{
2:[{id:'hunter',name:'Tank Hunters',desc:'+45% damage · +15% range',cost:.82,damage:1.45,range:1.15,rate:1},{id:'rapid',name:'Rapid Launcher',desc:'+38% reload · +18% damage',cost:.78,damage:1.18,range:1.03,rate:1.38}],
3:{hunter:{id:'hunter3',name:'Long-Range Kill Team',desc:'+75% damage · +28% range',cost:1.18,damage:1.75,range:1.28,rate:.95},rapid:{id:'rapid3',name:'Saturation ATGM',desc:'+68% reload · +30% damage',cost:1.14,damage:1.3,range:1.06,rate:1.68}}
}
};
export function serviceable(id,era){const w=SERVICE_WINDOWS[id]||{min:0,max:5};return era>=w.min&&era<=w.max}
export function tierCost(base,tier,path){const kind=path?.kind||'infantry';const table=UPGRADE_PATHS[kind];if(tier===2)return Math.round(base*(table?.[2]?.[0]?.cost||.7));return Math.round(base*1.05)}
