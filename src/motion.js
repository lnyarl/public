import {armyPosition} from './realtime.js';
import {city,clamp} from './world.js';
import {partyPosition} from './work-parties.js';

// Presentation time is separate from simulation ticks. Pauses and speed changes
// retain the same point along each path, including when an army changes route.
export function createMotion(state,now=0){
 let time=0,anchor=now,paused=state.paused,dayMs=1000;
 const armies=new Map(),caravans=new Map(),workers=new Map(),effects=[];
 const clock=now=>time+(paused?0:(now-anchor)/dayMs);
 const point=(track,t)=>{
  const p=clamp((t-track.at)/track.duration,0,1);
  const travel=track.finishing?Math.min(1,p/.8):p,opacity=track.retiring?(track.finishing?Math.min(1,(1-p)*5):1-p):1;
  return {x:track.from.x+(track.to.x-track.from.x)*travel,y:track.from.y+(track.to.y-track.from.y)*travel,offset:track.from.offset+(track.to.offset-track.from.offset)*travel,opacity};
 };
 function reconcile(s,now,advance=false){
  const t=clock(now);
  const groups=[
   [armies,s.armies,a=>({...armyPosition(a),offset:(a.mode==='siege'?20:a.mode==='stationed'?40:0)+(()=>{const group=s.armies.filter(b=>b.mode===a.mode&&b.from===a.from&&b.target===a.target);return (group.findIndex(b=>b.id===a.id)-(group.length-1)/2)*24;})()})],
   [caravans,s.caravans,a=>{const from=city(s,a.from),to=city(s,a.to),p=clamp((s.elapsed-a.start)/a.duration,0,1);return {x:from.x+(to.x-from.x)*p,y:from.y+(to.y-from.y)*p,offset:0};}],
   [workers,s.economy?.parties.filter(p=>p.phase!=='done')||[],p=>partyPosition(s,p)]
  ];
  for(const [tracks,items,position] of groups){
   const live=new Set();
   for(const item of items){
    live.add(item.id);const old=tracks.get(item.id),to=position(item);
    if(!old||advance)tracks.set(item.id,{data:{...item},from:old?point(old,t):to,to,at:t,duration:1,retiring:false});
   }
   for(const [id,old] of tracks)if(!live.has(id)&&!old.retiring){
    const from=point(old,t);let to=from,finishing=false;
    if(tracks===caravans){const c=city(s,old.data.to);to={x:c.x,y:c.y,offset:0};}
    else if(s.effects.some(e=>['arrival','capture'].includes(e.kind)&&(e.army?e.army===id:e.city===old.data.target&&e.faction===old.data.faction))){to={x:old.data.tx,y:old.data.ty,offset:0};finishing=true;}
    tracks.set(id,{...old,from,to,at:t,duration:1,retiring:true,finishing});
   }
  }
 }
 reconcile(state,now);
 return {
  clock,
  setPaused(value,now){time=clock(now);anchor=now;paused=value;},
  setSpeed(ms,now){time=clock(now);anchor=now;dayMs=ms;},
  refresh(s,now){reconcile(s,now);},
  update(s,now){
   reconcile(s,now,true);
   for(const e of s.effects)if(!effects.some(v=>v.event.id===e.id))effects.push({event:{...e},at:now});
   if(effects.length>48)effects.splice(0,effects.length-48);
  },
  sample(now){
   const t=clock(now),result={armies:[],caravans:[],workers:[],effects:[],time:t,moving:false};
   for(const [tracks,rows] of [[armies,result.armies],[caravans,result.caravans],[workers,result.workers]])for(const [id,track] of tracks){
    if(track.retiring&&t-track.at>=track.duration){tracks.delete(id);continue;}
    const p=point(track,t);rows.push({...p,data:track.data,retiring:track.retiring});
    if(t-track.at<track.duration)result.moving=true;
   }
   for(let i=effects.length-1;i>=0;i--){const e=effects[i],age=now-e.at;if(age>=900)effects.splice(i,1);else result.effects.unshift({...e.event,age});}
   return result;
  }
 };
}
