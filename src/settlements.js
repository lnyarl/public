import {sampleField} from './terrain.js';

const clamp=n=>Math.max(0,Math.min(1,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export function placeStrongholds(hubs,sites,g,world,rand,version){
 const candidates=[],plot=[-45,-30,-15,0,15,30,45];
 for(const site of sites){
  const {x,y}=site;if(x<220||y<220||x>world.width-220||y>world.height-220)continue;
  const height=sampleField(g,'elevation',x,y),slope=sampleField(g,'slope',x,y),water=sampleField(g,'riverDistance',x,y),forest=sampleField(g,'forest',x,y);
  if(height>=.34||slope>=.06||water<55||forest>(version>=7?.9:.7))continue;
  // The whole castle footprint needs firm ground, not just its center point.
  if(plot.some(dx=>plot.some(dy=>sampleField(g,'elevation',x+dx,y+dy)>=.35||sampleField(g,'slope',x+dx,y+dy)>=.07||sampleField(g,'riverDistance',x+dx,y+dy)<40)))continue;
  let fields=0,near=0,hills=0;
  for(const radius of [220,440])for(let k=0;k<8;k++){
   const px=x+Math.cos(k*Math.PI/4)*radius,py=y+Math.sin(k*Math.PI/4)*radius,h=sampleField(g,'elevation',px,py),woods=sampleField(g,'forest',px,py),wet=sampleField(g,'riverDistance',px,py);
   fields+=clamp((.34-h)/.15)*(1-woods*(version>=7?.25:.5))*clamp(wet/40);
   if(radius===220&&h<.34&&wet>24)near++;
   if(radius===440&&h>.34)hills++;
  }
  if(near<5)continue;
  candidates.push({site,fields:fields/16,flat:1-slope/.06,clear:1-forest,water,foothill:clamp(hills/3)});
 }
 const chosen=[],capitals=[],capitalGap=620+rand()*140,riverShare=.35+rand()*.2;
 for(const hub of hubs){
  const role=rand(),inland=280+rand()*360,gap=hub.capitalOf?capitalGap:version>=7?550+rand()*140:340+rand()*140;
  const remaining=candidates.filter(p=>!chosen.includes(p.site)),nearest=p=>chosen.length?Math.min(...chosen.map(q=>distance(p.site,q))):Infinity;
  // Keep suitable land even when a particularly mountainous seed needs less spacing.
  const separation=Math.min(gap,Math.max(...remaining.map(nearest))),options=remaining.filter(p=>nearest(p)>=separation);
  let best=null,bestScore=-Infinity;
  for(const p of options){
   const river=Math.exp(-(((p.water-150)/190)**2)),plain=Math.exp(-(((p.water-inland)/330)**2));
   const setting=role<riverShare?river*1.6:role<.78?p.fields+plain*.65:p.foothill*1.6+river*.35;
   const spread=version>=7?clamp(nearest(p)/1300)*3.5:hub.capitalOf?clamp(nearest(p)/1250)*1.5:Math.exp(-(((Math.min(...capitals.map(q=>distance(p.site,q)))-650)/420)**2));
   const score=p.fields*1.5+p.flat*.3+p.clear*.25+setting+spread+rand()*.6;
   if(score>bestScore){best=p;bestScore=score;}
  }
  chosen.push(best.site);if(hub.capitalOf)capitals.push(best.site);Object.assign(hub,best.site);
 }
 return chosen;
}
