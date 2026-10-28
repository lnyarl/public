import {CITIES,OFFICERS,FACTIONS as ORIGINAL} from './game.js';
import {REALMS,KEEP_NAMES,HEROES} from './fantasy.js';
import {trace} from './logger.js';
import {TERRAIN_VERSION,terrainForSeed,terrainAt,sampleField} from './terrain.js';
export {TERRAIN_VERSION};
import {scatteredSites,shapeScatteredDistricts,connectDistricts} from './world-topology.js';
import {placeStrongholds} from './settlements.js';
import {scaleWorld,expandedGeography} from './large-world.js';
import {frontierGeography} from './frontier-world.js';
export const WORLD_GENERATOR_VERSION=7;

export const WORLD={width:5400,height:4100,cols:30,rows:18,count:540};
export const worldSize=s=>({width:WORLD.width*(s.worldScale||1),height:WORLD.height*(s.worldScale||1),cols:WORLD.cols*(s.frontier?10:1),rows:WORLD.rows*(s.frontier?10:1),count:WORLD.count*(s.frontier?100:1)});
export function riversForSeed(seed){const rand=generator(seed^0x51a7);return Array.from({length:3},(_,i)=>({y:WORLD.height*(.18+i*.29)+(rand()-.5)*280,amplitude:100+rand()*170,width:17+rand()*13,phase:rand()*Math.PI*2,slope:(rand()-.5)*450}));}
export const riverY=(river,x)=>river.y+Math.sin(x/570+river.phase)*river.amplitude+Math.sin(x/270+river.phase)*river.amplitude*.3+river.slope*(x/WORLD.width-.5);
const terrainVersion=version=>version>=7?TERRAIN_VERSION:version>=5?4:version===4?3:2;
export const geographyForWorld=s=>s.frontier?frontierGeography(s,terrainForSeed(s.worldSeed,{version:terrainVersion(s.generatorVersion)})):s.generatorVersion>=2&&s.generatorVersion<=WORLD_GENERATOR_VERSION?expandedGeography(terrainForSeed(s.worldSeed,{version:terrainVersion(s.generatorVersion)}),s.worldScale||1):null;
function noise(seed,x,y){
 const ix=Math.floor(x),iy=Math.floor(y),sx=x-ix,sy=y-iy,fx=sx*sx*(3-2*sx),fy=sy*sy*(3-2*sy);
 const hash=(a,b)=>{const n=Math.sin(a*127.1+b*311.7+(seed>>>0)*.013)*43758.5453;return n-Math.floor(n);};
 const a=hash(ix,iy)*(1-fx)+hash(ix+1,iy)*fx,b=hash(ix,iy+1)*(1-fx)+hash(ix+1,iy+1)*fx;return a*(1-fy)+b*fy;
}
export const TERRAINS={
 평야:{name:'평야',food:1.2,gold:1,travel:1,cover:0,description:'식량 생산에 유리하고 이동이 빠릅니다.'},
 수변:{name:'강가',food:1.35,gold:1.15,travel:1.2,cover:8,description:'식량과 교역 수입이 높지만 이동이 느려집니다.'},
 구릉:{name:'언덕',food:.8,gold:1.1,travel:1.3,cover:18,description:'식량 생산은 적지만 방어에 유리합니다.'},
 숲:{name:'숲',food:.75,gold:1.2,travel:1.4,cover:22,description:'목재 교역과 방어에 유리하지만 이동이 느립니다.'},
 산악:{name:'산지',food:.55,gold:.85,travel:1.65,cover:30,description:'생산과 이동은 불리하지만 방어에 강합니다.'}
};
export const FACTIONS={
 wei:{...ORIGINAL.wei,capital:'xuchang',temper:.85},shu:{...ORIGINAL.shu,capital:'xinye',temper:.6},wu:{...ORIGINAL.wu,capital:'jianye',temper:.65},
 liubiao:{name:'유표',ruler:'유표',han:'劉',color:'#a6ac71',capital:'xiangyang',temper:.38},
 liuzhang:{name:'유장',ruler:'유장',han:'益',color:'#b6a06d',capital:'chengdu',temper:.3},
 zhanglu:{name:'장로',ruler:'장로',han:'張',color:'#a39abb',capital:'hanzhong',temper:.45},
 mateng:{name:'마등',ruler:'마등',han:'馬',color:'#b69a82',capital:'wuwei',temper:.8},
 gongsun:{name:'공손찬',ruler:'공손찬',han:'公',color:'#c5c4b6',capital:'beiping',temper:.75},
 yuanshao:{name:'원소',ruler:'원소',han:'袁',color:'#b8b46e',capital:'ye',temper:.8},
 yuanshu:{name:'원술',ruler:'원술',han:'仲',color:'#c2a16c',anchor:[.82,.49],temper:.85},
 taoqian:{name:'도겸',ruler:'도겸',han:'陶',color:'#83b1ad',capital:'xiapi',temper:.3},
 hansui:{name:'한수',ruler:'한수',han:'韓',color:'#a68e99',anchor:[.13,.34],temper:.7},
 menghuo:{name:'남중',ruler:'맹획',han:'孟',color:'#7eaa80',anchor:[.16,.86],temper:.7},
 shixie:{name:'사섭',ruler:'사섭',han:'士',color:'#9ba57c',anchor:[.57,.94],temper:.35},
 kongrong:{name:'공융',ruler:'공융',han:'孔',color:'#8fa9b4',anchor:[.93,.28],temper:.3}
};
for(const [id,[name,ruler,han]] of Object.entries(REALMS))Object.assign(FACTIONS[id],{name,ruler,han});
Object.defineProperty(FACTIONS,'neutral',{value:{name:'중립지',ruler:'미개척 변경',han:'·',color:'#9ca88d',temper:0},enumerable:false});
export const POLICIES={balanced:{name:'균형',gold:1,food:1,morale:.035,description:'수입·식량·민심을 고르게 유지'},food:{name:'식량 중심',gold:.88,food:1.35,morale:.025,description:'식량 +35% · 수입 −12%'},trade:{name:'수입 중심',gold:1.35,food:.9,morale:-.04,description:'수입 +35% · 식량 −10% · 민심 하락'},security:{name:'민심 중심',gold:.78,food:1,morale:.18,description:'민심 회복 강화 · 수입 −22%'}};
export const PROJECTS={farm:'농업',market:'상업',fort:'방어',relief:'구호',levy:'모병',hire:'등용'};
export const DOCTRINES={defend:{name:'수비 우선',reserve:1.15,threshold:1.65},balanced:{name:'균형 지휘',reserve:.9,threshold:1.35},expand:{name:'확장 우선',reserve:.75,threshold:1.2}};
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function generator(seed){let value=seed>>>0;return()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};}
const cache=new WeakMap();

