import {city,strongholds,troopTotal,FACTIONS,dist} from './world.js';
import {materialTotal} from './economy.js';
import {KINGDOM_POLICIES,hasKingdoms,treaty,warBetween,pairKey} from './kingdom-rules.js';
import {observeKingdom,knownStrength,thirdPartyRisk,contact} from './kingdom-knowledge.js';
import {foodDemand,proposeOffer,declareWar,failedNegotiation,diplomaticEvent,withdrawWar} from './diplomacy.js';

export function initializeKingdoms(s){
 if(hasKingdoms(s))return;
 s.kingdomRules=1;s.kingdoms={};s.diplomacy={serial:0,offers:[],wars:[],history:[],cooldowns:{}};
 for(const f of Object.keys(s.factions))s.kingdoms[f]={policy:f===s.player?'balanced':FACTIONS[f].temper>.7?'assertive':FACTIONS[f].temper<.4?'peaceful':'balanced',priority:'food',knowledge:{regions:{},armies:{},contacts:{}},goal:null,reason:'국경과 자원 상황을 확인합니다.',observedAt:s.elapsed,lastDiplomacy:-20};
 for(const f of Object.keys(s.kingdoms))observeKingdom(s,f);
 // Existing campaigns retain ongoing wars when adopting the kingdom layer.
 for(const a of s.armies){const c=city(s,a.target);if(!['march','siege','field','duel'].includes(a.mode)||!s.kingdoms[c?.owner]||a.faction===c.owner||warBetween(s,a.faction,c.owner)||treaty(s,a.faction,c.owner))continue;
  const f=a.faction,other=c.owner;s.diplomacy.wars.push({id:`w${++s.diplomacy.serial}`,key:pairKey(f,other),attacker:f,defender:other,target:c.id,resource:'food',started:s.elapsed,status:'active',initial:{[f]:troopTotal(s,f),[other]:troopTotal(s,other)},losses:{[f]:0,[other]:0},withdrawing:[]});contact(s,other,f);contact(s,f,other);
 }
}
export function setKingdomPolicy(s,policy=s.kingdoms?.[s.player]?.policy,priority=s.kingdoms?.[s.player]?.priority){
 if(!hasKingdoms(s)||!Object.hasOwn(KINGDOM_POLICIES,policy)||!['food','timber'].includes(priority))throw new Error('왕국 방침과 확보할 자원을 선택하세요.');
 const k=s.kingdoms[s.player];k.policy=policy;k.priority=priority;
 for(const a of s.armies)if(a.faction===s.player&&a.order&&['advance','attack'].includes(a.order.action))a.order.path=[];
 if(policy==='peaceful')for(const w of s.diplomacy.wars)if(w.status==='active'&&(w.attacker===s.player||w.defender===s.player))withdrawWar(s,w.attacker===s.player?w.defender:w.attacker);
 diplomaticEvent(s,`왕국 방침: ${KINGDOM_POLICIES[policy].name} · ${priority==='food'?'식량':'목재'} 확보`,s.player,null);
 thinkKingdom(s,s.player);
}
export function assessCampaign(s,f,other){
 const k=s.kingdoms[f],policy=KINGDOM_POLICIES[k.policy],own=troopTotal(s,f),enemy=Math.max(1500,knownStrength(s,f,other)),risk=thirdPartyRisk(s,f,other);
 const available=own*(1-policy.reserve),required=enemy*1.12+own*risk*.45;
 const allowed=k.policy!=='peaceful'&&!treaty(s,f,other)&&available>required;
 return {allowed,risk,available,required,reason:treaty(s,f,other)?'불가침 약속을 지킵니다.':k.policy==='peaceful'?'외교 우선 방침으로 전쟁을 피합니다.':allowed?'방어 병력을 남기고 제한전을 감당할 수 있습니다.':'예상 적 전력과 제삼국 위협에 대비해 병력을 아낍니다.'};
}
export function kingdomObjective(s,f){
 const wars=s.diplomacy.wars.filter(w=>w.status==='active'&&(w.attacker===f||w.defender===f)&&!w.withdrawing.includes(f));
 const attack=wars.find(w=>w.attacker===f&&city(s,w.target).owner!==f);if(attack&&s.kingdoms[f].policy!=='peaceful')return city(s,attack.target);
 const defensive=wars.find(w=>w.defender===f);if(!defensive)return null;
 // Defenders recover their announced contested district, rather than conquering unrelated kingdoms.
 return city(s,defensive.target)?.owner!==f?city(s,defensive.target):null;
}
export function thinkKingdom(s,f){
 if(!hasKingdoms(s)||!strongholds(s,f).length)return;
 const k=s.kingdoms[f];observeKingdom(s,f);
 const resource=f===s.player?k.priority:materialTotal(s,'timber',f)<40?'timber':'food',demand=foodDemand(s,f),stock=materialTotal(s,resource,f),wanted=resource==='food'?demand*45:120;
 const candidates=Object.values(k.knowledge.regions).filter(r=>r.owner!==f&&s.kingdoms[r.owner]&&strongholds(s,r.owner).length&&(r.resource===resource||resource==='food'&&r.major)&&s.elapsed-r.at<=60);
 const bases=strongholds(s,f),distance=r=>Math.min(...bases.map(b=>dist(b,city(s,r.id))));
 candidates.sort((a,b)=>(b.resource===resource?1000:0)-(a.resource===resource?1000:0)||distance(a)-distance(b)||a.id.localeCompare(b.id));
 const target=candidates[0];k.goal={resource,stock:Math.round(stock),wanted:Math.round(wanted),target:target?.id||null,at:s.elapsed};
 const active=s.diplomacy.wars.find(w=>w.status==='active'&&(w.attacker===f||w.defender===f));
 if(active){k.reason=active.withdrawing.includes(f)?'공세를 중단하고 휴전 조건을 검토합니다.':`${city(s,active.target).name}을 둘러싼 제한전 · 손실을 감시합니다.`;return;}
 k.reason=stock>=wanted?'비축이 충분해 전쟁 비용을 감수하지 않습니다.':'생산·채집과 거래로 필요한 자원을 확보합니다.';
 if(f===s.player)return; // Foreign affairs and war declarations belong to the player.
 if(stock>=wanted||s.elapsed-k.lastDiplomacy<6)return;
 const pending=s.diplomacy.offers.some(o=>o.from===f&&o.status==='pending');if(pending){k.reason='외교 제안의 답변을 기다립니다.';return;}
 const contacts=Object.keys(k.knowledge.contacts).filter(other=>strongholds(s,other).length&&!warBetween(s,f,other));
 const seller=contacts.find(other=>!failedNegotiation(s,f,other)&&(s.diplomacy.cooldowns[`${f}:${other}:trade`]||0)<=s.elapsed);
 if(seller){
  const amount=Math.min(resource==='food'?4000:60,Math.max(1,Math.ceil(wanted-stock))),price=Math.ceil(amount*(resource==='food'?.2:5));
  if(s.factions[f].gold>=price){proposeOffer(s,{to:seller,type:'trade',resource,amount,price},f);k.lastDiplomacy=s.elapsed;k.reason='무력 사용 전에 자원 거래를 제안합니다.';return;}
 }
 if(!target||!failedNegotiation(s,f,target.owner))return;
 const assessment=assessCampaign(s,f,target.owner);k.reason=assessment.reason;
 if(!assessment.allowed){
  const neighbor=contacts.find(other=>other!==target.owner&&!treaty(s,f,other)&&(s.diplomacy.cooldowns[`${f}:${other}:pact`]||0)<=s.elapsed);
  if(neighbor){proposeOffer(s,{to:neighbor,type:'pact',duration:20,price:Math.min(300,Math.floor(s.factions[f].gold*.05))},f);k.lastDiplomacy=s.elapsed;}return;
 }
 const demanded=s.diplomacy.offers.find(o=>o.from===f&&o.to===target.owner&&o.type==='demand'&&['rejected','expired'].includes(o.status)&&s.elapsed-(o.resolved??o.expires)<60);
 if(!demanded){if((s.diplomacy.cooldowns[`${f}:${target.owner}:demand`]||0)<=s.elapsed){proposeOffer(s,{to:target.owner,type:'demand',resource,amount:resource==='food'?2000:40,duration:15},f);k.lastDiplomacy=s.elapsed;}return;}
 if(city(s,target.id).owner===target.owner){declareWar(s,target.id,f);k.lastDiplomacy=s.elapsed;}
}

