import {makeCanvas,tileSpec} from './tile-cache.js';
import {sampleField,vegetationAt} from './terrain.js';
import {regionAt} from './world.js';

const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
const groundCache=new WeakMap(),tiles=new Map();
const chunkCache=new WeakMap();
const legacyChunks=new WeakMap();
const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const kinds=['grass','forest','rock','bank'];
function random(seed){let n=seed>>>0;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);}
function soften(field,cols,rows){
 const buffer=new Float32Array(field.length);
 for(let pass=0;pass<2;pass++)for(const horizontal of [true,false]){
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   let sum=0;for(let k=-3;k<=3;k++)sum+=field[(horizontal?y:Math.max(0,Math.min(rows-1,y+k)))*cols+(horizontal?Math.max(0,Math.min(cols-1,x+k)):x)];
   buffer[y*cols+x]=sum/7;
  }
  field.set(buffer);
 }
}

function material(kind){
 if(tiles.has(kind))return tiles.get(kind);
 const canvas=makeCanvas(1);canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,512),rand=random(519731+kinds.indexOf(kind)*8317);
 const tint={grass:[169,179,121],forest:[143,131,94],rock:[163,160,141],bank:[187,173,133]}[kind];
 for(let i=0;i<pixels.data.length;i+=4){const n=(rand()-.5)*100;for(let k=0;k<3;k++)pixels.data[i+k]=tint[k]+n;pixels.data[i+3]=17+rand()*24;}
 ctx.putImageData(pixels,0,0);ctx.lineCap='round';
 const washes={grass:'rgba(111,132,68,.055)',forest:'rgba(100,106,65,.085)',rock:'rgba(113,112,98,.075)',bank:'rgba(157,125,82,.075)'};
 ctx.fillStyle=washes[kind];
 for(let i=0;i<90;i++){const x=rand()*512,y=rand()*512;ctx.beginPath();ctx.ellipse(x,y,10+rand()*35,4+rand()*13,rand()*Math.PI,0,Math.PI*2);ctx.fill();}
 for(let i=0;i<900;i++){
  const x=rand()*512,y=rand()*512;
  if(kind==='grass'){
   const length=3+rand()*8,lean=(rand()-.5)*5;ctx.strokeStyle=rand()<.6?'rgba(77,105,45,.3)':'rgba(228,213,150,.35)';ctx.lineWidth=.7+rand()*.8;
   ctx.beginPath();ctx.moveTo(x-1,y);ctx.quadraticCurveTo(x+lean*.4,y-length*.5,x+lean,y-length);ctx.moveTo(x+1,y);ctx.lineTo(x+3+lean*.4,y-length*.65);ctx.stroke();
  }else if(kind==='forest'){
   ctx.fillStyle=['rgba(103,105,58,.32)','rgba(146,118,68,.28)','rgba(194,165,100,.25)'][Math.floor(rand()*3)];
   ctx.beginPath();ctx.ellipse(x,y,1.3+rand()*3, .7+rand()*1.2,rand()*Math.PI,0,Math.PI*2);ctx.fill();
   if(i%9===0){ctx.strokeStyle='rgba(84,83,58,.27)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+5+rand()*7,y+2);ctx.lineTo(x+3,y-2);ctx.stroke();}
  }else if(kind==='rock'){
   const size=1.4+rand()*5;ctx.fillStyle=rand()<.5?'rgba(103,105,99,.3)':'rgba(220,211,183,.38)';
   ctx.beginPath();ctx.moveTo(x-size,y);ctx.lineTo(x-size*.3,y-size*.6);ctx.lineTo(x+size,y-size*.2);ctx.lineTo(x+size*.5,y+size*.5);ctx.closePath();ctx.fill();
   if(i%10===0){ctx.strokeStyle='rgba(91,94,84,.2)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x-6,y);ctx.lineTo(x,y+2);ctx.lineTo(x+8,y-1);ctx.stroke();}
  }else{
   ctx.fillStyle=rand()<.5?'rgba(121,104,77,.27)':'rgba(230,209,155,.38)';ctx.beginPath();ctx.ellipse(x,y,.6+rand()*1.9,.3+rand()*.7,rand()*Math.PI,0,Math.PI*2);ctx.fill();
   if(i%6===0){ctx.strokeStyle='rgba(147,122,77,.17)';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(x-8,y);ctx.quadraticCurveTo(x,y+2,x+9+rand()*9,y);ctx.stroke();}
  }
 }
 tiles.set(kind,canvas);return canvas;
}

function ground(g,world,cities){
 const cacheKey=g||cities,size=g||world;
 if(groundCache.has(cacheKey))return groundCache.get(cacheKey);
 const cols=Math.ceil(size.width/12),rows=Math.ceil(size.height/12),count=cols*rows;
 const heights=new Float32Array(count),forest=new Float32Array(count),water=new Float32Array(count);
 const base=makeCanvas(1);base.width=cols;base.height=rows;
 const ctx=base.getContext('2d'),pixels=ctx.createImageData(cols,rows);
 const masks=kinds.map(()=>{const c=makeCanvas(1);c.width=cols;c.height=rows;return c;});
 const maskPixels=masks.map(c=>c.getContext('2d').createImageData(cols,rows));
 const legacy=g?null:{cities};
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const i=y*cols+x,wx=(x+.5)*size.width/cols,wy=(y+.5)*size.height/rows;
  if(g){heights[i]=sampleField(g,'elevation',wx,wy);forest[i]=g.version>=5?vegetationAt(g,wx,wy).canopy:sampleField(g,'forest',wx,wy);water[i]=sampleField(g,'riverDistance',wx,wy);}
  else{const type=regionAt(legacy,wx,wy)?.terrain;heights[i]=type==='산악'?.65:type==='구릉'?.42:.18;forest[i]=type==='숲'?.95:.03;water[i]=type==='수변'?25:300;}
 }
 if(!g)for(const field of [heights,forest,water])soften(field,cols,rows);
 const palette=[[188,189,142],[166,158,115],[174,172,152],[193,179,139]];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const i=y*cols+x,phase=g?.warp||0,patch=.74+.26*Math.sin(x/14+phase)*Math.sin(y/19-phase),bank=(1-smooth(20,95,water[i]))*patch,rock=smooth(.29,.57,heights[i]),woods=smooth(.25,.7,forest[i])*(1-rock);
  const weights=[(1-bank)*(1-rock-woods),(1-bank)*woods,(1-bank)*rock,bank];
  const dx=heights[y*cols+Math.min(cols-1,x+3)]-heights[y*cols+Math.max(0,x-3)],dy=heights[Math.min(rows-1,y+3)*cols+x]-heights[Math.max(0,y-3)*cols+x];
  const shade=g?1+Math.max(-.035,Math.min(.02,(dx+dy)*.18)):1;
  for(let k=0;k<3;k++)pixels.data[i*4+k]=weights.reduce((sum,w,j)=>sum+w*palette[j][k],0)*shade;
  pixels.data[i*4+3]=255;
  for(let j=0;j<4;j++){const p=maskPixels[j].data;p[i*4]=p[i*4+1]=p[i*4+2]=255;p[i*4+3]=Math.round(weights[j]*255);}
 }
 ctx.putImageData(pixels,0,0);masks.forEach((c,i)=>c.getContext('2d').putImageData(maskPixels[i],0,0));
 // Bake material blending once; panning only copies the finished ground painting.
 const result=makeCanvas(1);result.width=Math.ceil(size.width/2);result.height=Math.ceil(size.height/2);
 const output=result.getContext('2d'),layer=makeCanvas(1);layer.width=result.width;layer.height=result.height;
 const paint=layer.getContext('2d');output.drawImage(base,0,0,result.width,result.height);
 for(let i=0;i<kinds.length;i++){
  paint.setTransform(1,0,0,1,0,0);paint.globalCompositeOperation='source-over';paint.clearRect(0,0,layer.width,layer.height);
  paint.setTransform(result.width/size.width,0,0,result.height/size.height,0,0);paint.drawImage(masks[i],0,0,size.width,size.height);
  paint.globalCompositeOperation='source-in';
  const pattern=paint.createPattern(material(kinds[i]),'repeat'),angle=.17+i*.23;
  pattern.setTransform({a:Math.cos(angle),b:Math.sin(angle),c:-Math.sin(angle),d:Math.cos(angle),e:i*93,f:i*57});
  paint.fillStyle=pattern;paint.fillRect(0,0,size.width,size.height);output.drawImage(layer,0,0);
 }
 groundCache.set(cacheKey,result);return result;
}

