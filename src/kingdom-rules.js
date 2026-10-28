export const KINGDOM_POLICIES={peaceful:{name:'외교 우선',reserve:.55,lossLimit:.15},balanced:{name:'균형',reserve:.4,lossLimit:.25},assertive:{name:'자원 확보',reserve:.25,lossLimit:.35}};
export const DIPLOMACY_TYPES={trade:'자원 거래',pact:'불가침',demand:'자원 요구',peace:'휴전'};
export const pairKey=(a,b)=>[a,b].sort().join(':');
export const hasKingdoms=s=>s.kingdomRules===1;
export const treaty=(s,a,b)=>s.pacts.find(p=>p.key===pairKey(a,b)&&p.until>s.elapsed);
export const warBetween=(s,a,b)=>s.diplomacy?.wars.find(w=>w.key===pairKey(a,b)&&w.status==='active');
export function knownRegion(s,f,c){
 if(!hasKingdoms(s)||c.owner===f)return c;
 return s.kingdoms[f].knowledge.regions[c.id]||null;
}
export const knownOwner=(s,f,c)=>knownRegion(s,f,c)?.owner;
export function mayInvade(s,f,other){
 if(other===f)return true;
 if(!other||treaty(s,f,other))return false;
 if(!hasKingdoms(s))return true;
 const k=s.kingdoms[f];
 if(other==='neutral')return k.policy!=='peaceful';
 const war=warBetween(s,f,other);
 return !!war&&!war.withdrawing.includes(f)&&!(war.attacker===f&&k.policy==='peaceful');
}
export function canCommitArmy(s,a){
 if(!hasKingdoms(s))return true;
 const total=s.cities.reduce((n,c)=>n+(c.owner===a.faction?c.soldiers:0),0)+s.armies.reduce((n,b)=>n+(b.faction===a.faction?b.troops:0),0);
 const committed=s.armies.filter(b=>b.id!==a.id&&b.faction===a.faction&&b.purpose==='attack'&&b.mode!=='stationed'&&b.mode!=='return').reduce((n,b)=>n+b.troops,0);
 return committed+a.troops<=total*(1-KINGDOM_POLICIES[s.kingdoms[a.faction].policy].reserve);
}
