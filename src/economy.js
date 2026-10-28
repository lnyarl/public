import {city,strongholds,governingHub,hinterland,TERRAINS,POLICIES,clamp} from './world.js';
import {MATERIALS,MATERIAL_IDS,EMPTY_STOCK,RESOURCE_POLICIES} from './economy-rules.js';
import {makeResourceSites,civilPath} from './resource-sites.js';

export const hasEconomy=s=>s.economyRules===1;
export const stockWeight=stock=>MATERIAL_IDS.reduce((n,key)=>n+stock[key]*MATERIALS[key].weight,0);
export function hubFor(s,region,faction){const c=city(s,region),h=c&&(c.major?c:governingHub(s,c));return h&&(faction===undefined||h.owner===faction)?h:null;}
export function foodStock(s,faction=s.player,region){
 if(!hasEconomy(s))return s.factions[faction]?.food??0;
 if(region!==undefined){const h=hubFor(s,region,faction);return h?Math.max(0,s.economy.hubs[h.id].stock.food-s.economy.hubs[h.id].reserved.food):0;}
 return strongholds(s,faction).reduce((n,h)=>n+s.economy.hubs[h.id].stock.food,0);
}
export function materialTotal(s,key,faction=s.player){return hasEconomy(s)?strongholds(s,faction).reduce((n,h)=>n+s.economy.hubs[h.id].stock[key],0):key==='food'?foodStock(s,faction):0;}
export function laborUsed(s,hub){return hasEconomy(s)?s.economy.parties.filter(p=>p.homeHub===hub&&p.phase!=='done').reduce((n,p)=>n+p.workers,0)+s.projects.filter(p=>p.city===hub&&!['levy','hire'].includes(p.type)).length*100:0;}
export function laborAvailable(s,hub){const c=city(s,hub),levy=s.projects.filter(p=>p.city===hub&&p.type==='levy').reduce((n,p)=>n+Math.max(0,p.troops-p.done),0);return Math.max(0,Math.min(Math.floor(c.population*.02),c.population-10000-levy)-laborUsed(s,hub));}

export function initializeEconomy(s){
 if(s.economyRules!==undefined)throw new Error('경제 규칙이 이미 초기화되었습니다.');
 s.economyRules=1;s.resourceGenerationVersion=1;
 s.economy={rulesVersion:1,hubs:{},isolatedFood:{},sites:makeResourceSites(s),parties:[],fieldStock:{},ledger:[]};
 for(const [f,stock] of Object.entries(s.factions)){
  const hubs=strongholds(s,f),weights=hubs.map(h=>[h,...hinterland(s,h)].reduce((n,c)=>n+c.population,0)+h.soldiers*5),total=weights.reduce((a,b)=>a+b,0);let remainingFood=stock.food,remainingTimber=120;
  hubs.forEach((h,i)=>{const last=i===hubs.length-1,food=last?remainingFood:stock.food*weights[i]/total,timber=last?remainingTimber:120*weights[i]/total;remainingFood-=food;remainingTimber-=timber;
   const materials={food,timber,goods:0};s.economy.hubs[h.id]={resourcePolicy:'balanced',stock:materials,reserved:EMPTY_STOCK(),capacityWeight:Math.max(900,stockWeight(materials)*1.25),initialPopulation:h.population,livingStandard:.2,goodsExpectation:0,foodService30:1,goodsService30:0,shortageDays:0,lastFoodService:1,lastFlow:{food:0,gold:0},lastDemand:{food:0,goods:0}};
   for(const key of ['food','timber'])s.economy.ledger.push({at:s.elapsed,hub:h.id,owner:f,key,amount:materials[key],reason:'시작 물자 지급'});
  });delete stock.food;
 }
}

