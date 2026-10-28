import {city,regionAt,stationedTroops,troopTotal} from './world.js';
import {hasKingdoms,treaty} from './kingdom-rules.js';

// Records contain observations, never live references to another kingdom's state.
export function observeKingdom(s,f){
 const k=s.kingdoms[f],visible=new Set(),reveal=c=>{if(c){visible.add(c.id);for(const id of c.neighbors)visible.add(id);}};
 for(const c of s.cities)if(c.owner===f)reveal(c);
 const positions=new Map();
 for(const a of s.armies){const t=a.progress,u=1-t,x=a.bend?u*u*a.sx+2*u*t*a.bend.x+t*t*a.tx:a.sx+(a.tx-a.sx)*t,y=a.bend?u*u*a.sy+2*u*t*a.bend.y+t*t*a.ty:a.sy+(a.ty-a.sy)*t;const at=regionAt(s,x,y)||city(s,a.target);positions.set(a.id,at);if(a.faction===f)reveal(at);}
 const sites=new Map((s.economy?.sites||[]).map(v=>[v.region,v]));
 for(const id of visible){const c=city(s,id),site=sites.get(id);if(!c)continue;
  k.knowledge.regions[id]={id,owner:c.owner,major:c.major,troops:stationedTroops(s,c),defense:c.defense,training:c.training,morale:c.morale,at:s.elapsed,resource:site?.kind||null,richness:site?.richness||0};
  if(c.owner!==f&&s.factions[c.owner])contact(s,f,c.owner);
 }
 for(const [id,old] of Object.entries(k.knowledge.armies))if(visible.has(old.region)||s.elapsed-old.at>60)delete k.knowledge.armies[id];
 for(const a of s.armies){const at=positions.get(a.id);if(a.faction!==f&&at&&visible.has(at.id)){k.knowledge.armies[a.id]={id:a.id,faction:a.faction,region:at.id,target:a.target,troops:a.troops,mode:a.mode,at:s.elapsed};contact(s,f,a.faction);}}
 k.observedAt=s.elapsed;
}
export function contact(s,f,other){
 if(f===other||!s.kingdoms[other])return;
 const contacts=s.kingdoms[f].knowledge.contacts;
 contacts[other]??={since:s.elapsed,lastSeen:s.elapsed};contacts[other].lastSeen=s.elapsed;
}
export function knownStrength(s,f,other){
 if(other===f)return troopTotal(s,f);
 const memory=s.kingdoms[f].knowledge;
 const lands=Object.values(memory.regions).filter(r=>r.owner===other&&s.elapsed-r.at<=60);
 const armies=Object.values(memory.armies).filter(a=>a.faction===other&&s.elapsed-a.at<=20&&a.mode!=='stationed');
 return lands.reduce((n,r)=>n+r.troops,0)+armies.reduce((n,a)=>n+a.troops,0);
}
export function thirdPartyRisk(s,f,opponent){
 if(!hasKingdoms(s))return 0;
 const contacts=Object.keys(s.kingdoms[f].knowledge.contacts).filter(other=>other!==opponent&&!treaty(s,f,other));
 // Unknown strength remains a risk rather than being treated as an empty border.
 return contacts.reduce((n,other)=>n+Math.max(1500,knownStrength(s,f,other))*.35,0)/Math.max(1000,troopTotal(s,f));
}
export function knownGarrison(s,f,c){
 if(!hasKingdoms(s)||c.owner===f)return stationedTroops(s,c);
 const r=s.kingdoms[f].knowledge.regions[c.id];
 return r?Math.max(r.troops,s.elapsed-r.at>12?800:0):1500;
}
