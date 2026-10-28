import {city,officer} from './world.js';
import {forecast,foodStock} from './realtime.js';
import {GENERAL_ACTIONS} from './general-ai.js';
import {canSeeArmy,canSeeRegion} from './fog-of-war.js';

// This is an inspection of live state, not a second source of military orders.
export function inspectNode(s,id){
 if(!canSeeRegion(s,id))throw new Error('정찰 시야 밖의 군사 정보는 확인할 수 없습니다.');
 const c=city(s,id),observed=s.armies.filter(a=>canSeeArmy(s,a)),here=observed.filter(a=>a.target===id&&['stationed','siege','field'].includes(a.mode));
 const incoming=observed.filter(a=>a.troops>0&&a.target===id&&['march','return','duel'].includes(a.mode));
 const outgoing=observed.filter(a=>a.troops>0&&a.from===id&&a.target!==id&&['march','duel'].includes(a.mode));
 const hostile=here.filter(a=>a.faction!==c.owner),approaching=incoming.filter(a=>a.faction!==c.owner),stationed=here.filter(a=>a.mode==='stationed');
 let status={icon:'defend',label:'지역 수비',detail:'현재 위치를 지키며 다음 군사 판단을 기다립니다.',level:'normal'};
 if(hostile.length)status={icon:'attack',label:'교전 중',detail:`${hostile.length}개 공격 부대와 현장에서 싸우고 있습니다.`,level:'danger'};
 else if(approaching.length)status={icon:'watch',label:'접근 부대 경계',detail:`다른 왕국의 ${approaching.length}개 부대가 이곳으로 이동 중입니다.`,level:'warning'};
 else if(stationed.length)status={icon:'defend',label:`${stationed.length}개 부대 주둔`,detail:stationed.map(a=>`${officer(s,a.officer).name}: ${a.reason}`).join(' · '),level:'normal'};
 else if(c.soldiers<.5)status={icon:'empty',label:'주둔 병력 없음',detail:incoming.length?'이동 부대의 도착을 기다리는 위치입니다.':'현재 이곳에 머무는 수비 병력은 없습니다.',level:'normal'};
 else{
  const food=forecast(s,c.owner).food,available=foodStock(s,c.owner,c.id),short=available<1000||food<0&&available/-food<35;
  if(short)status={icon:'food',label:'식량 확보 대기',detail:'장거리 이동보다 수비와 식량 회복을 우선하고 있습니다.',level:'warning'};
  else if(c.major&&c.soldiers<=1200)status={icon:'defend',label:'거점 수비',detail:'거점 방어를 위한 기본 병력을 남겨 두고 있습니다.',level:'normal'};
  else status={icon:'gather',label:'지휘관 합류 대기',detail:'현지에 도착한 지휘관의 부대에 편성할 병력입니다.',level:'normal'};
 }
 const present=[];
 if(c.soldiers>=.5)present.push({id:`garrison:${id}`,type:'garrison',faction:c.owner,title:c.major?'거점 예비병':'합류 대기 병력',troops:c.soldiers,state:status.label,icon:status.icon,reason:status.detail,detail:`훈련 ${Math.round(c.training)}/100`});
 for(const a of here)present.push({id:a.id,army:a.id,type:'army',faction:a.faction,title:`${officer(s,a.officer).name} 부대`,troops:a.troops,icon:a.mode==='stationed'?a.order?.action||'gather':a.faction===c.owner?'support':'attack',state:a.mode==='stationed'?GENERAL_ACTIONS[a.order?.action]||'임무 검토':a.faction===c.owner?'합류 중':a.mode==='siege'?'거점 공격 중':'야외 교전 중',detail:`보급 ${Math.round(a.supply)}% · 사기 ${Math.round(a.morale)}`,reason:a.reason});
 const movement=[...incoming.map(a=>({a,direction:'incoming'})),...outgoing.map(a=>({a,direction:'outgoing'}))].map(({a,direction})=>({id:a.id,army:a.id,type:'army',faction:a.faction,title:`${officer(s,a.officer).name} 부대`,troops:a.troops,icon:a.mode==='duel'?'attack':a.mode==='return'?'withdraw':direction,state:a.mode==='duel'?'경로에서 교전 중':direction==='outgoing'?'이곳에서 출발':a.mode==='return'?'철수 후 복귀 중':'이곳으로 접근 중',days:a.mode==='duel'?null:Math.max(0,Math.ceil(a.duration*(1-a.progress)-1e-8)),detail:a.mode==='return'?'퇴로를 따라 복귀합니다.':direction==='outgoing'?`${city(s,a.target).name}(으)로 이동`:`${city(s,a.from).name}에서 이동`,reason:a.reason}));
 movement.sort((a,b)=>(a.days??Infinity)-(b.days??Infinity)||a.id.localeCompare(b.id));
 const kinds=new Set(['arrival','capture','march','retreat','engage','hit','defeat']);
 const history=s.events.filter(e=>kinds.has(e.kind)&&(e.city===id||e.target===id)&&(e.faction===s.player||!e.city||canSeeRegion(s,e.city))).slice(0,12).map(e=>({id:e.id,text:e.text,ago:Math.max(0,s.elapsed-e.at),faction:e.faction}));
 return {city:c,status,present,movement,history};
}
