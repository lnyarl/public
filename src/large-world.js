import {sampleField,warped,vegetationAt} from './terrain.js';
import {mountainAppearance} from './mountains.js';
const mountainScenery=new WeakMap();
function mountainItem(g,item){const base=g.base||g,scale=g.scale||1;return mountainAppearance(g,item,(x,y)=>{const p=warped(base,x,y);return {x:p.x*scale,y:p.y*scale};});}

export const LARGE_WORLD_SCALE=10;
const expanded=new WeakMap(),sceneryTiles=new WeakMap();
const hash=(seed,x,y)=>{let n=(seed^Math.imul(x,374761393)^Math.imul(y,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};

export function scaleWorld(cities,scale){
 if(scale===1)return cities;
 const roads=new Set();
 for(const c of cities){
  c.x*=scale;c.y*=scale;c.poly=c.poly.map(([x,y])=>[x*scale,y*scale]);
  for(const bend of Object.values(c.roads||{}))if(!roads.has(bend)){roads.add(bend);bend.x*=scale;bend.y*=scale;}
 }
 return cities;
}

export function expandedGeography(base,scale){
 if(scale===1||!base)return base;
 let g=expanded.get(base);if(g)return g;
 g={...base,base,scale,width:base.width*scale,height:base.height*scale,stepX:base.stepX*scale,stepY:base.stepY*scale,scenery:base.scenery.map(p=>({...p,x:p.x*scale,y:p.y*scale,width:p.width*3})),
  riverPaths:base.riverPaths.map(r=>({...r,points:r.points.map(p=>({...p,x:p.x*scale,y:p.y*scale}))})),
  ranges:base.ranges.map(r=>r.map(p=>({...p,x:p.x*scale,y:p.y*scale})))};
 expanded.set(base,g);return g;
}

// Detail is generated only for visited chunks, with bounded retained memory.
export function sceneryInBounds(g,bounds,zoom,known=null){
 if(g.frontier){const result=[];for(const part of g.parts(bounds,known)){const local={left:bounds.left-part.x,right:bounds.right-part.x,top:bounds.top-part.y,bottom:bounds.bottom-part.y};for(const item of sceneryInBounds(part.g,local,zoom))if(item.x>=local.left&&item.x<=local.right&&item.y>=local.top&&item.y<=local.bottom)result.push({...item,x:item.x+part.x,y:item.y+part.y});}return result.sort((a,b)=>a.y-b.y||a.x-b.x);}
 if(!g.scale||zoom<.085){if(!g.features)return g.scenery;let scenery=mountainScenery.get(g);if(!scenery){scenery=g.scenery.map(p=>p.kind==='mountain'?mountainItem(g,p):p).filter(Boolean);mountainScenery.set(g,scenery);}return scenery;}
 let tiles=sceneryTiles.get(g);if(!tiles){tiles=new Map();sceneryTiles.set(g,tiles);}
 const size=512,result=[],stride=zoom<.18?2:1;
 for(let row=Math.max(0,Math.floor(bounds.top/size));row<Math.min(Math.ceil(g.height/size),Math.ceil(bounds.bottom/size));row++)for(let col=Math.max(0,Math.floor(bounds.left/size));col<Math.min(Math.ceil(g.width/size),Math.ceil(bounds.right/size));col++){
  if(known&&!known.some(b=>b.left<(col+1)*size&&b.right>col*size&&b.top<(row+1)*size&&b.bottom>row*size))continue;
  const key=col+','+row;let items=tiles.get(key);
  if(!items){items=[];
   for(let y=Math.ceil(row*size/66);y<(row+1)*size/66;y++)for(let x=Math.ceil(col*size/66);x<(col+1)*size/66;x++){
    const px=(x+.2+hash(g.seed+8,x,y)*.6)*66,py=(y+.2+hash(g.seed+9,x,y)*.6)*66;
    if(px>g.width||py>g.height)continue;
    const h=sampleField(g,'elevation',px,py),d=sampleField(g,'riverDistance',px,py),forest=sampleField(g,'forest',px,py),roll=hash(g.seed+10,x,y);
    if(h>.47&&d>85&&roll<.48){const item=mountainItem(g,{kind:'mountain',x:px,y:py,width:100+hash(g.seed+23,x,y)*60});if(item)items.push(item);}
    else if(g.version>=5){const vegetation=vegetationAt(g,px,py);if(vegetation.canopy>.02&&roll<vegetation.canopy*.9)items.push({kind:vegetation.kind,species:vegetation.species,biome:vegetation.biome,x:px,y:py,width:46+vegetation.canopy*60+roll*8});else if(h>.32&&h<=.48&&d>65&&vegetation.canopy<.2&&roll<.18)items.push({kind:'hills',x:px,y:py,width:145});}
    else if(h>.32&&h<=.48&&d>65&&roll<.18)items.push({kind:'hills',x:px,y:py,width:145});
    else if(d>23&&h<.5&&roll<forest*.88+.018)items.push({kind:hash(g.seed+11,x,y)>.5?'oak':'pines',x:px,y:py,width:44+forest*64});
   }
  }
  tiles.delete(key);tiles.set(key,items);for(let i=0;i<items.length;i+=stride)result.push(items[i]);
 }
 while(tiles.size>96)tiles.delete(tiles.keys().next().value);
 return result.sort((a,b)=>a.y-b.y||a.x-b.x);
}
