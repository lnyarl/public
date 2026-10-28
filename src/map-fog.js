const ready=image=>image?.complete&&image.naturalWidth;
const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
function path(ctx,regions,screen){ctx.beginPath();for(const c of regions){c.poly.forEach(([x,y],i)=>{const p=screen(x,y);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.closePath();}}
export function createCloudFog(){
 const deck=document.createElement('canvas'),layer=document.createElement('canvas'),mask=document.createElement('canvas'),reveal=document.createElement('canvas'),memory=document.createElement('canvas'),composite=document.createElement('canvas');
 let key='',previous=null,previousVisible=null,transitions=[];
 function reset(c,w,h){if(c.width!==w||c.height!==h){c.width=w;c.height=h;}else c.getContext('2d').clearRect(0,0,w,h);}
 return {
  active(now,reduced=false){return !reduced&&transitions.length>0;},
  draw(ctx,width,height,screen,world,known,zoom,image,now,reduced=false,visible=null){
   const ids=new Set(known.map(c=>c.id)),current=visible||ids,remembered=known.filter(c=>!current.has(c.id));
   if(previous&&!reduced)for(const c of known)if(current.has(c.id)&&!previousVisible.has(c.id)){const points=c.poly.map(p=>screen(...p));if(points.some(p=>p.x>=-300&&p.x<=width+300&&p.y>=-300&&p.y<=height+300))transitions.push({c,at:now,strength:previous.has(c.id)?.5:1});}
   previous=new Set([...(previous||[]),...ids]);previousVisible=new Set(current);transitions=transitions.filter(t=>now-t.at<1100);
   const origin=screen(0,0),end=screen(world.width,world.height),signature=[width,height,origin.x,origin.y,zoom,ready(image)?1:0,...[...ids].sort(),'live',...[...current].sort()].join(',');
   if(signature!==key){
    reset(deck,width,height);reset(layer,width,height);reset(mask,width,height);
    const paint=deck.getContext('2d');paint.save();paint.beginPath();paint.rect(origin.x,origin.y,end.x-origin.x,end.y-origin.y);paint.clip();paint.fillStyle='#a9bcc5';paint.fillRect(0,0,width,height);
    if(ready(image)){
     const size=Math.max(510,Math.min(920,zoom*1700));
     // Two irregular layers of broad banks avoid repeated small silhouettes.
     for(let level=0;level<2;level++){
      const stepX=size*(level?.43:.55),stepY=size*(level?.43:.2),jitter=level?.8:.3,clouds=[];
      for(let row=Math.floor(-origin.y/stepY)-4;row<(height-origin.y)/stepY+4;row++)for(let col=Math.floor(-origin.x/stepX)-4;col<(width-origin.x)/stepX+4;col++){
       const n=hash(col+level*739,row+419),patch=.5+.25*Math.sin(col*.49+row*.21)+.25*Math.cos(row*.57-col*.17);
       if(level&&n>.48+patch*.42)continue;
       const sprite=image;
       const x=origin.x+(col+.1+hash(col-53,row+19)*jitter)*stepX+Math.sin(row*.73)*stepX*.2,y=origin.y+(row+.1+hash(col+37,row-17)*jitter)*stepY+Math.cos(col*.61)*stepY*.2;
       const w=size*(level?.8+hash(col-79,row+73)*.8:1.25+n*.95),h=w*sprite.naturalHeight/sprite.naturalWidth*(.78+hash(col+26,row-66)*.5);
       clouds.push({sprite,x,y,w,h,angle:(hash(col+72,row+92)-.5)*(level?1.1:.7),alpha:level?.72+n*.28:.7+n*.23});
      }
      clouds.sort((a,b)=>a.y-b.y);
      for(const cloud of clouds){paint.save();paint.translate(cloud.x,cloud.y);paint.rotate(cloud.angle);paint.globalAlpha=cloud.alpha;paint.drawImage(cloud.sprite,-cloud.w/2,-cloud.h/2,cloud.w,cloud.h);paint.restore();}
     }
    }paint.restore();
    const erase=mask.getContext('2d');erase.fillStyle='#fff';path(erase,known,screen);erase.fill();
    const out=layer.getContext('2d');out.drawImage(deck,0,0);out.globalCompositeOperation='destination-out';out.filter=`blur(${Math.max(1,Math.min(16,zoom*28))}px)`;out.drawImage(mask,0,0);out.filter='none';out.globalCompositeOperation='source-over';
    reset(memory,width,height);const haze=memory.getContext('2d');haze.drawImage(deck,0,0);haze.globalCompositeOperation='destination-in';reset(mask,width,height);const rememberedMask=mask.getContext('2d');rememberedMask.fillStyle='#fff';path(rememberedMask,remembered,screen);rememberedMask.fill();haze.filter='blur(28px)';haze.drawImage(mask,0,0);haze.filter='none';haze.globalCompositeOperation='source-over';out.globalAlpha=.5;out.drawImage(memory,0,0);out.globalAlpha=1;
    // Keep live territory clear while retaining the soft mist along its edges.
    reset(mask,width,height);const clearMask=mask.getContext('2d');clearMask.fillStyle='#fff';path(clearMask,known.filter(c=>current.has(c.id)),screen);clearMask.fill();out.globalCompositeOperation='destination-out';out.globalAlpha=.8;out.filter='blur(22px)';out.drawImage(mask,0,0);out.filter='none';out.globalCompositeOperation='source-over';
    out.globalAlpha=1;out.shadowColor='transparent';reset(composite,width,height);const shade=composite.getContext('2d');shade.shadowColor='#233e4340';shade.shadowBlur=28;shade.shadowOffsetX=8;shade.shadowOffsetY=20;shade.drawImage(layer,0,0);shade.shadowColor='transparent';key=signature;
   }
   ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(composite,0,0,ctx.canvas.width,ctx.canvas.height);
   if(!reduced&&transitions.length){
    reset(mask,width,height);const paint=mask.getContext('2d');paint.fillStyle='#fff';for(const t of transitions){paint.globalAlpha=t.strength;path(paint,[t.c],screen);paint.fill();}paint.globalAlpha=1;paint.globalCompositeOperation='destination-out';
    for(const t of transitions){const u=Math.max(0,Math.min(1,(now-t.at)/1100)),p=1-(1-u)**3,center=screen(t.c.x,t.c.y),radius=Math.max(...t.c.poly.map(q=>{const v=screen(...q);return Math.hypot(v.x-center.x,v.y-center.y);}))*p*1.35+1,gradient=paint.createRadialGradient(center.x,center.y,Math.max(0,radius-35),center.x,center.y,radius+35);gradient.addColorStop(0,'#fff');gradient.addColorStop(1,'#ffffff00');paint.fillStyle=gradient;paint.fillRect(center.x-radius-35,center.y-radius-35,(radius+35)*2,(radius+35)*2);}
    paint.globalCompositeOperation='source-over';reset(reveal,width,height);const mist=reveal.getContext('2d');mist.drawImage(deck,0,-8);mist.globalCompositeOperation='destination-in';mist.drawImage(mask,0,0);mist.globalCompositeOperation='source-over';ctx.drawImage(reveal,0,0,ctx.canvas.width,ctx.canvas.height);
   }ctx.restore();return transitions.length>0;
  }
 };
}
export function drawWorldOverview(canvas,s,world,camera,width,height,fog,image){
 if(!canvas)return;const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,pad=6,scale=Math.min((w-pad*2)/world.width,(h-pad*2)/world.height),left=(w-world.width*scale)/2,top=(h-world.height*scale)/2;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#203931';ctx.fillRect(0,0,w,h);ctx.fillStyle='#a9bcc5';ctx.fillRect(left,top,world.width*scale,world.height*scale);if(ready(image)){ctx.save();ctx.beginPath();ctx.rect(left,top,world.width*scale,world.height*scale);ctx.clip();ctx.drawImage(image,left,top,world.width*scale,world.height*scale);ctx.restore();}
 ctx.save();ctx.translate(left,top);ctx.scale(scale,scale);for(const c of fog.known){ctx.beginPath();c.poly.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fog.visible.has(c.id)?c.owner===s.player?'#d4be80':'#9bab85':'#627c6e';ctx.fill();}ctx.restore();ctx.strokeStyle='#d8c99a';ctx.lineWidth=.8;ctx.strokeRect(left,top,world.width*scale,world.height*scale);ctx.save();ctx.beginPath();ctx.rect(left,top,world.width*scale,world.height*scale);ctx.clip();ctx.strokeStyle='#fff5cd';ctx.lineWidth=1.2;ctx.strokeRect(left+(camera.x-width/camera.zoom/2)*scale,top+(camera.y-height/camera.zoom/2)*scale,width/camera.zoom*scale,height/camera.zoom*scale);ctx.restore();
}
