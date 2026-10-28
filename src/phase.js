import { FACTIONS,OFFICERS,CITIES,createGame,deserialize,chooseStory } from './game.js';
import { PERSONAS,characterLine } from './characters.js';
import { storyFor } from './stories.js';
import { trace } from './logger.js';

export { FACTIONS,OFFICERS,PERSONAS,storyFor };
export const TYPES={levy:'징집',farm:'농업',market:'상업',fort:'방비',march:'출진',transfer:'수송',hire:'등용'};
export const STANCES={charge:'돌파',feint:'계략',guard:'신중'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round50=n=>Math.max(0,Math.round(n/50)*50);
export const city=(s,id)=>s.cities.find(c=>c.id===id);
export const owned=(s,f=s.player)=>s.cities.filter(c=>c.owner===f);
export const troops=(s,f=s.player)=>owned(s,f).reduce((n,c)=>n+c.soldiers,0)+s.armies.filter(a=>a.faction===f).reduce((n,a)=>n+a.troops,0);
export const limit=(s,f=s.player)=>Math.min(6,s.factions[f].officers.length);
export const orders=(s,f=s.player)=>s.plans.filter(o=>o.faction===f);
export function random(s) {s.seed=(Math.imul(1664525,s.seed)+1013904223)>>>0;return s.seed/4294967296;}

function upgrade(old) {
  const s=structuredClone(old);
  if(s.battle) {
    city(s,s.battle.from).soldiers+=s.battle.troops;
    trace('save','legacy.battle.returned',{commander:s.battle.commander,troops:s.battle.troops});
  }
  s.version=3;s.phase='planning';s.day=0;s.paused=true;s.plans=[];s.armies=[];s.events=[];s.effects=[];s.serial=0;s.battle=null;
  delete s.ap;delete s.usedOfficers;delete s.weather;
  s.cities.forEach((c,i)=>{
    const population=46000+c.farm*12500+c.market*6500+(i%4)*3700;
    Object.assign(c,{population,reserve:Math.round(population*.075),agriculture:c.farm*17,commerce:c.market*17,defense:c.fort*17,training:58+(i%4)*5,weariness:0,acted:false});
  });
  s.summary='도시에서 명령을 예약한 뒤 실행하세요. 양측이 같은 시간에 움직입니다.';
  s.monthReport=[];
  trace('save','campaign.upgraded',{from:old.version,to:3,player:s.player,turn:s.turn});
  return s;
}
export const newCampaign=(player='shu',seed=Date.now())=>upgrade(createGame(player,seed));
export function serializeCampaign(s) {return JSON.stringify(s);}
export function loadCampaign(raw) {
  const data=JSON.parse(raw);
  delete data.weather;
  if(data.version!==3) return upgrade(deserialize(raw));
  if(!['shu','wei','wu'].includes(data.player)||!['planning','execution'].includes(data.phase)||!['playing','victory','defeat'].includes(data.status)||!Number.isInteger(data.day)||data.day<0||data.day>30||!Number.isInteger(data.seed)||!Number.isInteger(data.turn)||!Number.isInteger(data.month)||data.month<1||data.month>12||!Number.isInteger(data.year)) throw new Error('저장된 진행 상태가 올바르지 않습니다.');
  if(!Array.isArray(data.cities)||data.cities.length!==CITIES.length||new Set(data.cities.map(c=>c.id)).size!==CITIES.length||!Array.isArray(data.armies)||!Array.isArray(data.plans)||!Array.isArray(data.events)) throw new Error('지도 저장을 읽을 수 없습니다.');
  for(const f of ['shu','wei','wu']) {
    const v=data.factions?.[f];
    if(!v||!Number.isFinite(v.gold)||v.gold<0||!Number.isFinite(v.food)||v.food<0||!Array.isArray(v.officers)||v.officers.some(id=>!Object.hasOwn(OFFICERS,id))) throw new Error('세력 저장을 읽을 수 없습니다.');
  }
  for(const c of data.cities) {
    const original=CITIES.find(v=>v.id===c.id);
    if(!original||!Object.hasOwn(FACTIONS,c.owner)||['soldiers','population','reserve','agriculture','commerce','defense','training','morale','weariness'].some(k=>!Number.isFinite(c[k])||c[k]<0)) throw new Error('도시 수치가 올바르지 않습니다.');
    if(['agriculture','commerce','defense','training','morale','weariness'].some(k=>c[k]>100)) throw new Error('도시 범위가 올바르지 않습니다.');
    Object.assign(c,{x:original.x,y:original.y,name:original.name,region:original.region,terrain:original.terrain,neighbors:[...original.neighbors]});
  }
  for(const a of data.armies) if(!data.factions[a.faction]?.officers.includes(a.officer)||!city(data,a.from)||!city(data,a.target)||!['march','return','siege','duel'].includes(a.mode)||!Number.isFinite(a.troops)||a.troops<0||!Number.isFinite(a.progress)||a.progress<0||a.progress>1||!Number.isFinite(a.morale)||!Number.isFinite(a.supply)||!['sx','sy','tx','ty','duration'].every(k=>Number.isFinite(a[k]))||a.duration<=0) throw new Error('행군 저장이 올바르지 않습니다.');
  for(const o of data.plans) if(!Object.hasOwn(TYPES,o.type)||!city(data,o.city)||!data.factions[o.faction]?.officers.includes(o.officer)||!o.quote||!Number.isFinite(o.quote.gold)||o.quote.gold<0||!Number.isFinite(o.quote.food)||o.quote.food<0) throw new Error('명령 저장이 올바르지 않습니다.');
  if(!city(data,data.selected)||!data.story||!Array.isArray(data.pool)||data.pool.some(id=>!Object.hasOwn(OFFICERS,id))) throw new Error('이야기 저장이 올바르지 않습니다.');
  for(const o of data.plans) if(!['march','transfer'].includes(o.type)) {delete o.target;delete o.troops;delete o.stance;}
  data.paused=true;data.effects=[];
  data.events=data.events.slice(0,100);data.monthReport??=[];
  trace('save','campaign.loaded',{phase:data.phase,day:data.day,turn:data.turn,armies:data.armies.length,plans:data.plans.length});
  return data;
}

export function available(s,f=s.player) {
  const reserved=orders(s,f).filter(o=>o.status==='queued').reduce((n,o)=>({gold:n.gold+o.quote.gold,food:n.food+o.quote.food}),{gold:0,food:0});
  return {gold:s.factions[f].gold-reserved.gold,food:s.factions[f].food-reserved.food,reserved};
}
export function freeOfficers(s,f=s.player) {
  const busy=new Set([...orders(s,f).map(o=>o.officer),...s.armies.filter(a=>a.faction===f).map(a=>a.officer)]);
  return s.factions[f].officers.filter(id=>!busy.has(id));
}
function departing(s,id) {return s.plans.filter(o=>o.city===id&&['march','transfer'].includes(o.type)&&o.status==='queued').reduce((n,o)=>n+o.quote.troops,0);}
export const garrison=(s,id)=>Math.max(0,city(s,id).soldiers-departing(s,id));
function distance(a,b) {return Math.hypot(a.x-b.x,a.y-b.y);}
function season(s) {return s.month>=9&&s.month<=11?1.45:s.month===12||s.month<=2?.65:s.month<=5?1:1.15;}
export function income(s,f=s.player) {
  let gold=0,food=0;
  for(const c of owned(s,f)) {
    const trade=1-Math.min(.45,s.armies.filter(a=>a.target===c.id&&a.faction!==f&&a.mode==='siege').length*.18);
    gold+=Math.round(c.population*.0021*(.5+c.commerce/60)*(.45+c.morale/170)*trade*(f==='wei'?1.2:1));
    food+=Math.round(c.population*.010*(.45+c.agriculture/65)*season(s)*(f==='wu'?1.2:1));
  }
  return {gold,food:food-Math.ceil(troops(s,f)*.11)};
}

export function quoteOrder(s,request,f=s.player) {
  const c=city(s,request.city),o=OFFICERS[request.officer];
  if(!c||!o) throw new Error('도시와 담당 장수를 선택하세요.');
  const budget=clamp(Number(request.budget)||400,150,1000),trust=1+(s.trust[request.officer]||0)*.03;
  const q={gold:0,food:0,troops:0,duration:1,gain:0,field:null,notes:[]};
  if(['march','transfer'].includes(request.type)) {
    const dest=city(s,request.target);
    if(!dest) throw new Error('목적지를 선택하세요.');
    q.troops=Math.floor(Number(request.troops)||0);
    q.food=Math.ceil(q.troops*(.12+distance(c,dest)/1800));
    q.duration=clamp(Math.round(distance(c,dest)/(18+o.war/15)*(dest.terrain==='산악'?1.35:1)),3,16);
    q.notes=[`거리 ${Math.round(distance(c,dest))}`,`${o.name} 무력 ${o.war}`,dest.terrain];
  } else if(request.type==='levy') {
    const already=orders(s,f).filter(v=>v.city===c.id&&v.type==='levy').reduce((n,v)=>n+v.quote.troops,0);
    const capacity=Math.max(0,c.reserve-already);
    const factors=(.55+c.morale/120)*(.65+c.population/160000)*(.75+o.war/180)*(1-c.weariness*.006)*trust;
    q.gold=budget;q.troops=Math.min(capacity,round50(budget*3.25*factors));
    q.food=Math.ceil(q.troops*.45);q.gain=-clamp(Math.ceil(q.troops/c.population*180),2,10);
    q.duration=clamp(Math.round(5+q.troops/650-o.war/35+c.weariness/25),3,13);
    q.notes=[`민심 ${c.morale}`,`예비 인력 ${capacity.toLocaleString()}`,`인구 ${c.population.toLocaleString()}`,`${o.name} 무력 ${o.war}`,`피로 ${c.weariness}`];
  } else if(['farm','market','fort'].includes(request.type)) {
    q.field={farm:'agriculture',market:'commerce',fort:'defense'}[request.type];
    const stat=request.type==='fort'?(o.war+o.int)/2:o.int;
    const efficiency=(.55+stat/95)*(.6+c.morale/150)*(1-c[q.field]/145)*trust;
    q.gold=budget;q.gain=Math.min(100-c[q.field],Math.max(1,Math.round(budget/(c.population/2200)*efficiency)));
    q.duration=clamp(Math.round(5+q.gain*.55-stat/30),3,16);
    q.notes=[`${o.name} ${request.type==='fort'?'지휘':'지력'} ${Math.round(stat)}`,`민심 ${c.morale}`,`현재 개발 ${c[q.field]}`,`도시 규모 ${c.population.toLocaleString()}`];
  } else if(request.type==='hire') {
    const recruit=OFFICERS[request.recruit];
    if(!recruit) throw new Error('만날 인재를 선택하세요.');
    q.gold=Math.round((280+(recruit.war+recruit.int)*2.2)*(f==='shu'?.8:1)*(1-(o.int-60)/300));
    q.duration=clamp(Math.round(12-o.int/20),5,10);q.notes=[recruit.name,`교섭 ${o.name} 지력 ${o.int}`];
  } else throw new Error('명령을 선택하세요.');
  return q;
}

export function orderError(s,r,f=s.player) {
  if(s.status!=='playing') return '종료된 천하입니다.';
  if(s.phase!=='planning') return '지금은 실행 중입니다.';
  const c=city(s,r.city);
  if(!c||c.owner!==f) return '아군 도시를 선택하세요.';
  if(orders(s,f).length>=limit(s,f)) return '이번 달 지휘 한도를 채웠습니다.';
  if(!freeOfficers(s,f).includes(r.officer)) return '이미 임무 중인 장수입니다.';
  if(orders(s,f).some(o=>o.city===c.id&&o.type===r.type)) return '이 도시에는 같은 명령을 이미 예약했습니다.';
  if(orders(s,f).filter(o=>o.city===c.id).length>=2) return '한 도시에 최대 두 명령을 배정할 수 있습니다.';
  if(['march','transfer'].includes(r.type)) {
    const to=city(s,r.target);
    if(!to||!c.neighbors.includes(to.id)) return '인접 도시를 고르세요.';
    if(r.type==='march'&&to.owner===f) return '적 도시를 고르세요.';
    if(r.type==='transfer'&&to.owner!==f) return '아군 도시를 고르세요.';
    if(!Object.hasOwn(STANCES,r.stance||'guard')) return '행군 방침을 고르세요.';
    if(!Number.isInteger(Number(r.troops))||Number(r.troops)<500||Number(r.troops)>garrison(s,c.id)-1000) return '최소 500명 출진, 수비병 1,000명을 남겨야 합니다.';
  }
  if(r.type==='hire'&&(!s.pool.includes(r.recruit)||s.plans.some(o=>o.recruit===r.recruit))) return '이미 등용했거나 교섭 중인 인재입니다.';
  let q;try{q=quoteOrder(s,r,f);}catch(e){return e.message;}
  const funds=available(s,f);
  if(q.gold>funds.gold) return '예약 가능 금이 부족합니다.';
  if(q.food>funds.food) return '예약 가능 군량이 부족합니다.';
  if(r.type==='levy'&&q.troops<300) return '민심·피로·예비 인력이 부족해 징집할 수 없습니다.';
  if(q.field&&c[q.field]>=100) return '개발을 완료한 도시입니다.';
  return '';
}
export function addOrder(s,r,f=s.player) {
  const error=orderError(s,r,f);
  if(error){trace('plan','order.rejected',{faction:f,request:r,reason:error},'warn');throw new Error(error);}
  const order={...r,id:`o${++s.serial}`,faction:f,stance:r.stance||'guard',quote:quoteOrder(s,r,f),status:'queued',progress:0};
  if(!['march','transfer'].includes(r.type)) {delete order.target;delete order.troops;delete order.stance;}
  if(r.type!=='hire') delete order.recruit;
  s.plans.push(order);
  trace('plan','order.reserved',{order,available:available(s,f)});
  return order;
}
export function cancelOrder(s,id) {
  if(s.phase!=='planning') throw new Error('실행 중인 명령은 취소할 수 없습니다.');
  const i=s.plans.findIndex(o=>o.id===id&&o.faction===s.player);
  if(i<0) return;
  const [o]=s.plans.splice(i,1);
  trace('plan','order.cancelled',{id,type:o.type,released:o.quote,available:available(s)});
}

function armyPower(s,n,officer,stance='guard',defense=0,training=60,morale=75) {
  const o=OFFICERS[officer]||{war:68,int:68};
  const stat=stance==='feint'?o.int:o.war;
  return n*(.65+stat/160)*(.65+training/150)*(.6+morale/180)*(1+defense/180);
}
export function threat(s,c,f=c.owner) {
  let worst=0;
  for(const id of c.neighbors) {
    const n=city(s,id);
    if(n.owner!==f&&n.owner!=='neutral') worst=Math.max(worst,n.soldiers*.72);
  }
  const inbound=s.armies.filter(a=>a.faction!==f&&a.target===c.id&&a.mode==='march').reduce((n,a)=>n+a.troops,0);
  return Math.max(worst,inbound);
}
export function frontDistance(s,c,f=c.owner) {
  const seen=new Set([c.id]),queue=[[c.id,0]];
  for(let i=0;i<queue.length;i++) {
    const [id,d]=queue[i],v=city(s,id);
    if(v.neighbors.some(n=>city(s,n).owner!==f)) return d;
    for(const n of v.neighbors) if(!seen.has(n)&&city(s,n).owner===f) {seen.add(n);queue.push([n,d+1]);}
  }
  return 99;
}
export function planAI(s,f) {
  if(!owned(s,f).length) return [];
  const chosen=[];
  for(let slot=0;slot<limit(s,f);slot++) {
    const candidates=[];
    const free=freeOfficers(s,f);
    for(const c of owned(s,f)) {
      const danger=threat(s,c),need=Math.max(1500,Math.ceil(danger*.85)),current=garrison(s,c.id);
      const warrior=free.slice().sort((a,b)=>OFFICERS[b].war-OFFICERS[a].war)[0];
      const scholar=free.slice().sort((a,b)=>OFFICERS[b].int-OFFICERS[a].int)[0];
      if(!warrior||!scholar) continue;
      const budget=Math.min(700,Math.max(200,Math.floor(available(s,f).gold*.22/50)*50));
      const consider=(r,score,reason)=>{
        const error=orderError(s,r,f);
        trace('ai','candidate',{faction:f,city:c.id,type:r.type,target:r.target,score:Math.round(score*100)/100,reason,rejected:error||null});
        if(!error&&score>0) candidates.push({request:r,score,reason});
      };
      const deficit=Math.max(0,need-current);
      consider({city:c.id,type:'levy',officer:warrior,budget},danger?35+deficit/80-c.weariness*.5:8,'전선 병력 부족 / 민심·예비 인력 고려');
      consider({city:c.id,type:'fort',officer:scholar,budget},danger?15+(50-c.defense)*.35:0,'접경 성벽 보강');
      for(const id of c.neighbors) {
        const to=city(s,id),surplus=Math.max(0,current-need);
        if(to.owner===f) {
          const nearer=frontDistance(s,to,f)<frontDistance(s,c,f);
          const deficitTo=Math.max(0,threat(s,to)*1.05-garrison(s,to.id));
          const moving=Math.floor(Math.min(surplus,Math.max(deficitTo,current*.6))/100)*100;
          if(nearer||deficitTo>800) consider({city:c.id,type:'transfer',target:id,officer:warrior,troops:moving,stance:'guard'},20+deficitTo/120+(nearer?10:0),'후방 여유 병력을 전선에 수송; 위협 도시 우선');
        } else {
          const reserve=Math.max(1000,Math.ceil(danger*.65));
          const sending=Math.floor((current-reserve)/100)*100;
          const stance=OFFICERS[scholar].int>OFFICERS[warrior].war&&to.defense>40?'feint':'charge';
          const officer=stance==='feint'?scholar:warrior;
          const defend=armyPower(s,to.soldiers,null,'guard',to.defense,to.training,to.morale);
          const attack=armyPower(s,Math.max(0,sending),officer,stance,0,c.training,c.morale);
          const ratio=attack/Math.max(1,defend);
          const isolation=to.neighbors.filter(n=>city(s,n).owner===f).length;
          const affordable=available(s,f).food>Math.max(1500,troops(s,f)*.12);
          const score=ratio>=1.18&&affordable?30+(ratio-1)*16+isolation*3+(to.owner==='neutral'?3:0):0;
          consider({city:c.id,type:'march',target:id,officer,troops:sending,stance},score,`예상 전력비 ${ratio.toFixed(2)}, 잔류 ${reserve}, 군량 ${affordable?'충분':'부족'}`);
        }
      }
      const gain=income(s,f);
      consider({city:c.id,type:'farm',officer:scholar,budget},gain.food<troops(s,f)*.1?33+(65-c.agriculture)*.15:7+(60-c.agriculture)*.12,'군량 수지와 농업 생산성');
      consider({city:c.id,type:'market',officer:scholar,budget},12+(65-c.commerce)*.13,'후방 세입 기반 / 개발 효율');
    }
    candidates.sort((a,b)=>b.score-a.score);
    if(!candidates.length) break;
    const best=candidates[0];
    const order=addOrder(s,best.request,f);order.reason=best.reason;chosen.push(order);
    trace('ai','selected',{faction:f,slot,order:order.id,score:best.score,reason:best.reason});
  }
  return chosen;
}

function event(s,kind,text,data={}) {
  const e={id:++s.serial,day:s.day,turn:s.turn,kind,text,...data};
  s.events.unshift(e);s.events=s.events.slice(0,100);
  if(['hit','capture','work','levy','arrival'].includes(kind)) s.effects.push(e);
  trace('simulation',kind,e);
  return e;
}
export function startExecution(s) {
  if(s.phase!=='planning'||s.status!=='playing') throw new Error('계획 단계에서 실행하세요.');
  // Each AI plans from the same visible world. Candidate scoring never reads player orders.
  for(const f of ['shu','wei','wu']) if(f!==s.player) planAI(s,f);
  s.phase='execution';s.paused=false;s.day=0;s.effects=[];
  for(const a of s.armies) if(a.recall) {returnArmy(s,a);a.recall=false;}
  s.plans.forEach(o=>{
    const f=s.factions[o.faction];
    if(f.gold<o.quote.gold||f.food<o.quote.food) throw new Error('예약 자원이 일치하지 않습니다.');
    f.gold-=o.quote.gold;f.food-=o.quote.food;o.status='active';
  });
  event(s,'phase','양측의 명령이 공개되었습니다. 한 달 동안 함께 움직입니다.');
  trace('phase','execution.start',{turn:s.turn,orders:s.plans,resources:s.factions,armies:s.armies});
}

export function setRecall(s,id) {
  if(s.phase!=='planning') throw new Error('계획 단계에서 철수를 지정하세요.');
  const a=s.armies.find(v=>v.id===id&&v.faction===s.player);
  if(!a) throw new Error('아군 부대를 선택하세요.');
  a.recall=!a.recall;
  trace('plan','army.recall',{id,recall:a.recall,officer:a.officer});
}
function makeArmy(s,o) {
  const c=city(s,o.city),to=city(s,o.target),n=Math.min(o.quote.troops,Math.max(0,c.soldiers-500));
  if(n<300||c.owner!==o.faction) {o.status='failed';event(s,'cancel',`${c.name} 출발 실패. 병력 또는 소유권이 바뀌었습니다.`,{faction:o.faction,city:c.id});return;}
  c.soldiers-=n;
  const a={id:`a${++s.serial}`,faction:o.faction,officer:o.officer,from:c.id,target:to.id,sx:c.x,sy:c.y,tx:to.x,ty:to.y,progress:0,previous:0,mode:'march',troops:n,sent:n,training:c.training,morale:clamp(c.morale,40,100),supply:clamp(75+o.quote.food/Math.max(1,n)*45,70,100),stance:o.stance,duration:o.quote.duration,skillUsed:false,round:0,opponent:null};
  s.armies.push(a);o.status='done';
  event(s,'march',`${OFFICERS[a.officer].name}, ${c.name} → ${to.name} ${n.toLocaleString()}명 출발.`,{faction:a.faction,city:c.id,army:a.id,target:to.id});
}
export function armyPosition(a,previous=false) {
  const p=previous?(a.previous??a.progress):a.progress;
  return {x:a.sx+(a.tx-a.sx)*p,y:a.sy+(a.ty-a.sy)*p};
}
function returnArmy(s,a) {
  const p=armyPosition(a);
  const candidates=owned(s,a.faction).sort((x,y)=>distance(p,x)-distance(p,y));
  const home=city(s,a.from)?.owner===a.faction?city(s,a.from):candidates[0];
  a.opponent=null;
  if(!home) {a.mode='march';return;}
  a.mode='return';a.from=home.id;a.target=home.id;a.sx=p.x;a.sy=p.y;a.tx=home.x;a.ty=home.y;a.progress=0;a.previous=0;
  a.duration=clamp(Math.ceil(distance(p,home)/24),2,15);
  event(s,'retreat',`${OFFICERS[a.officer].name}, ${a.troops.toLocaleString()}명을 이끌고 ${home.name}(으)로 철수.`,{faction:a.faction,army:a.id,city:home.id});
}
function completeWork(s,o) {
  const c=city(s,o.city),q=o.quote;
  if(c.owner!==o.faction) {
    o.status='failed';const refund=Math.round(q.gold*Math.max(0,1-o.progress)*.5);s.factions[o.faction].gold+=refund;
    event(s,'cancel',`${c.name}의 임무가 점령으로 중단되었습니다. 금 ${refund} 반환.`,{city:c.id,faction:o.faction});return;
  }
  if(o.type==='levy') {
    const n=Math.min(q.troops,c.reserve,c.population-10000),old=c.soldiers;
    c.training=Math.round((old*c.training+n*(35+OFFICERS[o.officer].war*.2))/Math.max(1,old+n));
    c.soldiers+=n;c.reserve-=n;c.population-=n;c.morale=clamp(c.morale+q.gain,0,100);c.weariness=clamp(c.weariness+Math.ceil(n/500),0,100);
    event(s,'levy',`${c.name} 징집 완료 · 병력 +${n.toLocaleString()}, 민심 ${q.gain}.`,{city:c.id,faction:o.faction,amount:n,officer:o.officer});
  } else if(o.type==='hire') {
    if(s.pool.includes(o.recruit)) {s.pool.splice(s.pool.indexOf(o.recruit),1);s.factions[o.faction].officers.push(o.recruit);event(s,'hire',`${OFFICERS[o.recruit].name}, ${FACTIONS[o.faction].name}의 뜻에 합류.`,{city:c.id,faction:o.faction,officer:o.recruit});}
    else {s.factions[o.faction].gold+=q.gold;event(s,'cancel','이미 다른 세력에 합류한 인재입니다. 교섭 비용 반환.',{city:c.id,faction:o.faction});}
  } else {
    c[q.field]=clamp(c[q.field]+q.gain,0,100);c.morale=clamp(c.morale+1,0,100);
    c.farm=clamp(Math.ceil(c.agriculture/20),1,5);c.market=clamp(Math.ceil(c.commerce/20),1,5);c.fort=clamp(Math.ceil(c.defense/20),1,5);
    event(s,'work',`${c.name} ${TYPES[o.type]} +${q.gain} · ${OFFICERS[o.officer].name}의 임무 완료.`,{city:c.id,faction:o.faction,amount:q.gain,officer:o.officer});
  }
  o.status='done';
}

function battleDamage(s,a,defender,cover=0,split=1) {
  const persona=PERSONAS[a.officer]||{order:'guard',bonus:0,burst:1,shield:1,rally:0},advantage={charge:'feint',feint:'guard',guard:'charge'};
  const counter=advantage[a.stance]===defender.stance;
  const enemyCounter=advantage[defender.stance]===a.stance;
  const skill=!a.skillUsed&&(a.round>=2||a.morale<50);
  if(skill) {a.skillUsed=true;a.morale=clamp(a.morale+persona.rally,0,100);}
  const strength=armyPower(s,a.troops,a.officer,a.stance,0,a.training,a.morale);
  const armor=1+cover/140;
  const preferred=persona.order===({charge:'charge',feint:'feint',guard:'guard'}[a.stance]);
  const variation=.9+random(s)*.2;
  const attack=Math.round(strength*.105*(counter?1.35:enemyCounter?.8:1)*(preferred?1+persona.bonus:1)*(skill?persona.burst:1)*(a.supply<20?.65:1)*(1+(s.trust[a.officer]||0)*.05)*variation/armor/split);
  trace('combat','damage.calculated',{army:a.id,officer:a.officer,stance:a.stance,troops:a.troops,strength,cover,split,counter,enemyCounter,skill,variation,attack,defender});
  return {damage:Math.max(0,attack),skill,mitigation:skill?persona.shield:a.stance==='guard'?.65:1};
}
function fightCity(s,a) {
  const c=city(s,a.target);
  if(c.owner===a.faction) {c.soldiers+=a.troops;a.troops=0;event(s,'arrival',`${OFFICERS[a.officer].name}의 병력이 ${c.name}에 합류.`,{city:c.id,faction:a.faction});return;}
  const best=s.factions[c.owner]?.officers.slice().sort((x,y)=>OFFICERS[y].war-OFFICERS[x].war)[0]||null;
  const enemies=s.armies.filter(v=>v.target===c.id&&v.mode==='siege'&&v.faction!==c.owner).length;
  const def={id:`g-${c.id}`,officer:best,troops:c.soldiers,stance:c.defense>45?'guard':'charge',training:c.training,morale:c.morale,supply:100,skillUsed:true,round:0};
  a.round++;
  const hit=battleDamage(s,a,def,c.defense+(c.terrain==='산악'?12:0));
  const counter=battleDamage(s,def,a,0,Math.max(1,enemies));
  const taken=Math.min(a.troops,Math.round(counter.damage*hit.mitigation)),dealt=Math.min(c.soldiers,hit.damage);
  a.troops-=taken;c.soldiers-=dealt;a.morale=clamp(a.morale-taken/Math.max(1,a.sent)*65,0,100);a.supply=clamp(a.supply-3,0,100);
  const text=hit.skill?`${OFFICERS[a.officer].name} · ${PERSONAS[a.officer].skill}! 적 −${dealt}, 아군 −${taken}`:`${c.name} 공방 · 적 −${dealt}, ${OFFICERS[a.officer].name} −${taken}`;
  event(s,'hit',text,{city:c.id,army:a.id,faction:a.faction,dealt,taken,skill:hit.skill,quote:hit.skill?characterLine(a.officer,'hero'):null});
  if(c.soldiers<=Math.max(100,a.troops*.025)&&a.troops>200) {
    const oldOwner=c.owner;
    c.owner=a.faction;c.soldiers=a.troops;c.training=Math.round(a.training);c.morale=Math.max(40,c.morale-15);c.defense=Math.max(5,c.defense-12);a.troops=0;
    s.factions[a.faction].gold+=Math.round(c.population*.0025);s.trust[a.officer]=Math.min(3,(s.trust[a.officer]||0)+1);
    if(a.faction===s.player&&!s.story.conquest) s.story.conquest=c.id;
    event(s,'capture',`${OFFICERS[a.officer].name}, ${c.name} 점령.`,{city:c.id,faction:a.faction,previousOwner:oldOwner,officer:a.officer});
  } else if(a.troops<Math.max(250,a.sent*.18)||a.morale<28||a.supply<8) {returnArmy(s,a);}
}
function fightArmies(s,a,b) {
  a.round++;b.round++;
  const hit=battleDamage(s,a,b),counter=battleDamage(s,b,a);
  const lostA=Math.min(a.troops,Math.round(counter.damage*hit.mitigation)),lostB=Math.min(b.troops,Math.round(hit.damage*counter.mitigation));
  a.troops-=lostA;b.troops-=lostB;
  a.morale=clamp(a.morale-lostA/a.sent*70,0,100);b.morale=clamp(b.morale-lostB/b.sent*70,0,100);
  const p=armyPosition(a);
  event(s,'hit',`${OFFICERS[a.officer].name} ↔ ${OFFICERS[b.officer].name} 야전 · −${lostA} / −${lostB}`,{army:a.id,faction:a.faction,x:p.x,y:p.y,dealt:lostB,taken:lostA});
  const brokenA=a.troops<Math.max(200,a.sent*.18)||a.morale<28,brokenB=b.troops<Math.max(200,b.sent*.18)||b.morale<28;
  if(brokenA) returnArmy(s,a); else if(brokenB) {a.mode='march';a.opponent=null;}
  if(brokenB) returnArmy(s,b); else if(brokenA) {b.mode='march';b.opponent=null;}
}

export function tick(s) {
  if(s.phase!=='execution'||s.paused||s.status!=='playing') return;
  s.day++;s.effects=[];
  trace('tick','begin',{turn:s.turn,day:s.day,armies:s.armies.length,pending:s.plans.filter(o=>o.status==='active').length});
  for(const o of s.plans.filter(v=>v.status==='active')) {
    if(['march','transfer'].includes(o.type)) {makeArmy(s,o);continue;}
    o.progress=Math.min(1,s.day/o.quote.duration);
    if(city(s,o.city).owner!==o.faction||o.progress>=1) completeWork(s,o);
  }
  for(const a of s.armies) {
    a.previous=a.progress;
    if(a.mode==='march'||a.mode==='return') {a.progress=Math.min(1,a.progress+1/a.duration);a.supply=clamp(a.supply-.7,0,100);}
  }
  for(let i=0;i<s.armies.length;i++) for(let j=i+1;j<s.armies.length;j++) {
    const a=s.armies[i],b=s.armies[j];
    if(a.faction!==b.faction&&a.mode==='march'&&b.mode==='march'&&a.from===b.target&&a.target===b.from&&a.progress+b.progress>=1) {
      a.mode='duel';b.mode='duel';a.opponent=b.id;b.opponent=a.id;
      const p=armyPosition(a),q=armyPosition(b),x=(p.x+q.x)/2,y=(p.y+q.y)/2;
      for(const v of [a,b]) {v.progress=clamp((Math.abs(v.tx-v.sx)>Math.abs(v.ty-v.sy)?(x-v.sx)/(v.tx-v.sx):(y-v.sy)/(v.ty-v.sy)),0,1);}
      event(s,'intercept',`${OFFICERS[a.officer].name}와 ${OFFICERS[b.officer].name}의 군세가 도중에 조우.`,{army:a.id,faction:a.faction,x,y});
    }
  }
  const fought=new Set();
  for(const a of s.armies) {
    if(a.troops<=0) continue;
    if(a.mode==='duel'&&!fought.has(a.id)&&s.day%2===0) {
      const b=s.armies.find(v=>v.id===a.opponent);
      if(b&&b.troops>0) {fought.add(a.id);fought.add(b.id);fightArmies(s,a,b);}else{a.mode='march';a.opponent=null;}
    } else if((a.mode==='march'||a.mode==='return')&&a.progress>=1) {
      const to=city(s,a.target);
      if(to.owner===a.faction) {to.soldiers+=a.troops;a.troops=0;event(s,'arrival',`${OFFICERS[a.officer].name}의 병력, ${to.name} 도착.`,{city:to.id,faction:a.faction,army:a.id});}
      else if(a.mode==='return') returnArmy(s,a);
      else {a.mode='siege';event(s,'engage',`${OFFICERS[a.officer].name}, ${to.name} 공략 개시.`,{city:to.id,faction:a.faction,army:a.id});}
    } else if(a.mode==='siege'&&s.day%2===0) fightCity(s,a);
  }
  s.armies=s.armies.filter(a=>a.troops>0);
  if(owned(s).length===s.cities.length) s.status='victory';
  else if(!owned(s).length&&!s.armies.some(a=>a.faction===s.player)) s.status='defeat';
  if(s.status!=='playing') {s.paused=true;s.phase='planning';s.summary=s.status==='victory'?'천하가 하나의 깃발 아래 모였습니다.':'남은 거점과 군세가 없습니다.';event(s,'outcome',s.summary);}
  else if(s.day>=30) finishMonth(s);
  trace('tick','end',{turn:s.turn,day:s.day,phase:s.phase,status:s.status,armies:s.armies.map(a=>({id:a.id,mode:a.mode,troops:a.troops,progress:a.progress})),effects:s.effects.length});
}
function finishMonth(s) {
  s.monthReport=[];
  for(const f of ['shu','wei','wu']) {
    const gain=income(s,f),stock=s.factions[f];
    stock.gold+=gain.gold;stock.food+=gain.food;
    if(stock.food<0) {
      const shortages=-stock.food;stock.food=0;
      for(const c of owned(s,f)) c.soldiers=Math.floor(c.soldiers*.9);
      for(const a of s.armies.filter(v=>v.faction===f)) {a.troops=Math.floor(a.troops*.9);a.supply=Math.max(5,a.supply-25);}
      event(s,'supply',`${FACTIONS[f].name} 군량 부족 ${shortages}. 병력 10% 이탈.`,{faction:f});
    }
    if(f===s.player) s.monthReport=[{label:'세금',value:gain.gold},{label:'군량 수지',value:gain.food}];
    trace('economy','monthly',{faction:f,income:gain,stock,troops:troops(s,f)});
  }
  for(const c of s.cities) {c.population+=Math.round(c.population*.003*(c.morale/100));c.reserve+=Math.round(c.population*.007*(c.morale/100));c.morale=clamp(c.morale+2,0,100);c.weariness=clamp(c.weariness-6,0,100);}
  s.plans=[];s.phase='planning';s.paused=true;s.turn++;s.day=0;
  if(++s.month>12){s.month=1;s.year++;}
  if(!s.story.pending) {
    if(s.story.branch&&s.turn>=s.story.due&&!s.story.done.includes('echo')) s.story.pending='echo';
    else if(s.story.conquest&&!s.story.done.includes('conquest')) s.story.pending='conquest';
  }
  s.summary=`${s.year}년 ${s.month}월 · 명령을 다시 배정하세요. ${s.armies.length?`전장에 ${s.armies.length}개 부대가 남아 있습니다.`:''}`;
  event(s,'phase',s.summary);
  trace('phase','planning.start',{turn:s.turn,month:s.month,report:s.monthReport,armies:s.armies.length});
}
export function decideStory(s,index) {
  if(s.phase!=='planning') throw new Error('계획 중에만 이야기를 선택할 수 있습니다.');
  const choice=storyFor(s)?.choices[index];
  if(!choice) throw new Error('선택할 수 없는 이야기입니다.');
  const budget=available(s);
  if(budget.gold+(choice.effect.gold||0)<0||budget.food+(choice.effect.food||0)<0) throw new Error('예약 자원을 제외하면 결단에 필요한 자원이 부족합니다.');
  const before=new Map(s.cities.map(c=>[c.id,{farm:c.farm,market:c.market,fort:c.fort}]));
  const result=chooseStory(s,index);
  for(const c of s.cities) {const old=before.get(c.id);c.agriculture=clamp(c.agriculture+(c.farm-old.farm)*17,0,100);c.commerce=clamp(c.commerce+(c.market-old.market)*17,0,100);c.defense=clamp(c.defense+(c.fort-old.fort)*17,0,100);}
  event(s,'story',`${result.chapter} · ${result.title}`,{faction:s.player,officer:result.hero,quote:result.line});
  trace('story','choice',{index,result});
  return result;
}
