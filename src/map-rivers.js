import {createTileCache,tileSpec,makeCanvas} from './tile-cache.js';
const tiles=createTileCache(),identities=new WeakMap();let serial=0;
const cache=new WeakMap();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ready=image=>image?.complete&&image.naturalWidth;
const key=p=>p.x.toFixed(3)+','+p.y.toFixed(3);
const catmull=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);

export function riverGeometry(g){
 if(cache.has(g))return cache.get(g);
 const ends=new Set(g.riverPaths.map(r=>key(r.points.at(-1)))),ribbons=[],nodes=new Map();
 const channels=new Map();
 for(const river of g.riverPaths)for(const p of river.points){const cell=Math.floor(p.x/80)+','+Math.floor(p.y/80);if(!channels.has(cell))channels.set(cell,[]);channels.get(cell).push({p,river});}
 // Fade bends near neighboring branches so close channels cannot cross.
 const room=(p,river)=>{
  let distance=120;const x=Math.floor(p.x/80),y=Math.floor(p.y/80);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)for(const q of channels.get((x+dx)+','+(y+dy))||[])if(q.river!==river)distance=Math.min(distance,Math.hypot(q.p.x-p.x,q.p.y-p.y));
  return clamp((distance-30)/80,0,1);
 };
 for(const r of g.riverPaths)r.points.forEach((p,i)=>{
  const id=key(p);if(!nodes.has(id))nodes.set(id,{before:null,after:null});const node=nodes.get(id);
  if(i&&(!node.before||r.points[i-1].flow>node.before.flow))node.before=r.points[i-1];
  if(i+1<r.points.length)node.after=r.points[i+1];
 });
 for(const river of g.riverPaths){
  const source=river.source??!ends.has(key(river.points[0])),points=[];
  for(let i=0;i<river.points.length-1;i++){
   const b=river.points[i],c=river.points[i+1],a=i?river.points[i-1]:nodes.get(key(b)).before||b,d=river.points[i+2]||nodes.get(key(c)).after||c;
   for(let k=0;k<6;k++){const t=k/6;points.push({x:catmull(a.x,b.x,c.x,d.x,t),y:catmull(a.y,b.y,c.y,d.y,t),flow:b.flow+(c.flow-b.flow)*t});}
  }
  const last=river.points.at(-1);points.push({x:last.x,y:last.y,flow:last.flow});
  let length=0;for(let i=0;i<points.length;i++){if(i)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);points[i].at=length;}
  const first=river.points[0],roll=n=>{const v=Math.sin((g.seed||0)*.013+first.x*.017+first.y*.031+n*12.9898)*43758.5453;return v-Math.floor(v);};
  const count=Math.max(2,Math.round(length/(120+roll(0)*60))),knots=[{at:0,offset:0}],sign=roll(1)>.5?1:-1;
  for(let i=1;i<count;i++)knots.push({at:(i+(roll(i+2)-.5)*.4)*length/count,offset:sign*(i%2?1:-1)*(18+roll(i+count)*12)*Math.min(1,length/240)});
  knots.push({at:length,offset:0});
  const original=points.map(p=>({x:p.x,y:p.y}));let interval=0;
  // Alternate irregular bends inside the existing river corridor; endpoints stay fixed.
  for(let i=1;i<points.length-1;i++){
   const p=points[i],before=original[Math.max(0,i-8)],after=original[Math.min(points.length-1,i+8)],dx=after.x-before.x,dy=after.y-before.y,distance=Math.hypot(dx,dy)||1;
   while(p.at>knots[interval+1].at)interval++;
   const a=knots[interval],b=knots[interval+1],t=(p.at-a.at)/(b.at-a.at),blend=t*t*(3-2*t),drift=(a.offset+(b.offset-a.offset)*blend)*room(p,river);
   p.x-=dy/distance*drift;p.y+=dx/distance*drift;
  }
  length=0;for(let i=0;i<points.length;i++){if(i)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);points[i].at=length;}
  for(let i=0;i<points.length;i++){
   const p=points[i],before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)],dx=after.x-before.x,dy=after.y-before.y,distance=Math.hypot(dx,dy)||1;
   p.tx=dx/distance;p.ty=dy/distance;p.nx=-p.ty;p.ny=p.tx;
   const taper=source? .3+.7*clamp(p.at/Math.min(55,length*.8),0,1):1;
   p.radius=clamp(4+Math.sqrt(p.flow)*.52,8,46)*.5*taper;
   p.left=p.radius*(1+.22*Math.sin(p.x/89+p.y/103+g.warp)+.07*Math.sin(p.x/31-p.y/43));
   p.right=p.radius*(1+.2*Math.sin(p.x/97-p.y/81+g.warp+2)+.08*Math.sin(p.x/41+p.y/29));
  }
  ribbons.push({points,length,source,left:Math.min(...points.map(p=>p.x-p.left))-18,right:Math.max(...points.map(p=>p.x+p.right))+18,top:Math.min(...points.map(p=>p.y-p.left))-18,bottom:Math.max(...points.map(p=>p.y+p.right))+18});
 }
 cache.set(g,ribbons);return ribbons;
}