// Clip districts around their existing towns; saved positions and travel routes stay stable.
function shapeDistricts(cities,grid){
 for(const c of cities){
  const nearby=[];
  for(let row=c.row-2;row<=c.row+2;row++)for(let col=c.col-2;col<=c.col+2;col++){
   const n=grid.get(`${col},${row}`);if(n&&n!==c)nearby.push(n);
  }
  let poly=[[0,0],[WORLD.width,0],[WORLD.width,WORLD.height],[0,WORLD.height]];
  for(const n of nearby){
   const dx=n.x-c.x,dy=n.y-c.y,limit=(n.x*n.x+n.y*n.y-c.x*c.x-c.y*c.y)/2,next=[];
   for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],da=dx*a[0]+dy*a[1]-limit,db=dx*b[0]+dy*b[1]-limit;
    if(da<=0)next.push(a);
    if((da<=0)!==(db<=0)){const t=da/(da-db);next.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
   }
   poly=next;
  }
  c.poly=poly;c.edges=poly.map((a,i)=>{
   const b=poly[(i+1)%poly.length],x=(a[0]+b[0])/2,y=(a[1]+b[1])/2,d=(x-c.x)**2+(y-c.y)**2;
   return nearby.find(n=>Math.abs((x-n.x)**2+(y-n.y)**2-d)<.01)?.id??null;
  });
 }
}
export function index(s){let found=cache.get(s);if(!found){found={cities:new Map(s.cities.map(c=>[c.id,c]))};cache.set(s,found);}return found;}
export function invalidateWorld(s){cache.delete(s);}
function spatialIndex(s){
 const found=index(s);if(found.buckets)return found.buckets;
 const bucketWidth=worldSize(s).width/worldSize(s).cols,bucketHeight=worldSize(s).height/worldSize(s).rows;
 found.buckets=new Map();
 for(const c of s.cities){
  const xs=c.poly.map(p=>p[0]),ys=c.poly.map(p=>p[1]);
  for(let row=Math.max(0,Math.floor(Math.min(...ys)/bucketHeight));row<=Math.min(worldSize(s).rows-1,Math.floor(Math.max(...ys)/bucketHeight));row++)for(let col=Math.max(0,Math.floor(Math.min(...xs)/bucketWidth));col<=Math.min(worldSize(s).cols-1,Math.floor(Math.max(...xs)/bucketWidth));col++){
   const key=`${col},${row}`;if(!found.buckets.has(key))found.buckets.set(key,[]);found.buckets.get(key).push(c);
  }
 }
 return found.buckets;
}
export function regionsInBounds(s,b){
 const bucketWidth=worldSize(s).width/worldSize(s).cols,bucketHeight=worldSize(s).height/worldSize(s).rows;
 const result=new Set(),buckets=spatialIndex(s);
 for(let row=Math.max(0,Math.floor(b.top/bucketHeight));row<=Math.min(worldSize(s).rows-1,Math.floor(b.bottom/bucketHeight));row++)for(let col=Math.max(0,Math.floor(b.left/bucketWidth));col<=Math.min(worldSize(s).cols-1,Math.floor(b.right/bucketWidth));col++)for(const c of buckets.get(`${col},${row}`)||[])result.add(c);
 return [...result];
}
export const city=(s,id)=>index(s).cities.get(id);
export const officer=(s,id)=>s.officers[id];
export const owned=(s,f=s.player)=>s.cities.filter(c=>c.owner===f);
export const strongholds=(s,f)=>s.cities.filter(c=>c.major&&(f===undefined||c.owner===f));
const administrations=new WeakMap();
function administration(s){
 let cached=administrations.get(s);if(cached?.revision===s.revision)return cached;
 const hubs=strongholds(s),byTile=new Map(),lands=new Map(hubs.map(c=>[c.id,[]]));
 for(const c of s.cities){const hub=c.major?c:hubs.filter(h=>h.owner===c.owner).reduce((best,h)=>!best||dist(c,h)<dist(c,best)?h:best,null);if(hub){byTile.set(c.id,hub);if(!c.major)lands.get(hub.id).push(c);}}
 cached={revision:s.revision,byTile,lands};administrations.set(s,cached);return cached;
}
export const governingHub=(s,c)=>administration(s).byTile.get(typeof c==='string'?c:c.id);
export const hinterland=(s,c)=>administration(s).lands.get(typeof c==='string'?c:c.id)||[];
export function regionAt(s,x,y){
 const bucketWidth=worldSize(s).width/worldSize(s).cols,bucketHeight=worldSize(s).height/worldSize(s).rows;
 for(const c of spatialIndex(s).get(`${Math.floor(x/bucketWidth)},${Math.floor(y/bucketHeight)}`)||[]){let inside=false;
  for(let i=0,j=c.poly.length-1;i<c.poly.length;j=i++){const a=c.poly[i],b=c.poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}
  if(inside)return c;
 }
 return null;
}
export const stationedArmies=(s,c)=>s.armies.filter(a=>a.mode==='stationed'&&a.target===(typeof c==='string'?c:c.id));
export const stationedTroops=(s,c)=>c.soldiers+stationedArmies(s,c).filter(a=>a.faction===c.owner).reduce((n,a)=>n+a.troops,0);
export const troopTotal=(s,f=s.player)=>s.cities.reduce((n,c)=>n+(c.owner===f?c.soldiers:0),0)+s.armies.reduce((n,a)=>n+(a.faction===f?a.troops:0),0);

