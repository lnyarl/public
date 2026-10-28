export const GENERAL_ACTIONS={advance:'목표로 진군',attack:'공격',support:'아군 지원',gather:'집결 대기',defend:'수비',recover:'병력·보급 회복',withdraw:'철수'};
const clamp=n=>Math.max(0,Math.min(1,n));

// Personality is independent of combat ability and stays fixed across saves.
export function generalTraits(seed,id){
 let value=(seed^2166136261)>>>0;for(const ch of id)value=Math.imul(value^ch.charCodeAt(0),16777619)>>>0;
 const next=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return Math.round((.15+value/4294967296*.7)*100)/100;};
 return {aggression:next(),caution:next(),cooperation:next()};
}

// Every general uses this evaluator. Candidates carry an action AND a target.
export function evaluateGeneral(context,traits){
 const {aggression,caution,cooperation}=traits,{troops,supply,morale,policy,food,options,current}=context;
 const readiness=clamp(troops/Math.max(1,context.desiredTroops)),border=clamp(context.borderPressure||0),rows=[];
 for(const option of options){
  const row={...option,rank:option.emergency?2:0,score:0,valid:option.valid!==false};
  const urgency=clamp(option.urgency||0),travel=clamp((option.days||0)/40),ratio=clamp((option.ratio||0)/3);
  if(option.foodCost>food){row.valid=false;row.reason=' 이동에 필요한 식량 부족';}
  if(['advance','attack'].includes(option.action)){
   const threshold=policy.threshold+(caution-.5)*.35+(option.cover||0)/250;
   if(troops<500||supply<35||morale<35||context.foodDays<35||option.ratio<threshold){row.valid=false;row.reason='전력·사기·보급 여유 부족';}
  }
  if(row.valid)switch(option.action){
   case 'advance':row.score=(.28+aggression*.25+readiness*.15+ratio*.08-travel*.12-border*caution*.12)*(policy.mode==='expand'?1.15:policy.mode==='defend'?.6:1);break;
   case 'attack':row.score=(.35+aggression*.25+ratio*.18+(option.objective?.12:0))*(policy.mode==='defend'?.75:1);break;
   case 'support':row.score=.22+cooperation*.28+urgency*.3-travel*.12+border*cooperation*.08;break;
   case 'gather':row.score=.18+caution*.18+urgency*.2+(option.incoming?.15:0);break;
   case 'defend':row.score=.08+urgency*.42+cooperation*.08+border*(.08+caution*.12)+(policy.mode==='defend'&&urgency>0?.15:0);break;
   case 'recover':row.score=.12+(1-supply/100)*(.35+caution*.15)+(1-readiness)*.25+clamp((65-morale)/65)*.2-travel*.1;break;
   case 'withdraw':row.score=option.emergency?1:.2+urgency*.25+caution*.15;break;
  }
  // A small preference for continuing a valid task; it never revives an invalid one.
  if(row.valid&&current?.action===row.action&&current.target===row.target)row.score+=.06;
  row.score=Math.round(Math.max(0,row.score)*10000)/10000;rows.push(row);
 }
 rows.sort((a,b)=>Number(b.valid)-Number(a.valid)||b.rank-a.rank||b.score-a.score||a.action.localeCompare(b.action)||a.target.localeCompare(b.target));
 return {chosen:rows.find(r=>r.valid&&r.score>0)||null,candidates:rows};
}