export function changeStock(s,hub,key,delta,reason,log=true){
 const h=s.economy?.hubs[hub];if(!h||!MATERIALS[key]||!Number.isFinite(delta))throw new Error('물자 변경이 올바르지 않습니다.');
 if(delta<0&&h.stock[key]-h.reserved[key]+delta< -1e-7)throw new Error('거점의 사용 가능한 물자가 부족합니다.');
 const applied=delta>0?Math.min(delta,Math.max(0,h.capacityWeight-stockWeight(h.stock))/MATERIALS[key].weight):delta;
 h.stock[key]=Math.max(0,h.stock[key]+applied);
 if(log&&Math.abs(applied)>1e-9){const owner=city(s,hub).owner,e={at:s.elapsed,hub,owner,key,amount:applied,reason};s.economy.ledger.unshift(e);s.economy.ledger.length=Math.min(200,s.economy.ledger.length);
  if(owner===s.player){s.resourceLog.unshift({at:s.elapsed,day:s.day,month:s.month,year:s.year,gold:0,food:0,timber:0,goods:0,[key]:applied,reason:`${reason} · ${city(s,hub).name}`});s.resourceLog.length=Math.min(24,s.resourceLog.length);}
 }
 return applied;
}

export function regionEconomicYield(s,c){
 if(c.owner==='neutral')return {gold:0,gross:0,food:0};
 const hub=governingHub(s,c)||c,policy=POLICIES[hub.policy],terrain=TERRAINS[c.terrain],season=s.month>=9&&s.month<=11?1.35:s.month<=2||s.month===12?.7:1;
 const besieged=s.armies.some(a=>a.target===hub.id&&a.faction!==c.owner&&a.mode==='siege'),labor=c.major?Math.max(.5,1-laborUsed(s,c.id)/c.population):1;
 const gross=c.population/1000*(.85+(c.agriculture+hub.agriculture)/400)*terrain.food*season*policy.food*labor*(besieged?.5:1);
 const gold=c.population*.0023*(.45+c.commerce/65)*(c.major?1:.65+hub.commerce/100)*(.5+hub.morale/180)*policy.gold*(c.terrain==='숲'?1:terrain.gold)*(c.owner==='wei'?1.15:1)*(besieged?.5:1)/30;
 return {gold,gross,food:gross-c.population/1000-c.soldiers*.005};
}

export function hubEconomy(s,id){
 const c=city(s,id),h=s.economy.hubs[id],lands=[c,...hinterland(s,c)],population=lands.reduce((n,r)=>n+r.population,0),production=lands.reduce((n,r)=>n+regionEconomicYield(s,r).gross,0);
 const stationed=s.armies.filter(a=>a.faction===c.owner&&a.mode==='stationed'&&hubFor(s,a.target,c.owner)?.id===id&&civilPath(s,id,a.target,c.owner)!==null);
 const military=lands.reduce((n,r)=>n+r.soldiers*.005,0)+stationed.reduce((n,a)=>n+a.troops*.005,0);
 return {city:c,hub:h,lands,population,production,stationed,military,foodDemand:population/1000+military,goodsDemand:population/1000*(.001+.003*h.livingStandard),laborUsed:laborUsed(s,id),laborAvailable:laborAvailable(s,id)};
}

export function prepareArmyFood(s,a,from,duration){
 const daily=a.troops*.012,minimum=daily*(duration+5),wanted=Math.max(0,minimum-(a.carriedFood||0)),hub=hubFor(s,from.id,a.faction);
 if(wanted<=1e-7)return true;
 if(!hub||civilPath(s,hub.id,from.id,a.faction)===null||foodStock(s,a.faction,from.id)+1e-7<wanted)return false;
 changeStock(s,hub.id,'food',-wanted,'출진 식량 적재');a.carriedFood=(a.carriedFood||0)+wanted;return true;
}

