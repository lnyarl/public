import {WORLD,makeWorld,invalidateWorld} from './world.js';
import {terrainForSeed,TERRAIN_VERSION} from './terrain.js';
import {makeResourceSites} from './resource-sites.js';

export const CORE_SECTOR='4,4';
const sectorId=(col,row)=>`${col},${row}`;
export const sectorSeed=(s,col,row)=>sectorId(col,row)===CORE_SECTOR?s.worldSeed:(s.worldSeed^Math.imul(col+1,73856093)^Math.imul(row+1,19349663))>>>0;
const prefix=(key,id)=>key===CORE_SECTOR?id:`sector-${key.replace(',','-')}:${id}`;
export function validateFrontier(s){
 const f=s.frontier;if(s.worldScale!==10||!f||f.version!==1||!Array.isArray(f.chunks)||f.chunks.length>100||!f.chunks.includes(CORE_SECTOR)||new Set(f.chunks).size!==f.chunks.length||f.chunks.some(k=>!/^\d,\d$/.test(k)))throw new Error('확장 지도 저장을 읽을 수 없습니다.');
}

export function makeSector(s,col,row){
 const key=sectorId(col,row),core=key===CORE_SECTOR,dx=col*WORLD.width,dy=row*WORLD.height;
 const cities=makeWorld(sectorSeed(s,col,row),{generatorVersion:core?s.generatorVersion:7}),roads=new Set();
 for(const c of cities){
  c.id=prefix(key,c.id);c.sector=key;c.x+=dx;c.y+=dy;c.poly=c.poly.map(([x,y])=>[x+dx,y+dy]);c.col=Math.floor(c.x/180);c.row=Math.floor(c.y/(4100/18));
  c.neighbors=c.neighbors.map(id=>prefix(key,id));c.edges=c.edges.map(id=>id?prefix(key,id):null);
  c.roads=Object.fromEntries(Object.entries(c.roads||{}).map(([id,b])=>{if(!roads.has(b)){roads.add(b);b.x+=dx;b.y+=dy;}return [prefix(key,id),b];}));
  if(!core){c.owner='neutral';c.major=false;c.soldiers=0;c.defense=0;delete c.capitalOf;c.name=`중립 ${c.terrain} · ${col+1}-${row+1}`;c.region='미개척 변경';}
 }
 return cities;
}

function stitchPair(a,b,axis,line){
 const cross=1-axis,side=list=>list.flatMap(c=>c.poly.flatMap((p,i)=>{const q=c.poly[(i+1)%c.poly.length];return Math.abs(p[axis]-line)<.001&&Math.abs(q[axis]-line)<.001?[{c,lo:Math.min(p[cross],q[cross]),hi:Math.max(p[cross],q[cross])}]:[];}));
 const aa=side(a),bb=side(b);
 const split=(edges,other)=>{for(const c of new Set(edges.map(e=>e.c))){const poly=[],ids=[];
  for(let i=0;i<c.poly.length;i++){
   const p=c.poly[i],q=c.poly[(i+1)%c.poly.length];if(Math.abs(p[axis]-line)>.001||Math.abs(q[axis]-line)>.001){poly.push(p);ids.push(c.edges[i]);continue;}
   const lo=Math.min(p[cross],q[cross]),hi=Math.max(p[cross],q[cross]),cuts=[p[cross],q[cross]];
   for(const e of other)for(const v of [e.lo,e.hi])if(v>lo+.00001&&v<hi-.00001)cuts.push(v);
   const sorted=[...new Set(cuts)].sort((x,y)=>p[cross]<q[cross]?x-y:y-x);
   for(let k=0;k<sorted.length-1;k++){const mid=(sorted[k]+sorted[k+1])/2,n=other.find(e=>mid>=e.lo-.00001&&mid<=e.hi+.00001)?.c,v=[0,0];v[axis]=line;v[cross]=sorted[k];poly.push(v);ids.push(n?.id||null);
    if(n){if(!c.neighbors.includes(n.id))c.neighbors.push(n.id);const length=Math.hypot(c.x-n.x,c.y-n.y);c.roads[n.id]??={x:(c.x+n.x)/2,y:(c.y+n.y)/2,cost:length*1.3};}
   }
  }c.poly=poly;c.edges=ids;
 }};
 split(aa,bb);split(bb,aa);
}

