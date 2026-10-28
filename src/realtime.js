import {CORE_SECTOR,restoreFrontierWorld,validateFrontier} from './frontier-world.js';
import {WORLD,FACTIONS,POLICIES,PROJECTS,DOCTRINES,TERRAINS,makeWorld,makeOfficers,city,officer,owned,strongholds,governingHub,hinterland,troopTotal,clamp,dist,routeCost,WORLD_GENERATOR_VERSION,stationedArmies,stationedTroops,regionAt} from './world.js';
import {PERSONAS} from './fantasy.js';
import {loadCampaign as loadLegacy} from './phase.js';
import {trace} from './logger.js';
import {PriorityQueue} from './priority-queue.js';
import {generalTraits,evaluateGeneral,GENERAL_ACTIONS} from './general-ai.js';
import {militaryTerrain,militaryDays,militaryFrontier,frontierAt,findMilitaryRoute,militaryRouteSummary} from './military-routing.js';
import {hasEconomy,initializeEconomy,validateEconomy,foodStock,hubFor,changeStock,regionEconomicYield,advanceEconomy,prepareArmyFood,laborAvailable,laborUsed,hubEconomy} from './economy.js';
import {EMPTY_STOCK} from './economy-rules.js';
import {advanceWorkParties,validateWorkParties} from './work-parties.js';
import {advanceResourceOperations} from './resource-policy.js';
import {scaleWorld,LARGE_WORLD_SCALE} from './large-world.js';
import {updateVisibility} from './fog-of-war.js';
import {initializeKingdoms,validateKingdoms,thinkKingdom,kingdomObjective} from './kingdom-ai.js';
import {hasKingdoms,mayInvade,knownOwner,canCommitArmy,warBetween} from './kingdom-rules.js';
import {knownGarrison} from './kingdom-knowledge.js';
import {advanceDiplomacy,recordWarLoss} from './diplomacy.js';
import {initializeCommandPoints,validateCommandPoints,projectCommandCost,commandError,spendCommandPoints,advanceCommandPoints,COMMAND_COSTS} from './command-points.js';
export {foodStock} from './economy.js';
export {WORLD,FACTIONS,POLICIES,PROJECTS,DOCTRINES,TERRAINS,city,officer,owned,strongholds,governingHub,hinterland,troopTotal,PERSONAS,stationedArmies,stationedTroops};
const ids=Object.keys(FACTIONS),round50=n=>Math.max(0,Math.floor(n/50)*50);
export function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export const MAP_SIZES={small:{name:'작은 지도',scale:1,description:'기본 전장에서 왕국 간 전쟁에 집중합니다.'},large:{name:'큰 지도',scale:10,description:'기본 전장 바깥으로 넓은 중립 지역을 탐사합니다.'}};
export function newCampaign(player='shu',seed=42,{worldScale=1,mapSize}={}){
 if(!['shu','wei','wu'].includes(player))throw new Error('영주를 선택하세요.');
 if(mapSize!==undefined){if(!Object.hasOwn(MAP_SIZES,mapSize))throw new Error('맵 크기를 선택하세요.');worldScale=MAP_SIZES[mapSize].scale;}
 const s={version:4,landRules:1,worldType:'procedural',generatorVersion:WORLD_GENERATOR_VERSION,worldSeed:seed>>>0,seed:seed>>>0,player,selected:FACTIONS[player].capital,cities:makeWorld(seed),...makeOfficers(seed),projects:[],armies:[],caravans:[],pacts:[],hostilities:{},events:[],reports:[],effects:[],elapsed:0,day:1,month:9,year:1,turn:1,paused:false,status:'playing',serial:0,revision:0,aiCursor:0,urgent:[],resourceLog:[],trust:{},pool:['zhaoyun','pangtong','huangzhong','machao','xuhuang','luxun','huangyueying','taishici'],ledger:{gold:0,food:0}};
 if(mapSize!==undefined)Object.assign(s,{mapSize,worldScale,fogRules:1});
 s.factions[player].doctrine='balanced';initializeGenerals(s);
 report(s,'world',`${worldScale===LARGE_WORLD_SCALE?WORLD.count*100:WORLD.count}개 지형, ${strongholds(s).length}개 거점, ${ids.length}개 왕국. 지휘관에게 전쟁을 맡기고 거점을 돌보세요.`,{faction:player});return worldScale===LARGE_WORLD_SCALE?expandCampaign(s):s;
}
export function newEconomicCampaign(player='shu',seed=42,options={}){const s=newCampaign(player,seed,options);initializeEconomy(s);initializeCommandPoints(s);initializeKingdoms(s);return s;}
export function expandCampaign(s){
 if(s.frontier){s.fogRules=1;updateVisibility(s);return s;}
 const next=structuredClone(s),factor=1/(s.worldScale||1),dx=21600,dy=16400;next.worldScale=10;next.frontier={version:1,chunks:[CORE_SECTOR]};next.fogRules=1;next.revision++;
 scaleWorld(next.cities,factor);
 const roads=new Set();for(const c of next.cities){c.sector=CORE_SECTOR;c.x+=dx;c.y+=dy;c.poly=c.poly.map(([x,y])=>[x+dx,y+dy]);c.col=Math.floor(c.x/180);c.row=Math.floor(c.y/(4100/18));for(const b of Object.values(c.roads||{}))if(!roads.has(b)){roads.add(b);b.x+=dx;b.y+=dy;}}
 for(const a of next.armies){a.sx=a.sx*factor+dx;a.tx=a.tx*factor+dx;a.sy=a.sy*factor+dy;a.ty=a.ty*factor+dy;if(a.bend){a.bend.x=a.bend.x*factor+dx;a.bend.y=a.bend.y*factor+dy;}}
 const seen=new Set();for(const e of [...next.events,...next.reports,...next.effects])if(!seen.has(e)){seen.add(e);if(Number.isFinite(e.x))e.x=e.x*factor+dx;if(Number.isFinite(e.y))e.y=e.y*factor+dy;}
 next.explored=(s.explored||[]).filter(id=>next.cities.some(c=>c.id===id));const fog=updateVisibility(next);if(!fog.visible.has(next.selected))next.selected=strongholds(next,next.player)[0]?.id||next.selected;return next;
}

