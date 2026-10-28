import {city} from './world.js';
import {canSeeRegion,canSeePoint} from './fog-of-war.js';

const colors={gold:'#e7cc8c',bronze:'#c5d0a0',warning:'#c49858',danger:'#ac5c49'};
export function createMapFeedback(){
 let threats=[],effects=[],hits=[];
 function add(effect,now){if(effect.city&&effect.label)effects=effects.filter(e=>e.city!==effect.city||!e.label);effects.push({...effect,at:now});if(effects.length>18)effects.shift();}
 return {
  update(next,now){threats=next.threats;const places=new Set();for(const e of next.effects){const key=e.city||`${e.x},${e.y}`;if(places.has(key))continue;places.add(key);add(e,now);}},
  add,
  hit(x,y){return hits.find(h=>Math.hypot(x-h.x,y-h.y)<22);},
  active(now,reduced=false){return !reduced&&threats.some(t=>t.type==='invasion')||effects.some(e=>now-e.at<2200);},
  draw(ctx,s,screen,width,height,visual,now,reduced){
   hits=[];effects=effects.filter(e=>now-e.at<2200);
   const pulse=reduced?0:(Math.sin(now/620)+1)/2;
   ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
   for(const t of threats){
    if(t.type!=='invasion')continue;
    const c=city(s,t.city);if(!c||!canSeeRegion(s,c.id))continue;
    const p=screen(c.x,c.y),color=colors[t.level],onMap=p.x>34&&p.x<width-34&&p.y>145&&p.y<height-155;
    // Wash the threatened land, then draw the actual incoming route and arrowhead.
    if(onMap){
     ctx.beginPath();for(let i=0;i<c.poly.length;i++){const q=screen(...c.poly[i]);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);}ctx.closePath();ctx.fillStyle=t.level==='danger'?'#9d443718':'#b7844211';ctx.fill();ctx.strokeStyle=color;ctx.globalAlpha=.55;ctx.lineWidth=1.4;ctx.setLineDash([5,5]);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
     for(const id of t.armies){const a=visual.armies.find(v=>v.data.id===id);if(!a)continue;const q=screen(a.x,a.y),angle=Math.atan2(p.y-q.y,p.x-q.x),distance=Math.hypot(p.x-q.x,p.y-q.y);if(distance<38)continue;const end={x:p.x-Math.cos(angle)*31,y:p.y-Math.sin(angle)*31};ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.setLineDash([6,6]);ctx.lineDashOffset=reduced||s.paused?0:-now/160;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(end.x,end.y);ctx.lineTo(end.x-Math.cos(angle-.5)*9,end.y-Math.sin(angle-.5)*9);ctx.lineTo(end.x-Math.cos(angle+.5)*9,end.y-Math.sin(angle+.5)*9);ctx.closePath();ctx.fill();}
     ctx.globalAlpha=.7+pulse*.2;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y+6,35+pulse*3,18+pulse*2,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
    }
    const marker=onMap?{x:p.x+29,y:p.y-32}:edgePoint(p,width,height);
    if(!onMap)for(let i=0;i<8&&hits.some(h=>Math.hypot(h.x-marker.x,h.y-marker.y)<48);i++){marker.y+=48;if(marker.y>height-170){marker.y=Math.min(162,height*.3);marker.x=Math.max(29,marker.x-52);}}
    // Edge markers retain direction without moving the player's camera.
    if(!onMap){ctx.save();ctx.translate(marker.x,marker.y);ctx.rotate(Math.atan2(p.y-marker.y,p.x-marker.x)+Math.PI/2);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-23);ctx.lineTo(-5,-16);ctx.lineTo(5,-16);ctx.closePath();ctx.fill();ctx.restore();}
    badge(ctx,marker.x,marker.y,color,t.level==='danger'?'⚔':'!');hits.push({...marker,city:c.id});
    if(!onMap){ctx.font='10px Batang,serif';const w=ctx.measureText(c.name).width+16;ctx.fillStyle='#26392fec';ctx.beginPath();ctx.roundRect(marker.x-w/2,marker.y+17,w,19,7);ctx.fill();ctx.fillStyle='#e4c59e';ctx.fillText(c.name,marker.x,marker.y+27);}
   }
   for(const e of effects){
    const c=e.city?city(s,e.city):null,x=e.x??c?.x,y=e.y??c?.y;if(x===undefined||y===undefined||!canSeePoint(s,x,y))continue;
    const p=screen(x,y);if(p.x<0||p.x>width||p.y<0||p.y>height)continue;
    const age=now-e.at,t=age/2200,color=colors[e.tone]||colors.gold;
    ctx.globalAlpha=Math.min(1,(1-t)*4);ctx.strokeStyle=color;ctx.lineWidth=e.kind==='hit'?1.8:1.4;
    const r=22+(reduced?0:Math.min(1,age/1000)*20);
    if(age<850||reduced){ctx.beginPath();ctx.ellipse(p.x,p.y+5,r,r*.5,0,0,Math.PI*2);ctx.stroke();}
    if(e.kind==='hit'){ctx.beginPath();ctx.moveTo(p.x-12,p.y-13);ctx.lineTo(p.x+12,p.y+10);ctx.moveTo(p.x+12,p.y-13);ctx.lineTo(p.x-12,p.y+10);ctx.stroke();}
    if(e.from){const from=city(s,e.from);if(from){const q=screen(from.x,from.y);ctx.setLineDash([4,7]);ctx.globalAlpha*=.6;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=Math.min(1,(1-t)*4);}}
    if(e.label){
     ctx.font=`${e.kind==='hit'?'11px Arial,Malgun Gothic':'bold 12px Batang,serif'}`;
     const w=ctx.measureText(e.label).width+24,yy=p.y-55-(reduced?0:Math.min(age/80,13));
     ctx.fillStyle=e.tone==='danger'?'#422e27f0':'#263d2ff0';ctx.beginPath();ctx.roundRect(p.x-w/2,yy-12,w,25,10);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=.8;ctx.stroke();ctx.fillStyle=e.tone==='danger'?'#efc4a9':'#eddbad';ctx.fillText(e.label,p.x,yy+1);
    }
   }
   ctx.restore();
  }
 };
}

function badge(ctx,x,y,color,symbol){
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#2c382df5';ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(12,-9);ctx.lineTo(10,7);ctx.lineTo(0,15);ctx.lineTo(-10,7);ctx.lineTo(-12,-9);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ebc5a0';ctx.font='bold 16px Batang,serif';ctx.fillText(symbol,0,0);ctx.restore();
}

export function edgePoint(p,width,height){
 const cx=width/2,cy=height/2,left=29,right=Math.max(left,width-85),top=Math.min(162,height*.3),bottom=Math.max(top,height-(width<=760?260:170));
 const dx=p.x-cx,dy=p.y-cy;
 const scale=Math.min(1,dx>0?(right-cx)/dx:dx<0?(left-cx)/dx:Infinity,dy>0?(bottom-cy)/dy:dy<0?(top-cy)/dy:Infinity);
 return {x:Math.max(left,Math.min(right,cx+dx*scale)),y:Math.max(top,Math.min(bottom,cy+dy*scale))};
}