export function advanceEconomy(s){
 const before=foodStock(s),beforeGold=s.factions[s.player].gold,covered=new Set(),fedArmies=new Set();
 for(const c of strongholds(s)){
  const q=hubEconomy(s,c.id),h=q.hub;for(const r of q.lands)covered.add(r.id);
  const startFood=h.stock.food,gold=q.lands.reduce((n,r)=>n+regionEconomicYield(s,r).gold,0);s.factions[c.owner].gold+=gold;
  changeStock(s,c.id,'food',q.production,'기본 수확');
  const served=Math.min(foodStock(s,c.owner,c.id),q.foodDemand),ratio=q.foodDemand?served/q.foodDemand:1;changeStock(s,c.id,'food',-served,'주민과 수비병 식량');
  const goods=Math.min(h.stock.goods-h.reserved.goods,q.goodsDemand),goodsRatio=q.goodsDemand?goods/q.goodsDemand:1;changeStock(s,c.id,'goods',-goods,'주민 생활용품');
  h.lastFoodService=ratio;h.foodService30=(h.foodService30*29+ratio)/30;h.goodsService30=(h.goodsService30*29+goodsRatio)/30;
  h.shortageDays=ratio<.8?h.shortageDays+1:ratio>=.95?Math.max(0,h.shortageDays-1):h.shortageDays;
  const safety=localSafety(s,q.lands),tax={balanced:.5,food:.4,trade:.75,security:.25}[c.policy],gap=Math.max(0,h.goodsExpectation-h.goodsService30);
  const target=clamp(55+35*(h.foodService30-.5)+10*safety+10*h.goodsService30-15*gap-20*tax-15*c.weariness/100,0,100);
  c.morale=clamp(c.morale+clamp((target-c.morale)*.05,-1,1),0,100);c.weariness=Math.max(0,c.weariness-.16);
  const living=clamp(.4*h.goodsService30+.25*c.commerce/100+.2*h.foodService30+.15*safety,0,1);h.livingStandard+=(living-h.livingStandard)*.01;
  h.goodsExpectation+=(h.goodsService30-h.goodsExpectation)/(h.goodsService30>h.goodsExpectation?90:180);
  const room=Math.max(0,1-c.population/(h.initialPopulation*(1+c.commerce/100)));c.population+=c.population*.0004*room*Math.max(0,(c.morale-40)/60)*h.foodService30;
  for(const r of q.lands){if(h.shortageDays>5)r.population=Math.max(10000+(r.major?laborUsed(s,r.id):0),r.population*(1-.0002*(1-ratio)));r.soldiers*=1-.01*(1-ratio);r.training=Math.min(85,r.training+.025);r.reserve=Math.min(r.population*.12,r.reserve+r.population*.00018*r.morale/100);}
  for(const a of q.stationed){fedArmies.add(a.id);const need=a.troops*.005,used=Math.min(a.carriedFood||0,need*(1-ratio)),service=need?ratio+used/need:1;a.carriedFood=Math.max(0,(a.carriedFood||0)-used);a.supply=Math.max(0,a.supply-5*(1-service));a.troops*=1-.01*(1-service);}
  h.lastDemand={food:q.foodDemand,goods:q.goodsDemand};h.lastFlow={food:h.stock.food-startFood,gold};
 }
 for(const r of s.cities)if(r.owner!=='neutral'&&!covered.has(r.id)){
  const yieldValue=regionEconomicYield(s,r),need=r.population/1000,stock=(s.economy.isolatedFood[r.id]||0)+yieldValue.gross,used=Math.min(stock,need);s.economy.isolatedFood[r.id]=Math.min(need*7,stock-used);if(used<need)r.morale=Math.max(0,r.morale-.25*(1-used/need));
 }
 for(const [region,amount] of Object.entries(s.economy.isolatedFood)){const hub=hubFor(s,region);if(hub&&amount>0)s.economy.isolatedFood[region]-=changeStock(s,hub.id,'food',amount,'관할 식량 회수');}
 for(const a of s.armies)if(!fedArmies.has(a.id)&&a.troops>0){const need=a.troops*(a.mode==='stationed'?.005:.012),used=Math.min(a.carriedFood||0,need),ratio=need?used/need:1;a.carriedFood=Math.max(0,(a.carriedFood||0)-used);if(ratio<1){a.supply=Math.max(0,a.supply-5*(1-ratio));a.troops*=1-.01*(1-ratio);}}
 s.ledger={gold:s.factions[s.player].gold-beforeGold,food:foodStock(s)-before};
 if(Math.abs(s.ledger.gold)>.001){s.resourceLog.unshift({at:s.elapsed,day:s.day,month:s.month,year:s.year,gold:s.ledger.gold,food:0,reason:'하루 정산 · 세수'});s.resourceLog.length=Math.min(24,s.resourceLog.length);}
}

