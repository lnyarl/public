import {city,strongholds,governingHub} from './world.js';
import {hasEconomy,hubEconomy,laborAvailable,stockWeight} from './economy.js';
import {RESOURCE_POLICIES} from './economy-rules.js';
import {civilPath} from './resource-sites.js';
import {startGathering,recallParty} from './work-parties.js';
import {COMMAND_COSTS,spendCommandPoints} from './command-points.js';
import {trace} from './logger.js';

const threatened=(s,id)=>s.armies.some(a=>a.faction!==city(s,id).owner&&a.target===id&&['march','siege','field'].includes(a.mode));

export function resourceOperations(s,id){
 const q=hubEconomy(s,id),h=q.hub,policy=h.resourcePolicy??'balanced',rule=RESOURCE_POLICIES[policy];
 const parties=s.economy.parties.filter(p=>p.homeHub===id&&p.phase!=='done'),targets={food:Math.ceil(q.foodDemand*rule.foodDays),timber:rule.timber};
 const needs=['food','timber'].filter(key=>h.stock[key]-h.reserved[key]+parties.reduce((n,p)=>n+(p.owner===q.city.owner?p.cargo[key]:0),0)<targets[key]);
 let reason,site=null;
 if(policy==='rest')reason=parties.length?'활동 중인 작업대의 귀환을 기다립니다.':'새 채집을 멈추고 인력을 보전합니다.';
 else if(threatened(s,id))reason='거점에 적군이 접근해 안전을 확보할 때까지 쉽니다.';
 else if(!needs.length)reason='목표 비축량을 확보해 추가 채집을 쉬고 있습니다.';
 else if(parties.length>=2)reason='방침에 따라 작업대 두 개가 자원을 확보하고 있습니다.';
 else if(laborAvailable(s,id)<100)reason='다른 작업과 주민 생활을 위해 채집 인력을 기다립니다.';
 else if(h.capacityWeight-stockWeight(h.stock)<1)reason='창고에 여유가 생길 때까지 새 채집을 쉽니다.';
 else{
  const occupied=new Set(s.economy.parties.filter(p=>p.phase!=='done').map(p=>p.siteId));
  const candidates=s.economy.sites.filter(v=>needs.includes(v.kind)&&v.stock>0&&!occupied.has(v.id)&&city(s,v.region).owner===q.city.owner&&governingHub(s,v.region)?.id===id).map(v=>({v,path:civilPath(s,id,v.region,q.city.owner)})).filter(({path})=>path!==null&&path.every(region=>!threatened(s,region)));
  candidates.sort((a,b)=>needs.indexOf(a.v.kind)-needs.indexOf(b.v.kind)||a.path.length-b.path.length||b.v.richness-a.v.richness||a.v.id.localeCompare(b.v.id));
  site=candidates[0]?.v||null;reason=site?`${site.kind==='food'?'식량':'목재'} 확보에 가용 작업대를 자동 배정합니다.`:parties.length?'작업대가 자원을 확보하고 있습니다. 귀환과 입고를 기다립니다.':'필요한 자원을 채집할 안전한 관할 자원지를 기다립니다.';
 }
 return {q,policy,rule,targets,needs,parties,site,reason,foodDays:q.foodDemand?(h.stock.food-h.reserved.food)/q.foodDemand:0};
}

export function setResourcePolicy(s,id,policy){
 const c=city(s,id);
 if(!hasEconomy(s)||s.status!=='playing'||!c?.major||c.owner!==s.player||!Object.hasOwn(RESOURCE_POLICIES,policy))throw new Error('아군 거점의 운영 방침을 선택하세요.');
 const h=s.economy.hubs[id];if((h.resourcePolicy??'balanced')===policy)return;
 spendCommandPoints(s,COMMAND_COSTS.economy,'자원 운영 방침 변경');h.resourcePolicy=policy;
 for(const p of s.economy.parties.filter(p=>p.homeHub===id&&p.owner===c.owner&&p.phase!=='done')){
  p.automatic=true;p.repeat=false;if(policy==='rest')recallParty(s,p.id,c.owner);
 }
 trace('economy','policy.changed',{city:id,policy,elapsed:s.elapsed});
}

export function advanceResourceOperations(s){
 if(!hasEconomy(s))return;
 for(const c of strongholds(s)){
  let plan=resourceOperations(s,c.id);
  for(const p of plan.parties){
   if(!p.automatic||p.owner!==c.owner||p.returnRequested)continue;
   const site=s.economy.sites.find(v=>v.id===p.siteId);
   if(plan.policy==='rest'||threatened(s,c.id)||!plan.needs.includes(site.kind)||p.phase==='outbound'&&[p.legTo,...p.path].some(id=>id&&threatened(s,id)))recallParty(s,p.id,c.owner);
  }
  for(let slot=plan.parties.length;slot<2;slot++){
   plan=resourceOperations(s,c.id);if(!plan.site)break;
   startGathering(s,c.id,plan.site.id,{faction:c.owner,automatic:true});
  }
 }
}