function ribbonPath(r,scale=1,padding=0){
 const path=new Path2D(),points=r.points;
 points.forEach((p,i)=>{const x=p.x+p.nx*(p.left*scale+padding),y=p.y+p.ny*(p.left*scale+padding);i?path.lineTo(x,y):path.moveTo(x,y);});
 for(let i=points.length-1;i>=0;i--){const p=points[i];path.lineTo(p.x-p.nx*(p.right*scale+padding),p.y-p.ny*(p.right*scale+padding));}
 path.closePath();
 for(const p of [points[0],points.at(-1)]){const radius=Math.min(p.left,p.right)*scale+padding;path.moveTo(p.x+radius,p.y);path.arc(p.x,p.y,radius,0,Math.PI*2,true);}
 return path;
}

function bankTile(rivers,image,tileX,tileY){
 const canvas=makeCanvas(256);
 const ctx=canvas.getContext('2d'),inside=new Path2D();ctx.translate(-tileX,-tileY);
 // Wrap slices of the painted strip along each bank instead of laying down straight tiles.
 for(const r of rivers){
  r.inside??=ribbonPath(r,.65);inside.addPath(r.inside);
  for(const side of [-1,1]){
   const period=110+25*Math.sin(r.points[0].x/137+side),phase=side>0?period*.47:0;
   for(let i=0;i<r.points.length-1;i++){
    const p=r.points[i],q=r.points[i+1],offset=side>0?p.left:p.right,nextOffset=side>0?q.left:q.right;
    if(Math.max(p.x,q.x)<tileX-48||Math.min(p.x,q.x)>tileX+304||Math.max(p.y,q.y)<tileY-48||Math.min(p.y,q.y)>tileY+304)continue;
    const x=p.x+p.nx*offset*side,y=p.y+p.ny*offset*side,dx=q.x+q.nx*nextOffset*side-x,dy=q.y+q.ny*nextOffset*side-y;
    const length=Math.hypot(dx,dy),advance=q.at-p.at,height=clamp(p.radius*.85,4,17);let at=0;
    while(at<advance){
     const u=(p.at+phase+at)%period,part=Math.min(advance-at,period-u);
     ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(dy,dx));if(side>0)ctx.scale(1,-1);
     ctx.drawImage(image,u/period*image.naturalWidth,0,part/period*image.naturalWidth,image.naturalHeight,at/advance*length-.25,-height*.52,part/advance*length+.5,height);ctx.restore();at+=part;
    }
   }
  }
 }
 // Water from every branch erases the interior, including banks crossing a confluence.
 ctx.globalCompositeOperation='destination-out';ctx.fill(inside);
 return canvas;
}