function legacyWorld(seed=42){
 const rand=generator(seed),w=WORLD.width/WORLD.cols,h=WORLD.height/WORLD.rows;
 const vertices=Array.from({length:WORLD.rows+1},(_,r)=>Array.from({length:WORLD.cols+1},(_,c)=>[c*w+(c&&c<WORLD.cols?(rand()-.5)*62:0),r*h+(r&&r<WORLD.rows?(rand()-.5)*75:0)]));
 const cities=[];
 const roots=['청하','임강','광릉','서릉','장평','평원','남안','영수','안평','곡양','운릉','동양','상산','영천','양곡','신평','백수','문현','낙성','강안','청계','광평','용천','수양','평릉','고성','무릉','임해','창오','안정'];
 const suffix=['동','서','남','북','상','하','중','외','내','신','고','평','광','영','장','청','흥','안'];
 const regions=['서량','옹주','익주','남중','기주','사예','형주','교주','유주','예주','양주','강동'];
 for(let r=0;r<WORLD.rows;r++)for(let c=0;c<WORLD.cols;c++){
  const poly=[vertices[r][c],vertices[r][c+1],vertices[r+1][c+1],vertices[r+1][c]];
  const x=poly.reduce((n,p)=>n+p[0],0)/4+(rand()-.5)*40,y=poly.reduce((n,p)=>n+p[1],0)/4+(rand()-.5)*45;
  const region=regions[Math.min(2,Math.floor(c/10))*4+Math.min(3,Math.floor(r/4.5))];
  const terrain=c<7?'산악':Math.abs(y-WORLD.height*.61)<180?'수변':r>12?'구릉':'평야';
  const population=Math.round(26000+rand()*48000),agriculture=25+rand()*35,commerce=20+rand()*35;
  cities.push({id:`county-${r*WORLD.cols+c}`,name:`${region} ${roots[c]}${suffix[r]}현`,region,col:c,row:r,x,y,poly,terrain,major:false,population,reserve:Math.round(population*.065),agriculture,commerce,defense:20+rand()*25,training:48+rand()*22,morale:65+rand()*18,weariness:0,soldiers:Math.round((900+rand()*1400)/50)*50,policy:'balanced',administration:55+Math.floor(rand()*30),cooldown:0});
 }
 const claimed=new Set();
 for(const original of CITIES){
  const target={x:original.x/980*WORLD.width,y:original.y/740*WORLD.height};
  const c=cities.filter(v=>!claimed.has(v.id)).sort((a,b)=>dist(a,target)-dist(b,target))[0];claimed.add(c.id);
  Object.assign(c,{id:original.id,name:original.name,major:true,region:original.region,terrain:original.terrain,population:90000+original.farm*9000,reserve:9000,soldiers:original.soldiers,agriculture:original.farm*17,commerce:original.market*17,defense:original.fort*17,administration:80});
 }
 const centers=Object.entries(FACTIONS).map(([id,f])=>({... (f.capital?cities.find(c=>c.id===f.capital):{x:f.anchor[0]*WORLD.width,y:f.anchor[1]*WORLD.height}),id}));
 for(const center of centers)if(!FACTIONS[center.id].capital){const c=cities.filter(v=>!v.major).sort((a,b)=>dist(a,center)-dist(b,center))[0];c.major=true;c.name={yuanshu:'수춘',hansui:'금성',menghuo:'건녕',shixie:'교지',kongrong:'북해'}[center.id];c.capitalOf=center.id;}
 const grid=new Map(cities.map(c=>[`${c.col},${c.row}`,c]));
 for(const c of cities){
  c.owner=centers.reduce((a,b)=>dist(c,a)<dist(c,b)?a:b).id;
  c.neighbors=[];
  for(const [dc,dr]of [[-1,0],[1,0],[0,-1],[0,1],...(c.row%2?[[1,-1],[-1,1]]:[[-1,-1],[1,1]])]){const n=grid.get(`${c.col+dc},${c.row+dr}`);if(n)c.neighbors.push(n.id);}
 }
 // Add reverse links so every land route can be traversed in either direction.
 const byId=new Map(cities.map(c=>[c.id,c]));for(const c of cities)for(const id of c.neighbors){const n=byId.get(id);if(!n.neighbors.includes(c.id))n.neighbors.push(c.id);}
 for(const [id,f]of Object.entries(FACTIONS)){const capital=f.capital?byId.get(f.capital):cities.find(c=>c.capitalOf===id);capital.owner=id;capital.soldiers=Math.max(6500,capital.soldiers);capital.capitalOf=id;}
 shapeDistricts(cities,grid);

 return cities;
}