function report(s,kind,text,data={}){
 const e={id:++s.serial,at:s.elapsed,day:s.day,month:s.month,year:s.year,kind,text,...data};
 s.events.unshift(e);if(s.events.length>160)s.events.length=160;
 if(e.faction===s.player||e.other===s.player||kind==='outcome'){s.reports.unshift(e);if(s.reports.length>80)s.reports.length=80;}
 if(['hit','capture','work','arrival','defeat'].includes(kind)){s.effects.push(e);if(s.effects.length>24)s.effects.shift();}
 trace('world',kind,e);return e;
}
function resources(s,f,gold,food,reason,region){
 const stock=s.factions[f],beforeFood=foodStock(s,f);
 if(hasEconomy(s)){if(food){const h=hubFor(s,region,f);if(!h)throw new Error('물자를 지급할 아군 거점이 없습니다.');changeStock(s,h.id,'food',food,reason,false);}}else stock.food+=food;
 stock.gold+=gold;
 if(f!==s.player)return;
 s.resourceLog??=[];s.resourceLog.unshift({at:s.elapsed,day:s.day,month:s.month,year:s.year,gold,food:Math.max(0,foodStock(s,f))-beforeFood,reason});
 if(s.resourceLog.length>24)s.resourceLog.length=24;
 trace('economy','resource.changed',{reason,gold,food,balance:{gold:stock.gold,food:Math.max(0,foodStock(s,f))}});
}
export function serializeCampaign(s){
 if(!s.frontier)return JSON.stringify(s);
 const immutable=new Set(['x','y','poly','edges','neighbors','roads','col','row','name','region','terrain','elevation','forestDensity','major']);
 return JSON.stringify({...s,cities:s.cities.map(c=>Object.fromEntries(Object.entries(c).filter(([key])=>!immutable.has(key))))});
}
function migrateLandRules(s){
 if(s.landRules===1)return;
 let troops=0,refund=0;
 for(const c of s.cities)if(!c.major){const hub=governingHub(s,c);if(hub){const n=c.soldiers;hub.training=(hub.training*hub.soldiers+c.training*n)/Math.max(1,hub.soldiers+n);hub.soldiers+=n;troops+=n;c.soldiers=0;}c.defense=0;}
 s.projects=s.projects.filter(p=>{if(city(s,p.city).major)return true;const left=p.type==='hire'?1:1-p.progress,gold=Math.floor(p.gold*left),food=Math.floor(p.food*left);resources(s,p.faction,gold,food,'거점 전환 · 남은 사업비 환급');if(p.faction===s.player)refund+=gold;return false;});
 s.landRules=1;report(s,'world',`거점 중심으로 영지를 정리했습니다. 일반 땅의 병력을 거점에 모으고 남은 사업비 금 ${refund}을 돌려받았습니다.`,{faction:s.player});trace('save','land.migrated',{troops,refund});
}
export function loadCampaign(raw){
 const old=JSON.parse(raw);
 delete old.weather;
 if(old.commandRules!==undefined&&old.commandRules!==1)throw new Error('지원하지 않는 행동력 규칙입니다.');
 if(old.worldScale!==undefined&&![1,LARGE_WORLD_SCALE].includes(old.worldScale))throw new Error('지원하지 않는 세계 크기입니다.');
 if(old.mapSize!==undefined&&(!Object.hasOwn(MAP_SIZES,old.mapSize)||old.worldScale!==MAP_SIZES[old.mapSize].scale||!!old.frontier!==(old.mapSize==='large')))throw new Error('저장된 맵 크기가 올바르지 않습니다.');
 if(old.fogRules!==undefined&&old.fogRules!==1)throw new Error('지원하지 않는 시야 규칙입니다.');
 if(old.economyRules!==undefined&&![0,1].includes(old.economyRules))throw new Error('지원하지 않는 경제 규칙입니다.');
 if(old.version!==4){
  const v=loadLegacy(raw),s=newCampaign(v.player,v.seed);s.paused=true;s.year=v.year;s.month=v.month;s.day=Math.max(1,v.day);s.turn=v.turn;
  for(const id of ['shu','wei','wu']){s.factions[id].gold=v.factions[id].gold;s.factions[id].food=v.factions[id].food;s.factions[id].officers=[...v.factions[id].officers];}
  s.pool=[...v.pool];s.trust={...v.trust};
  for(const c of v.cities){const to=city(s,c.id);for(const key of ['owner','population','reserve','agriculture','commerce','defense','morale','training','weariness','soldiers']){if(key==='owner'&&!ids.includes(c.owner))continue;to[key]=c[key];}}
  for(const a of v.armies){const from=city(s,a.from),to=city(s,a.target);s.armies.push({...a,sx:from.x,sy:from.y,tx:to.x,ty:to.y,previous:a.progress,reason:'이전 게임에서 계속 수행 중',cooldown:0});}
  s.serial=Math.max(s.serial,v.serial||0);
  for(const o of v.plans){
   if(o.status==='queued')try{if(['march','transfer'].includes(o.type))dispatch(s,city(s,o.city),city(s,o.target),o.officer,o.quote.troops,o.type==='transfer'?'reinforce':'attack','이전 출진 계획 이어가기');else startProject(s,{city:o.city,type:o.type,budget:o.quote.gold,recruit:o.recruit},o.faction);}catch(error){trace('save','legacy.order.skipped',{id:o.id,reason:error.message});}
   else if(o.status==='active'&&!['march','transfer'].includes(o.type)){const q=o.quote;s.projects.push({id:`p${++s.serial}`,city:o.city,faction:o.faction,type:o.type,recruit:o.recruit,gold:q.gold,food:q.food,duration:Math.max(1,Math.ceil(q.duration*(1-o.progress))),progress:0,done:0,gain:q.gain*(1-o.progress),troops:q.troops,field:q.field,reason:'이전 내정 사업 이어가기'});}
  }
  delete s.generalRules;initializeGenerals(s);s.selected=city(s,v.selected)?.id||s.selected;report(s,'world','기존 게임을 넓은 실시간 세계로 옮겼습니다. 기존 저장은 보존됩니다.',{faction:s.player});return s;
 }
 if(!ids.includes(old.player)||!Number.isInteger(old.worldSeed)||!Number.isInteger(old.seed)||!Number.isInteger(old.elapsed)||old.elapsed<0||!Number.isInteger(old.serial)||!Number.isInteger(old.day)||old.day<1||old.day>30||old.month<1||old.month>12||!['playing','victory','defeat'].includes(old.status))throw new Error('시간 저장을 읽을 수 없습니다.');
 if(old.frontier)validateFrontier(old);const regionCount=WORLD.count*(old.frontier?old.frontier.chunks.length:1);
 if(!Array.isArray(old.cities)||old.cities.length!==regionCount||new Set(old.cities.map(c=>c.id)).size!==regionCount||!Array.isArray(old.projects)||!Array.isArray(old.armies)||!Array.isArray(old.caravans)||!Array.isArray(old.pacts)||!Array.isArray(old.events)||!Array.isArray(old.reports)||!old.officers||!old.hostilities)throw new Error('세계 저장을 읽을 수 없습니다.');
 if(old.worldType!=='procedural')old.generatorVersion=0;else old.generatorVersion??=1;
 const staticWorld=new Map((old.frontier?restoreFrontierWorld(old):makeWorld(old.worldSeed,{legacy:old.worldType!=='procedural',generatorVersion:old.generatorVersion,worldScale:old.worldScale||1})).map(c=>[c.id,c]));
 const names=old.cities.map(c=>[c.name,staticWorld.get(c.id)?.name]).filter(([a,b])=>typeof a==='string'&&b&&a!==b);
 for(const c of old.cities){const base=staticWorld.get(c.id);if(c.owner==='neutral'&&base){c.owner=base.owner;trace('save','neutral.regionalized',{city:c.id,owner:c.owner});}if(!base||!(ids.includes(c.owner)||old.frontier&&c.owner==='neutral')||!POLICIES[c.policy]||['population','reserve','soldiers','morale','agriculture','commerce','defense','training','weariness','administration'].some(k=>!Number.isFinite(c[k])||c[k]<0)||c.population<10000||['morale','agriculture','commerce','defense','training','weariness'].some(k=>c[k]>100))throw new Error('거점 저장이 올바르지 않습니다.');for(const k of ['name','x','y','poly','edges','neighbors','col','row','major','region','terrain'])c[k]=base[k];for(const k of ['elevation','forestDensity','roads','sector']){if(base[k]!==undefined)c[k]=base[k];else delete c[k];}}
 for(const id of ids){const f=old.factions?.[id];if(!f||!DOCTRINES[f.doctrine]||!Number.isFinite(f.gold)||f.gold<0||!hasEconomy(old)&&(!Number.isFinite(f.food)||f.food<0)||!Array.isArray(f.officers)||f.officers.some(id=>!old.officers[id]||!Number.isFinite(old.officers[id].war)||!Number.isFinite(old.officers[id].int)))throw new Error('세력 저장이 올바르지 않습니다.');}
 for(const p of old.projects)if(!city(old,p.city)||!ids.includes(p.faction)||!PROJECTS[p.type]||!Number.isFinite(p.duration)||p.duration<=0||!Number.isFinite(p.progress)||p.progress<0||p.progress>1||!Number.isFinite(p.gain)||!Number.isFinite(p.gold)||p.gold<0||!Number.isFinite(p.food)||p.food<0||!Number.isFinite(p.done))throw new Error('사업 저장이 올바르지 않습니다.');
 for(const a of old.armies)if(!city(old,a.from)||!city(old,a.target)||!old.factions[a.faction]?.officers.includes(a.officer)||!['march','siege','field','return','duel','stationed'].includes(a.mode)||!['sx','sy','tx','ty','progress','troops','sent','morale','supply','duration'].every(k=>Number.isFinite(a[k]))||a.duration<=0||a.troops<0||a.progress<0||a.progress>1)throw new Error('부대 저장이 올바르지 않습니다.');
 for(const a of old.armies)if(a.bend&&(!Number.isFinite(a.bend.x)||!Number.isFinite(a.bend.y)))throw new Error('부대 경로 저장이 올바르지 않습니다.');
 if(!city(old,old.selected)||!Array.isArray(old.pool)||old.pool.some(id=>!old.officers[id]))throw new Error('선택 저장을 읽을 수 없습니다.');
 old.paused=true;old.effects=[];old.urgent??=[];old.resourceLog=(Array.isArray(old.resourceLog)?old.resourceLog:[]).filter(e=>e&&Number.isFinite(e.gold)&&Number.isFinite(e.food)&&typeof e.reason==='string').slice(0,24);
 const theme=makeOfficers(old.worldSeed);for(const [id,o] of Object.entries(old.officers)){const next=theme.officers[id];if(next){if(o.name!==next.name)names.push([o.name,next.name]);Object.assign(o,{name:next.name,han:next.han,role:next.role,trait:next.trait});}}
 for(const [id,f] of Object.entries(old.factions)){if(f.name!==FACTIONS[id].name)names.push([f.name,FACTIONS[id].name]);Object.assign(f,{name:FACTIONS[id].name,ruler:FACTIONS[id].ruler,han:FACTIONS[id].han});}
 names.sort((a,b)=>b[0].length-a[0].length);const rename=text=>names.reduce((text,[a,b])=>a.length>1?text.split(a).join(b):text.replace(new RegExp(`(^|[^가-힣])${a}(?=[^가-힣]|$)`,'g'),`$1${b}`),String(text||''));
 for(const e of [...old.events,...old.reports])e.text=rename(e.text);for(const a of [...old.armies,...old.projects,...Object.values(old.factions),...old.resourceLog])if(a.reason)a.reason=rename(a.reason);
 if(hasEconomy(old)){validateEconomy(old);validateWorkParties(old);if(old.commandRules===undefined)initializeCommandPoints(old);}
 if(old.commandRules!==undefined)validateCommandPoints(old);
 if(old.kingdomRules!==undefined)validateKingdoms(old);
 migrateLandRules(old);initializeGenerals(old);for(const a of old.armies)if(a.mode==='siege'&&!city(old,a.target).major)a.mode='field';
 if(!city(old,old.selected).major)old.selected=(governingHub(old,old.selected)||strongholds(old,old.player)[0]||strongholds(old)[0]).id;
 if(old.fogRules){old.explored=(Array.isArray(old.explored)?old.explored:[]).filter(id=>city(old,id));updateVisibility(old);}
 if(hasEconomy(old)&&old.kingdomRules===undefined)initializeKingdoms(old);
 trace('save','world.loaded',{regions:old.cities.length,strongholds:strongholds(old).length,elapsed:old.elapsed,armies:old.armies.length});return old;
}

