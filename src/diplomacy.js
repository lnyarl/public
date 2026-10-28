import {city,strongholds,troopTotal} from './world.js';
import {stockWeight,changeStock} from './economy.js';
import {MATERIALS} from './economy-rules.js';
import {KINGDOM_POLICIES,DIPLOMACY_TYPES,hasKingdoms,pairKey,treaty,warBetween} from './kingdom-rules.js';
import {contact,knownStrength,thirdPartyRisk} from './kingdom-knowledge.js';

export function diplomaticEvent(s,text,from,to){
 const event={id:++s.serial,at:s.elapsed,day:s.day,month:s.month,year:s.year,kind:'diplomacy',text,faction:from,other:to};
 s.events.unshift(event);s.events.length=Math.min(160,s.events.length);
 if(from===s.player||to===s.player){s.reports.unshift(event);s.reports.length=Math.min(80,s.reports.length);}
 s.diplomacy.history.unshift(event);s.diplomacy.history.length=Math.min(100,s.diplomacy.history.length);
}
export function foodDemand(s,f){return s.cities.filter(c=>c.owner===f).reduce((n,c)=>n+c.population/1000,0)+troopTotal(s,f)*.008;}
export function availableMaterial(s,f,key){return strongholds(s,f).reduce((n,c)=>{const h=s.economy.hubs[c.id];return n+h.stock[key]-h.reserved[key];},0);}
const capacity=(s,f,key)=>strongholds(s,f).reduce((n,c)=>{const h=s.economy.hubs[c.id];return n+Math.max(0,h.capacityWeight-stockWeight(h.stock))/MATERIALS[key].weight;},0);
function transferMaterial(s,from,to,key,amount){
 let left=amount;for(const c of strongholds(s,from)){const h=s.economy.hubs[c.id],take=Math.min(left,h.stock[key]-h.reserved[key]);if(take>0){changeStock(s,c.id,key,-take,'외교 물자 지급');left-=take;}}
 left=amount;for(const c of strongholds(s,to)){const delivered=changeStock(s,c.id,key,left,'외교 물자 수령');left-=delivered;if(left<1e-7)break;}
}
function checkRealm(s,f){if(!hasKingdoms(s)||s.status!=='playing'||!s.kingdoms[f]||!strongholds(s,f).length)throw new Error('외교할 수 있는 왕국이 없습니다.');}
function termsError(s,o){
 if(!strongholds(s,o.from).length||!strongholds(s,o.to).length)return '거점을 잃어 협상을 이행할 수 없습니다.';
 if(['trade','demand'].includes(o.type)){
  if(warBetween(s,o.from,o.to))return '전쟁 중에는 먼저 휴전해야 합니다.';
  if(availableMaterial(s,o.to,o.resource)+1e-7<o.amount)return '상대의 사용 가능한 재고가 부족합니다.';
  if(capacity(s,o.from,o.resource)+1e-7<o.amount)return '받는 왕국의 창고 공간이 부족합니다.';
 }
 if(o.type==='pact'&&(warBetween(s,o.from,o.to)||treaty(s,o.from,o.to)))return '전쟁 중이거나 이미 유효한 협정이 있습니다.';
 if(o.type==='peace'&&!warBetween(s,o.from,o.to))return '이미 전쟁이 끝났습니다.';
 const payer=o.price<0?o.to:o.from;if(s.factions[payer].gold<Math.abs(o.price))return '약속한 금을 지급할 수 없습니다.';
 return '';
}
export function evaluateOffer(s,o){
 const invalid=termsError(s,o);if(invalid)return {accept:false,reason:invalid};
 const f=o.to,own=troopTotal(s,f),other=knownStrength(s,f,o.from),risk=thirdPartyRisk(s,f,o.from),policy=s.kingdoms[f].policy;
 if(o.type==='trade'){
  const reserve=o.resource==='food'?foodDemand(s,f)*15:40,price=o.amount*(o.resource==='food'?.16:4);
  return availableMaterial(s,f,o.resource)-o.amount<reserve?{accept:false,reason:'우리 왕국의 비축분부터 확보해야 합니다.'}:o.price<price?{accept:false,reason:`대가가 부족합니다. 금 ${Math.ceil(price)} 이상을 원합니다.`}:{accept:true,reason:'비축분을 지키면서 거래할 수 있습니다.'};
 }
 if(o.type==='pact'){
  const active=s.diplomacy.wars.some(w=>w.status==='active'&&(w.attacker===f||w.defender===f));
  const accepts=policy==='peaceful'||active||risk>.3||other>=own*.65||o.price>=Math.max(200,own*.025);
  return {accept:accepts,reason:accepts?'국경을 안정시키는 편이 유리합니다.':'지금은 행동의 자유를 유지하겠습니다.'};
 }
 if(o.type==='demand'){
  const reserve=o.resource==='food'?foodDemand(s,f)*10:25;
  const accepts=other>own*(1.4+Math.min(.4,risk))&&availableMaterial(s,f,o.resource)-o.amount>=reserve;
  return {accept:accepts,reason:accepts?'충돌을 피하기 위해 물자를 내놓겠습니다.':'이 요구를 받아들일 이유가 없습니다.'};
 }
 const w=warBetween(s,f,o.from),loss=w.losses[f]/Math.max(1,w.initial[f]),lostGoal=city(s,w.target)?.owner===w.attacker;
 const willing=loss>=KINGDOM_POLICIES[policy].lossLimit*.65||risk>.5||w.withdrawing.includes(f)||s.elapsed-w.started>=25||lostGoal;
 const compensation=Math.ceil(Math.max(200,own*.04));
 const accepts=o.price>=compensation||willing&&o.price>=0;
 return {accept:accepts,reason:accepts?'얻을 것보다 전쟁 비용이 커지고 있습니다.':`휴전 대가로 금 ${compensation} 이상을 원합니다.`};
}
export function proposeOffer(s,request,f=s.player){
 checkRealm(s,f);const {to,type}=request;checkRealm(s,to);
 if(to===f||!s.kingdoms[f].knowledge.contacts[to]||!Object.hasOwn(DIPLOMACY_TYPES,type))throw new Error('접촉한 왕국과 협상 종류를 선택하세요.');
 const resource=request.resource||'food',amount=Number(request.amount??0),price=Number(request.price??0),duration=Number(request.duration??20);
 if(!Number.isInteger(price)||price<0||price>20000||!Number.isInteger(duration)||duration<5||duration>60)throw new Error('금은 0~20000, 기간은 5~60일로 입력하세요.');
 if(['trade','demand'].includes(type)&&(!['food','timber'].includes(resource)||!Number.isInteger(amount)||amount<1||amount>20000))throw new Error('식량 또는 목재 수량을 1~20000으로 입력하세요.');
 if(type==='demand'&&price!==0)throw new Error('자원 요구에는 금을 지급하지 않습니다.');
 if(s.diplomacy.offers.some(o=>o.from===f&&o.to===to&&o.type===type&&o.status==='pending'))throw new Error('같은 제안의 답변을 기다리고 있습니다.');
 const cooldown=s.diplomacy.cooldowns[`${f}:${to}:${type}`]||0;if(cooldown>s.elapsed)throw new Error(`${cooldown-s.elapsed}일 뒤에 다시 제안할 수 있습니다.`);
 const o={id:`d${s.diplomacy.serial+1}`,from:f,to,type,resource,amount:['trade','demand'].includes(type)?amount:0,price,duration,created:s.elapsed,expires:s.elapsed+10,status:'pending',reason:'답변 대기'};
 // Offer terms may be rejected by the other kingdom; only the sender's funds are committed here.
 if(s.factions[f].gold<price)throw new Error('제안할 금이 부족합니다.');
 if(type==='peace'&&!warBetween(s,f,to))throw new Error('전쟁 중인 상대에게 휴전을 제안하세요.');
 if(type!=='peace'&&warBetween(s,f,to))throw new Error('전쟁 중에는 휴전을 먼저 제안하세요.');
 if(type==='pact'&&treaty(s,f,to))throw new Error('현재 협정이 끝난 뒤에 새로 협상하세요.');
 s.diplomacy.serial++;s.diplomacy.offers.push(o);contact(s,to,f);
 s.diplomacy.cooldowns[`${f}:${to}:${type}`]=s.elapsed+12;
 diplomaticEvent(s,`${s.factions[f].name} → ${s.factions[to].name}: ${DIPLOMACY_TYPES[type]} 제안`,f,to);return o;
}
export function respondOffer(s,id,accept,f=s.player){
 checkRealm(s,f);const o=s.diplomacy.offers.find(v=>v.id===id&&v.to===f&&v.status==='pending');
 if(!o||o.expires<=s.elapsed)throw new Error('답변할 수 있는 제안이 없습니다.');
 if(typeof accept!=='boolean')throw new Error('수락 또는 거절을 선택하세요.');
 const error=accept?termsError(s,o):'';if(error)throw new Error(error);
 if(accept){
  if(['trade','demand'].includes(o.type))transferMaterial(s,o.to,o.from,o.resource,o.amount);
  s.factions[o.from].gold-=o.price;s.factions[o.to].gold+=o.price;
  if(o.price&&(o.from===s.player||o.to===s.player)){s.resourceLog.unshift({at:s.elapsed,day:s.day,month:s.month,year:s.year,gold:o.from===s.player?-o.price:o.price,food:0,reason:`${DIPLOMACY_TYPES[o.type]} 합의금`});s.resourceLog.length=Math.min(24,s.resourceLog.length);}
  if(['pact','peace','demand'].includes(o.type)){
   const key=pairKey(o.from,o.to);s.pacts=s.pacts.filter(p=>p.key!==key);s.pacts.push({key,until:s.elapsed+o.duration,type:o.type});delete s.hostilities[key];
   const w=warBetween(s,o.from,o.to);if(w){w.status='ended';w.ended=s.elapsed;w.outcome='협상으로 휴전';for(const f of [o.from,o.to])s.kingdoms[f].reason=`휴전 합의 · ${o.duration}일 동안 병력과 자원을 회복합니다.`;}
  }
 }
 o.status=accept?'accepted':'rejected';o.resolved=s.elapsed;o.reason=accept?'합의가 이행되었습니다.':'상대가 거절했습니다.';
 diplomaticEvent(s,`${s.factions[f].name}: ${DIPLOMACY_TYPES[o.type]} ${accept?'수락':'거절'}${accept&&o.amount?` · ${MATERIALS[o.resource].name} ${o.amount}`:''}${accept&&o.price?` · 금 ${o.price}`:''}`,o.from,o.to);return o;
}
export function failedNegotiation(s,f,other){return s.diplomacy.offers.some(o=>o.from===f&&o.to===other&&['trade','demand'].includes(o.type)&&['rejected','expired'].includes(o.status)&&s.elapsed-(o.resolved??o.expires)<60);}
export function declareWar(s,targetId,f=s.player){
 checkRealm(s,f);const target=city(s,targetId),memory=s.kingdoms[f].knowledge.regions[targetId],other=memory?.owner;
 if(!target||!other||other===f||!s.kingdoms[other]||!memory.major&&!memory.resource)throw new Error('알려진 외국 거점이나 자원지를 목표로 선택하세요.');
 if(target.owner!==other)throw new Error('목표의 소유국이 바뀌었습니다. 새 정보를 확인하세요.');
 if(s.kingdoms[f].policy==='peaceful')throw new Error('외교 우선 방침에서는 선전포고하지 않습니다.');
 if(treaty(s,f,other))throw new Error('불가침·휴전 약속이 끝나기 전에는 공격할 수 없습니다.');
 if(s.diplomacy.wars.some(w=>w.status==='active'&&w.attacker===f))throw new Error('진행 중인 공격 전쟁을 먼저 마무리하세요.');
 if(warBetween(s,f,other))throw new Error('이미 전쟁 중입니다.');
 if(!failedNegotiation(s,f,other))throw new Error('거래나 자원 요구로 먼저 협상하세요.');
 const war={id:`w${++s.diplomacy.serial}`,key:pairKey(f,other),attacker:f,defender:other,target:targetId,resource:memory.resource||'food',started:s.elapsed,status:'active',initial:{[f]:troopTotal(s,f),[other]:troopTotal(s,other)},losses:{[f]:0,[other]:0},withdrawing:[]};
 s.diplomacy.wars.push(war);s.hostilities[war.key]=s.elapsed+70;contact(s,other,f);
 s.kingdoms[f].reason=`${target.name} 확보를 위한 제한전 · 손실과 주변국을 감시합니다.`;
 s.kingdoms[other].reason=`${target.name}에 대한 공격에 대비합니다.`;
 diplomaticEvent(s,`${s.factions[f].name}, ${target.name} 확보를 위한 제한전 선언`,f,other);return war;
}
export function recordWarLoss(s,a,b,lostA,lostB){const w=warBetween(s,a,b);if(w){w.losses[a]+=lostA;w.losses[b]+=lostB;}}
export function withdrawWar(s,other,f=s.player){
 const w=warBetween(s,f,other);if(!w)throw new Error('진행 중인 전쟁이 없습니다.');
 if(!w.withdrawing.includes(f)){w.withdrawing.push(f);s.kingdoms[f].reason='공세를 중단하고 휴전 조건을 검토합니다.';diplomaticEvent(s,`${s.factions[f].name}, 공세 중단과 병력 철수 지시 · 휴전은 별도 합의 필요`,f,other);}
}
export function advanceDiplomacy(s){
 if(!hasKingdoms(s))return;
 for(const o of s.diplomacy.offers)if(o.status==='pending'){
  if(!strongholds(s,o.from).length||!strongholds(s,o.to).length){o.status='expired';o.resolved=s.elapsed;o.reason='왕국의 거점 상실로 협상을 종료했습니다.';continue;}
  if(o.expires<=s.elapsed){o.status='expired';o.resolved=s.elapsed;o.reason='응답 기간이 지났습니다.';continue;}
  if(o.to!==s.player&&s.elapsed>o.created){const decision=evaluateOffer(s,o);respondOffer(s,o.id,decision.accept,o.to);o.reason=decision.reason;}
 }
 s.diplomacy.offers=s.diplomacy.offers.filter(o=>o.status==='pending'||s.elapsed-(o.resolved??o.expires)<60);
 s.diplomacy.wars=s.diplomacy.wars.filter(w=>w.status==='active'||s.elapsed-w.ended<120);
 for(const [key,until] of Object.entries(s.diplomacy.cooldowns))if(until<=s.elapsed)delete s.diplomacy.cooldowns[key];
 for(const p of s.pacts)if(p.until===s.elapsed)diplomaticEvent(s,'불가침·휴전 기간이 끝났습니다.',...p.key.split(':'));
 for(const w of s.diplomacy.wars)if(w.status==='active'){
  if(!strongholds(s,w.attacker).length||!strongholds(s,w.defender).length){w.status='ended';w.ended=s.elapsed;w.outcome='왕국의 거점 상실';continue;}
  for(const f of [w.attacker,w.defender]){
   const k=s.kingdoms[f],other=f===w.attacker?w.defender:w.attacker,goalReached=f===w.attacker&&city(s,w.target).owner===f;
   const loss=w.losses[f]/Math.max(1,w.initial[f]),risk=thirdPartyRisk(s,f,other);
   const stop=goalReached||loss>=KINGDOM_POLICIES[k.policy].lossLimit||s.elapsed-w.started>=45||risk>1.1||k.policy==='peaceful';
   if(stop)withdrawWar(s,other,f);
   if(f!==s.player&&w.withdrawing.includes(f)&&!s.diplomacy.offers.some(o=>o.from===f&&o.to===other&&o.type==='peace'&&o.status==='pending')&&(s.diplomacy.cooldowns[`${f}:${other}:peace`]||0)<=s.elapsed){
    const price=Math.min(1000,Math.floor(s.factions[f].gold*.1));proposeOffer(s,{to:other,type:'peace',price,duration:20},f);
   }
  }
 }
}