export function makeWorld(seed=42,{legacy=false,generatorVersion=WORLD_GENERATOR_VERSION,worldScale=1}={}){
 const began=performance.now();
 if(![0,1,2,3,4,5,6,WORLD_GENERATOR_VERSION].includes(generatorVersion))throw new Error('지원하지 않는 지도 생성 버전입니다.');
 legacy=legacy||generatorVersion===0;
 const cities=legacyWorld(seed),rand=generator(seed^0x63f29),geography=!legacy&&generatorVersion>=2?terrainForSeed(seed,{version:terrainVersion(generatorVersion)}):null;
 if(!legacy){
  const sites=generatorVersion>=3?scatteredSites(WORLD,generator(seed^0x49b31)):cities.map(({x,y,col,row})=>({x,y,col,row})),hubs=cities.filter(c=>c.major),lands=cities.filter(c=>!c.major),chosen=[];
  const shuffle=list=>{for(let i=list.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;};
  const order=geography?[...shuffle(hubs.filter(c=>c.capitalOf)),...shuffle(hubs.filter(c=>!c.capitalOf))]:shuffle(hubs);
  if(generatorVersion>=6)chosen.push(...placeStrongholds(order,sites,geography,WORLD,rand,generatorVersion));
  else for(const hub of order){
   const available=sites.filter(p=>!chosen.includes(p)),suitable=geography?available.filter(p=>p.x>180&&p.x<WORLD.width-180&&p.y>180&&p.y<WORLD.height-180&&sampleField(geography,'elevation',p.x,p.y)<.36&&sampleField(geography,'slope',p.x,p.y)<.08&&sampleField(geography,'riverDistance',p.x,p.y)>28):available;
   const options=suitable.length?suitable:available;if(chosen.length){const distance=new Map(options.map(p=>[p,Math.min(...chosen.map(q=>dist(p,q)))]));options.sort((a,b)=>distance.get(b)-distance.get(a));}
   const site=options[Math.floor(rand()*Math.min(chosen.length?8:options.length,options.length))];chosen.push(site);Object.assign(hub,site);
  }
  shuffle(lands);sites.filter(p=>!chosen.includes(p)).forEach((p,i)=>Object.assign(lands[i],p));
  const capitals=hubs.filter(c=>c.capitalOf),grid=new Map(cities.map(c=>[`${c.col},${c.row}`,c]));
  for(const c of cities){c.owner=capitals.reduce((a,b)=>dist(c,a)<dist(c,b)?a:b).capitalOf;c.neighbors=[];for(const [dc,dr] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1]]){const n=grid.get(`${c.col+dc},${c.row+dr}`);if(n)c.neighbors.push(n.id);}}
  if(generatorVersion>=3){
   shapeScatteredDistricts(cities,WORLD);
   connectDistricts(cities,generator(seed^0x384ab),(a,b)=>1+Math.max(0,sampleField(geography,'elevation',(a.x+b.x)/2,(a.y+b.y)/2)-.24)*2,generatorVersion>=7?5:Infinity);
  }else shapeDistricts(cities,grid);
 }
 const hubs=cities.filter(c=>c.major),rivers=riversForSeed(seed);
 for(const c of hubs)c.name=KEEP_NAMES[c.id]||(c.capitalOf?REALMS[c.capitalOf][0]+' 성채':'스타폴');
 for(const c of cities){
  if(geography){c.terrain=terrainAt(geography,c.x,c.y);c.elevation=sampleField(geography,'elevation',c.x,c.y);c.forestDensity=sampleField(geography,'forest',c.x,c.y);}
  else{const elevation=noise(seed,c.x/650,c.y/650)*.7+noise(seed+31,c.x/240,c.y/240)*.3,wet=noise(seed+17,c.x/470,c.y/470);c.terrain=rivers.some(r=>Math.abs(c.y-riverY(r,c.x))<95)?'수변':elevation>.68?'산악':elevation>.54?'구릉':wet>.57?'숲':'평야';}
  const hub=hubs.reduce((best,h)=>dist(c,h)<dist(c,best)?h:best);c.region=hub.name+' 권역';
  if(!c.major){const dx=c.x-hub.x,dy=c.y-hub.y,direction=Math.abs(dx)>Math.abs(dy)?dx>0?'동쪽':'서쪽':dy>0?'남쪽':'북쪽';c.name=`${hub.name} ${direction} ${TERRAINS[c.terrain].name}`;c.soldiers=0;c.defense=0;}
 }
 if(geography)makeLandRoutes(cities,geography,generatorVersion>=3?[0,-25,25,-45,45,-65,65,-110,110]:undefined);
 trace('terrain','world.generated',{seed:seed>>>0,generatorVersion:legacy?0:generatorVersion,regions:cities.length,rivers:geography?.riverPaths.length||rivers.length,scenery:geography?.scenery.length||0,roads:cities.reduce((n,c)=>n+c.neighbors.length,0)/2,districtSides:[...new Set(cities.map(c=>c.poly.length))].sort((a,b)=>a-b),milliseconds:Math.round((performance.now()-began)*100)/100});
 return scaleWorld(cities,worldScale);
}