export function cityYield(s,c){
 if(hasEconomy(s))return regionEconomicYield(s,c);
 const hub=governingHub(s,c);if(!hub)return {gold:0,food:-c.soldiers*.005};
 const policy=POLICIES[hub.policy],terrain=TERRAINS[c.terrain],season=s.month>=9&&s.month<=11?1.35:s.month<=2||s.month===12?.7:1;
 const besieged=s.armies.some(a=>a.target===hub.id&&a.faction!==c.owner&&a.mode==='siege'),trade=c.major?1:.65+hub.commerce/100,farm=c.major?1:.65+hub.agriculture/100;
 return {gold:c.population*.0023*(.45+c.commerce/65)*trade*(.5+hub.morale/180)*policy.gold*terrain.gold*(c.owner==='wei'?1.15:1)*(besieged?.5:1)/30,food:(c.population*.007*(.4+c.agriculture/75)*farm*terrain.food*season*policy.food*(c.owner==='wu'?1.15:1)-c.soldiers*.15)/30};
}
export function regionalYield(s,c){return [c,...hinterland(s,c)].reduce((sum,t)=>{const y=cityYield(s,t);sum.gold+=y.gold;sum.food+=y.food;return sum;},{gold:0,food:0});}
export function forecast(s,f=s.player){if(hasEconomy(s)){const result={gold:0,food:0};for(const h of strongholds(s,f)){const q=hubEconomy(s,h.id);result.gold+=q.lands.reduce((n,c)=>n+regionEconomicYield(s,c).gold,0);result.food+=q.production-q.foodDemand;}return result;}const result={gold:0,food:0};for(const c of s.cities)if(c.owner===f){const y=cityYield(s,c);result.gold+=y.gold;result.food+=y.food;}result.food-=s.armies.filter(a=>a.faction===f).reduce((n,a)=>n+a.troops*(a.mode==='stationed'?.005:.012),0);return result;}
export const activeProject=(s,id,military=false)=>s.projects.find(p=>p.city===id&&!!(p.automatic&&p.type==='levy')===military);
export function quote(s,r,f=s.player){
 const c=city(s,r.city);if(!c?.major||!s.factions[f])throw new Error('내정은 거점에서만 할 수 있습니다.');
 const budget=clamp(Number(r.budget)||400,150,1200),skill=c.administration*(.65+c.morale/200),q={gold:budget,food:0,gain:0,troops:0,duration:1,field:null,notes:[]};
 if(['farm','market','fort'].includes(r.type)){q.field={farm:'agriculture',market:'commerce',fort:'defense'}[r.type];q.gain=Math.min(100-c[q.field],Math.max(1,Math.round(budget/(c.population/2300)*(.5+skill/75)*(1-c[q.field]/140))));q.duration=Math.max(4,Math.round(5+q.gain*.45-skill/35));q.notes=[`행정력 ${c.administration}`,`민심 ${Math.round(c.morale)}`,`인구 ${Math.round(c.population).toLocaleString()}`,`개발도 ${Math.round(c[q.field])}`];}
 else if(r.type==='relief'){q.field='morale';q.gain=Math.min(100-c.morale,Math.round(budget/(c.population/1300)*1.3));q.food=Math.round(budget*1.5);q.duration=6;q.notes=['매일 민심 회복','모병 피로 완화'];}
 else if(r.type==='levy'){q.troops=Math.min(Math.floor(c.reserve),Math.max(0,Math.floor(c.population-10000)),round50(budget*2.5*(.6+c.morale/150)*(1-c.weariness*.007)));q.food=Math.ceil(q.troops*.5);q.gain=-Math.max(1,q.troops/c.population*140);q.duration=Math.max(5,Math.round(5+q.troops/900));q.notes=[`모병 가능 인구 ${Math.floor(c.reserve)}`,`민심 ${Math.round(c.morale)}`,`모병 피로 ${Math.round(c.weariness)}`];}
 else if(r.type==='hire'){const o=officer(s,r.recruit);if(!o)throw new Error('등용할 지휘관을 고르세요.');q.gold=Math.round((o.war+o.int)*3.1*(f==='shu'?.85:1));q.duration=9;q.notes=[`${o.name} 무력 ${o.war} · 지력 ${o.int}`,'합류 후 자동으로 부대에 배치'];}
 else throw new Error('사업 종류를 선택하세요.');
 if(s.commandRules===1)q.ap=projectCommandCost(s,r);
 return q;
}
export function projectError(s,r,f=s.player){
 if(s.status!=='playing')return '종료된 게임입니다.';
 const c=city(s,r.city);if(!c||c.owner!==f)return '아군 거점을 선택하세요.';
 if(!c.major)return '일반 땅은 거점이 자동 관리합니다.';
 if(activeProject(s,c.id,!!(r.automatic&&r.type==='levy')))return '이 거점에서 사업이 진행 중입니다.';
 if(r.type==='levy'&&s.projects.some(p=>p.city===c.id&&p.type==='levy'))return '이미 모병이 진행 중입니다.';
 if(s.projects.filter(p=>p.faction===f&&!p.automatic).length>=8)return '진행 중인 사업 8개를 먼저 마쳐야 합니다.';
 let q;try{q=quote(s,r,f);}catch(error){return error.message;}
 if(q.gold>s.factions[f].gold||q.food>foodStock(s,f,c.id))return '금 또는 거점의 식량이 부족합니다.';
 if(hasEconomy(s)&&!['levy','hire'].includes(r.type)&&laborAvailable(s,c.id)<100)return '사업에 배정할 노동력이 부족합니다.';
 if(hasEconomy(s)&&r.type==='levy'&&q.troops>c.population-10000-laborUsed(s,c.id))return '작업 중인 주민을 제외하면 모병 인원이 부족합니다.';
 if(q.field&&q.gain<=0)return '이미 충분히 회복·개발했습니다.';
 if(r.type==='levy'&&(q.troops<300||c.morale<40))return '모병 가능 인구와 민심을 회복해야 합니다.';
 if(r.type==='hire'&&(!s.pool.includes(r.recruit)||s.projects.some(p=>p.recruit===r.recruit)))return '이미 등용 중이거나 합류한 지휘관입니다.';
 const apError=commandError(s,q.ap,f);if(apError)return apError;
 return '';
}
export function startProject(s,r,f=s.player){
 const error=projectError(s,r,f);if(error)throw new Error(error);
 const q=quote(s,r,f);spendCommandPoints(s,q.ap,PROJECTS[r.type],f);resources(s,f,-q.gold,-q.food,`${r.automatic?'자동 ':''}${PROJECTS[r.type]} · ${city(s,r.city).name}`,r.city);
 const p={...q,id:`p${++s.serial}`,type:r.type,city:r.city,faction:f,recruit:r.type==='hire'?r.recruit:null,progress:0,done:0,started:s.elapsed,automatic:!!r.automatic,reason:r.reason||'거점 발전을 위한 투자'};s.projects.push(p);
 report(s,'project',`${city(s,r.city).name} ${PROJECTS[r.type]} 시작 · 금 ${q.gold}, ${q.duration}일`,{city:r.city,faction:f});trace('economy','project.started',{project:p});return p;
}
export function cancelProject(s,id){
 const i=s.projects.findIndex(p=>p.id===id&&p.faction===s.player);if(i<0)throw new Error('취소할 사업이 없습니다.');const p=s.projects[i],refund=Math.floor(p.gold*(1-p.progress)*.6);resources(s,p.faction,refund,0,'사업 중단 환불');s.projects.splice(i,1);report(s,'project',`${city(s,p.city).name} 사업 중단 · 금 ${refund} 반환`,{city:p.city,faction:p.faction});return refund;
}
export function setPolicy(s,id,policy){const c=city(s,id);if(!c?.major||c.owner!==s.player||!POLICIES[policy])throw new Error('아군 거점의 정책을 선택하세요.');if(s.commandRules===1&&c.policy===policy)return;spendCommandPoints(s,COMMAND_COSTS.policy,'정책 변경');c.policy=policy;report(s,'policy',`${c.name}, ${POLICIES[policy].name} 정책 시행`,{city:id,faction:s.player});}
export function setDoctrine(s,doctrine){if(!DOCTRINES[doctrine])throw new Error('군사 방침을 선택하세요.');if(s.commandRules===1&&s.factions[s.player].doctrine===doctrine)return;spendCommandPoints(s,COMMAND_COSTS.doctrine,'군사 방침 변경');s.factions[s.player].doctrine=doctrine;for(const a of s.armies)if(a.faction===s.player&&a.order)a.order.path=[];report(s,'policy',`지휘관들에게 ${DOCTRINES[doctrine].name} 지침을 전했습니다.`,{faction:s.player});}

