// Finite, independently oriented ranges and compact massifs. No map-wide axis.
export function mountainFeatures(seed,width,height){
 let state=(seed^0x9b71c3)>>>0;state=Math.imul(state^(state>>>16),0x7feb352d);state=Math.imul(state^(state>>>15),0x846ca68b);state=(state^(state>>>16))>>>0;
 const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const features=[],count=3+Math.floor(rand()*5);
 function path(x,y,angle,length,breadth,amplitude,kind='range'){
  breadth=Math.max(115,breadth);
  const points=[{x,y,at:0,width:breadth,height:amplitude}],bend=(rand()-.5)*.16;let heading=angle,travelled=0,turn=bend;
  while(travelled<length){
   const step=Math.min(length-travelled,75+rand()*100);turn=turn*.65+(rand()-.5)*.16;heading+=turn;
   const nx=x+Math.cos(heading)*step,ny=y+Math.sin(heading)*step;
   if(nx<100||nx>width-100||ny<100||ny>height-100)break;
   travelled+=step;x=nx;y=ny;points.push({x,y,at:travelled,width:Math.max(115,breadth*(.8+rand()*.4)),height:amplitude*(.78+rand()*.24)});
  }
  if(points.length<3)return null;
  const feature={kind,angle,length:travelled,points,width:breadth,taper:240+rand()*260,passes:[]};
  for(let n=Math.floor(rand()*4);n>0;n--)feature.passes.push({at:travelled*(.15+rand()*.7),width:110+rand()*110,depth:.3+rand()*.45});
  features.push(feature);return feature;
 }
 for(let i=0;i<count;i++){
  const angle=rand()*Math.PI*2,length=500+rand()*1900,breadth=110+rand()*120,amplitude=.53+rand()*.23;
  const mx=Math.abs(Math.cos(angle))*length/2+200,my=Math.abs(Math.sin(angle))*length/2+200,cx=mx+rand()*(width-mx*2),cy=my+rand()*(height-my*2);
  const range=path(cx-Math.cos(angle)*length/2,cy-Math.sin(angle)*length/2,angle,length,breadth,amplitude);if(!range)continue;
  for(let n=Math.floor(rand()*3);n>0;n--){
   const k=1+Math.floor(rand()*(range.points.length-2)),p=range.points[k],prev=range.points[k-1],heading=Math.atan2(p.y-prev.y,p.x-prev.x)+(rand()<.5?-1:1)*(.5+rand()*.8);
   path(p.x,p.y,heading,280+rand()*650,Math.max(90,breadth*(.5+rand()*.25)),amplitude*(.75+rand()*.2),'spur');
  }
 }
 for(let i=0,n=1+Math.floor(rand()*4);i<n;i++)features.push({kind:'massif',x:400+rand()*(width-800),y:400+rand()*(height-800),angle:rand()*Math.PI,radiusX:200+rand()*230,radiusY:145+rand()*170,height:.55+rand()*.22,phase:rand()*Math.PI*2});
 return features;
}

export function mountainField(features,cols,rows,stepX,stepY){
 const field=new Float32Array(cols*rows);
 for(const f of features){
  const ca=Math.cos(f.angle),sa=Math.sin(f.angle),padding=f.kind==='massif'?Math.max(f.radiusX,f.radiusY)*2.8:f.width*3.8;
  const xs=f.points?.map(p=>p.x)||[f.x],ys=f.points?.map(p=>p.y)||[f.y];
  const left=Math.max(0,Math.floor((Math.min(...xs)-padding)/stepX)),right=Math.min(cols-1,Math.ceil((Math.max(...xs)+padding)/stepX)),top=Math.max(0,Math.floor((Math.min(...ys)-padding)/stepY)),bottom=Math.min(rows-1,Math.ceil((Math.max(...ys)+padding)/stepY));
  for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++){
   const x=col*stepX,y=row*stepY;let value;
   if(f.kind==='massif'){
    const dx=x-f.x,dy=y-f.y,u=(dx*ca+dy*sa)/f.radiusX,v=(-dx*sa+dy*ca)/f.radiusY,r=Math.hypot(u,v);
    const edge=1+.13*Math.sin(Math.atan2(v,u)*3+f.phase)+.07*Math.sin(Math.atan2(v,u)*5-f.phase);
    value=f.height*Math.exp(-((r/edge)**2)*1.25)+.1*Math.exp(-r*r*.3);
   }else{
    let nearest=Infinity,along=0,breadth=f.width,amplitude=0;
    for(let k=1;k<f.points.length;k++){
     const a=f.points[k-1],b=f.points[k],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy))),d=(x-a.x-t*dx)**2+(y-a.y-t*dy)**2;
     if(d<nearest){nearest=d;along=a.at+(b.at-a.at)*t;breadth=a.width+(b.width-a.width)*t;amplitude=a.height+(b.height-a.height)*t;}
    }
    const end=Math.max(0,Math.min(1,(f.length-along)/f.taper)),start=f.kind==='spur'?1:Math.max(0,Math.min(1,along/f.taper));
    const taper=start*start*(3-2*start)*end*end*(3-2*end);let pass=1;
    for(const gap of f.passes)pass*=1-gap.depth*Math.exp(-(((along-gap.at)/gap.width)**2));
    value=(Math.exp(-nearest/(breadth*breadth))*amplitude*pass+.14*Math.exp(-nearest/(breadth*breadth*6.5)))*taper;
   }
   const i=row*cols+col;field[i]=Math.max(field[i],value);
  }
 }
 return field;
}