export function validateKingdoms(s){
 const bad=()=>{throw new Error('왕국 외교·정보 저장을 읽을 수 없습니다.');},number=n=>Number.isFinite(n)&&n>=0,realm=f=>!!s.factions[f],time=n=>Number.isInteger(n)&&n>=0&&n<=s.elapsed;
 if(s.kingdomRules!==1||!s.kingdoms||Object.keys(s.kingdoms).length!==Object.keys(s.factions).length||!s.diplomacy)bad();
 for(const f of Object.keys(s.factions)){
  const k=s.kingdoms[f],m=k?.knowledge;if(!k||!Object.hasOwn(KINGDOM_POLICIES,k.policy)||!['food','timber'].includes(k.priority)||!m?.regions||!m.armies||!m.contacts||!time(k.observedAt)||!Number.isFinite(k.lastDiplomacy)||typeof k.reason!=='string')bad();
  for(const [id,r] of Object.entries(m.regions))if(!city(s,id)||id!==r.id||!realm(r.owner)&&r.owner!=='neutral'||!time(r.at)||!number(r.troops)||!number(r.defense)||!number(r.training)||!number(r.morale)||![null,'food','timber'].includes(r.resource)||!number(r.richness))bad();
  for(const [id,a] of Object.entries(m.armies))if(id!==a.id||!realm(a.faction)||!city(s,a.region)||!city(s,a.target)||!number(a.troops)||!time(a.at)||!['stationed','march','return','siege','field','duel'].includes(a.mode))bad();
  for(const [other,c] of Object.entries(m.contacts))if(!realm(other)||other===f||!time(c.since)||!time(c.lastSeen))bad();
  if(k.goal&&(!['food','timber'].includes(k.goal.resource)||!number(k.goal.stock)||!number(k.goal.wanted)||k.goal.target&&!city(s,k.goal.target)||!time(k.goal.at)))bad();
 }
 const d=s.diplomacy;if(!Number.isInteger(d.serial)||d.serial<0||!Array.isArray(d.offers)||!Array.isArray(d.wars)||!Array.isArray(d.history)||!d.cooldowns)bad();
 const identifiers=[...d.offers,...d.wars].map(v=>v.id);if(new Set(identifiers).size!==identifiers.length)bad();
 for(const o of d.offers){if(typeof o.id!=='string'||!realm(o.from)||!realm(o.to)||o.from===o.to||!['trade','pact','demand','peace'].includes(o.type)||!['food','timber'].includes(o.resource)||!Number.isInteger(o.amount)||o.amount<0||o.amount>20000||!Number.isInteger(o.price)||o.price<0||o.price>20000||!Number.isInteger(o.duration)||o.duration<5||o.duration>60||!time(o.created)||o.expires!==o.created+10||!['pending','accepted','rejected','expired'].includes(o.status)||typeof o.reason!=='string')bad();if(o.status!=='pending'&&!time(o.resolved))bad();}
 for(const w of d.wars){if(!realm(w.attacker)||!realm(w.defender)||w.attacker===w.defender||w.key!==pairKey(w.attacker,w.defender)||!city(s,w.target)||!time(w.started)||!['active','ended'].includes(w.status)||!w.initial||!w.losses||!Array.isArray(w.withdrawing)||w.withdrawing.some(f=>f!==w.attacker&&f!==w.defender))bad();for(const f of [w.attacker,w.defender])if(!number(w.initial[f])||!number(w.losses[f]))bad();if(w.status==='ended'&&!time(w.ended))bad();}
 for(const [key,n] of Object.entries(d.cooldowns))if(!number(n)||!Number.isInteger(n)||key.split(':').length!==3)bad();
 for(const p of s.pacts)if(typeof p.key!=='string'||p.key.split(':').length!==2||!p.key.split(':').every(realm)||!number(p.until))bad();
}