function drawPaintedBanks(ctx,g,bounds,image){
 const rivers=riverGeometry(g);
 // The complete river tile is cached by the caller; bank fragments are temporary.
 for(let y=Math.max(0,Math.floor(bounds.top/256)*256);y<Math.min(g.height,bounds.bottom);y+=256)for(let x=Math.max(0,Math.floor(bounds.left/256)*256);x<Math.min(g.width,bounds.right);x+=256){
  const visible=rivers.filter(r=>r.left<x+276&&r.right>x-20&&r.top<y+276&&r.bottom>y-20&&r.points.some(p=>p.x>x-48&&p.x<x+304&&p.y>y-48&&p.y<y+304));
  if(visible.length)ctx.drawImage(bankTile(visible,image,x,y),x,y);
 }
}

export function paintRivers(ctx,g,bounds,zoom,art){
 const rivers=riverGeometry(g).filter(r=>r.left<bounds.right&&r.right>bounds.left&&r.top<bounds.bottom&&r.bottom>bounds.top);
 const water=new Path2D();ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 for(const r of rivers){
  r.paths??={flood:ribbonPath(r,1,8),bank:ribbonPath(r,1,2),water:ribbonPath(r)};
  water.addPath(r.paths.water);
 }
 // Paint every bank before the water so confluences remain a continuous pool.
 ctx.fillStyle='#8f987027';for(const r of rivers)ctx.fill(r.paths.flood);
 ctx.fillStyle='#9da080a0';for(const r of rivers)ctx.fill(r.paths.bank);
 ctx.fillStyle='#7fa7a4';ctx.fill(water);
 ctx.save();ctx.clip(water);
 const painted=ready(art['river-water']),texture=painted?art['river-water']:art.water;
 if(ready(texture)){const pattern=ctx.createPattern(texture,'repeat');if(painted)pattern.setTransform(new DOMMatrix().scale(.42));ctx.globalAlpha=painted?.9:.25;ctx.fillStyle=pattern;ctx.fillRect(bounds.left,bounds.top,bounds.right-bounds.left,bounds.bottom-bounds.top);ctx.globalAlpha=1;}
 for(const r of rivers){
  let nextBar=65,nextRipple=18,nextPool=35;
  for(let i=2;i<r.points.length-2;i++){
   const p=r.points[i],before=r.points[i-2],after=r.points[i+2],bend=(p.x-before.x)*(after.y-p.y)-(p.y-before.y)*(after.x-p.x);
   if(!painted&&p.at>nextPool){
    nextPool=p.at+55+20*Math.sin(p.y/57);ctx.fillStyle='#537f8c30';ctx.beginPath();ctx.ellipse(p.x,p.y,22+p.radius,p.radius*.55,Math.atan2(p.ty,p.tx),0,Math.PI*2);ctx.fill();
   }
   if(p.at>nextBar){
    nextBar=p.at+120+35*Math.sin(p.x/57+p.y/73);
    const turn=bend/Math.max(1,Math.hypot(p.x-before.x,p.y-before.y)*Math.hypot(after.x-p.x,after.y-p.y));
    if(p.radius>9&&Math.abs(turn)>.08&&Math.sin(p.x/71+p.y/47+g.warp)>.05){
     const side=turn>0?1:-1,length=Math.min(18,p.radius*.95),width=1+p.radius*.16;
     ctx.save();ctx.translate(p.x+p.nx*p.radius*.58*side,p.y+p.ny*p.radius*.58*side);ctx.rotate(Math.atan2(p.ty,p.tx));ctx.fillStyle='#c1b48ad9';
     if(ready(art['river-sandbar'])){const image=art['river-sandbar'],w=length*2.4;ctx.drawImage(image,-w/2,-w*image.naturalHeight/image.naturalWidth/2,w,w*image.naturalHeight/image.naturalWidth);}
     else{ctx.beginPath();ctx.moveTo(-length,0);ctx.bezierCurveTo(-length*.6,-width*.65,length*.6,-width,length,0);ctx.bezierCurveTo(length*.5,width*.8,-length*.7,width*.7,-length,0);ctx.fill();}ctx.restore();
    }
   }
   if(zoom>.28&&p.at>nextRipple&&p.radius>6){
    nextRipple=p.at+28+18*(1+Math.sin(p.y/41));const side=Math.sin(p.x/37+p.y/29),offset=side*p.radius*.55,length=3+p.radius*.3;
    const x=p.x+p.nx*offset,y=p.y+p.ny*offset;ctx.strokeStyle=painted?'#dae4c935':'#d5e5d161';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x-p.tx*length*.5,y-p.ty*length*.5);ctx.quadraticCurveTo(x+p.nx,y+p.ny,x+p.tx*length*.5,y+p.ty*length*.5);ctx.stroke();
   }
  }
 }
 ctx.restore();
 if(ready(art['river-bank'])&&(!g.scale||zoom>.28))drawPaintedBanks(ctx,g,bounds,art['river-bank']);
 if(zoom>.32)for(const r of rivers){
  let next=45;
  for(const p of r.points){if(p.at<next)continue;next=p.at+105+35*Math.sin(p.x/77);const side=Math.sin(p.x/49+p.y/61)>0?1:-1,x=p.x+p.nx*(p.radius+5)*side,y=p.y+p.ny*(p.radius+5)*side;
   if(art.reeds?.complete&&art.reeds.naturalWidth){const width=18+p.radius*.25;ctx.drawImage(art.reeds,x-width/2,y-width*art.reeds.naturalHeight/art.reeds.naturalWidth,width,width*art.reeds.naturalHeight/art.reeds.naturalWidth);}
   else{ctx.strokeStyle='#70815d';ctx.lineWidth=1;ctx.beginPath();for(let k=-1;k<=1;k++){ctx.moveTo(x+k*2,y);ctx.lineTo(x+k*3,y-4-Math.abs(k));}ctx.stroke();}
  }
 }
 ctx.restore();
}