const pair=(a,b)=>[a,b].sort().join(':');
function pact(s,a,b){return s.pacts.some(p=>p.key===pair(a,b)&&p.until>s.elapsed);}
function inbound(s,id,f){return s.armies.filter(a=>a.target===id&&a.faction===f&&!['return','stationed'].includes(a.mode)).reduce((n,a)=>n+a.troops,0);}
export function danger(s,c){
 const observed=hasKingdoms(s)?Object.values(s.kingdoms[c.owner]?.knowledge.armies||{}).filter(a=>s.elapsed-a.at<=12):s.armies;
 const attacking=observed.filter(a=>a.target===c.id&&a.faction!==c.owner&&['march','siege','field'].includes(a.mode)).reduce((n,a)=>n+a.troops,0);
 const potential=Math.max(0,...c.neighbors.map(id=>city(s,id)).filter(n=>knownOwner(s,c.owner,n)!==c.owner&&!pact(s,c.owner,knownOwner(s,c.owner,n))).map(n=>knownGarrison(s,c.owner,n)*.5));
 return Math.max(attacking,potential);
}
function initializeGenerals(s){
 if(s.generalRules!==undefined&&s.generalRules!==1)throw new Error('지원하지 않는 지휘관 규칙 버전입니다.');
 const migrating=s.generalRules!==1;
 if(new Set(s.armies.map(a=>a.id)).size!==s.armies.length)throw new Error('부대 식별자가 중복되었습니다.');
 if(new Set(s.armies.map(a=>a.officer)).size!==s.armies.length)throw new Error('한 지휘관에게 여러 부대가 배정되어 있습니다.');
 for(const [f,stock] of Object.entries(s.factions)){
  const places=owned(s,f).filter(c=>c.major||c.soldiers>0).sort((a,b)=>b.soldiers-a.soldiers||a.id.localeCompare(b.id));
  for(let i=0;i<stock.officers.length;i++){
   const id=stock.officers[i],o=officer(s,id),a=s.armies.find(a=>a.officer===id);
   o.traits??=generalTraits(s.worldSeed,id);
   if(Object.keys(o.traits).sort().join(',')!=='aggression,caution,cooperation'||Object.values(o.traits).some(n=>!Number.isFinite(n)||n<0||n>1))throw new Error('지휘관 성향 저장이 올바르지 않습니다.');
   if(migrating||o.location===undefined)o.location=a?(a.mode==='stationed'?a.target:null):(places[i%places.length]?.id??null);
   if(o.location!==null&&!city(s,o.location))throw new Error('지휘관 위치 저장이 올바르지 않습니다.');
   if(a){
    if(!migrating&&o.location!==(a.mode==='stationed'?a.target:null))throw new Error('지휘관과 부대의 위치가 일치하지 않습니다.');
    a.order??={action:a.purpose==='attack'?'attack':'support',target:a.target,path:[],started:s.elapsed,reason:a.reason};
    if(!GENERAL_ACTIONS[a.order.action]||!city(s,a.order.target)||!Array.isArray(a.order.path)||!Number.isFinite(a.order.started))throw new Error('부대 임무 저장이 올바르지 않습니다.');
    let previous=city(s,a.target);for(const next of a.order.path){if(!city(s,next)||!previous.neighbors.includes(next))throw new Error('부대 경로 저장이 올바르지 않습니다.');previous=city(s,next);}
    o.location=a.mode==='stationed'?a.target:null;
   }
  }
 }
 s.generalRules=1;if(migrating)trace('save','generals.initialized',{generals:Object.values(s.factions).reduce((n,f)=>n+f.officers.length,0),armies:s.armies.length});
}
function freeCommanders(s,f,at){const busy=new Set(s.armies.filter(a=>a.faction===f).map(a=>a.officer));return s.factions[f].officers.filter(id=>!busy.has(id)&&(at===undefined||officer(s,id).location===at)).sort((a,b)=>(officer(s,b).war+officer(s,b).int*.3)-(officer(s,a).war+officer(s,a).int*.3));}
function power(s,n,id,training=60,morale=75,cover=0,stance='charge'){const o=officer(s,id)||{war:65,int:65};return n*(.65+(stance==='feint'?o.int:o.war)/170)*(.65+training/170)*(.6+morale/180)*(1+cover/210);}
function objectiveDistances(s,start,f){if(s.generatorVersion>=2)return routeDistances(s,start,f,true);const result=new Map([[start.id,0]]),queue=[start];for(let i=0;i<queue.length;i++)for(const id of queue[i].neighbors){const c=city(s,id);if(!result.has(id)&&(c.owner===f||!pact(s,f,c.owner))){result.set(id,result.get(queue[i].id)+1);queue.push(c);}}return result;}
const distanceFields=new WeakMap();
function routeDistances(s,start,f,enemy){
 const signature=`${s.revision}:${hasKingdoms(s)?s.elapsed:0}:${s.pacts.filter(p=>p.until>s.elapsed).map(p=>p.key).sort().join(',')}`;
 let cached=distanceFields.get(s);if(cached?.signature!==signature){cached={signature,fields:new Map()};distanceFields.set(s,cached);}
 const key=`${start.id}:${f}:${enemy}`,old=cached.fields.get(key);if(old){cached.fields.delete(key);cached.fields.set(key,old);return old;}
 const result=new Map([[start.id,0]]),queue=new PriorityQueue();queue.push(start.id,0);
 while(queue.length){const {id,cost}=queue.pop();if(cost!==result.get(id))continue;const c=city(s,id);for(const next of c.neighbors){const n=city(s,next),owner=knownOwner(s,f,n);if(owner!==f&&(!enemy||!mayInvade(s,f,owner)))continue;const distance=cost+routeCost(c,n)/200;if(distance<(result.get(next)??Infinity)){result.set(next,distance);queue.push(next,distance);}}}
 cached.fields.set(key,result);while(cached.fields.size>16)cached.fields.delete(cached.fields.keys().next().value);return result;
}
function newUnit(s,f,commander,c,n){
 const o=officer(s,commander),a={id:`a${++s.serial}`,faction:f,officer:commander,from:c.id,target:c.id,sx:c.x,sy:c.y,tx:c.x,ty:c.y,progress:1,previous:1,mode:'stationed',troops:n,sent:n,training:c.training,morale:c.morale,supply:100,stance:o.int>o.war+8?'feint':'charge',duration:1,round:0,skillUsed:false,purpose:'reinforce',reason:'현 위치에서 임무를 검토합니다.',opponent:null};
 if(hasEconomy(s))a.carriedFood=0;s.armies.push(a);o.location=c.id;return a;
}
function beginLeg(s,a,to,returning=false){
 const from=city(s,a.target),stock=s.factions[a.faction],food=Math.ceil(a.troops*(.12+dist(from,to)/2400));
 const duration=militaryDays(s,from,to,officer(s,a.officer));
 if(!from.neighbors.includes(to.id))return false;
 if(!returning&&hasKingdoms(s)&&(!mayInvade(s,a.faction,to.owner)||a.purpose==='attack'&&!canCommitArmy(s,a)))return false;
 if(hasEconomy(s)){if(!prepareArmyFood(s,a,from,duration)&&!returning)return false;}else{if(stock.food<food&&!returning)return false;resources(s,a.faction,0,-Math.min(stock.food,food),`부대 이동 · ${officer(s,a.officer).name}`);}
 if(a.order)a.reason=`${GENERAL_ACTIONS[a.order.action]} · ${city(s,a.order.target).name}${to.id!==a.order.target?' · '+to.name+' 경유':''}`;
 Object.assign(a,{from:from.id,target:to.id,sx:from.x,sy:from.y,tx:to.x,ty:to.y,progress:0,previous:0,mode:returning?'return':'march',duration,round:0,skillUsed:false,opponent:null});
 delete a.bend;if(from.roads?.[to.id])a.bend={x:from.roads[to.id].x,y:from.roads[to.id].y};officer(s,a.officer).location=null;
 if(!returning&&to.owner!==a.faction){s.hostilities[pair(a.faction,to.owner)]=s.elapsed+70;if(!s.urgent.includes(to.owner))s.urgent.push(to.owner);}
 report(s,'march',`${officer(s,a.officer).name}, ${from.name} → ${to.name} ${Math.round(a.troops).toLocaleString()}명 ${a.purpose==='attack'?'출진':'이동'}`,{faction:a.faction,city:from.id,target:to.id,army:a.id,reason:a.reason});
 trace('military','dispatched',{army:a,remaining:from.soldiers,stronghold:from.major,food});return true;
}
function dispatch(s,from,to,commander,n,purpose,reason){
 if(!from||!to||!from.neighbors.includes(to.id)||!freeCommanders(s,from.owner,from.id).includes(commander))throw new Error('출진 조건이 바뀌었습니다.');
 n=Math.floor(n);if(n<1||n>from.soldiers)throw new Error('병력이 부족합니다.');
 const required=hasEconomy(s)?n*.012*(militaryDays(s,from,to,officer(s,commander))+5):Math.ceil(n*(.12+dist(from,to)/2400));
 if(foodStock(s,from.owner,from.id)<required)throw new Error('이동할 식량이 부족합니다.');
 from.soldiers-=n;const a=newUnit(s,from.owner,commander,from,n);a.purpose=purpose;a.reason=reason;a.order={action:purpose==='attack'?'attack':'support',target:to.id,path:[],started:s.elapsed,reason};beginLeg(s,a,to);return a;
}
function pathTo(s,start,target,f,hostile=false,options={}){return findMilitaryRoute(s,start,target,{faction:f,hostile,...options});}
function nearbyRegions(s,at){const seen=new Set([at.id]),queue=[{c:at,depth:0}];for(let i=0;i<queue.length;i++){const {c,depth}=queue[i];if(depth===2)continue;for(const id of c.neighbors)if(!seen.has(id)){seen.add(id);queue.push({c:city(s,id),depth:depth+1});}}return queue.map(v=>v.c);}
function desiredTroops(s,f){return clamp(troopTotal(s,f)/Math.max(1,s.factions[f].officers.length),2000,8000);}
function replenish(s,a,c){
 if(c.owner!==a.faction)return;
 const others=stationedArmies(s,c).filter(b=>b.faction===a.faction),need=Math.max(0,desiredTroops(s,a.faction)-a.troops),available=Math.max(0,c.soldiers-(c.major?1000:0));
 const n=c.major?Math.min(need,available/Math.max(1,others.length)):c.soldiers;
 if(n<=0)return;delete a.defeatedAt;const old=a.troops;a.training=(a.training*old+c.training*n)/Math.max(1,old+n);a.troops+=n;a.sent=Math.max(a.sent,a.troops);c.soldiers-=n;
 trace('military','replenished',{army:a.id,city:c.id,troops:n,total:a.troops,remaining:c.soldiers});
}
function mobilizeGenerals(s,f){
 for(const id of freeCommanders(s,f)){
  const o=officer(s,id),c=city(s,o.location);if(!c)continue;
  if(c.owner!==f){const a=newUnit(s,f,id,c,0);retreat(s,a,'거점을 잃어 지휘관 이동');continue;}
  const available=Math.max(0,c.soldiers-(c.major?1000:0)),n=available/Math.max(1,freeCommanders(s,f,c.id).length);
  if(n<500&&c.major||n<=0)continue;c.soldiers-=n;newUnit(s,f,id,c,n);
 }
}
function generalDecision(s,a,objective,doctrine,foodDays,frontier){
 const f=a.faction,stock=s.factions[f],at=city(s,a.target),o=officer(s,a.officer),local=nearbyRegions(s,at),options=[],friendly=local.filter(c=>c.owner===f);
 const attackPower=n=>power(s,n,a.officer,a.training,a.morale),defense=c=>{const memory=hasKingdoms(s)&&c.owner!==f?s.kingdoms[f].knowledge.regions[c.id]:c;return power(s,knownGarrison(s,f,c),null,memory?.training??60,memory?.morale??75,(c.major?(memory?.defense??30):0)+TERRAINS[c.terrain].cover);};
 const atRisk=danger(s,at),atDefense=stationedTroops(s,at),incoming=inbound(s,at.id,f),desired=desiredTroops(s,f);
 const routing=action=>({army:a,frontier,action}),border=frontierAt(frontier,at.id,o);
 const homes=strongholds(s,f).map(c=>({c,path:pathTo(s,at,c,f,false,routing('recover'))})).filter(v=>v.path!==null).map(v=>({...v,cost:militaryRouteSummary(s,at,v.path,{faction:f,...routing('recover')}).cost})).sort((a,b)=>a.cost-b.cost||a.c.id.localeCompare(b.c.id)),home=homes[0];
 const add=(action,target,path,extra={})=>{const steps=path||[],route=militaryRouteSummary(s,at,steps,{faction:f,...routing(action)}),first=city(s,steps[0]),foodCost=first?(hasEconomy(s)?a.troops*.012*(militaryDays(s,at,first,o)+5):Math.ceil(a.troops*(.12+dist(at,first)/2400))):0;options.push({action,target:target.id,path:steps,days:route.days,route,foodCost:action==='withdraw'?0:foodCost,reason:`${GENERAL_ACTIONS[action]} · ${target.name}`,...extra});};
 add('defend',at,[],{urgency:atRisk/Math.max(1000,atDefense),emergency:s.armies.some(b=>b.faction!==f&&b.target===at.id&&['siege','field'].includes(b.mode))});
 if(home)add('recover',home.c,home.path,{valid:home.c.id!==at.id||a.supply<95||a.morale<70||a.troops<desired,reason:`${home.c.name}에서 병력과 보급 회복`});
 for(const c of friendly){
  const observed=hasKingdoms(s)?Object.values(s.kingdoms[f].knowledge.armies).filter(b=>s.elapsed-b.at<=12):s.armies;
  const attacking=observed.filter(b=>b.target===c.id&&b.faction!==f&&['march','siege','field'].includes(b.mode)).reduce((n,b)=>n+b.troops,0),deficit=attacking-stationedTroops(s,c)-inbound(s,c.id,f);
  if(c.id!==at.id&&deficit>500){const path=pathTo(s,at,c,f,false,routing('support'));if(path)add('support',c,path,{urgency:deficit/Math.max(1000,a.troops),emergency:true,valid:a.troops>0,reason:`${c.name} 방어에 ${Math.round(deficit)}명 부족 · 아군 지원`});}
  if(!c.major&&c.soldiers>.5&&c.id!==at.id&&a.troops<desired){const path=pathTo(s,at,c,f,false,routing('recover'));if(path)add('recover',c,path,{urgency:1,reason:`${c.name}의 대기 병력 ${Math.round(c.soldiers)}명과 합류`});}
 }
 const route=objective?pathTo(s,at,objective,f,true,routing('advance')):null;
 if(objective&&route?.length){
  const next=city(s,route[0]),other=stationedArmies(s,at).filter(b=>b.id!==a.id&&b.faction===f).reduce((n,b)=>n+b.troops,0),support=inbound(s,next.id,f),ratio=next.owner===f?3:attackPower(a.troops+other*.65+support*.65)/Math.max(1,defense(next));
  add(next.owner===f?'advance':'attack',objective,route,{ratio,cover:TERRAINS[next.terrain].cover,objective:true,reason:`${objective.name} 공략 · ${next.name} 경유 · 예상 전력 ${ratio.toFixed(2)}배`});
  if(next.owner!==f)add('gather',at,[],{urgency:1-Math.min(1,ratio/doctrine.threshold),incoming:incoming>0,valid:ratio<doctrine.threshold&&a.supply>35,reason:`${objective.name} 공략 전 집결 · 추가 전력 대기`});
 }
 for(const c of at.neighbors.map(id=>city(s,id)))if(c.owner!==f&&mayInvade(s,f,knownOwner(s,f,c))&&((!hasKingdoms(s)&&c.major)||c.id===route?.[0]||c.owner==='neutral'&&s.factions[f].doctrine==='expand')){
  const ratio=attackPower(a.troops+inbound(s,c.id,f)*.65)/Math.max(1,defense(c));add('attack',c,[c.id],{ratio,cover:TERRAINS[c.terrain].cover,objective:c.id===objective?.id});
 }
 const endangered=at.owner!==f||atRisk>Math.max(500,a.troops*1.6),emergency=(a.supply<20||a.morale<30||a.troops<Math.min(500,a.sent*.25))&&endangered;
 if(home&&home.c.id!==at.id)add('withdraw',home.c,pathTo(s,at,home.c,f,false,routing('withdraw')),{valid:endangered,emergency,urgency:atRisk/Math.max(1000,a.troops),reason:`${home.c.name}까지 철수 · 전력과 보급 보존`});
 const localFood=foodStock(s,f,at.id)+(a.carriedFood||0),localDays=hasEconomy(s)?localFood/Math.max(1,a.troops*.012):foodDays;
 if(hasKingdoms(s))for(const option of options)if(['advance','attack'].includes(option.action)&&!canCommitArmy(s,a)){option.valid=false;option.reason='왕국의 방어 예비 병력을 보존합니다.';}
 const result=evaluateGeneral({troops:a.troops,supply:a.supply,morale:a.morale,desiredTroops:desired,policy:{...doctrine,mode:stock.doctrine},food:localFood,foodDays:localDays,...border,options,current:a.order},o.traits);
 a.lastEvaluation={at:s.elapsed,nearby:local.length,traits:{...o.traits},inputs:{troops:a.troops,gold:stock.gold,food:localFood,supply:a.supply,war:o.war,int:o.int,terrain:at.terrain,policy:stock.doctrine,...border},candidates:result.candidates.map(({action,target,score,rank,valid,reason,route})=>({action,target,score,rank,valid,reason,route}))};
 trace('ai','general.evaluated',{army:a.id,officer:a.officer,...a.lastEvaluation});return result.chosen;
}
function executeDecision(s,a,choice){
 if(!choice)return;
 if(a.order?.action===choice.action&&a.order.target===choice.target&&a.mode==='stationed'&&choice.path.length===0){a.reason=choice.reason;return;}
 a.order={action:choice.action,target:choice.target,path:[...choice.path],started:s.elapsed,reason:choice.reason};a.reason=choice.reason;a.purpose=choice.action==='attack'||choice.action==='advance'?'attack':'reinforce';
 trace('ai','general.selected',{army:a.id,officer:a.officer,action:choice.action,target:choice.target,score:choice.score,rank:choice.rank,reason:choice.reason});
 if(choice.action==='withdraw'){retreat(s,a,choice.reason);return;}
 if(a.order.path.length){const next=city(s,a.order.path[0]);if(beginLeg(s,a,next))a.order.path.shift();}
}
export function think(s,f){
 const stock=s.factions[f],cities=owned(s,f);if(!cities.length)return;
 thinkKingdom(s,f);
 stock.lastDecision=s.elapsed;stock.decisionCount++;
 const doctrine=DOCTRINES[stock.doctrine],supply=forecast(s,f),foodDays=supply.food<0?foodStock(s,f)/-supply.food:9999,totalTroops=troopTotal(s,f);
 const reserveGold=f===s.player?Math.max(1200,stock.gold*.75):Math.max(500,stock.gold*.25),budget=clamp(round50(Math.max(0,stock.gold-reserveGold)*.45),150,600),canSpend=stock.gold-budget>=reserveGold;
 let objective=city(s,stock.objective);
 if(hasKingdoms(s)){objective=kingdomObjective(s,f);stock.objective=objective?.id||null;}
 else if(!objective||objective.owner===f||pact(s,f,objective.owner)||!objective.major){const bases=strongholds(s,f),options=strongholds(s).filter(c=>c.owner!==f&&!pact(s,f,c.owner));options.sort((a,b)=>Math.min(...bases.map(c=>dist(c,a)))+stationedTroops(s,a)*.025-(Math.min(...bases.map(c=>dist(c,b)))+stationedTroops(s,b)*.025));stock.objective=options[0]?.id||null;stock.objectiveSince=s.elapsed;objective=options[0];}
 const routes=objective?objectiveDistances(s,objective,f):new Map(),staging=cities.filter(c=>routes.has(c.id)).sort((a,b)=>routes.get(a.id)-routes.get(b.id))[0];stock.staging=staging?.id||null;
 mobilizeGenerals(s,f);const frontier=militaryFrontier(s,f);
 for(const a of s.armies.filter(a=>a.faction===f&&a.mode==='stationed'&&stock.officers.includes(a.officer))){
  if(a.arrivedAt===s.elapsed)continue;
  const c=city(s,a.target);if(c.owner!==f){retreat(s,a,'현 위치가 적에게 넘어감');continue;}replenish(s,a,c);if(a.order?.action==='withdraw'&&a.order.path.length)continue;
  const decision=generalDecision(s,a,objective,doctrine,foodDays,frontier);executeDecision(s,a,decision);if(decision)stock.reason=`${officer(s,a.officer).name}: ${decision.reason}`;
 }
 // Recruitment and civilian budgets are shared kingdom resources, spent sequentially.
 const target=cities.filter(c=>c.major&&!activeProject(s,c.id,true)&&c.morale>=45&&c.reserve>=500&&c.weariness<65&&stationedTroops(s,c)+inbound(s,c.id,f)<Math.max(2000,desiredTroops(s,f)*2,danger(s,c)*doctrine.reserve)).sort((a,b)=>stationedTroops(s,a)-stationedTroops(s,b))[0];
 if(target&&canSpend&&(f!==s.player||s.projects.filter(p=>p.faction===f&&p.automatic).length<2)&&foodStock(s,f,target.id)>totalTroops*.2){const r={city:target.id,type:'levy',budget,automatic:true,reason:'지휘관 부대의 병력 보충'};if(!projectError(s,r,f))startProject(s,r,f);}
 if(f!==s.player&&stock.gold-budget>=reserveGold&&s.projects.filter(p=>p.faction===f).length<4){const target=cities.filter(c=>c.major&&!activeProject(s,c.id)).sort((a,b)=>(a.morale<50?-100:a.agriculture+a.commerce)-(b.morale<50?-100:b.agriculture+b.commerce))[0];if(target){const type=target.morale<52?'relief':supply.food<50?'farm':target.agriculture<30?'farm':'market',r={city:target.id,type,budget,automatic:true,reason:'영주의 자율 내정'};if(!projectError(s,r,f))startProject(s,r,f);} }
 tryTrade(s,f,cities);trace('ai','decision',{faction:f,at:s.elapsed,reason:stock.reason,generals:stock.officers.length});
}
function tryTrade(s,f,cities){
 if(hasEconomy(s))return;
 const stock=s.factions[f];if(stock.food>12000||stock.gold<400)return;
 const neighbors=new Set(cities.flatMap(c=>c.neighbors.map(id=>city(s,id).owner)).filter(id=>id!==f));
 const seller=[...neighbors].filter(id=>(s.hostilities[pair(f,id)]||0)<=s.elapsed&&s.factions[id].food>22000).sort((a,b)=>s.factions[b].food-s.factions[a].food)[0];if(!seller)return;
 const price=Math.min(350,Math.floor(stock.gold*.08)),amount=price*10;if(price<100)return;
 resources(s,f,-price,amount,`식량 구입 · ${s.factions[seller].name}`);resources(s,seller,price,-amount,`식량 판매 · ${stock.name}`);
 const from=cities.find(c=>c.neighbors.some(id=>city(s,id).owner===seller)),to=from.neighbors.map(id=>city(s,id)).find(c=>c.owner===seller);
 const key=pair(f,seller);s.pacts=s.pacts.filter(p=>p.key!==key);s.pacts.push({key,until:s.elapsed+35});s.caravans.push({id:`t${++s.serial}`,from:to.id,to:from.id,faction:seller,buyer:f,start:s.elapsed,duration:12,amount});
 report(s,'trade',`${stock.name} ↔ ${s.factions[seller].name} 식량 ${amount.toLocaleString()} 교역 · 금 ${price}, 35일 통행 협정`,{faction:f,other:seller,city:from.id});
}

