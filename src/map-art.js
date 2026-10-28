import {riverY} from './world.js';
import {drawGround} from './map-surfaces.js';
import {drawRivers} from './map-rivers.js';
import {sceneryInBounds} from './large-world.js';
const legacyRiverCache=new WeakMap();
export const TERRAIN_VARIANTS={
 pines:['pines','pine-tall','fir-wide'],
 oak:['oak','oak-round','birch'],
 mountain:['mountain-spire','mountain-massif','mountain-crag','mountain-weathered']
};

// Coordinate-based choices stay fixed while panning, zooming and loading saves.
export function terrainSprite(art,kind,x,y,modern=false,species=null){
 const choices=kind==='mountain'&&!modern?['mountain','mountain-ridge','mountain-weathered']:TERRAIN_VARIANTS[kind];
 if(!choices)return art[kind];
 if(species&&choices.includes(species))return art[species]||art[kind];
 const n=Math.sin(x*12.9898+y*78.233)*43758.5453,index=Math.floor((n-Math.floor(n))*choices.length);
 return art[choices[index]]||art[kind];
}

// Paint each sprite with its base anchored to the same map position.
export function stamp(ctx,art,x,y,width){
 if(!art?.complete||!art.naturalWidth)return false;
 const height=width*art.naturalHeight/art.naturalWidth;
 ctx.drawImage(art,x-width/2,y-height,width,height);return true;
}

function naturalLandscape(ctx,cities,zoom,world,g,art,view){
 ctx.imageSmoothingEnabled=true;
 if(!cities.length)return;
 const {left,right,top,bottom}=view?.bounds||{left:Math.min(...cities.map(c=>c.x))-280,right:Math.max(...cities.map(c=>c.x))+280,top:Math.min(...cities.map(c=>c.y))-280,bottom:Math.max(...cities.map(c=>c.y))+280};
 if(g.frontier&&zoom<.06){for(const c of cities){ctx.beginPath();c.poly.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=c.terrain==='숲'?'#a3aa85':c.terrain==='산악'?'#aeb09a':'#babc94';ctx.fill();}return;}
 drawGround(ctx,world,art,g,null,{left,right,top,bottom},zoom,view?.knownBounds,view?.tiles);
 if(zoom>.5){const byId=new Map(cities.map(c=>[c.id,c]));ctx.lineWidth=2;ctx.strokeStyle='#e3d6a754';ctx.setLineDash([7,9]);for(const c of cities)for(const id of c.neighbors){const n=byId.get(id),bend=c.roads?.[id];if(!n||c.id>id||!bend)continue;ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.quadraticCurveTo(bend.x,bend.y,n.x,n.y);ctx.stroke();}ctx.setLineDash([]);}
 if(g.frontier){for(const part of g.parts({left,right,top,bottom},view?.knownBounds)){ctx.save();ctx.translate(part.x,part.y);drawRivers(ctx,part.g,{left:left-part.x,right:right-part.x,top:top-part.y,bottom:bottom-part.y},zoom,art,view?.tiles);ctx.restore();}}
 else drawRivers(ctx,g,{left,right,top,bottom},zoom,art,view?.tiles);
 if(zoom<(g.scale ? .015 : .085))return;
 for(const item of sceneryInBounds(g,{left,right,top,bottom},zoom,view?.visibleBounds)){if(item.x<left||item.x>right||item.y<top||item.y>bottom||view?.canSee&&!view.canSee(item.x,item.y))continue;
  if(cities.some(c=>c.major&&Math.abs(item.x-c.x)<60&&Math.abs(item.y-c.y)<52))continue;
  if(zoom<.14&&['oak','pines'].includes(item.kind)&&(!g.scale||item.width*zoom<5))continue;
  const sprite=terrainSprite(art,item.kind,item.x,item.y,g.version>=3,item.species);
  stamp(ctx,sprite,item.x,item.y,item.width);
 }
 for(const c of cities)if(c.major&&zoom>.24)stamp(ctx,art.farmland,c.x+58,c.y+38,72);
}

