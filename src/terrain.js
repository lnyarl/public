import {PriorityQueue} from './priority-queue.js';
import {mountainFeatures,mountainField} from './mountains.js';

export const TERRAIN_VERSION=5;
export const FOREST_COVERAGE={min:.4,max:.6};
const WIDTH=5400,HEIGHT=4100,COLS=181,ROWS=137,SX=WIDTH/(COLS-1),SY=HEIGHT/(ROWS-1),COUNT=COLS*ROWS;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,value)=>{const t=clamp((value-a)/(b-a));return t*t*(3-2*t);};
const cache=new Map();
export function installTerrain(g){cache.set(`${g.version}:${g.seed>>>0}`,g);while(cache.size>8)cache.delete(cache.keys().next().value);}
const sampling=new WeakMap();
function random(seed){let n=seed>>>0;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);}
function hash(seed,x,y){let n=(seed^Math.imul(x,374761393)^Math.imul(y,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
function noise(seed,x,y){const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy,a=u*u*(3-2*u),b=v*v*(3-2*v);return (hash(seed,ix,iy)*(1-a)+hash(seed,ix+1,iy)*a)*(1-b)+(hash(seed,ix,iy+1)*(1-a)+hash(seed,ix+1,iy+1)*a)*b;}
// Apply the same invertible bend to land, water and gameplay samples.
export function warped(g,x,y){const phase=g.warp,wx=x+(Math.sin(y/240+phase)*35+Math.sin(y/630+phase*2)*55)*Math.sin(Math.PI*x/WIDTH),wy=y+(Math.sin(wx/260+phase)*40+Math.sin(wx/750+phase*3)*65)*Math.sin(Math.PI*y/HEIGHT);return {x:wx,y:wy};}
export function sampleField(g,field,x,y){
 if(g.frontier){const col=Math.max(0,Math.min(9,Math.floor(x/5400))),row=Math.max(0,Math.min(9,Math.floor(y/4100)));return sampleField(g.chunk(col,row),field,x-col*5400,y-row*4100);}
 if(g.base)return sampleField(g.base,field,x/g.scale,y/g.scale)*(field==='riverDistance'?g.scale:1);
 let point=sampling.get(g);if(!point||point.x!==x||point.y!==y){let px=x,py=y;const ay=Math.sin(x/260+g.warp)*40+Math.sin(x/750+g.warp*3)*65;for(let k=0;k<5;k++)py=y-ay*Math.sin(Math.PI*py/HEIGHT);const ax=Math.sin(py/240+g.warp)*35+Math.sin(py/630+g.warp*2)*55;for(let k=0;k<5;k++)px=x-ax*Math.sin(Math.PI*px/WIDTH);point={x,y,u:clamp(px/SX,0,COLS-1),v:clamp(py/SY,0,ROWS-1)};sampling.set(g,point);}
 const {u,v}=point,c=Math.min(COLS-2,Math.floor(u)),r=Math.min(ROWS-2,Math.floor(v)),a=u-c,b=v-r,i=r*COLS+c,f=g[field];return (f[i]*(1-a)+f[i+1]*a)*(1-b)+(f[i+COLS]*(1-a)+f[i+COLS+1]*a)*b;
}
export function terrainAt(g,x,y){const h=sampleField(g,'elevation',x,y),river=sampleField(g,'riverDistance',x,y),forest=sampleField(g,'forest',x,y);return river<78?'수변':h>.51?'산악':h>.34?'구릉':forest>.43?'숲':'평야';}

// Tree cover and species share environmental fields; randomness only thins stands.
export function vegetationAt(g,x,y){
 if(g.frontier){const col=Math.max(0,Math.min(9,Math.floor(x/5400))),row=Math.max(0,Math.min(9,Math.floor(y/4100)));return vegetationAt(g.chunk(col,row),x-col*5400,y-row*4100);}
 if(g.base)return vegetationAt(g.base,x/g.scale,y/g.scale);
 const h=sampleField(g,'elevation',x,y),water=sampleField(g,'riverDistance',x,y),moisture=sampleField(g,'moisture',x,y),forest=sampleField(g,'forest',x,y),slope=sampleField(g,'slope',x,y);
 const temperature=clamp(.36+.32*y/g.height-.65*h+(noise(g.seed+41,x/1500,y/1500)-.5)*.24);
 const riparian=(1-smooth(85,180,water))*smooth(.5,.7,moisture)*(1-smooth(.27,.36,h));
 const growing=clamp((.53-h)/.09)*(1-smooth(.12,.23,slope))*smooth(45,85,water);
 const canopy=Math.max(smooth(.24,.72,forest)*smooth(.25,.48,moisture),riparian*.7)*growing;
 if(water<=45)return {biome:'water',canopy:0,kind:null,species:null};
 if(h>=.53||slope>=.23)return {biome:'alpine',canopy:0,kind:null,species:null};
 if(canopy<.02)return {biome:moisture<.4?'dryGrassland':'grassland',canopy:0,kind:null,species:null};
 const stand=noise(g.seed+43,x/320,y/320),conifer=temperature<.39||(h>.31&&moisture<.62);
 const kind=conifer?'pines':'oak';
 const species=conifer?(moisture>.66&&h>.23?'fir-wide':stand>.48?'pine-tall':'pines'):(riparian>.3?'birch':moisture>.59&&stand>.35?'oak-round':'oak');
 return {biome:riparian>.3?'riparian':conifer?'coniferForest':'broadleafForest',canopy,kind,species};
}
function neighbors(i,visit){const x=i%COLS,y=Math.floor(i/COLS);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy||x+dx<0||x+dx>=COLS||y+dy<0||y+dy>=ROWS)continue;visit(i+dy*COLS+dx,Math.hypot(dx*SX,dy*SY));}}
function drainage(height){
 const queue=new PriorityQueue(),seen=new Uint8Array(COUNT),downstream=new Int32Array(COUNT).fill(-1);
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(!x||!y||x===COLS-1||y===ROWS-1){const i=y*COLS+x;seen[i]=1;queue.push(i,height[i]);}
 while(queue.length){const {id:i}=queue.pop();neighbors(i,j=>{if(seen[j])return;seen[j]=1;height[j]=Math.max(height[j],height[i]+.00002);downstream[j]=i;queue.push(j,height[j]);});}return downstream;
}
function accumulate(rainfall,downstream){
 const incoming=new Uint8Array(COUNT),flow=new Float32Array(rainfall),queue=new Int32Array(COUNT);let head=0,tail=0;
 for(const to of downstream)if(to>=0)incoming[to]++;
 for(let i=0;i<COUNT;i++)if(!incoming[i])queue[tail++]=i;
 while(head<tail){const i=queue[head++],to=downstream[i];if(to<0)continue;flow[to]+=flow[i];if(!--incoming[to])queue[tail++]=to;}return flow;
}

export function terrainForSeed(seed,{version=TERRAIN_VERSION}={}){
 if(![2,3,4,TERRAIN_VERSION].includes(version))throw new Error('지원하지 않는 지형 생성 버전입니다.');
 seed>>>=0;const key=`${version}:${seed}`;if(cache.has(key)){const g=cache.get(key);cache.delete(key);cache.set(key,g);return g;}
 const rand=random(seed^0x74e331),ranges=[],height=new Float32Array(COUNT),rainfall=new Float32Array(COUNT),slope=new Float32Array(COUNT);let ca,sa,along;
 if(version===2){
  const angle=rand()*Math.PI;ca=Math.cos(angle);sa=Math.sin(angle);const across=Math.abs(WIDTH*sa)+Math.abs(HEIGHT*ca);along=Math.abs(WIDTH*ca)+Math.abs(HEIGHT*sa);const rangeCount=2+Math.floor(rand()*2);
  for(let k=0;k<rangeCount;k++)ranges.push({offset:((k+1)/(rangeCount+1)-.5)*across+(rand()-.5)*200,phase:rand()*6.28,tilt:(rand()-.5)*.35,branchStart:(rand()-.5)*along*.45,branchLength:900+rand()*700,branchTurn:(rand()>.5?1:-1)*(.35+rand()*.25),width:125+rand()*110,amplitude:130+rand()*180,passes:[(rand()-.5)*along*.7,(rand()-.5)*along*.7]});
 }
 const features=version>=3?mountainFeatures(seed,WIDTH,HEIGHT):[],relief=version>=3?mountainField(features,COLS,ROWS,SX,SY):null;
 const branchAt=(range,u)=>ridgeAt(range,range.branchStart)+(u-range.branchStart)*range.branchTurn+Math.sin((u-range.branchStart)/350)*65;
 const ridgeAt=(range,u)=>range.offset+u*range.tilt+Math.sin(u/760+range.phase)*range.amplitude+Math.sin(u/310+range.phase)*55;
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
  const i=y*COLS+x,wx=x*SX,wy=y*SY,u=version===2?(wx-WIDTH/2)*ca+(wy-HEIGHT/2)*sa:wx,v=version===2?-(wx-WIDTH/2)*sa+(wy-HEIGHT/2)*ca:wy;
  let ridge=relief?relief[i]:0;
  for(const range of ranges){const d=Math.abs(v-ridgeAt(range,u)),gap=Math.min(...range.passes.map(p=>Math.abs(u-p))),pass=1-.67*Math.exp(-((gap/125)**2)),core=Math.exp(-((d/range.width)**2))*pass;
   ridge=Math.max(ridge,core*.51+Math.exp(-((d/(range.width*2.6))**2))*.14);
   const t=(u-range.branchStart)/range.branchLength;if(t>0&&t<1){const bd=Math.abs(v-branchAt(range,u)),taper=Math.min(1,t*5,(1-t)*3);ridge=Math.max(ridge,(Math.exp(-((bd/(range.width*.65))**2))*.48+Math.exp(-((bd/(range.width*1.6))**2))*.10)*taper);}
  }
  const edge=Math.min(wx/WIDTH,1-wx/WIDTH,wy/HEIGHT,1-wy/HEIGHT);
  height[i]=.035+edge*.18+noise(seed,wx/1100,wy/1100)*.13+noise(seed+1,wx/340,wy/340)*.026+ridge*(.8+noise(seed+2,u/480,v/480)*.2);
  rainfall[i]=.55+noise(seed+3,wx/1300,wy/1300)*.8+ridge*.25;
 }
 // Priority-Flood: raise closed depressions just enough to drain to the boundary.
 let downstream=drainage(height),flow=accumulate(rainfall,downstream);
 // Two shallow incision passes gather nearby channels into shared valley floors.
 for(let pass=0;pass<2;pass++){
  const depth=Float32Array.from(flow,q=>Math.log1p(q/145)*.008),carved=new Float32Array(height);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){let cut=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){if(x+dx<0||x+dx>=COLS||y+dy<0||y+dy>=ROWS)continue;cut=Math.max(cut,depth[(y+dy)*COLS+x+dx]/(1+(dx*dx+dy*dy)*.18));}carved[y*COLS+x]-=cut;}
  height.set(carved);downstream=drainage(height);flow=accumulate(rainfall,downstream);
 }
 for(let i=0;i<COUNT;i++)if(downstream[i]>=0){let best=0;neighbors(i,(j,d)=>{const drop=(height[i]-height[j])/d;if(drop>best)best=drop;});slope[i]=best*30;}
 const river=new Uint8Array(COUNT),riverDistance=new Float32Array(COUNT).fill(Infinity);
 for(let i=0;i<COUNT;i++)if(flow[i]>=145){river[i]=1;riverDistance[i]=0;}
 const diagonal=Math.hypot(SX,SY);
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const i=y*COLS+x;let d=riverDistance[i];if(x)d=Math.min(d,riverDistance[i-1]+SX);if(y){d=Math.min(d,riverDistance[i-COLS]+SY);if(x)d=Math.min(d,riverDistance[i-COLS-1]+diagonal);if(x<COLS-1)d=Math.min(d,riverDistance[i-COLS+1]+diagonal);}riverDistance[i]=d;}
 for(let y=ROWS-1;y>=0;y--)for(let x=COLS-1;x>=0;x--){const i=y*COLS+x;let d=riverDistance[i];if(x<COLS-1)d=Math.min(d,riverDistance[i+1]+SX);if(y<ROWS-1){d=Math.min(d,riverDistance[i+COLS]+SY);if(x)d=Math.min(d,riverDistance[i+COLS-1]+diagonal);if(x<COLS-1)d=Math.min(d,riverDistance[i+COLS+1]+diagonal);}riverDistance[i]=d;}
 const forest=new Float32Array(COUNT),moisture=new Float32Array(COUNT);
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const i=y*COLS+x,wx=x*SX,wy=y*SY;
  moisture[i]=clamp((rainfall[i]-.55)*.65+.28*Math.exp(-riverDistance[i]/260)+noise(seed+4,wx/700,wy/700)*.32);
  forest[i]=clamp((moisture[i]-.29)*2.1)*clamp((.55-height[i])/.16)*clamp(riverDistance[i]/32);
 }
 if(version>=4){
  // Leave a small margin for interpolation and the map's coordinate bend.
  const bounds=version===4?{min:.12,max:.32}:FOREST_COVERAGE,margin=version===4?.01:.025;
  const target=bounds.min+margin+hash(seed,137,59)*(bounds.max-bounds.min-margin*2),patch=420+hash(seed,61,173)*680,scores=new Float32Array(COUNT),eligible=[];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
   const i=y*COLS+x,factor=clamp((.55-height[i])/.16)*clamp(riverDistance[i]/32);scores[i]=moisture[i]*.7+noise(seed+31,x*SX/patch,y*SY/patch)*.3;
   if(factor>.43)eligible.push(scores[i]-(.43/factor-.43)/4);
  }
  // Select a seed-specific area, then feather its edges rather than roll cells.
  eligible.sort((a,b)=>a-b);
  const cut=eligible.length-Math.round(COUNT*target),threshold=(eligible[cut-1]+eligible[cut])/2;
  for(let i=0;i<COUNT;i++)forest[i]=clamp(.43+(scores[i]-threshold)*4)*clamp((.55-height[i])/.16)*clamp(riverDistance[i]/32);
 }
 const g={version,seed,warp:hash(seed,91,37)*6.28,width:WIDTH,height:HEIGHT,cols:COLS,rows:ROWS,stepX:SX,stepY:SY,elevation:height,rainfall,slope,downstream,flow,river,riverDistance,moisture,forest,riverPaths:[],scenery:[],ranges:[]};
 const incoming=new Uint8Array(COUNT);for(let i=0;i<COUNT;i++)if(river[i]&&downstream[i]>=0)incoming[downstream[i]]++;
 const point=i=>({...warped(g,(i%COLS)*SX,Math.floor(i/COLS)*SY),flow:flow[i],height:height[i]});
 for(let i=0;i<COUNT;i++)if(river[i]&&incoming[i]!==1&&downstream[i]>=0){const points=[point(i)];let j=i;do{j=downstream[j];points.push(point(j));}while(downstream[j]>=0&&incoming[j]===1);g.riverPaths.push({points,width:clamp(2+Math.sqrt(flow[i])*.38,4,29)});}
 for(const range of ranges){const points=[];for(let u=-along*.6;u<=along*.6;u+=90){const v=ridgeAt(range,u),x=WIDTH/2+u*ca-v*sa,y=HEIGHT/2+u*sa+v*ca;if(x>=0&&x<=WIDTH&&y>=0&&y<=HEIGHT)points.push(warped(g,x,y));}g.ranges.push(points);const branch=[];for(let u=range.branchStart;u<range.branchStart+range.branchLength;u+=100){const v=branchAt(range,u),x=WIDTH/2+u*ca-v*sa,y=HEIGHT/2+u*sa+v*ca;if(x>=0&&x<=WIDTH&&y>=0&&y<=HEIGHT)branch.push(warped(g,x,y));}g.ranges.push(branch);}
 if(version>=3)for(const feature of features)if(feature.points)g.ranges.push(feature.points.map(p=>warped(g,p.x,p.y)));
 if(version>=3)g.features=features;
 // Version 2 retains its original scenery as well as its original height field.
 if(version===2)for(const range of g.ranges)for(let k=0;k<range.length;k++){
  const p=range[k],x=p.x+(hash(seed+12,k,range.length)-.5)*75,y=p.y+(hash(seed+13,k,range.length)-.5)*90,h=sampleField(g,'elevation',x,y);
  if(h>.46&&sampleField(g,'riverDistance',x,y)>80)g.scenery.push({kind:'mountain',x,y,width:145+hash(seed+14,k,range.length)*75});
  if(k%4===0&&k+1<range.length){const next=range[k+1],length=Math.hypot(next.x-p.x,next.y-p.y),side=hash(seed+15,k,range.length)>.5?95:-95,px=x-(next.y-p.y)/length*side,py=y+(next.x-p.x)/length*side;if(sampleField(g,'elevation',px,py)>.48&&sampleField(g,'riverDistance',px,py)>100)g.scenery.push({kind:'mountain',x:px,y:py,width:125+hash(seed+16,k,range.length)*65});}
 }
 // Sample high ground with irregular spacing, including isolated massifs.
 if(version>=3){
  const candidates=[];
  for(let row=0;row<Math.ceil(HEIGHT/44);row++)for(let col=0;col<Math.ceil(WIDTH/44);col++){
   const x=(col+hash(seed+20,col,row))*44,y=(row+hash(seed+21,col,row))*44;if(x>WIDTH||y>HEIGHT)continue;
   const h=sampleField(g,'elevation',x,y);if(h>.47&&sampleField(g,'riverDistance',x,y)>85)candidates.push({x,y,h,col,row});
  }
  candidates.sort((a,b)=>b.h-a.h);
  const peaks=[];for(const p of candidates){const spacing=48+hash(seed+22,p.col,p.row)*30;if(peaks.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<Math.max(spacing,q.spacing)))continue;
   peaks.push({...p,spacing});g.scenery.push({kind:'mountain',x:p.x,y:p.y,width:100+hash(seed+23,p.col,p.row)*60,variant:Math.floor(hash(seed+24,p.col,p.row)*3)});
  }
 }
 // Scenery uses world coordinates, independent of the 540 administrative districts.
 const spacing=version>=5?60:66;
 for(let row=0;row<Math.ceil(HEIGHT/spacing);row++)for(let col=0;col<Math.ceil(WIDTH/spacing);col++){
  const x=(col+.2+hash(seed+8,col,row)*.6)*spacing,y=(row+.2+hash(seed+9,col,row)*.6)*spacing;if(x>WIDTH||y>HEIGHT)continue;
  const h=sampleField(g,'elevation',x,y),d=sampleField(g,'riverDistance',x,y),raw=sampleField(g,'forest',x,y),density=version===4?Math.sqrt(raw):raw,roll=hash(seed+10,col,row);
  if(version>=5){
   const vegetation=vegetationAt(g,x,y);
   if(vegetation.canopy>.02&&roll<vegetation.canopy*.9)g.scenery.push({kind:vegetation.kind,species:vegetation.species,biome:vegetation.biome,x,y,width:46+vegetation.canopy*60+roll*8});
   else if(h>.32&&h<=.48&&d>85&&vegetation.canopy<.2&&roll<.18)g.scenery.push({kind:'hills',x,y,width:145});
   continue;
  }
  if(h>.32&&h<=.48&&d>65&&roll<.18)g.scenery.push({kind:'hills',x,y,width:145});
  else if(d>23&&h<.5&&roll<density*.88+.018)g.scenery.push({kind:hash(seed+11,col,row)>.5?'oak':'pines',x,y,width:44+density*64+roll*12});
 }
 g.scenery.sort((a,b)=>a.y-b.y||a.x-b.x);
 cache.set(key,g);if(cache.size>3)cache.delete(cache.keys().next().value);return g;
}
