import {city,index,FACTIONS,TERRAINS,geographyForWorld,stationedTroops} from './world.js';
import {sampleField,terrainAt} from './terrain.js';
import {PriorityQueue} from './priority-queue.js';
import {hasKingdoms,knownOwner,mayInvade} from './kingdom-rules.js';
import {knownGarrison} from './kingdom-knowledge.js';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const pair=(a,b)=>[a,b].sort().join(':');
export const militaryPact=(s,a,b)=>s.pacts.some(p=>p.key===pair(a,b)&&p.until>s.elapsed);
export function neighborAggression(s,f,enemy){
 if(enemy==='neutral'||enemy===f||militaryPact(s,f,enemy))return 0;
 const stock=hasKingdoms(s)?null:s.factions[enemy],base=stock?.aggression??FACTIONS[enemy]?.temper??.5;
 const policy=stock?.doctrine==='expand'?.9:stock?.doctrine==='defend'?.2:.5;
 return clamp(base*.7+policy*.3+((s.hostilities[pair(f,enemy)]||0)>s.elapsed?.2:0));
}

const terrainCache=new WeakMap();
// Static travel cost follows the same quadratic road which the renderer animates.
export function militaryTerrain(s,a,b){
 if(a.id>b.id)[a,b]=[b,a];
 let cache=terrainCache.get(s);if(!cache){cache=new Map();terrainCache.set(s,cache);}
 const key=pair(a.id,b.id);if(cache.has(key))return cache.get(key);
 const g=geographyForWorld(s),scale=s.frontier?1:s.worldScale||1,bend=a.roads?.[b.id]||b.roads?.[a.id]||{x:(a.x+b.x)/2,y:(a.y+b.y)/2};
 const count=clamp(Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/scale/30),8,24);
 const fallback=c=>c.elevation??(c.terrain==='산악'?.7:c.terrain==='구릉'?.4:.15);
 let length=0,cost=0,cover=0,forest=0,mountain=0,px=a.x,py=a.y,ph=g?sampleField(g,'elevation',px,py):fallback(a);
 for(let i=1;i<=count;i++){
  const t=i/count,u=1-t,x=u*u*a.x+2*u*t*bend.x+t*t*b.x,y=u*u*a.y+2*u*t*bend.y+t*t*b.y,step=Math.hypot(x-px,y-py)/scale;
  const h=g?sampleField(g,'elevation',x,y):fallback(a)*u+fallback(b)*t;
  const f=g?sampleField(g,'forest',x,y):(a.terrain==='숲'?u:0)+(b.terrain==='숲'?t:0);
  const kind=g?terrainAt(g,x,y):t<.5?a.terrain:b.terrain,water=kind==='수변'?.2:0;
  const rugged=Math.max(0,(h-.3)/.35),factor=1+Math.min(8,rugged*rugged*3)+f*.45+water;
  length+=step;cost+=step*factor+Math.abs(h-ph)*350;cover+=step*TERRAINS[kind].cover;forest+=step*f;mountain+=step*(h>.51?1:0);px=x;py=y;ph=h;
 }
 const result={length,cost,cover:cover/Math.max(1,length),forest:forest/Math.max(1,length),mountain:mountain/Math.max(1,length)};
 cache.set(key,result);return result;
}
export const militaryDays=(s,a,b,commander)=>clamp(Math.ceil(militaryTerrain(s,a,b).cost/(28+(commander?.war??65)/9)),4,60);