export function stitchSectors(cities,chunks){
 const groups=new Map(chunks.map(k=>[k,[]]));for(const c of cities)groups.get(c.sector).push(c);
 for(const key of [...chunks].sort()){const [x,y]=key.split(',').map(Number),a=groups.get(key);for(const [nx,ny,axis,line] of [[x+1,y,0,(x+1)*5400],[x,y+1,1,(y+1)*4100]]){const b=groups.get(sectorId(nx,ny));if(b)stitchPair(a,b,axis,line);}}
 const byId=new Map(cities.map(c=>[c.id,c]));for(const c of cities)c.neighbors=[...c.neighbors.filter(id=>byId.get(id).sector===c.sector),...c.neighbors.filter(id=>byId.get(id).sector!==c.sector).sort()];
 return cities;
}
export function restoreFrontierWorld(s){validateFrontier(s);return stitchSectors(s.frontier.chunks.flatMap(key=>makeSector(s,...key.split(',').map(Number))),s.frontier.chunks);}

export function loadSector(s,col,row){
 if(!s.frontier||col<0||col>=10||row<0||row>=10)return false;
 const key=sectorId(col,row);if(s.frontier.chunks.includes(key))return false;
 const added=makeSector(s,col,row);s.frontier.chunks.push(key);s.cities.push(...added);stitchSectors(s.cities,s.frontier.chunks);s.revision++;invalidateWorld(s);
 if(s.economyRules===1){const local={...s,cities:added,worldSeed:sectorSeed(s,col,row)};s.economy.sites.push(...makeResourceSites(local));}
 return true;
}

export function ensureFrontierVision(s){
 if(!s.frontier)return;
 const wanted=new Set();
 for(const c of s.cities)if(c.owner===s.player){const [col,row]=c.sector.split(',').map(Number);for(const [x,y] of c.poly){if(Math.abs(x-col*5400)<.001)wanted.add(sectorId(col-1,row));if(Math.abs(x-(col+1)*5400)<.001)wanted.add(sectorId(col+1,row));if(Math.abs(y-row*4100)<.001)wanted.add(sectorId(col,row-1));if(Math.abs(y-(row+1)*4100)<.001)wanted.add(sectorId(col,row+1));}for(const dx of [-850,0,850])for(const dy of [-850,0,850])wanted.add(sectorId(Math.floor((c.x+dx)/5400),Math.floor((c.y+dy)/4100)));}
 for(const a of s.armies)if(a.faction===s.player){const x=a.sx+(a.tx-a.sx)*a.progress,y=a.sy+(a.ty-a.sy)*a.progress;for(const dx of [-420,0,420])for(const dy of [-420,0,420])wanted.add(sectorId(Math.floor((x+dx)/5400),Math.floor((y+dy)/4100)));}
 for(const key of wanted)loadSector(s,...key.split(',').map(Number));
}

const geographyCache=new WeakMap();
const terrainSources=new WeakMap();
export function setFrontierTerrainSource(s,source){if(source)terrainSources.set(s,source);}
export function frontierGeography(s,base){
 let g=geographyCache.get(s);if(g)return g;
 const local=new Map([[CORE_SECTOR,base]]);
 g={version:base.version,seed:s.worldSeed,width:54000,height:41000,scale:1,frontier:true,scenery:[],riverPaths:[],ranges:[],
  chunk(col,row){const key=sectorId(col,row),source=terrainSources.get(s);let value=source?source(sectorSeed(s,col,row),key===CORE_SECTOR?base.version:TERRAIN_VERSION):local.get(key);if(!value&&!source)value=key===CORE_SECTOR?base:terrainForSeed(sectorSeed(s,col,row),{version:TERRAIN_VERSION});if(value){local.delete(key);local.set(key,value);while(local.size>8)local.delete(local.keys().next().value);}return value;},
  parts(bounds,known){const parts=[];for(let row=Math.max(0,Math.floor(bounds.top/4100));row<Math.min(10,Math.ceil(bounds.bottom/4100));row++)for(let col=Math.max(0,Math.floor(bounds.left/5400));col<Math.min(10,Math.ceil(bounds.right/5400));col++){const x=col*5400,y=row*4100;if(known&&!known.some(b=>b.left<x+5400&&b.right>x&&b.top<y+4100&&b.bottom>y))continue;const chunk=this.chunk(col,row);if(chunk)parts.push({g:chunk,x,y});}return parts;}};
 geographyCache.set(s,g);return g;
}
