import {city,regionAt} from './world.js';
import {ensureFrontierVision} from './frontier-world.js';

const cache=new WeakMap();
export function visibilityFor(s){
 let key=`${s.revision}:${s.elapsed}:${s.player}:${s.fogRules||0}`;
 const old=cache.get(s);if(old?.key===key)return old;
 const visible=new Set(),detailed=new Set(),reveal=c=>{if(!c)return;visible.add(c.id);for(const id of c.edges||c.neighbors)if(id)visible.add(id);};
 if(!s.fogRules)for(const c of s.cities)visible.add(c.id);
 else{
  // Reveal one geographic ring, rather than entire neighbouring kingdoms.
  for(const c of s.cities)if(c.owner===s.player){reveal(c);detailed.add(c.id);}
  for(const a of s.armies)if(a.faction===s.player){
   const p=a.progress,u=1-p,x=a.bend?u*u*a.sx+2*u*p*a.bend.x+p*p*a.tx:a.sx+(a.tx-a.sx)*p,y=a.bend?u*u*a.sy+2*u*p*a.bend.y+p*p*a.ty:a.sy+(a.ty-a.sy)*p;
   const at=regionAt(s,x,y);reveal(at);if(at){detailed.add(at.id);for(const id of at.edges||at.neighbors)if(id)detailed.add(id);}
  }
 }
 // Border scouts provide a terrain horizon beyond the range of live intelligence.
 const nearby=new Set(visible);let ring=new Set(visible);
 for(let step=0;step<2;step++){const next=new Set();for(const id of ring)for(const neighbour of city(s,id)?.edges||[])if(neighbour&&!nearby.has(neighbour)){nearby.add(neighbour);next.add(neighbour);}ring=next;}
 const explored=new Set(s.explored||[]);for(const id of nearby)explored.add(id);
 if(!s.fogRules)for(const id of visible)detailed.add(id);
 const result={key,visible,detailed,nearby,explored,regions:s.cities.filter(c=>detailed.has(c.id)),known:s.cities.filter(c=>explored.has(c.id))};cache.set(s,result);return result;
}
export function updateVisibility(s){ensureFrontierVision(s);const fog=visibilityFor(s);if(s.fogRules)s.explored=[...fog.explored];return fog;}
export const canSeeRegion=(s,id)=>!s.fogRules||visibilityFor(s).detailed.has(id);
export function canSeePoint(s,x,y){return !s.fogRules||canSeeRegion(s,regionAt(s,x,y)?.id);}
export function armyPoint(a){const p=a.progress,u=1-p;return {x:a.bend?u*u*a.sx+2*u*p*a.bend.x+p*p*a.tx:a.sx+(a.tx-a.sx)*p,y:a.bend?u*u*a.sy+2*u*p*a.bend.y+p*p*a.ty:a.sy+(a.ty-a.sy)*p};}
export function canSeeArmy(s,a){if(a.faction===s.player||!s.fogRules)return true;const p=armyPoint(a);return canSeePoint(s,p.x,p.y);}
export function regionBounds(c){return {left:Math.min(...c.poly.map(p=>p[0])),right:Math.max(...c.poly.map(p=>p[0])),top:Math.min(...c.poly.map(p=>p[1])),bottom:Math.max(...c.poly.map(p=>p[1]))};}
export const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