// Nearest-border distance and strongest attenuated border threat are separate fields.
export function militaryFrontier(s,f){
 const mine=s.cities.filter(c=>c.owner===f),nearest=new Map(),pressure=new Map(),byId=index(s).cities,distances=new PriorityQueue(),threats=new PriorityQueue();
 for(const c of mine){
  const adjacent=[...new Set([...(c.edges||[]),...c.neighbors])].map(id=>byId.get(id)).filter(n=>n&&knownOwner(s,f,n)&&knownOwner(s,f,n)!==f&&knownOwner(s,f,n)!=='neutral');
  if(!adjacent.length)continue;
  nearest.set(c.id,{cost:0,hops:0});distances.push(c.id,0);
  const enemies=adjacent.map(n=>({enemy:knownOwner(s,f,n),aggression:neighborAggression(s,f,knownOwner(s,f,n)),troops:knownGarrison(s,f,n)})).sort((a,b)=>b.aggression-a.aggression||a.enemy.localeCompare(b.enemy));
  if(enemies[0].aggression>0){const root={...enemies[0],cost:-600*Math.log(enemies[0].aggression)};pressure.set(c.id,root);threats.push(c.id,root.cost);}
 }
 while(distances.length){const {id,cost}=distances.pop(),old=nearest.get(id);if(old.cost!==cost)continue;const c=byId.get(id);for(const next of c.neighbors){const n=byId.get(next);if(n.owner!==f)continue;const value=cost+militaryTerrain(s,c,n).cost;if(value<(nearest.get(next)?.cost??Infinity)){nearest.set(next,{cost:value,hops:old.hops+1});distances.push(next,value);}}}
 while(threats.length){const {id,cost}=threats.pop(),old=pressure.get(id);if(old.cost!==cost)continue;const c=byId.get(id);for(const next of c.neighbors){const n=byId.get(next);if(n.owner!==f)continue;const value=cost+militaryTerrain(s,c,n).cost;if(value<(pressure.get(next)?.cost??Infinity)){pressure.set(next,{...old,cost:value});threats.push(next,value);}}}
 return {nearest,pressure};
}
export function frontierAt(frontier,id,commander){
 const near=frontier.nearest.get(id),threat=frontier.pressure.get(id);
 return {borderDistanceDays:near?near.cost/(28+(commander?.war??65)/9):null,borderHops:near?.hops??null,neighborAggression:threat?.aggression??0,borderPressure:threat?Math.exp(-threat.cost/600):0,threateningNeighbor:threat?.enemy??null};
}

export function militaryStep(s,a,b,{faction,action='advance',army,frontier,stationed}={}){
 const terrain=militaryTerrain(s,a,b),threat=frontier?.pressure.get(b.id),owner=knownOwner(s,faction,b),pressure=threat?Math.exp(-threat.cost/600):owner!==faction?neighborAggression(s,faction,owner):0;
 const riskWeight={support:.5,attack:1,advance:2,defend:3,gather:3,recover:5,withdraw:6}[action]??2;
 const enemy=owner!==faction?(hasKingdoms(s)?knownGarrison(s,faction,b):stationed?b.soldiers+(stationed.get(b.id)||0):stationedTroops(s,b)):0,opposition=clamp(Math.max(enemy,threat?.troops||0)/Math.max(1000,army?.troops??4000),.25,2);
 const exposure=terrain.length*pressure*riskWeight*opposition,coverSavings=exposure*(1-1/(1+terrain.cover/150));
 const combat=enemy*(action==='withdraw'||action==='recover'?.12:.04);
 return {cost:terrain.cost+exposure-coverSavings+combat,terrainCost:terrain.cost,exposureCost:exposure-coverSavings,coverSavings,cover:terrain.cover};
}
export function findMilitaryRoute(s,start,target,options={}){
 if(start.id===target.id)return [];
 const {faction,hostile=false}=options,costs=new Map([[start.id,0]]),parents=new Map(),queue=new PriorityQueue(),byId=index(s).cities;queue.push(start.id,0);
 const stationed=new Map();for(const a of s.armies)if(a.mode==='stationed'&&byId.get(a.target)?.owner===a.faction)stationed.set(a.target,(stationed.get(a.target)||0)+a.troops);
 const stepOptions={...options,stationed};
 while(queue.length){const {id,cost}=queue.pop();if(cost!==costs.get(id))continue;if(id===target.id)break;const c=byId.get(id);
  for(const next of c.neighbors){const n=byId.get(next),owner=knownOwner(s,faction,n),escaping=hasKingdoms(s)&&options.action==='withdraw';if(owner!==faction&&(!hostile||!escaping&&!mayInvade(s,faction,owner)))continue;
   const value=cost+militaryStep(s,c,n,stepOptions).cost;if(value<(costs.get(next)??Infinity)){costs.set(next,value);parents.set(next,id);queue.push(next,value);}
  }
 }
 if(!parents.has(target.id))return null;const path=[];for(let id=target.id;id!==start.id;id=parents.get(id))path.unshift(id);return path;
}
export function militaryRouteSummary(s,start,path,options){
 const result={days:0,cost:0,terrainCost:0,exposureCost:0,coverSavings:0};let previous=start;
 for(const id of path){const next=city(s,id),step=militaryStep(s,previous,next,options);result.days+=militaryDays(s,previous,next,s.officers[options.army?.officer]);for(const key of ['cost','terrainCost','exposureCost','coverSavings'])result[key]+=step[key];previous=next;}
 return result;
}
