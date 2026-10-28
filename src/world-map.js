import {directionalThreats,drawDirectionalThreats,DIRECTION_NAMES} from './directional-threats.js';
import {worldSize,regionsInBounds,city,FACTIONS,TERRAINS,regionAt,riversForSeed,geographyForWorld,clamp,stationedTroops} from './world.js';
import {createMotion} from './motion.js';
import {landscape,settlement,settlementScale,stamp,TERRAIN_VARIANTS} from './map-art.js';
import {createMapFeedback} from './map-feedback.js';
import {visibilityFor,canSeePoint,canSeeRegion,regionBounds,intersects} from './fog-of-war.js';
import {createCloudFog,drawWorldOverview} from './map-fog.js';
import {createMapTiles} from './map-tile-client.js';

// Fit current holdings, including separated districts, into the space between the HUDs.
export function territoryFrame(s,width,height){
 const mine=s.cities.filter(c=>c.owner===s.player);if(!mine.length)return null;
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 for(const c of mine)for(const [x,y] of c.poly){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 const mobile=width<=760,l=Math.min(28,width*.08),r=Math.min(76,width*.16),t=Math.min(mobile?175:130,height*.3),b=Math.min(mobile?240:150,height*.35);
 const zoom=Math.min(.9,(width-l-r)/(right-left+120),(height-t-b)/(bottom-top+120));
 return {x:(left+right)/2-(l-r)/2/zoom,y:(top+bottom)/2-(t-b)/2/zoom,zoom};
}

// The map owns its camera and animation. Simulation objects stay serializable.
export function createWorldMap(canvas,state,onSelect,onArmy,onLand,overviewCanvas=null){
 const WORLD=worldSize(state);
 const renderCtx=canvas.getContext('2d',{alpha:false}),camera={x:city(state,state.selected).x,y:city(state,state.selected).y,zoom:.82};
 const terrain=document.createElement('canvas'),terrainCtx=terrain.getContext('2d',{alpha:false});let terrainKey='';
 const scene=document.createElement('canvas'),sceneCtx=scene.getContext('2d',{alpha:false});let sceneKey='',ctx=renderCtx;
 const motion=createMotion(state,performance.now()),geography=geographyForWorld(state),signals=createMapFeedback();
 const cloudFog=createCloudFog();
 let s=state,width=1,height=1,dpr=1,visible=true,dirty=true,frame=0,drag=null,moved=false,drawn=0,drawMs=0,labelRevision=-1,labels=[],samples=[],lastStats=0,hover=null,pointer=null,inspected=null,frameTimes=[],lastVisual=null,zoomTween=null,focusTween=null,locateHighlight=null,territoryView=true;
 const tiles=createMapTiles(()=>{terrainKey='';sceneKey='';dirty=true;});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const art={},sources={settlement:'assets/settlement.webp'};
 sources['resource-food']='assets/art/ui/farm.webp';
 sources['resource-timber']='assets/art/ui/timber.webp';
 for(const name of ['mountain','mountain-ridge','hills','pines','oak','farmland','reeds'])sources[name]=`assets/art/terrain/${name}.webp`;
 for(const name of Object.values(TERRAIN_VARIANTS).flat())sources[name]=`assets/art/terrain/${name}.webp`;
 for(const name of ['ground','water'])sources[name]=`assets/art/materials/${name}.webp`;
 sources['cloud-bank']='assets/art/materials/cloud-bank.webp';
 sources['river-water']='assets/art/materials/river-water.webp';
 for(const name of ['river-bank','river-sandbar'])sources[name]=`assets/art/terrain/${name}.webp`;
 for(const name of ['infantry','caravan','standard','battle'])sources[name]=`assets/art/units/${name}.webp`;
 for(const [name,src] of Object.entries(sources)){const image=new Image();image.onload=()=>{terrainKey='';sceneKey='';dirty=true;};image.src=src;art[name]=image;}
 const screen=(x,y)=>({x:(x-camera.x)*camera.zoom+width/2,y:(y-camera.y)*camera.zoom+height/2});
 const world=(x,y)=>({x:(x-width/2)/camera.zoom+camera.x,y:(y-height/2)/camera.zoom+camera.y});
 function bounds(){const margin=220;return {left:camera.x-width/camera.zoom/2-margin,right:camera.x+width/camera.zoom/2+margin,top:camera.y-height/camera.zoom/2-margin,bottom:camera.y+height/camera.zoom/2+margin};}
 function visibleCities(){const fog=visibilityFor(s);return regionsInBounds(s,bounds()).filter(c=>fog.detailed.has(c.id));}
 const visibleArmy=v=>v.data.faction===s.player&&!v.retiring||canSeePoint(s,v.x,v.y);
 function updateHover(){
  let next=null,cursor=drag&&moved?'grabbing':'grab';
  if(pointer&&!(drag&&moved)){
   if(signals.hit(pointer.x,pointer.y))cursor='pointer';
   else{const p=world(pointer.x,pointer.y),region=regionAt(s,p.x,p.y);if(region&&canSeeRegion(s,region.id)){next=region.id;if(region.major||region.soldiers>=.5)cursor='pointer';}}
  }
  if(hover!==next){hover=next;dirty=true;}canvas.style.cursor=cursor;canvas.dataset.hoveredRegion=hover||'';
 }
 function locatePosition(target,now){
  if(target.army){const v=motion.sample(now).armies.find(v=>v.data.id===target.army&&!v.retiring&&visibleArmy(v));return v?{x:v.x,y:v.y,offset:v.offset}:null;}
  const c=city(s,target.city);return c&&canSeeRegion(s,c.id)?{x:c.x,y:c.y,offset:0,region:c}:null;
 }
 function locate(target,point){
  const now=performance.now();if(!locatePosition(target,now))return false;
  stepZoom(now);stepFocus(now);zoomTween=null;territoryView=false;
  const duration=reduced?0:700,zoom=Math.max(camera.zoom,.7/(s.frontier?1:s.worldScale||1));
  focusTween={from:{...camera},target,point,zoom,at:now,duration};
  locateHighlight={target,at:now+duration*.7,end:now+duration+2400};
  canvas.dataset.locateTarget=target.army||target.city;canvas.dataset.locateKind=target.army?'army':'region';
  if(reduced)stepFocus(now);dirty=true;return true;
 }
 function stepFocus(now){
  if(!focusTween)return;
  const f=focusTween,p=locatePosition(f.target,now);if(!p){focusTween=null;return;}
  const t=f.duration?clamp((now-f.at)/f.duration,0,1):1,ease=t*t*(3-2*t);
  const x=p.x-(f.point.x-width/2-p.offset)/f.zoom,y=p.y-(f.point.y-height/2)/f.zoom;
  camera.x=f.from.x+(x-f.from.x)*ease;camera.y=f.from.y+(y-f.from.y)*ease;camera.zoom=f.from.zoom+(f.zoom-f.from.zoom)*ease;
  if(t===1)focusTween=null;
 }
 function drawLocate(now){
  if(!locateHighlight)return;
  const h=locateHighlight,p=locatePosition(h.target,now);
  if(!p||now>=h.end){locateHighlight=null;canvas.dataset.locateTarget='';canvas.dataset.locateAlpha='0';return;}
  const fade=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},alpha=fade((now-h.at)/240)*fade((h.end-now)/900);
  canvas.dataset.locateAlpha=alpha.toFixed(3);canvas.dataset.locateWorldX=String(p.x);canvas.dataset.locateWorldY=String(p.y);const pos=screen(p.x,p.y);canvas.dataset.locateX=String(pos.x+p.offset);canvas.dataset.locateY=String(pos.y);
  ctx.save();ctx.globalAlpha=alpha;
  if(p.region){ctx.translate(width/2-camera.x*camera.zoom,height/2-camera.y*camera.zoom);ctx.scale(camera.zoom,camera.zoom);polygon(p.region.poly);ctx.fillStyle='#ffe3a329';ctx.fill();ctx.strokeStyle='#ffe4a9';ctx.lineWidth=2.5/camera.zoom;ctx.lineJoin='round';ctx.shadowColor='#f9d67d';ctx.shadowBlur=10;ctx.stroke();ctx.setTransform(dpr,0,0,dpr,0,0);}
  if(h.target.army||p.region?.major||s.economy?.sites.some(site=>site.region===h.target.city)){
   const x=pos.x+p.offset,y=pos.y,w=p.region?.major?52:30,top=p.region?.major?-46:-34,bottom=30;
   ctx.strokeStyle='#fff0ba';ctx.lineWidth=2;ctx.shadowColor='#edc55c';ctx.shadowBlur=12;ctx.beginPath();
   for(const side of [-1,1])for(const edge of [top,bottom]){const direction=edge===top?1:-1;ctx.moveTo(x+side*(w-10),y+edge);ctx.lineTo(x+side*w,y+edge);ctx.lineTo(x+side*w,y+edge+direction*10);}ctx.stroke();
  }
  ctx.restore();
 }
 function focusTerritory(){focusTween=null;const target=territoryFrame(s,width,height);if(!target)return false;zoomTween=null;territoryView=true;Object.assign(camera,target);dirty=true;return true;}
 function resize(){focusTween=null;zoomTween=null;const r=canvas.getBoundingClientRect();visible=r.width>0&&r.height>0;width=Math.max(1,r.width);height=Math.max(1,r.height);dpr=Math.min(1.5,devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);if(territoryView)focusTerritory();dirty=true;}
 function polygon(points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();}
 function draw(now,visual){
  const began=performance.now(),visible=visibleCities(),zoom=camera.zoom,markerZoom=zoom*(s.frontier?1:s.worldScale||1),b=bounds(),fog=visibilityFor(s),known=regionsInBounds(s,b).filter(c=>fog.explored.has(c.id));drawn=visible.length;
  const signature=s.fogRules?[...fog.detailed].sort().join(',')+':'+fog.explored.size:'';
  const key=`${camera.x},${camera.y},${zoom},${canvas.width},${canvas.height},${signature}`;
  if(key!==terrainKey){terrain.width=canvas.width;terrain.height=canvas.height;terrainCtx.setTransform(dpr,0,0,dpr,0,0);terrainCtx.fillStyle='#344e49';terrainCtx.fillRect(0,0,width,height);terrainCtx.translate(width/2-camera.x*zoom,height/2-camera.y*zoom);terrainCtx.scale(zoom,zoom);terrainCtx.fillStyle=s.fogRules?'#a7b8aa':'#7e9b90';terrainCtx.fillRect(0,0,WORLD.width,WORLD.height);
   terrainCtx.save();
   const knownBounds=known.map(regionBounds).filter(r=>intersects(r,b));
   if(known.length)landscape(terrainCtx,known,zoom,WORLD,riversForSeed(s.worldSeed),art,geography,s.cities,{bounds:b,knownBounds,visibleBounds:knownBounds,tiles:tiles?.failed?null:tiles,canSee:(x,y)=>fog.explored.has(regionAt(s,x,y)?.id)});
   terrainCtx.restore();if(s.fogRules){
    if(markerZoom>.18&&art.settlement.complete&&art.settlement.naturalWidth)for(const c of known)if(c.major&&!fog.detailed.has(c.id)){
     const p=screen(c.x,c.y),scale=settlementScale(zoom),w=76*scale,h=w*art.settlement.naturalHeight/art.settlement.naturalWidth;
     terrainCtx.save();terrainCtx.setTransform(dpr,0,0,dpr,0,0);terrainCtx.globalAlpha=.45;terrainCtx.drawImage(art.settlement,p.x-w/2,p.y+18*scale-h,w,h);terrainCtx.font='12px Batang,serif';terrainCtx.textAlign='center';terrainCtx.fillStyle='#344c43';terrainCtx.fillText('성채 흔적',p.x,p.y+18*scale+17);terrainCtx.restore();
    }
   }terrainCtx.save();terrainCtx.strokeStyle='#d9d0a8';terrainCtx.lineWidth=1.5/zoom;terrainCtx.strokeRect(0,0,WORLD.width,WORLD.height);terrainCtx.restore();terrainKey=key;
  }
  const backgroundKey=`${key},${s.revision},${s.selected},${hover},${Math.round(stationedTroops(s,city(s,s.selected)))}`;
  if(backgroundKey!==sceneKey){scene.width=canvas.width;scene.height=canvas.height;ctx=sceneCtx;
  ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(terrain,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.translate(width/2-camera.x*zoom,height/2-camera.y*zoom);ctx.scale(zoom,zoom);
  for(const c of visible){const mine=c.owner===s.player;polygon(c.poly);ctx.globalAlpha=mine?(markerZoom<.25?.3:.2):(markerZoom<.25?.34:.035);ctx.fillStyle=mine?'#f5d47b':FACTIONS[c.owner].color;ctx.fill();ctx.globalAlpha=1;}
  const drawn=new Set(visible.filter(c=>c.owner!=='neutral').map(c=>c.id)),frontiers=[],outline=new Path2D();
  for(const c of visible){
   if(c.owner==='neutral')continue;
   for(let a=0;a<c.poly.length;a++){
    const n=city(s,c.edges[a]);if(n?.owner===c.owner)continue;
    const shared=n&&drawn.has(n.id);if(shared&&c.id>n.id)continue;
    const edge=new Path2D();edge.moveTo(...c.poly[a]);edge.lineTo(...c.poly[(a+1)%c.poly.length]);outline.addPath(edge);frontiers.push({c,n,shared,edge});
   }
  }
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle='#28382ed9';ctx.lineWidth=6/zoom;ctx.stroke(outline);ctx.lineWidth=4/zoom;
  for(const {c,n,shared,edge} of frontiers){
   // Every edge has the same total width; shared frontiers split that width.
   if(shared)for(const side of [c,n]){ctx.save();polygon(side.poly);ctx.clip();ctx.strokeStyle=FACTIONS[side.owner].color;ctx.stroke(edge);ctx.restore();}
   else{ctx.strokeStyle=FACTIONS[c.owner].color;ctx.stroke(edge);}
  }
  ctx.restore();
  const hovered=city(s,hover);
  if(hovered&&fog.detailed.has(hovered.id)){ctx.save();polygon(hovered.poly);ctx.fillStyle='#fff0b51c';ctx.fill();ctx.strokeStyle='#ffe6a0b3';ctx.lineWidth=1.5/zoom;ctx.lineJoin='round';ctx.stroke();ctx.restore();}
  const labelBoxes=[];
  visible.sort((a,b)=>(b.id===s.selected)-(a.id===s.selected)||Number(b.major)-Number(a.major));
  for(const c of visible){
   if(!c.major)continue;
   const selected=c.id===s.selected,color=FACTIONS[c.owner].color;
   const p=screen(c.x,c.y);ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
   if(c.owner===s.player&&markerZoom>.25){ctx.strokeStyle='#f6d68dbb';ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(p.x,p.y+8,c.major?36:markerZoom>.33?13:5,c.major?15:markerZoom>.33?6:3,0,0,Math.PI*2);ctx.stroke();}
   if(markerZoom>.33||(c.major&&markerZoom>.21))settlement(ctx,p.x,p.y,color,selected,zoom,art.settlement,art.standard,FACTIONS[c.owner].han);
   else {ctx.fillStyle='#364738';ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,c.major?3.5:1.6,0,Math.PI*2);ctx.fill();ctx.stroke();}
   if((c.major&&markerZoom>=.22)||(selected&&markerZoom>=.08)||(hover===c.id&&markerZoom>=.08)){
    const name=c.major?c.name:c.name.split(' ').at(-1),large=c.major||selected;ctx.font=`${large?'bold 14':'11'}px Batang,serif`;const w=ctx.measureText(name).width+18,y=p.y+(markerZoom>.21?Math.ceil(18*settlementScale(zoom))+6:9),box={x:p.x-w/2,y,w,h:large?23:18};
    if(selected||!labelBoxes.some(b=>box.x<b.x+b.w+4&&box.x+box.w+4>b.x&&box.y<b.y+b.h+3&&box.y+box.h+3>b.y)){
     labelBoxes.push(box);ctx.fillStyle=selected?'#314f3cf2':'#263c32df';ctx.beginPath();ctx.roundRect(box.x,box.y,w,box.h,box.h/2);ctx.fill();ctx.strokeStyle=selected?'#f4daa0':'#b3ae7e';ctx.lineWidth=selected?1.5:.6;ctx.stroke();ctx.fillStyle='#f0e6c8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,p.x,y+box.h/2);
     if(selected){ctx.font='10px Arial,Malgun Gothic';ctx.fillStyle='#253d30';ctx.fillText(`${(stationedTroops(s,c)/1000).toFixed(1)}천 · ${FACTIONS[c.owner].name}`,p.x,y+box.h+11);}
    }
   }ctx.restore();
  }
  const ground=city(s,hover);if(ground&&!ground.major&&ground.soldiers<.5&&markerZoom>.22){const p=screen(ground.x,ground.y);ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.font='12px Malgun Gothic,sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#e0dfbc';ctx.strokeText(TERRAINS[ground.terrain].name,p.x,p.y);ctx.fillStyle='#344d37';ctx.fillText(TERRAINS[ground.terrain].name,p.x,p.y);ctx.restore();}
  if(markerZoom<.22){
   if(labelRevision!==s.revision){const sums=new Map();for(const c of fog.regions){if(!sums.has(c.owner))sums.set(c.owner,{x:0,y:0,n:0});const v=sums.get(c.owner);v.x+=c.x;v.y+=c.y;v.n++;}labels=[...sums].map(([id,v])=>({id,x:v.x/v.n,y:v.y/v.n,n:v.n}));labelRevision=s.revision;}
   for(const label of labels){if((width<=760||markerZoom<.05)&&label.id!==s.player)continue;const p=screen(label.x,label.y),mine=label.id===s.player,name=FACTIONS[label.id].name+(mine?' · 내 영지':'');ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.font=`bold ${markerZoom<.05?11:width<=760?15:21}px Batang,serif`;ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle=mine?'#f8d78c':'#ded9b8';ctx.strokeText(name,p.x,p.y);ctx.fillStyle='#354a3b';ctx.fillText(name,p.x,p.y);ctx.restore();}
  }
  drawWorldOverview(overviewCanvas,s,WORLD,camera,width,height,fog,art['cloud-bank']);canvas.dataset.visibleLabels=String(labelBoxes.length+(markerZoom<.22?labels.length:0));canvas.dataset.cameraView=territoryView?'territory':'free';sceneKey=backgroundKey;}
  ctx=renderCtx;ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(scene,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.translate(width/2-camera.x*zoom,height/2-camera.y*zoom);ctx.scale(zoom,zoom);
  for(const site of s.economy?.sites||[]){
   const c=city(s,site.region),sprite=art['resource-'+site.kind];
   if(!fog.detailed.has(c.id)||c.x<b.left||c.x>b.right||c.y<b.top||c.y>b.bottom||markerZoom<.22||!sprite?.complete||!sprite.naturalWidth)continue;
   const p=screen(c.x,c.y),owned=c.owner===s.player,scale=Math.min(40/sprite.naturalWidth,40/sprite.naturalHeight),w=sprite.naturalWidth*scale,h=sprite.naturalHeight*scale;
   ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
   ctx.fillStyle='#20372c42';ctx.beginPath();ctx.ellipse(p.x,p.y+24,22,6,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=owned?'#ead8a4':'#d9d7b3';ctx.strokeStyle='#2e4433';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,24,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.strokeStyle=owned?'#b18d43':'#8d9970';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,21.5,0,Math.PI*2);ctx.stroke();
   ctx.drawImage(sprite,p.x-w/2,p.y-h/2,w,h);ctx.restore();
  }
  for(const v of visual.workers){if(!canSeePoint(s,v.x,v.y)||v.x<b.left||v.x>b.right||v.y<b.top||v.y>b.bottom)continue;const p=screen(v.x,v.y);ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=v.opacity;ctx.fillStyle='#e4d49d';ctx.strokeStyle='#48624d';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(p.x,p.y+3,12,6,0,0,Math.PI*2);ctx.fill();ctx.stroke();stamp(ctx,art.caravan,p.x,p.y+6,24);if(markerZoom>.4){ctx.font='10px Malgun Gothic';ctx.textAlign='center';ctx.strokeStyle='#f0e6c8';ctx.lineWidth=3;ctx.strokeText('작업대',p.x,p.y+20);ctx.fillStyle='#304b33';ctx.fillText('작업대',p.x,p.y+20);}ctx.restore();}
  canvas.dataset.resourceSites=String(s.economy?.sites.length||0);canvas.dataset.workParties=String(visual.workers.length);
  for(const p of s.projects){const c=city(s,p.city);if(!fog.detailed.has(c.id)||c.x<b.left||c.x>b.right||c.y<b.top||c.y>b.bottom||markerZoom<.32)continue;ctx.strokeStyle=p.faction===s.player?'#ebce8a':'#b8d49c';ctx.lineWidth=2/zoom;ctx.beginPath();ctx.arc(c.x,c.y,13/zoom,-Math.PI/2,-Math.PI/2+p.progress*Math.PI*2);ctx.stroke();}
  const inspectedCity=city(s,inspected);if(inspectedCity&&fog.detailed.has(inspected)){const p=screen(inspectedCity.x,inspectedCity.y);ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.strokeStyle='#ffe2a0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y+6,23,13,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  const garrisons=visible.filter(c=>!c.major&&c.soldiers>=.5);canvas.dataset.fieldGarrisons=String(garrisons.length+s.armies.filter(a=>a.mode==='stationed'&&!city(s,a.target).major).length);
  for(const c of garrisons){const p=screen(c.x,c.y),color=c.owner===s.player?'#f8d78c':FACTIONS[c.owner].color;ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
   if(markerZoom<.25){ctx.fillStyle='#294032';ctx.strokeStyle=color;ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fill();ctx.stroke();}
   else{ctx.fillStyle='#213a2bd9';ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(p.x,p.y+7,13,7,0,0,Math.PI*2);ctx.fill();ctx.stroke();if(!stamp(ctx,art.standard,p.x,p.y+9,22)){ctx.beginPath();ctx.moveTo(p.x,p.y+8);ctx.lineTo(p.x,p.y-15);ctx.stroke();ctx.fillStyle=color;ctx.fillRect(p.x,p.y-15,10,8);}ctx.font='bold 9px Batang,serif';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(FACTIONS[c.owner].han,p.x+2,p.y-5);
    if(markerZoom>.45||hover===c.id){ctx.font='10px Arial,Malgun Gothic';ctx.lineWidth=3;ctx.strokeStyle='#233a2c';const text=`합류 대기 ${Math.round(c.soldiers).toLocaleString()}명`;ctx.strokeText(text,p.x,p.y+26);ctx.fillStyle='#f2e3bb';ctx.fillText(text,p.x,p.y+26);}
   }ctx.restore();
  }
  for(const v of visual.caravans){if(!canSeePoint(s,v.x,v.y)||v.x<b.left||v.x>b.right||v.y<b.top||v.y>b.bottom)continue;const p=screen(v.x,v.y);ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=v.opacity;if(markerZoom<.3||!stamp(ctx,art.caravan,p.x,p.y+9,25)){ctx.fillStyle='#e5ce8f';ctx.fillRect(p.x-2,p.y-2,4,4);}ctx.restore();}
  for(const v of visual.armies){const a=v.data,{x,y}=v;if(!visibleArmy(v)||x<b.left||x>b.right||y<b.top||y>b.bottom)continue;const p=screen(x,y),f=FACTIONS[a.faction],phase=Number(a.id.replace(/\D/g,''))||0,wave=reduced?0:Math.sin(visual.time*5+phase)*2;ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=v.opacity;ctx.translate(p.x+v.offset,p.y);if(markerZoom<.25)ctx.scale(.65,.65);
   ctx.fillStyle='#213f3038';ctx.beginPath();ctx.ellipse(0,10,22,8,0,0,Math.PI*2);ctx.fill();
   if(markerZoom>.38&&!stamp(ctx,art.infantry,-7,15,39))for(let i=0;i<3;i++){const x=-13+i*10,y=(i%2)*4+wave*.4;ctx.fillStyle='#273f32';ctx.beginPath();ctx.arc(x,y,2.8,0,Math.PI*2);ctx.fill();ctx.fillRect(x-2,y+2,4,6);ctx.strokeStyle='#d1c399';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+4,y+7);ctx.lineTo(x+4,y-8);ctx.stroke();}
   if(!stamp(ctx,art.standard,8,6+wave*.4,28)){ctx.strokeStyle='#5b573a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-4,8);ctx.lineTo(-4,-28);ctx.stroke();ctx.fillStyle='#243d30';ctx.beginPath();ctx.moveTo(-4,-28);ctx.quadraticCurveTo(7,-30+wave,18,-25);ctx.lineTo(17,-7+wave);ctx.lineTo(7,-11);ctx.lineTo(-4,-8);ctx.closePath();ctx.fill();ctx.strokeStyle=f.color;ctx.lineWidth=1.5;ctx.stroke();}ctx.font='bold 11px Batang,serif';ctx.fillStyle=f.color;ctx.textAlign='center';ctx.fillText(f.han,11,-12+wave*.4);
   if(['siege','field','duel'].includes(a.mode)&&!stamp(ctx,art.battle,0,15,27)){ctx.strokeStyle='#f8c287';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-15,-3);ctx.lineTo(13,13);ctx.moveTo(-13,13);ctx.lineTo(13,-3);ctx.stroke();}if(markerZoom>.38){ctx.font='bold 10px Arial,Malgun Gothic';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#233a2c';const name=s.officers[a.officer].name,labelY=a.mode==='stationed'&&city(s,a.target).major?-30:23;ctx.strokeText(name,0,labelY);ctx.fillStyle='#eadbaa';ctx.fillText(name,0,labelY);}ctx.restore();}
  ctx.setTransform(dpr,0,0,dpr,0,0);
   signals.draw(ctx,s,screen,width,height,{...visual,armies:visual.armies.filter(v=>visibleArmy(v))},now,reduced);
  if(s.fogRules)canvas.dataset.fogAnimating=String(cloudFog.draw(ctx,width,height,screen,WORLD,fog.known,zoom,art['cloud-bank'],now,reduced,fog.detailed));
  drawLocate(now);canvas.dataset.cameraMoving=String(!!focusTween);
  const hints=directionalThreats(s);drawDirectionalThreats(ctx,hints,width,height);canvas.dataset.threatDirections=hints.map(h=>h.direction).join(',');canvas.setAttribute('aria-description',hints.map(h=>DIRECTION_NAMES[h.direction]+'쪽에서 수상한 움직임').join(', '));
  lastVisual={...visual,armies:visual.armies.filter(v=>visibleArmy(v))};canvas.dataset.fogVisible=String(fog.visible.size);canvas.dataset.fogExplored=String(fog.explored.size);canvas.dataset.fogStyle='clouds';canvas.dataset.worldRegions=String(WORLD.count);canvas.dataset.loadedRegions=String(s.cities.length);canvas.dataset.worldWidth=String(WORLD.width);canvas.dataset.worldHeight=String(WORLD.height);canvas.dataset.groundChunks=String(geography?.renderChunks?.cached||0);if(tiles){const t=tiles.stats();canvas.dataset.tilePending=String(t.pending);canvas.dataset.tileCreated=String(t.created);canvas.dataset.tileBytes=String(t.bytes);canvas.dataset.tileWorkerFailed=String(t.failed);}frameTimes.push(now);while(frameTimes.length&&now-frameTimes[0]>2000)frameTimes.shift();
  drawMs=performance.now()-began;samples.push(drawMs);if(samples.length>60)samples.shift();if(now-lastStats>1000){const sorted=[...samples].sort((a,b)=>a-b);canvas.dataset.visibleCities=String(drawn);canvas.dataset.drawP95=sorted[Math.floor((sorted.length-1)*.95)].toFixed(2);canvas.dataset.zoom=String(Math.round(camera.zoom*100));const gaps=frameTimes.slice(1).map((t,i)=>t-frameTimes[i]).sort((a,b)=>a-b);canvas.dataset.frameP95=(gaps[Math.floor((gaps.length-1)*.95)]||0).toFixed(1);canvas.dataset.renderFps=frameTimes.length>1?((frameTimes.length-1)*1000/(now-frameTimes[0])).toFixed(1):'0';lastStats=now;}dirty=false;
 }
  function loop(now){if(focusTween){stepFocus(now);dirty=true;}if(locateHighlight)dirty=true;if(zoomTween){stepZoom(now);dirty=true;}if(visible){if(dirty)updateHover();const visual=motion.sample(now);if(dirty||cloudFog.active(now,reduced)||signals.active(now,reduced)||(!s.paused&&(visual.armies.some(v=>visibleArmy(v))||visual.workers.some(v=>canSeePoint(s,v.x,v.y))||visual.caravans.some(v=>canSeePoint(s,v.x,v.y)))))draw(now,visual);}frame=requestAnimationFrame(loop);}
 function stepZoom(now){
  if(!zoomTween)return;const t=clamp((now-zoomTween.at)/160,0,1),p=1-(1-t)**3;
  camera.zoom=zoomTween.from+(zoomTween.to-zoomTween.from)*p;camera.x=zoomTween.anchor.x-(zoomTween.px-width/2)/camera.zoom;camera.y=zoomTween.anchor.y-(zoomTween.py-height/2)/camera.zoom;
  if(t===1)zoomTween=null;
 }
 function zoomBy(factor,px=width/2,py=height/2){
  stepFocus(performance.now());focusTween=null;territoryView=false;
  const now=performance.now();stepZoom(now);const to=clamp((zoomTween?.to??camera.zoom)*factor,Math.min(width/WORLD.width,height/WORLD.height)*.9,2.4);
  zoomTween={from:camera.zoom,to,anchor:world(px,py),px,py,at:now};if(reduced)stepZoom(now+160);dirty=true;
 }
 canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();zoomBy(e.deltaY<0?1.18:1/1.18,e.clientX-r.left,e.clientY-r.top);},{passive:false});
 canvas.addEventListener('pointerdown',e=>{stepFocus(performance.now());focusTween=null;if(e.pointerType==='touch'){pointer=null;updateHover();}stepZoom(performance.now());zoomTween=null;canvas.focus();canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y};moved=false;});
 canvas.addEventListener('pointermove',e=>{
  const r=canvas.getBoundingClientRect();pointer=e.pointerType==='touch'?null:{x:e.clientX-r.left,y:e.clientY-r.top};
  if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;if(moved)territoryView=false;camera.x=clamp(drag.cx-dx/camera.zoom,0,WORLD.width);camera.y=clamp(drag.cy-dy/camera.zoom,0,WORLD.height);dirty=true;}
  updateHover();
 });
 canvas.addEventListener('pointerleave',()=>{pointer=null;updateHover();});
 canvas.addEventListener('pointercancel',()=>{drag=null;pointer=null;updateHover();});
 canvas.addEventListener('pointerup',e=>{if(!drag)return;drag=null;updateHover();if(moved)return;const rect=canvas.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top,marker=signals.hit(px,py);if(marker){const c=city(s,marker.city);territoryView=false;zoomTween=null;camera.x=c.x;camera.y=c.y;camera.zoom=Math.max(.65,camera.zoom);dirty=true;c.major?onSelect(c.id):onLand?.(c.id);return;}const point=world(px,py);if(!canSeePoint(s,point.x,point.y))return;dirty=true;const camp=visibleCities().find(c=>!c.major&&c.soldiers>=.5&&Math.hypot(c.x-point.x,c.y-point.y)<18/camera.zoom);if(camp){onLand?.(camp.id);return;}const army=lastVisual?.armies.filter(v=>!v.retiring&&Math.hypot(v.x+v.offset/camera.zoom-point.x,v.y-point.y)<22/camera.zoom).at(-1);if(army){onArmy(army.data.id);return;}const nearest=visibleCities().filter(c=>c.major).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0];if(nearest&&Math.hypot(nearest.x-point.x,nearest.y-point.y)<60/camera.zoom)onSelect(nearest.id);else {const land=regionAt(s,point.x,point.y);if(land)onLand?.(land.id);}});
 canvas.addEventListener('keydown',e=>{const delta=100/camera.zoom;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();if(e.key.startsWith('Arrow')){focusTween=null;zoomTween=null;territoryView=false;}if(e.key==='ArrowLeft')camera.x-=delta;if(e.key==='ArrowRight')camera.x+=delta;if(e.key==='ArrowUp')camera.y-=delta;if(e.key==='ArrowDown')camera.y+=delta;camera.x=clamp(camera.x,0,WORLD.width);camera.y=clamp(camera.y,0,WORLD.height);if(e.key==='+'||e.key==='=')zoomBy(1.3);if(e.key==='-')zoomBy(1/1.3);dirty=true;}});
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();frame=requestAnimationFrame(loop);
 return {invalidateTerrain(){terrainKey='';sceneKey='';dirty=true;},inspect(id){if(inspected!==id){inspected=id;dirty=true;}},repaint(){const now=performance.now();motion.setPaused(s.paused,now);motion.refresh(s,now);dirty=true;},feedback(id,text,tone='gold'){signals.add({city:id,label:text,tone,kind:'command'},performance.now());dirty=true;},setFeedback(next){signals.update(next,performance.now());canvas.dataset.threats=String(next.threats.filter(t=>t.type==='invasion').length);dirty=true;},setSpeed(ms){motion.setSpeed(ms,performance.now());},update(next){s=next;const now=performance.now();motion.update(s,now);motion.setPaused(s.paused,now);dirty=true;},locate,focusTerritory,focus(id){focusTween=null;territoryView=false;zoomTween=null;const c=city(s,id);if(c&&canSeeRegion(s,id)){camera.x=c.x;camera.y=c.y;if(camera.zoom<.5)camera.zoom=.9;dirty=true;}},zoom:zoomBy,overview(){focusTween=null;territoryView=false;zoomTween=null;camera.x=WORLD.width/2;camera.y=WORLD.height/2;camera.zoom=Math.min(width/WORLD.width,height/WORLD.height)*.94;dirty=true;},stats(){return {tiles:tiles?.stats(),visibleCities:drawn,drawMs:Math.round(drawMs*100)/100,zoom:camera.zoom,pixelRatio:dpr,fps:Number(canvas.dataset.renderFps)||0,frameP95:Number(canvas.dataset.frameP95)||0};},destroy(){tiles?.destroy();for(const image of Object.values(art))image.onload=null;cancelAnimationFrame(frame);observer.disconnect();}};
}