export function landscape(ctx,cities,zoom,world,rivers,art={},geography=null,allCities=cities,view=null){
 if(geography){naturalLandscape(ctx,cities,zoom,world,geography,art,view);return;}
 const noise=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
 drawGround(ctx,world,art,null,allCities,view?.bounds,zoom,view?.knownBounds);
 let water=legacyRiverCache.get(allCities);
 if(!water){
  const riverPaths=rivers.map(r=>{const points=[];for(let x=0;x<=world.width;x+=30)points.push({x,y:riverY(r,x),flow:((r.width*1.35-4)/.52)**2*(.8+.35*x/world.width)});return {points,source:false};});
  water={width:world.width,height:world.height,warp:0,riverPaths};legacyRiverCache.set(allCities,water);
 }
 const bounds={left:Math.min(...cities.map(c=>c.x))-280,right:Math.max(...cities.map(c=>c.x))+280,top:Math.min(...cities.map(c=>c.y))-280,bottom:Math.max(...cities.map(c=>c.y))+280};
 drawRivers(ctx,water,bounds,zoom,art);
 for(const c of cities){
  const n=noise(c.col,c.row);
  if(zoom<.1)continue;
  if(c.terrain==='산악')stamp(ctx,terrainSprite(art,'mountain',c.x,c.y),c.x,c.y-18,165+n*20);
  else if(c.terrain==='구릉')stamp(ctx,art.hills,c.x,c.y+8,170);
  else if(c.terrain!=='숲'&&(n>.75||c.major))stamp(ctx,art.farmland,c.x+68,c.y+45,74);
  if(c.terrain==='수변')stamp(ctx,art.reeds,c.x-58,c.y+39,48);
  const count=c.terrain==='숲'?5:c.terrain==='산악'?1:2;
  for(let i=0;i<count;i++){
   const x=c.x-88+noise(i+c.row,c.col)*176,y=c.y-65+noise(c.col+i,c.row)*155;
   if(c.major&&Math.abs(x-c.x)<48&&Math.abs(y-c.y)<46)continue;
   stamp(ctx,terrainSprite(art,i%2?'oak':'pines',x,y),x,y,c.terrain==='숲'?62+noise(i,c.col)*22:29+noise(i,c.col)*13);
  }
 }
 if(zoom>1.15){ctx.lineWidth=1.3/zoom;ctx.strokeStyle='#e4d6ad44';ctx.setLineDash([3/zoom,7/zoom]);const byId=new Map(cities.map(c=>[c.id,c]));for(const c of cities)for(const id of c.neighbors)if(c.id<id&&byId.has(id)){const n=byId.get(id);ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.quadraticCurveTo(c.x+(n.x-c.x)*.6,c.y+(n.y-c.y)*.4,n.x,n.y);ctx.stroke();}ctx.setLineDash([]);}
}

export const settlementScale=zoom=>1.3*Math.min(1,Math.max(.65,zoom*2));

export function settlement(ctx,x,y,color,selected,zoom,art,standard,sigil=''){
 ctx.save();ctx.translate(x,y);const scale=settlementScale(zoom);ctx.scale(scale,scale);
 ctx.fillStyle='#304d3c35';ctx.beginPath();ctx.ellipse(3,9,29,10,0,0,Math.PI*2);ctx.fill();
 if(selected){ctx.strokeStyle='#fff1bd';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,9,41,16,0,0,Math.PI*2);ctx.stroke();}
 if(art?.complete&&art.naturalWidth){
  const w=76,h=w*art.naturalHeight/art.naturalWidth;
  ctx.drawImage(art,-w/2,18-h,w,h);
 }else{
 ctx.fillStyle='#707b68';ctx.beginPath();ctx.moveTo(-25,-1);ctx.lineTo(0,-10);ctx.lineTo(25,-1);ctx.lineTo(25,12);ctx.lineTo(0,22);ctx.lineTo(-25,12);ctx.closePath();ctx.fill();
 ctx.fillStyle='#a8ac8b';ctx.beginPath();ctx.moveTo(-25,-1);ctx.lineTo(0,8);ctx.lineTo(25,-1);ctx.lineTo(25,10);ctx.lineTo(0,20);ctx.lineTo(-25,10);ctx.fill();
 ctx.fillStyle='#ccd0af';for(let i=0;i<5;i++){ctx.fillRect(-25+i*5,-3+i*1.8,3,5);ctx.fillRect(2+i*5,6-i*1.8,3,5);}
 ctx.fillStyle='#3e5547';ctx.fillRect(-4,8,8,10);ctx.fillStyle='#d4c6a2';ctx.fillRect(-11,-15,22,16);
 for(const tx of [-17,17]){ctx.fillStyle='#c4c5ab';ctx.fillRect(tx-5,-22,10,26);ctx.fillStyle='#526774';ctx.beginPath();ctx.moveTo(tx-8,-22);ctx.lineTo(tx,-36);ctx.lineTo(tx+8,-22);ctx.closePath();ctx.fill();}
 ctx.fillStyle='#d0ceb2';ctx.fillRect(-10,-26,20,18);for(let i=0;i<4;i++)ctx.fillRect(-11+i*6,-31,4,8);ctx.fillStyle='#445b55';ctx.fillRect(-3,-21,6,9);
 ctx.fillStyle='#55634e';ctx.fillRect(-3,-8,6,8);
 }
 if(stamp(ctx,standard,28,-5,25)){ctx.font='bold 9px Batang,serif';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(sigil,31,-23);}else{
 ctx.strokeStyle='#4c5744';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(19,-4);ctx.lineTo(19,-37);ctx.stroke();
 ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(19,-37);ctx.lineTo(35,-34);ctx.lineTo(32,-26);ctx.lineTo(19,-28);ctx.closePath();ctx.fill();ctx.strokeStyle='#ede0b2';ctx.lineWidth=.7;ctx.stroke();
 }ctx.restore();
}

const iconNames=new Set(['roster','forces','projects','world','farm','market','fort','relief','levy','gold','food','timber']);
export function icon(name){
 const src=name==='goods'?'assets/art/ui/goods.svg':iconNames.has(name)?`assets/art/ui/${name}.webp`:'assets/settlement.webp';
 return `<img class="game-icon" src="${src}" alt="" aria-hidden="true" width="64" height="64" decoding="async">`;
}