function localSafety(s,lands){
 let weighted=0,population=0;for(const c of lands){const attack=s.armies.filter(a=>a.faction!==c.owner&&a.target===c.id&&['march','siege','field'].includes(a.mode)).reduce((n,a)=>n+a.troops,0),defense=c.soldiers+s.armies.filter(a=>a.faction===c.owner&&a.target===c.id&&a.mode==='stationed').reduce((n,a)=>n+a.troops,0);weighted+=c.population*clamp(1-attack/(attack+defense+100),0,1);population+=c.population;}return population?weighted/population:1;
}

export function validateEconomy(s){
 const invalid=()=>{throw new Error('경제 저장을 읽을 수 없습니다.');},number=n=>Number.isFinite(n)&&n>=0;
 const e=s.economy;if(!e||e.rulesVersion!==1||s.resourceGenerationVersion!==1||!e.hubs||Array.isArray(e.hubs)||!e.isolatedFood||Array.isArray(e.isolatedFood)||!e.fieldStock||Array.isArray(e.fieldStock)||!Array.isArray(e.sites)||!Array.isArray(e.parties)||!Array.isArray(e.ledger))invalid();
 const hubs=strongholds(s);if(Object.keys(e.hubs).length!==hubs.length)invalid();
 for(const c of hubs){const h=e.hubs[c.id];if(!h||h.resourcePolicy!==undefined&&!Object.hasOwn(RESOURCE_POLICIES,h.resourcePolicy)||!number(h.capacityWeight)||!number(h.initialPopulation)||h.initialPopulation<10000||!h.stock||!h.reserved)invalid();for(const key of MATERIAL_IDS)if(!number(h.stock[key])||!number(h.reserved[key])||h.reserved[key]>h.stock[key]+1e-7)invalid();if(stockWeight(h.stock)>h.capacityWeight+1e-6)invalid();for(const k of ['livingStandard','goodsExpectation','foodService30','goodsService30','lastFoodService'])if(!number(h[k])||h[k]>1)invalid();if(!Number.isInteger(h.shortageDays)||h.shortageDays<0||!h.lastFlow||!h.lastDemand)invalid();for(const k of ['gold','food'])if(!Number.isFinite(h.lastFlow[k]))invalid();for(const k of ['food','goods'])if(!number(h.lastDemand[k]))invalid();}
 for(const [id,n] of Object.entries(e.isolatedFood))if(!city(s,id)||!number(n))invalid();
 for(const [id,stock] of Object.entries(e.fieldStock)){if(!city(s,id))invalid();for(const key of MATERIAL_IDS)if(!number(stock[key]))invalid();}
 if(new Set(e.sites.map(v=>v.id)).size!==e.sites.length||new Set(e.sites.map(v=>v.region)).size!==e.sites.length||new Set(e.parties.map(v=>v.id)).size!==e.parties.length)invalid();
 for(const v of e.sites)if(typeof v.id!=='string'||!city(s,v.region)||city(s,v.region).major||!['food','timber'].includes(v.kind)||!number(v.richness)||v.richness<.7||v.richness>1.4||!number(v.stock)||!number(v.stockMax)||v.stock>v.stockMax||!number(v.regen))invalid();
 for(const f of Object.values(s.factions))if(Object.hasOwn(f,'food'))invalid();
 for(const a of s.armies)if(!number(a.carriedFood))invalid();
}
