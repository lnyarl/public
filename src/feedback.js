import {city} from './world.js';
import {hasEconomy,foodStock} from './economy.js';
import {canSeeArmy} from './fog-of-war.js';

// Presentation reads the simulation; it never changes orders, clocks, or saves.
export function collectThreats(s){
 const groups=new Map();
 for(const a of s.armies){
  const c=city(s,a.target);
  if(a.faction===s.player||c?.owner!==s.player||!['march','siege','field'].includes(a.mode)||a.troops<=0||!canSeeArmy(s,a))continue;
  const key=`invasion:${c.id}`,engaged=a.mode!=='march';
  const t=groups.get(key)||{id:key,type:'invasion',city:c.id,x:c.x,y:c.y,troops:0,armies:[],level:'warning',label:'적군 접근',priority:80};
  t.troops+=a.troops;t.armies.push(a.id);
  if(engaged){t.level='danger';t.label=c.major?'거점 교전 중':'영토 교전 중';t.priority=100;}
  groups.set(key,t);
 }
 if(hasEconomy(s)){
  for(const [id,h] of Object.entries(s.economy.hubs)){if(city(s,id).owner!==s.player)continue;const loss=Math.min(0,h.lastFlow.food),empty=h.stock.food<=0;if(empty||loss<0&&h.stock.food/-loss<=10)groups.set(`food:${id}`,{id:`food:${id}`,type:'food',city:id,resource:'food',level:empty?'danger':'warning',label:empty?`${city(s,id).name} 식량 고갈`:`${city(s,id).name} 식량 약 ${Math.ceil(h.stock.food/-loss)}일분`,priority:empty?95:70});}
 }else{const food=foodStock(s),loss=Math.min(0,s.ledger?.food||0);if(food<=0||loss<0&&food/-loss<=10){const empty=food<=0;groups.set('food',{id:'food',type:'food',resource:'food',level:empty?'danger':'warning',label:empty?'식량 고갈 · 병력 이탈':`식량 약 ${Math.ceil(food/-loss)}일분`,priority:empty?95:70});}}
 return [...groups.values()].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
}

export function eventFeedback(s,e){
 const own=e.faction===s.player,affected=e.other===s.player||city(s,e.city)?.owner===s.player;
 const base={id:`event:${e.id}`,city:e.city,x:e.x,y:e.y,tone:'gold',priority:20};
 if(e.kind==='capture'){
  if(e.other===s.player)return {...base,kind:'loss',tone:'danger',priority:110,label:e.stronghold?'거점 함락':'영토 상실',sound:'loss'};
  if(own)return {...base,kind:'capture',label:e.stronghold?'거점 점령':'영토 확보',sound:'success',priority:60};
 }
 if(!own&&!affected&&e.kind!=='outcome')return null;
 switch(e.kind){
  case 'march':return own?{...base,city:e.target,from:e.city,kind:'march',label:'아군 출진',sound:'march'}:null;
  case 'engage':case 'intercept':return {...base,kind:'battle',tone:affected?'danger':'bronze',label:affected?'아군 교전':'전투 개시',sound:'battle',priority:85};
  case 'hit':return {...base,kind:'hit',tone:affected?'danger':'bronze',label:`아군 −${Math.round(own?e.taken:e.dealt).toLocaleString('ko-KR')}`,sound:'battle',priority:50};
  case 'defeat':return own?{...base,kind:'loss',tone:'danger',label:'아군 부대 전멸',sound:'loss',priority:105}:null;
  case 'retreat':return own?{...base,kind:'retreat',tone:'warning',label:'아군 철수',sound:'warning',priority:75}:null;
  case 'work':return own?{...base,kind:'complete',label:'사업 완료',sound:'complete',priority:40}:null;
  case 'hire':return own?{...base,kind:'complete',label:'지휘관 합류',sound:'success',priority:45}:null;
  case 'arrival':return own?{...base,kind:'arrival',tone:'bronze',label:'지원군 도착',sound:'march',priority:25}:null;
  case 'trade':return {...base,kind:'trade',tone:'bronze',label:'식량 교역',sound:'trade',priority:30};
  case 'outcome':return {...base,city:s.selected,kind:'outcome',tone:s.status==='victory'?'gold':'danger',label:s.status==='victory'?'왕국 통일':'왕국의 마지막 날',sound:s.status==='victory'?'success':'loss',priority:120};
  default:return null;
 }
}

export function createFeedback(state){
 let cursor=Math.max(0,...state.events.map(e=>Number(e.id)||0)),previous=new Map(collectThreats(state).map(t=>[t.id,t.level]));
 return {update(s){
  const effects=s.events.filter(e=>e.id>cursor).map(e=>eventFeedback(s,e)).filter(Boolean);
  cursor=Math.max(cursor,...s.events.map(e=>Number(e.id)||0));
  const threats=collectThreats(s);
  for(const t of threats)if(previous.get(t.id)!==t.level)effects.push({...t,id:`threat:${t.id}:${t.level}`,kind:'warning',tone:t.level,sound:t.level==='danger'?'danger':'warning'});
  previous=new Map(threats.map(t=>[t.id,t.level]));
  effects.sort((a,b)=>b.priority-a.priority);
  return {threats,effects:effects.slice(0,12),sound:effects.find(e=>e.sound)?.sound};
 }};
}
