import {trace} from './logger.js';

export const COMMAND_MAX=9;
export const COMMAND_RECOVERY_DAYS=1;
export const COMMAND_RECOVERY_AMOUNT=3;
export const COMMAND_COSTS={farm:2,market:2,fort:2,relief:2,levy:2,hire:3,policy:1,doctrine:1,gather:1,economy:1};

export function initializeCommandPoints(s){
 if(s.commandRules!==undefined)return;
 s.commandRules=1;s.commandPoints=Object.fromEntries(Object.keys(s.factions).map(id=>[id,{points:COMMAND_MAX,progress:0}]));
}

export function commandStatus(s,faction=s.player){
 if(s.commandRules!==1)return null;
 const p=s.commandPoints[faction];
 return {points:p.points,max:COMMAND_MAX,recoveryIn:p.points===COMMAND_MAX?null:COMMAND_RECOVERY_DAYS};
}

export function projectCommandCost(s,request){return s.commandRules===1&&!(request.automatic&&request.type==='levy')?(COMMAND_COSTS[request.type]||0):0;}

export function commandError(s,cost,faction=s.player){
 const status=commandStatus(s,faction);if(!status||cost===0||status.points>=cost)return '';
 return `행동력이 부족합니다. 필요 ${cost} · 현재 ${status.points}/${status.max} · ${status.recoveryIn}일 뒤 ${COMMAND_RECOVERY_AMOUNT} 회복`;
}

export function spendCommandPoints(s,cost,action,faction=s.player){
 if(s.commandRules!==1||cost===0)return;
 if(!Number.isInteger(cost)||cost<0)throw new Error('행동력 비용이 올바르지 않습니다.');
 const error=commandError(s,cost,faction);if(error)throw new Error(error);
 const p=s.commandPoints[faction];p.points-=cost;
 trace('command','spent',{faction,action,cost,points:p.points,elapsed:s.elapsed});
}

export function advanceCommandPoints(s){
 if(s.commandRules!==1)return;
 for(const p of Object.values(s.commandPoints)){
  p.points=Math.min(COMMAND_MAX,p.points+COMMAND_RECOVERY_AMOUNT);p.progress=0;
 }
}

export function validateCommandPoints(s){
 if(s.commandRules!==1||!s.commandPoints||Array.isArray(s.commandPoints)||Object.keys(s.commandPoints).length!==Object.keys(s.factions).length)throw new Error('행동력 저장을 읽을 수 없습니다.');
 for(const id of Object.keys(s.factions)){
  const p=s.commandPoints[id];
  // Accept saved progress from the previous five-day rule; daily recovery ignores it.
  if(!p||!Number.isInteger(p.points)||p.points<0||p.points>COMMAND_MAX||!Number.isInteger(p.progress)||p.progress<0||p.progress>=5||p.points===COMMAND_MAX&&p.progress!==0)throw new Error('행동력 저장을 읽을 수 없습니다.');
 }
}