export function groundTile(g,x,y,size){
   const base=makeCanvas(1);base.width=base.height=48;const paint=base.getContext('2d'),pixels=paint.createImageData(48,48);
   for(let row=0;row<48;row++)for(let col=0;col<48;col++){
    const wx=x+(col+.5)*size/48,wy=y+(row+.5)*size/48,type=g.legacy?regionAt(g.state,wx,wy)?.terrain:null,h=g.legacy?(type==='산악'?.65:type==='구릉'?.42:.18):sampleField(g,'elevation',wx,wy),f=g.legacy?(type==='숲'?.95:.03):g.version>=5?vegetationAt(g,wx,wy).canopy:sampleField(g,'forest',wx,wy),d=g.legacy?(type==='수변'?25:300):sampleField(g,'riverDistance',wx,wy);
    const bank=1-smooth(20,95,d),rock=smooth(.29,.57,h),woods=smooth(.25,.7,f)*(1-rock),weights=[(1-bank)*(1-rock-woods),(1-bank)*woods,(1-bank)*rock,bank],palette=[[188,189,142],[166,158,115],[174,172,152],[193,179,139]],i=(row*48+col)*4;
    for(let k=0;k<3;k++)pixels.data[i+k]=weights.reduce((n,w,j)=>n+w*palette[j][k],0);pixels.data[i+3]=255;
   }
   paint.putImageData(pixels,0,0);const tile=makeCanvas(1);tile.width=tile.height=256;const output=tile.getContext('2d');output.drawImage(base,0,0,256,256);
   output.scale(256/size,256/size);const pattern=output.createPattern(material('grass'),'repeat');pattern.setTransform({a:1,b:0,c:0,d:1,e:-x,f:-y});output.fillStyle=pattern;output.fillRect(0,0,size,size);
 return tile;
}

