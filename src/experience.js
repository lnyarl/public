import { OFFICERS, ownedCities, totalSoldiers } from './game.js';

export function portrait(id) {
  const o=OFFICERS[id], scholar=o.int>o.war;
  const beard=['guanyu','zhangfei','liubei','caocao','xiahoudun','huangzhong'].includes(id);
  const accent=scholar?'#9aa78e':id==='guanyu'?'#88a17e':id==='zhangfei'?'#aa795c':'#b4a075';
  return `<span class="hero-portrait" style="--portrait-accent:${accent}" aria-label="${o.name} 삽화"><svg viewBox="0 0 100 120" aria-hidden="true"><path d="M0 0H100V120H0Z" fill="#303b2e"/><circle cx="53" cy="43" r="35" fill="${accent}" opacity=".12"/><path d="M5 120 15 87 37 75H65L88 90 99 120" fill="${accent}"/><path d="m36 75 15 32 16-32-12-7H45Z" fill="#c6ae83"/><path d="m30 79 20 29-10 12H15L21 90ZM72 80 51 108l12 12h26l-8-30Z" fill="${scholar?'#52604b':'#555848'}"/><path d="M32 34Q31 16 50 15T72 34L68 64 60 79H44L34 63Z" fill="${id==='guanyu'?'#a77457':'#bc9c74'}"/><path d="M34 44 44 41M57 41l10 3" stroke="#2c3028" stroke-width="3"/><path d="m48 45-3 15h11M44 67h15" fill="none" stroke="#765e44" stroke-width="2"/>${beard?`<path d="M34 57 43 66 52 64 64 59 66 77 53 ${id==='guanyu'?103:88} 40 78Z" fill="#2c3027"/><path d="M43 63q8-6 17 0" fill="none" stroke="#24291f" stroke-width="4"/>`:''}${scholar?'<path d="M27 36 30 11l21-8 20 8 4 25-25-6Z" fill="#29362b" stroke="#9ba489"/><path d="M49 4v25M31 17l19 7 21-8" fill="none" stroke="#777f64"/>':'<path d="m25 36 6-23 20-9 20 9 8 23-27-6Z" fill="#5b644b" stroke="#b6a47b"/><path d="M47 7h9v23h-9ZM23 37l13-5v20l-9-7ZM68 32l12 5-5 10-7 6Z" fill="#777c58"/>'}<path d="M14 107h22M16 114h25M67 107h21M64 114h26" stroke="#c3b487" opacity=".35"/></svg></span>`;
}

export function snapshot(s) {
  return {gold:s.factions[s.player].gold,food:s.factions[s.player].food,soldiers:totalSoldiers(s),cities:ownedCities(s).length,ap:s.ap,officers:s.factions[s.player].officers.length,trust:{...s.trust},towns:Object.fromEntries(s.cities.map(c=>[c.id,{...c}]))};
}
export function changes(s,before) {
  const after=snapshot(s), result=[];
  for(const [key,label,unit] of [['gold','금','냥'],['food','군량','석'],['soldiers','총 병력','명'],['cities','도시','개'],['officers','장수','명'],['ap','명령서','장']]) {
    if(before[key]!==after[key]) result.push({label,from:before[key],to:after[key],unit,good:after[key]>before[key]});
  }
  for(const c of s.cities) {
    const old=before.towns[c.id];
    if(old.owner===s.player && c.owner===s.player && old.soldiers!==c.soldiers) result.push({label:`${c.name} 병력`,from:old.soldiers,to:c.soldiers,unit:'명',good:c.soldiers>old.soldiers});
    for(const [key,label,unit] of [['farm','농업','단계'],['market','상업','단계'],['fort','성벽','단계'],['morale','민심','']]) {
      if(old[key]!==c[key]) result.push({label:`${c.name} ${label}`,from:old[key],to:c[key],unit,good:c[key]>old[key]});
    }
  }
  for(const [id,n] of Object.entries(s.trust)) if(n!==(before.trust[id]||0)) result.push({label:`${OFFICERS[id].name} 신뢰`,from:before.trust[id]||0,to:n,unit:'/ 3',good:true});
  return result;
}