function makeLandRoutes(cities,g,offsets=[0,-65,65,-110,110]){
 const byId=new Map(cities.map(c=>[c.id,c]));for(const c of cities){c.roads={};}
 for(const c of cities)for(const id of c.neighbors){if(c.id>id)continue;const n=byId.get(id),length=dist(c,n),mx=(c.x+n.x)/2,my=(c.y+n.y)/2,nx=-(n.y-c.y)/length,ny=(n.x-c.x)/length;let best=null;
  for(const offset of offsets){const bend={x:mx+nx*offset,y:my+ny*offset};let cost=0,px=c.x,py=c.y,ph=sampleField(g,'elevation',px,py);
   for(let k=1;k<=8;k++){const t=k/8,u=1-t,x=u*u*c.x+2*u*t*bend.x+t*t*n.x,y=u*u*c.y+2*u*t*bend.y+t*t*n.y,h=sampleField(g,'elevation',x,y),forest=sampleField(g,'forest',x,y),water=sampleField(g,'riverDistance',x,y);cost+=Math.hypot(x-px,y-py)*(1+Math.max(0,h-.24)*1.5+forest*.15+(water<20?.2:0))+Math.abs(h-ph)*700;px=x;py=y;ph=h;}
   if(!best||cost<best.cost)best={x:bend.x,y:bend.y,cost};
  }c.roads[id]=best;n.roads[c.id]=best;
 }
}
export function routeCost(a,b){return a.roads?.[b.id]?.cost??dist(a,b)*TERRAINS[b.terrain].travel;}

