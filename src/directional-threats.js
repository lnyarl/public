import {city} from './world.js';
import {armyPoint} from './fog-of-war.js';

export const COMPASS=['N','NE','E','SE','S','SW','W','NW'];
export const DIRECTION_NAMES={N:'북',NE:'북동',E:'동',SE:'남동',S:'남',SW:'남서',W:'서',NW:'북서'};
export function compassDirection(dx,dy){return COMPASS[(Math.round(Math.atan2(dx,-dy)/(Math.PI/4))+8)%8];}

// Only a coarse approach direction leaves this boundary: no army IDs, sizes or positions.
export function directionalThreats(s){
 const own=s.cities.filter(c=>c.owner===s.player),hints=new Map();
 for(const a of s.armies){
  if(a.faction===s.player||a.troops<=0||!['march','siege','field'].includes(a.mode))continue;
  const target=city(s,a.target),point=armyPoint(a);if(!target||!Number.isFinite(point.x)||!Number.isFinite(point.y))continue;
  const home=target.owner===s.player?target:own.reduce((best,c)=>!best||Math.hypot(c.x-point.x,c.y-point.y)<Math.hypot(best.x-point.x,best.y-point.y)?c:best,null);if(!home)continue;
  const distance=Math.hypot(point.x-home.x,point.y-home.y);if(distance>900)continue;
  const targetDistance=Math.hypot(target.x-home.x,target.y-home.y);
  if(target.owner!==s.player&&(a.mode!=='march'||targetDistance>=distance-20))continue;
  const dx=distance>20?point.x-home.x:a.sx-home.x,dy=distance>20?point.y-home.y:a.sy-home.y;if(Math.hypot(dx,dy)<1)continue;
  const direction=compassDirection(dx,dy),level=distance<300?'near':'faint';
  if(!hints.has(direction)||level==='near')hints.set(direction,{direction,level});
 }
 return COMPASS.filter(d=>hints.has(d)).map(d=>hints.get(d));
}

export function drawDirectionalThreats(ctx,hints,width,height){
 ctx.save();
 const left=12,right=width-12,top=Math.min(width<=760?148:105,height*.25),bottom=Math.max(top+80,height-(width<=760?278:130));
 for(const hint of hints){
  const vectors={N:[.5,0],NE:[1,0],E:[1,.5],SE:[1,1],S:[.5,1],SW:[0,1],W:[0,.5],NW:[0,0]},[u,v]=vectors[hint.direction],x=left+u*(right-left),y=top+v*(bottom-top),radius=Math.min(width,height)*(u===.5||v===.5?.23:.25);
  const glow=ctx.createRadialGradient(x,y,0,x,y,radius);glow.addColorStop(0,hint.level==='near'?'#e9ab645e':'#e9bd7040');glow.addColorStop(.45,'#d9a35c20');glow.addColorStop(1,'#e9ab6400');ctx.fillStyle=glow;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
  ctx.strokeStyle=hint.level==='near'?'#f2c484b0':'#e6bf7c80';ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();const length=24;
  if(v===0){const cx=Math.max(left+length,Math.min(right-length,x));ctx.moveTo(cx-length,top);ctx.lineTo(cx+length,top);}if(v===1){const cx=Math.max(left+length,Math.min(right-length,x));ctx.moveTo(cx-length,bottom);ctx.lineTo(cx+length,bottom);}
  if(u===0){const cy=Math.max(top+length,Math.min(bottom-length,y));ctx.moveTo(left,cy-length);ctx.lineTo(left,cy+length);}if(u===1){const cy=Math.max(top+length,Math.min(bottom-length,y));ctx.moveTo(right,cy-length);ctx.lineTo(right,cy+length);}ctx.stroke();
 }
 ctx.restore();
}