const artwork=new WeakMap();
function mountainNoise(seed,x,y){
 const hash=(x,y)=>{let n=(seed^Math.imul(x,374761393)^Math.imul(y,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
 const col=Math.floor(x),row=Math.floor(y),u=x-col,v=y-row,a=u*u*(3-2*u),b=v*v*(3-2*v);
 return (hash(col,row)*(1-a)+hash(col+1,row)*a)*(1-b)+(hash(col,row+1)*(1-a)+hash(col+1,row+1)*a)*b;
}
const smoothMountain=(low,high,value)=>{const t=Math.max(0,Math.min(1,(value-low)/(high-low)));return t*t*(3-2*t);};
// Broadness and density are independent, smooth patches in world coordinates.
export function mountainProfile(seed,x,y){
 return {density:.2+.8*smoothMountain(.22,.78,mountainNoise(seed^0x8ab731,x/360,y/360)),breadth:smoothMountain(.8,.96,mountainNoise(seed^0x3c9157,x/950,y/950))};
}
// The broad slopes remain gameplay terrain; tall peaks occupy a narrow, broken crest.
export function mountainAppearance(g,item,project){
 if(!g.features)return item;
 let cache=artwork.get(g);
 if(!cache){
  const scale=g.scale||1;
  const features=g.features.map(f=>f.points?{...f,points:f.points.map(p=>({...p,...project(p.x,p.y),width:p.width*scale}))}:{...f,...project(f.x,f.y),radiusX:f.radiusX*scale,radiusY:f.radiusY*scale});
  cache={features,items:new WeakMap()};artwork.set(g,cache);
 }
 if(cache.items.has(item))return cache.items.get(item);
 const n=Math.sin(item.x*12.9898+item.y*78.233+g.seed*.017)*43758.5453,roll=n-Math.floor(n);
 const {density,breadth}=mountainProfile(g.seed,item.x,item.y);
 let distance=Infinity,coreWidth=0,kind='range';
 for(const f of cache.features){
  let d=Infinity,w=0;
  if(f.kind==='massif'){
   const dx=item.x-f.x,dy=item.y-f.y,ca=Math.cos(f.angle),sa=Math.sin(f.angle);
   d=Math.hypot((dx*ca+dy*sa)/Math.min(f.radiusX*(.45+breadth*.2),200+breadth*100),(-dx*sa+dy*ca)/Math.min(f.radiusY*(.45+breadth*.2),160+breadth*80));w=1;
  }else for(let k=1;k<f.points.length;k++){
   const a=f.points[k-1],b=f.points[k],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((item.x-a.x)*dx+(item.y-a.y)*dy)/(dx*dx+dy*dy)));
   const gap=Math.hypot(item.x-a.x-t*dx,item.y-a.y-t*dy);
   if(gap<d){d=gap;w=Math.min((a.width+(b.width-a.width)*t)*(.24+density*.18)*(1+breadth),82+breadth*65);}
  }
  if(d/Math.max(1,w)<distance/Math.max(1,coreWidth)){distance=d;coreWidth=w;kind=f.kind;}
 }
 const shoulder=kind!=='massif'&&distance>coreWidth&&distance<coreWidth+45&&roll<.05*density;
 const result=distance<=coreWidth&&roll<density||shoulder?{...item,width:item.width*(shoulder?.52:.62+density*.2),shoulder,density,breadth}:null;
 cache.items.set(item,result);return result;
}
