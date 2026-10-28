import {newEconomicCampaign,expandCampaign,loadCampaign,serializeCampaign,tick,startProject,cancelProject,setPolicy,setDoctrine} from './realtime.js';
import {startGathering,recallParty} from './work-parties.js';
import {setResourcePolicy} from './resource-policy.js';
import {terrainForSeed} from './terrain.js';
import {updateVisibility} from './fog-of-war.js';
import {diagnostics} from './logger.js';
import {riverGeometry} from './map-rivers.js';
import {setKingdomPolicy} from './kingdom-ai.js';
import {proposeOffer,respondOffer,declareWar,withdrawWar} from './diplomacy.js';

const fields=['owner','population','reserve','agriculture','commerce','defense','morale','training','weariness','soldiers','administration','policy'];
export const CITY_STATE_FIELDS=fields;

// One owner executes commands, movement, economy and AI in the original tick order.
export function createCampaignRuntime(){
 let s=null,previous=new Map(),count=0,logCursor=0;
 function snapshot(result,save,reset=false){
  const added=[],changed=[],topology=[];
  for(const c of s.cities){const row=fields.map(k=>c[k]),old=previous.get(c.id);
   if(!old)added.push(c);else if(row.some((v,i)=>v!==old[i]))changed.push([c.id,...row]);
   if(!reset&&count!==s.cities.length&&old)topology.push({id:c.id,poly:c.poly,edges:c.edges,neighbors:c.neighbors,roads:c.roads});
   previous.set(c.id,row);
  }
  count=s.cities.length;const {cities,...state}=s,logs=diagnostics().filter(e=>e.seq>logCursor);logCursor=logs.at(-1)?.seq||logCursor;
  return {state,added,changed,topology,reset,result,logs,raw:save?serializeCampaign(s):null};
 }
 return {handle(type,args={}){
  if(type==='terrain'){const g=terrainForSeed(args.seed,{version:args.version});return {...g,riverBounds:riverGeometry(g).map(({left,right,top,bottom})=>({left,right,top,bottom}))};}
  let result;
  if(type==='new'||type==='load'){
   if(type==='load'){const loaded=loadCampaign(args.raw);s=loaded.mapSize?loaded:expandCampaign(loaded);}
   else s=newEconomicCampaign(args.player,args.seed,{worldScale:10,mapSize:args.mapSize});
   previous=new Map();count=0;updateVisibility(s);return snapshot(null,true,true);
  }
  if(!s)throw new Error('세계를 먼저 불러오세요.');
  if(args.selected&&s.cities.some(c=>c.id===args.selected&&c.major))s.selected=args.selected;
  switch(type){
   case 'tick':tick(s);break;
   case 'pause':s.paused=!!args.paused;break;
   case 'project':result=startProject(s,args.request);break;
   case 'cancel':result=cancelProject(s,args.id);break;
   case 'policy':setPolicy(s,args.city,args.policy);break;
   case 'doctrine':setDoctrine(s,args.doctrine);break;
   case 'gather':result=startGathering(s,args.hub,args.site,{repeat:args.repeat});break;
   case 'recall':recallParty(s,args.id);break;
   case 'resource-policy':setResourcePolicy(s,args.hub,args.policy);break;
   case 'kingdom-policy':setKingdomPolicy(s,args.policy,args.priority);break;
   case 'diplomacy-offer':result=proposeOffer(s,args);break;
   case 'diplomacy-response':result=respondOffer(s,args.id,args.accept);break;
   case 'declare-war':result=declareWar(s,args.target);break;
   case 'withdraw-war':withdrawWar(s,args.other);break;
   default:throw new Error('지원하지 않는 게임 명령입니다.');
  }
  if(type!=='tick')updateVisibility(s);return snapshot(result,type!=='tick'||s.elapsed%5===0);
 }};
}