export function armyPosition(a,previous=false){const p=previous?(a.previous??a.progress):a.progress;const u=1-p;return a.bend?{x:u*u*a.sx+2*u*p*a.bend.x+p*p*a.tx,y:u*u*a.sy+2*u*p*a.bend.y+p*p*a.ty}:{x:a.sx+(a.tx-a.sx)*p,y:a.sy+(a.ty-a.sy)*p};}
function retreat(s,a,reason){
 if(hasEconomy(s)&&a.troops<=0&&a.carriedFood>0){const point=armyPosition(a),region=regionAt(s,point.x,point.y)?.id||a.from,cache=s.economy.fieldStock[region]??=EMPTY_STOCK();cache.food+=a.carriedFood;a.carriedFood=0;}
 if(a.troops<=0&&a.defeatedAt===undefined){a.defeatedAt=s.elapsed;const p=armyPosition(a);report(s,'defeat',`${officer(s,a.officer).name} 부대 전멸 · 지휘관 철수`,{faction:a.faction,army:a.id,x:p.x,y:p.y});trace('military','army.defeated',{army:a.id,faction:a.faction,sent:a.sent,position:p});}
 const pos=armyPosition(a),bases=strongholds(s,a.faction),homes=bases.length?bases:owned(s,a.faction);
 if(!homes.length){officer(s,a.officer).location=null;a.mode='return';a.opponent=null;return;}
 const frontier=militaryFrontier(s,a.faction),routing={faction:a.faction,army:a,frontier,action:'withdraw',hostile:true};
 const moving=a.from!==a.target&&a.progress<1,ends=moving?[city(s,a.from),city(s,a.target)]:[city(s,a.target)],choices=[];
 for(const end of ends)for(const home of homes){const path=findMilitaryRoute(s,end,home,routing);if(path!==null){const partial=moving?militaryTerrain(s,city(s,a.from),city(s,a.target)).cost*(end.id===a.from?a.progress:1-a.progress):0;choices.push({end,home,path,cost:partial+militaryRouteSummary(s,end,path,routing).cost});}}
 choices.sort((a,b)=>a.cost-b.cost||a.home.id.localeCompare(b.home.id));const choice=choices[0];
 if(!choice){a.reason='철수할 수 있는 연결된 길이 없습니다';trace('ai','retreat.blocked',{army:a.id,from:a.from,target:a.target});return;}
 const {end,home,path}=choice,old={...a,bend:a.bend?{...a.bend}:null};
 a.order={action:'withdraw',target:home.id,path:[...path],started:s.elapsed,reason};a.reason=reason;a.opponent=null;
 if(moving){
  const t=old.progress,u=1-t,b=old.bend||{x:(old.sx+old.tx)/2,y:(old.sy+old.ty)/2},back=end.id===old.from;
  // Subdivide the current road curve so reversing never cuts across the terrain.
  a.bend=back?{x:u*old.sx+t*b.x,y:u*old.sy+t*b.y}:{x:u*b.x+t*old.tx,y:u*b.y+t*old.ty};
  Object.assign(a,{from:back?old.target:old.from,target:end.id,sx:pos.x,sy:pos.y,tx:end.x,ty:end.y,progress:0,previous:0,duration:Math.max(1,Math.ceil(old.duration*(back?t:u))),mode:'return'});officer(s,a.officer).location=null;
 }else if(path.length){a.target=end.id;beginLeg(s,a,city(s,path[0]),true);a.order.path.shift();}
 else joinGarrison(s,a,end);
 report(s,'retreat',`${officer(s,a.officer).name}, ${reason}. ${home.name}(으)로 철수`,{faction:a.faction,city:home.id,army:a.id,path:[...a.order.path],routeCost:choice.cost});
}
function hit(s,a,defender,cover=0){
 const p=PERSONAS[a.officer],o=officer(s,a.officer)||{name:'수비대',war:65,int:65},skill=!!p&&!a.skillUsed&&a.round>=2;
 if(skill){a.skillUsed=true;a.morale=clamp(a.morale+p.rally,0,100);}
 const advantage={charge:'feint',feint:'guard',guard:'charge'},factor=advantage[a.stance]===defender.stance?1.2:advantage[defender.stance]===a.stance?.85:1;
 const strength=power(s,a.troops,a.officer,a.training,a.morale,0,a.stance),variation=.9+random(s)*.2;
 const damage=Math.max(0,Math.round(strength*.12*factor*(p?.order===a.stance?1+p.bonus:1)*(skill?p.burst:1)*(a.supply<25?.65:1)*variation/(1+cover/150)));
 trace('combat','calculation',{army:a.id,officer:o.name,troops:a.troops,stance:a.stance,cover,skill,strength,variation,damage});
 return {damage,skill,shield:skill?p.shield:a.stance==='guard'?.7:1};
}
function joinGarrison(s,a,c){
 Object.assign(a,{mode:'stationed',from:c.id,target:c.id,sx:c.x,sy:c.y,tx:c.x,ty:c.y,progress:1,previous:1,opponent:null,arrivedAt:s.elapsed});delete a.bend;officer(s,a.officer).location=c.id;
 replenish(s,a,c);
 report(s,'arrival',`${officer(s,a.officer).name}, ${c.name} 도착 · ${Math.round(a.troops).toLocaleString()}명`,{faction:a.faction,city:c.id,army:a.id,troops:a.troops,garrison:stationedTroops(s,c)});
 trace('military','stationed',{army:a.id,officer:a.officer,faction:a.faction,city:c.id,troops:a.troops,mission:a.order?.target});
}
function occupy(s,a,c){
 const former=c.owner,surroundings=c.major?hinterland(s,c):[],defenders=stationedArmies(s,c);c.owner=a.faction;
 // Surviving defenders and their commanders withdraw physically; none are reassigned remotely.
 for(const b of defenders)if(b.faction!==a.faction)retreat(s,b,'거점 상실로 철수');
 for(const id of s.factions[former]?.officers||[])if(officer(s,id).location===c.id&&!s.armies.some(b=>b.officer===id)){const b=newUnit(s,former,id,c,0);retreat(s,b,'거점 상실로 지휘관 철수');}
 c.soldiers=0;c.morale=Math.max(40,c.morale);c.defense=c.major?Math.max(5,c.defense-12):0;
 for(const land of surroundings)if(land.owner===former&&stationedTroops(s,land)<500)land.owner=a.faction;
 s.revision++;s.trust[a.officer]=Math.min(3,(s.trust[a.officer]||0)+(c.major?1:0));joinGarrison(s,a,c);
 report(s,'capture',`${officer(s,a.officer).name}, ${c.name} ${c.major?'점령':'확보'} · ${Math.round(a.troops).toLocaleString()}명`,{faction:a.faction,other:former,city:c.id,stronghold:c.major,army:a.id,troops:a.troops,garrison:stationedTroops(s,c)});if(!s.urgent.includes(former))s.urgent.push(former);
}
function defendLosses(s,c,damage){
 const defenders=stationedArmies(s,c).filter(a=>a.faction===c.owner),total=stationedTroops(s,c),fraction=total?Math.min(1,damage/total):0;
 c.soldiers*=1-fraction;for(const a of defenders){a.troops*=1-fraction;a.morale=clamp(a.morale-fraction*40,0,100);}
}
function fightCity(s,a){
 const c=city(s,a.target);if(c.owner===a.faction){joinGarrison(s,a,c);return;}
 const stationed=stationedArmies(s,c).filter(b=>b.faction===c.owner),commander=stationed.slice().sort((a,b)=>officer(s,b.officer).war-officer(s,a.officer).war)[0]?.officer;
 const def={id:`g-${c.id}`,officer:commander,troops:stationedTroops(s,c),training:c.training,morale:c.morale,supply:100,stance:'guard',round:0,skillUsed:true};a.round++;
 const attack=hit(s,a,def,(c.major?c.defense:0)+TERRAINS[c.terrain].cover+(hasKingdoms(s)?15:0)),counter=hit(s,def,a),siegers=s.armies.filter(v=>v.target===c.id&&v.faction===a.faction&&['siege','field'].includes(v.mode)).length;
 const lost=Math.min(a.troops,Math.round(counter.damage*attack.shield/Math.max(1,siegers))),dealt=Math.min(def.troops,attack.damage);
 a.troops-=lost;defendLosses(s,c,dealt);a.morale=clamp(a.morale-lost/Math.max(1,a.sent)*70,0,100);c.morale=clamp(c.morale-dealt/Math.max(1000,c.population*.04)*8,20,100);
 recordWarLoss(s,a.faction,c.owner,lost,dealt);
 const skill=attack.skill?PERSONAS[a.officer].skill:null;
 report(s,'hit',`${officer(s,a.officer).name}${skill?` · ${skill}!`:''}, ${c.name} 전투 · 적 −${Math.round(dealt)}, 아군 −${Math.round(lost)}`,{faction:a.faction,other:c.owner,city:c.id,dealt,taken:lost,skill,army:a.id});
 if(stationedTroops(s,c)<Math.max(100,a.troops*.025)&&a.troops>250)occupy(s,a,c);
 else if(a.troops<a.sent*.24||a.morale<30)retreat(s,a,'손실과 사기가 위험 수준');
}
function fightArmies(s,a,b){
 const cover=militaryTerrain(s,city(s,a.from),city(s,a.target)).cover;
 a.round++;b.round++;const x=hit(s,a,b,cover),y=hit(s,b,a,cover),lostA=Math.min(a.troops,Math.round(y.damage*x.shield)),lostB=Math.min(b.troops,Math.round(x.damage*y.shield));a.troops-=lostA;b.troops-=lostB;a.morale=clamp(a.morale-lostA/a.sent*65,0,100);b.morale=clamp(b.morale-lostB/b.sent*65,0,100);const p=armyPosition(a);
 recordWarLoss(s,a.faction,b.faction,lostA,lostB);
 report(s,'hit',`${officer(s,a.officer).name} ↔ ${officer(s,b.officer).name} 야외 전투 · −${lostA} / −${lostB}`,{faction:a.faction,other:b.faction,x:p.x,y:p.y,dealt:lostB,taken:lostA});
 const brokenA=a.troops<a.sent*.25||a.morale<30,brokenB=b.troops<b.sent*.25||b.morale<30;
 if(brokenA)retreat(s,a,'야외 전투 손실 누적');else if(brokenB){a.mode=a.order?.action==='withdraw'?'return':'march';a.opponent=null;}
 if(brokenB)retreat(s,b,'야외 전투 손실 누적');else if(brokenA){b.mode=b.order?.action==='withdraw'?'return':'march';b.opponent=null;}
}
function advanceArmies(s){
 const frontiers=new Map();
 for(const a of s.armies){
  a.previous=a.progress;
  if(hasKingdoms(s)&&a.mode!=='stationed'&&a.mode!=='return'){
   const targetOwner=city(s,a.target).owner,opponent=a.mode==='duel'?s.armies.find(b=>b.id===a.opponent)?.faction:targetOwner;
   const war=warBetween(s,a.faction,opponent===a.faction?city(s,a.order?.target)?.owner:opponent),withdrawing=war?.withdrawing.includes(a.faction);
   if(withdrawing||opponent&&opponent!==a.faction&&!mayInvade(s,a.faction,opponent)){retreat(s,a,withdrawing?'왕국의 손실 한도에 따라 공세 중단':'왕국 방침과 협정에 따라 공격 중단');continue;}
  }
  if(a.mode==='stationed'){
   const c=city(s,a.target);if(c.owner!==a.faction){retreat(s,a,'현 위치가 적에게 넘어감');continue;}
   a.supply=clamp(a.supply+(foodStock(s,a.faction,c.id)>0?(c.major?7:2):0),0,100);a.morale=clamp(a.morale+(c.major?.6:.15),0,100);replenish(s,a,c);
   if(a.order?.path?.length){
    if(!frontiers.has(a.faction))frontiers.set(a.faction,militaryFrontier(s,a.faction));
    const route=pathTo(s,c,city(s,a.order.target),a.faction,['advance','attack','withdraw'].includes(a.order.action),{action:a.order.action,army:a,frontier:frontiers.get(a.faction)});
    if(route===null){a.order.path=[];a.reason='목적지까지 연결된 길을 다시 검토합니다';continue;}a.order.path=route;if(!route.length)continue;
    if(a.order.action==='withdraw'){const next=city(s,a.order.path[0]);if(city(s,a.order.target).owner!==a.faction||!c.neighbors.includes(next.id)||!hasKingdoms(s)&&pact(s,a.faction,next.owner))retreat(s,a,'철수 경로 변경');else if(beginLeg(s,a,next,true))a.order.path.shift();continue;}
    const next=city(s,a.order.path[0]),threat=s.armies.some(b=>b.faction!==a.faction&&b.target===c.id&&['march','siege','field'].includes(b.mode));
    if(!threat&&a.supply>=25&&!pact(s,a.faction,next.owner)){
     const defenders=knownGarrison(s,a.faction,next),memory=hasKingdoms(s)?s.kingdoms[a.faction].knowledge.regions[next.id]:next,ratio=power(s,a.troops+inbound(s,next.id,a.faction)*.65,a.officer,a.training,a.morale)/Math.max(1,power(s,defenders,null,memory?.training??60,memory?.morale??75,(next.major?(memory?.defense??30):0)+TERRAINS[next.terrain].cover));
     if(next.owner===a.faction||ratio>=DOCTRINES[s.factions[a.faction].doctrine].threshold){if(beginLeg(s,a,next))a.order.path.shift();}
    }
   }
   continue;
  }
  if(a.mode==='march'||a.mode==='return'){a.progress=Math.min(1,a.progress+1/a.duration);if(a.progress>1-1e-9)a.progress=1;a.supply=Math.max(0,a.supply-1.6);}
  else a.supply=Math.max(0,a.supply-2.5);
  if(['siege','field'].includes(a.mode)&&pact(s,a.faction,city(s,a.target).owner)){retreat(s,a,'통행 협정으로 공격 중단');continue;}
  if(['siege','field'].includes(a.mode)&&s.elapsed%3===0){const c=city(s,a.target),support=inbound(s,c.id,a.faction)-a.troops,ratio=power(s,a.troops+support*.6,a.officer,a.training,a.morale)/Math.max(1,power(s,stationedTroops(s,c),null,c.training,c.morale,(c.major?c.defense:0)+TERRAINS[c.terrain].cover));if(c.owner!==a.faction&&(a.supply<22||ratio<.65)){retreat(s,a,a.supply<22?'보급로를 지키기 위해':'적 증원으로 전력 열세');}}
 }
 // Road buckets avoid comparing every army to every other army.
 const roads=new Map();for(const a of s.armies)if(['march','return'].includes(a.mode)&&a.troops>0){const key=pair(a.from,a.target);if(!roads.has(key))roads.set(key,[]);roads.get(key).push(a);}
 const roadProgress=a=>{const from=city(s,a.from),to=city(s,a.target),dx=to.x-from.x,dy=to.y-from.y,length=dx*dx+dy*dy||1,start=clamp(((a.sx-from.x)*dx+(a.sy-from.y)*dy)/length,0,1);return {start,value:start+(1-start)*a.progress};};
 for(const group of roads.values())for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
  const a=group[i],b=group[j];if(!['march','return'].includes(a.mode)||!['march','return'].includes(b.mode)||a.faction===b.faction||pact(s,a.faction,b.faction)||a.from!==b.target||a.target!==b.from)continue;
  if(hasKingdoms(s)&&!warBetween(s,a.faction,b.faction))continue;
  const x=roadProgress(a),y=roadProgress(b);if(x.value+y.value<1)continue;
  a.mode=b.mode='duel';a.opponent=b.id;b.opponent=a.id;const meeting=(x.value+1-y.value)/2;
  a.progress=clamp((meeting-x.start)/Math.max(1e-9,1-x.start),0,1);b.progress=clamp((1-meeting-y.start)/Math.max(1e-9,1-y.start),0,1);
  const p=armyPosition(a);report(s,'intercept',`${officer(s,a.officer).name}와 ${officer(s,b.officer).name}의 부대가 길에서 마주쳤습니다`,{faction:a.faction,other:b.faction,x:p.x,y:p.y});
 }
 const fought=new Set();for(const a of s.armies){
  if(a.mode==='stationed')continue;
  if(a.troops<=0&&a.mode!=='return')continue;
  if(a.mode==='duel'&&!fought.has(a.id)&&s.elapsed%2===0){const b=s.armies.find(v=>v.id===a.opponent&&v.troops>0);if(b){fought.add(a.id);fought.add(b.id);fightArmies(s,a,b);}else{a.mode=a.order?.action==='withdraw'?'return':'march';a.opponent=null;}}
  else if((a.mode==='march'||a.mode==='return')&&a.progress>=1){const c=city(s,a.target);if(c.owner===a.faction){joinGarrison(s,a,c);}else if(a.mode==='return'){if(a.order?.path.length&&(hasKingdoms(s)||!c.major&&stationedTroops(s,c)<100||a.troops<=0)){const next=city(s,a.order.path[0]);if(beginLeg(s,a,next,true))a.order.path.shift();}else if(a.order?.path.length&&!pact(s,a.faction,c.owner)){a.mode=c.major?'siege':'field';}else retreat(s,a,'귀환지가 점령되어 경로 변경');}else if(pact(s,a.faction,c.owner))retreat(s,a,'통행 협정으로 공격 중단');else if(!c.major&&stationedTroops(s,c)<100)occupy(s,a,c);else{a.mode=c.major?'siege':'field';report(s,'engage',`${officer(s,a.officer).name}, ${c.name} ${c.major?'성 공격':'야외 전투'} 시작`,{faction:a.faction,other:c.owner,city:c.id});}}
  else if(['siege','field'].includes(a.mode)&&s.elapsed%2===0)fightCity(s,a);
 }
 for(const a of s.armies)if(a.troops<=0&&!['return','stationed'].includes(a.mode))retreat(s,a,'병력을 잃어 부대 재편');

}
function advanceProjects(s){
 const finished=new Set();for(const p of s.projects){const c=city(s,p.city);if(c.owner!==p.faction){resources(s,p.faction,Math.floor(p.gold*(1-p.progress)*.4),0,'거점 상실 · 사업 환불');finished.add(p.id);report(s,'project',`${c.name} 함락으로 사업 중단`,{faction:p.faction,city:c.id});continue;}
  p.progress=Math.min(1,p.progress+1/p.duration);
  if(p.field){const change=p.gain/p.duration;c[p.field]=clamp(c[p.field]+change,0,100);if(p.type==='relief')c.weariness=Math.max(0,c.weariness-1.2);}
  if(p.type==='levy'){const expected=Math.floor(p.troops*p.progress),n=Math.max(0,Math.min(expected-p.done,Math.floor(c.reserve),Math.floor(c.population-10000-(hasEconomy(s)?laborUsed(s,c.id):0))));const old=c.soldiers;c.soldiers+=n;c.reserve-=n;c.population-=n;c.training=(old*c.training+n*50)/Math.max(1,old+n);c.morale=clamp(c.morale+p.gain/p.duration,0,100);c.weariness=clamp(c.weariness+n/500,0,100);p.done+=n;}
  if(p.progress>=1-1e-8){if(p.type==='hire'&&s.pool.includes(p.recruit)){s.pool.splice(s.pool.indexOf(p.recruit),1);s.factions[p.faction].officers.push(p.recruit);Object.assign(officer(s,p.recruit),{location:c.id,traits:generalTraits(s.worldSeed,p.recruit)});report(s,'hire',`${officer(s,p.recruit).name}, ${s.factions[p.faction].name}에 합류`,{faction:p.faction,city:c.id});}finished.add(p.id);report(s,'work',`${c.name} ${PROJECTS[p.type]} 완료${p.field?` · +${p.gain}`:p.type==='levy'?` · 병력 +${p.done}`:''}`,{faction:p.faction,city:c.id,amount:p.field?p.gain:p.done});}
 }
 s.projects=s.projects.filter(p=>!finished.has(p.id));
}
function economy(s){
 if(hasEconomy(s)){advanceEconomy(s);return;}
 const income=Object.fromEntries(ids.map(id=>[id,{gold:0,food:0}]));
 for(const c of s.cities){if(c.owner==='neutral')continue;const y=cityYield(s,c),f=income[c.owner];f.gold+=y.gold;f.food+=y.food;
  if(c.major){c.morale=clamp(c.morale+POLICIES[c.policy].morale,0,100);c.weariness=Math.max(0,c.weariness-.16);c.population+=c.population*.00006*c.morale/100;c.reserve=Math.min(c.population*.12,c.reserve+c.population*.00018*c.morale/100);}c.training=Math.min(85,c.training+.025);
 }
 for(const a of s.armies)income[a.faction].food-=a.troops*(a.mode==='stationed'?.005:.012);
 for(const id of ids){const stock=s.factions[id],gain=income[id];resources(s,id,gain.gold,gain.food,'하루 정산 · 수입과 식량 소비');if(stock.food<0){stock.food=0;for(const c of s.cities)if(c.owner===id){c.soldiers*=.99;c.morale=Math.max(0,c.morale-.25);}for(const a of s.armies)if(a.faction===id){a.supply=Math.max(0,a.supply-5);a.troops*=.99;}if(s.elapsed%5===0)report(s,'supply',`${stock.name} 식량 부족 · 병력 이탈, 민심 하락`,{faction:id});} }
 s.ledger=income[s.player];
}
export function tick(s){
 if(s.paused||s.status!=='playing')return;
 const began=performance.now();s.elapsed++;s.effects=[];advanceCommandPoints(s);advanceDiplomacy(s);advanceProjects(s);advanceArmies(s);if(hasEconomy(s))advanceWorkParties(s);economy(s);
 advanceResourceOperations(s);
 s.caravans=s.caravans.filter(t=>s.elapsed-t.start<t.duration);s.pacts=s.pacts.filter(p=>p.until>s.elapsed);
 const batch=[];if(s.elapsed%3===1)batch.push(s.player);
 while(batch.length<3&&s.urgent.length){const f=s.urgent.shift();if(!batch.includes(f)&&ids.includes(f))batch.push(f);}
 let scanned=0;while(batch.length<3&&scanned++<ids.length){const f=ids[s.aiCursor++%ids.length];if(!batch.includes(f))batch.push(f);}
 for(const f of batch)think(s,f);
 if(++s.day>30){s.day=1;if(++s.month>12){s.month=1;s.year++;}s.turn++;report(s,'calendar',`${s.year}년 ${s.month}월이 시작되었습니다.`,{faction:s.player});}
 if(strongholds(s).every(c=>c.owner===s.player)){s.status='victory';s.paused=true;report(s,'outcome','모든 거점이 하나의 왕관 아래 모였습니다.');}else if(!strongholds(s,s.player).length&&troopTotal(s)<500){s.status='defeat';s.paused=true;report(s,'outcome','남은 아군 거점과 전력이 없습니다.');}
 trace('tick','world.step',{elapsed:s.elapsed,cities:s.cities.length,armies:s.armies.length,projects:s.projects.length,caravans:s.caravans.length,aiBatch:batch,milliseconds:Math.round((performance.now()-began)*100)/100});
 updateVisibility(s);
}