export function makeOfficers(seed=42){
 const rand=generator(seed+97),officers=structuredClone(OFFICERS),factions={};
 for(const [id,h] of Object.entries(HEROES))Object.assign(officers[id],{name:h[0],han:h[0][0],role:['liubei','caocao','sunquan'].includes(id)?'영주':officers[id].int>officers[id].war?'전술가':'지휘관',trait:h[1]});
 const surnames=['에린','드란','실렌','나르','로안','카린','테온','세라','이렌','오린','메르','바린','헤른','타린','루엔'],names=['윈터','그레이','블룸','호크','리드','벨','실버','리프','스톤','애쉬','문','로즈','울프','데일','크로우'];
 let cursor=0;
 for(const [id,f]of Object.entries(FACTIONS)){
  let list=f.officers?[...f.officers]:[];
  if(!list.length)for(let i=0;i<4;i++){
   const key=`${id}-general-${i}`,name=i===0?f.ruler:surnames[(cursor+i)%surnames.length]+' '+names[(cursor*3+i*4)%names.length];
   officers[key]={name,war:62+Math.floor(rand()*31),int:60+Math.floor(rand()*33),role:i===0?'영주':'지휘관',trait:'변경의 수호자'};list.push(key);
  }
  factions[id]={name:f.name,ruler:f.ruler,color:f.color,han:f.han,officers:list,gold:id==='shu'?8000:11000,food:60000,doctrine:f.temper>=.75?'expand':f.temper<=.4?'defend':'balanced',objective:null,objectiveSince:0,lastDecision:-10,reason:'전선과 내정 상황을 살피고 있습니다.',decisionCount:0};cursor++;
 }
 return {officers,factions};
}