function drawChunks(ctx,g,bounds,zoom,known,backend=null){
 let cached=chunkCache.get(g);if(!cached){cached=new Map();chunkCache.set(g,cached);}
 const {size}=tileSpec(zoom,bounds,g);
 let drawn=0;
 for(let y=Math.max(0,Math.floor(bounds.top/size)*size);y<Math.min(g.height,bounds.bottom);y+=size)for(let x=Math.max(0,Math.floor(bounds.left/size)*size);x<Math.min(g.width,bounds.right);x+=size){
  if(known&&!known.some(b=>overlap(b,{left:x,right:x+size,top:y,bottom:y+size})))continue;
  const key=`${size}:${x},${y}`;let tile=backend?backend.ground(g,x,y,size):cached.get(key);
  if(!tile){
   if(!backend)tile=groundTile(g,x,y,size);
  }
  if(!tile)continue;if(!backend){cached.delete(key);cached.set(key,tile);}const bleed=.5/zoom;ctx.drawImage(tile,x-bleed,y-bleed,size+bleed*2,size+bleed*2);drawn++;
 }
 while(cached.size>64)cached.delete(cached.keys().next().value);
 g.renderChunks={drawn,cached:backend?drawn:cached.size,canvasPixels:(backend?drawn:cached.size)*256*256};
}

export function drawGround(ctx,world,art,g=null,cities=null,bounds=null,zoom=1,known=null,backend=null){
 ctx.save();ctx.imageSmoothingEnabled=true;
 if(g?.frontier){
  let count=0;for(const part of g.parts(bounds,known)){const local={left:bounds.left-part.x,right:bounds.right-part.x,top:bounds.top-part.y,bottom:bounds.bottom-part.y},visible=known?.map(b=>({left:b.left-part.x,right:b.right-part.x,top:b.top-part.y,bottom:b.bottom-part.y}));ctx.save();ctx.translate(part.x,part.y);drawChunks(ctx,part.g,local,zoom,visible,backend);count+=part.g.renderChunks?.cached||0;ctx.restore();}
  g.renderChunks={cached:count};ctx.restore();return;
 }
 if(!g&&world.width>5400&&cities){let legacy=legacyChunks.get(cities);if(!legacy){legacy={legacy:cities,state:{cities,worldScale:world.width/5400},width:world.width,height:world.height,scale:world.width/5400};legacyChunks.set(cities,legacy);}drawChunks(ctx,legacy,bounds,zoom,known);ctx.restore();return;}
 if(g?.scale){drawChunks(ctx,g,bounds||{left:0,top:0,right:g.width,bottom:g.height},zoom,known,backend);ctx.restore();return;}
 const surfaces=g||cities?ground(g,world,cities):null;
 if(surfaces){ctx.drawImage(surfaces,0,0,world.width,world.height);ctx.restore();return;}
 ctx.fillStyle='#a5ad8a';ctx.fillRect(0,0,world.width,world.height);
 if(art.ground?.complete&&art.ground.naturalWidth){ctx.globalAlpha=.16;ctx.fillStyle=ctx.createPattern(art.ground,'repeat');ctx.fillRect(0,0,world.width,world.height);}
 ctx.globalAlpha=1;
 ctx.fillStyle=ctx.createPattern(material('grass'),'repeat');ctx.fillRect(0,0,world.width,world.height);ctx.restore();
}
