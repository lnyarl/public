import {city,routeCost,strongholds} from './world.js';
import {PriorityQueue} from './priority-queue.js';
import {SITE_RULES} from './economy-rules.js';

export function civilPath(s,from,to,faction,escape=false){
 if(!city(s,from)||!city(s,to)||!escape&&city(s,from).owner!==faction||city(s,to).owner!==faction)return null;
 if(from===to)return [];
 const costs=new Map([[from,0]]),parents=new Map(),queue=new PriorityQueue();queue.push(from,0);
 while(queue.length){const {id,cost}=queue.pop();if(cost!==costs.get(id))continue;if(id===to)break;
  const at=city(s,id);for(const next of at.neighbors){const c=city(s,next);if(c.owner!==faction)continue;const value=cost+routeCost(at,c);if(value<(costs.get(next)??Infinity)){costs.set(next,value);parents.set(next,id);queue.push(next,value);}}
 }
 if(!parents.has(to))return null;
 const path=[];for(let id=to;id!==from;id=parents.get(id))path.unshift(id);return path;
}

export function makeResourceSites(s){
 let seed=(s.worldSeed^0x713ce0a5)>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const lands=s.cities.filter(c=>!c.major),sites=[],used=new Set();
 const add=(c,kind)=>{used.add(c.id);const rule=SITE_RULES[kind];sites.push({id:`site-${kind}-${c.id}`,region:c.id,kind,richness:.7+random()*.7,stock:rule.max,stockMax:rule.max,regen:rule.regen});};
 const woods=lands.filter(c=>c.terrain==='숲'||c.forestDensity>.2);
 // A separate random stream keeps new resources from changing terrain or combat.
 for(const hub of strongholds(s).filter(c=>c.capitalOf)){
  const options=woods.filter(c=>c.owner===hub.owner&&!used.has(c.id)).map(c=>({c,path:civilPath(s,hub.id,c.id,hub.owner)})).filter(v=>v.path!==null);
  options.sort((a,b)=>a.path.length-b.path.length||a.c.id.localeCompare(b.c.id));if(options.length)add(options[0].c,'timber');
 }
 for(const [kind,candidates,count] of [['timber',woods,48],['food',lands.filter(c=>['평야','수변'].includes(c.terrain)),24]]){
  const ranked=candidates.filter(c=>!used.has(c.id)).map(c=>({c,rank:random()})).sort((a,b)=>a.rank-b.rank);
  for(const {c} of ranked){if(sites.filter(v=>v.kind===kind).length>=count)break;add(c,kind);}
 }
 return sites;
}