export function riverTile(g,x,y,spec,art){
 const {size,resolution,detail}=spec,pixels=512*resolution,pad=2,canvas=makeCanvas(pixels+pad*2),ctx=canvas.getContext('2d');
 ctx.setTransform(pixels/size,0,0,pixels/size,pad-x*pixels/size,pad-y*pixels/size);
 paintRivers(ctx,g,{left:x-pad*size/pixels,right:x+size+pad*size/pixels,top:y-pad*size/pixels,bottom:y+size+pad*size/pixels},detail,art);
 return canvas;
}

export function drawRivers(ctx,g,bounds,zoom,art,backend=null){
 let identity=identities.get(g);if(!identity){identity=++serial;identities.set(g,identity);}
 const spec=tileSpec(zoom,bounds,g),{size}=spec,rivers=g.riverBounds||riverGeometry(g);
 const assets=['river-water','water','river-bank','river-sandbar','reeds'].map(k=>ready(art[k])?1:0).join('');
 for(let y=Math.max(0,Math.floor(bounds.top/size)*size);y<Math.min(g.height,bounds.bottom);y+=size)for(let x=Math.max(0,Math.floor(bounds.left/size)*size);x<Math.min(g.width,bounds.right);x+=size){
  const key=`${identity}:${size}:${spec.resolution}:${spec.detail}:${assets}:${x},${y}`;
  if(!rivers.some(r=>r.left<x+size+4&&r.right>x-4&&r.top<y+size+4&&r.bottom>y-4))continue;
  const tile=backend?backend.river(g,x,y,spec,art):tiles.get(key)||(()=>{const value=riverTile(g,x,y,spec,art);tiles.set(key,value);return value;})();
  if(tile){const pad=2*size/(512*spec.resolution);ctx.drawImage(tile,x-pad,y-pad,size+pad*2,size+pad*2);}
 }
 g.riverTiles=backend?backend.stats():tiles.stats();
}
