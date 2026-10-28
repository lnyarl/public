import {riverTile} from './map-rivers.js';
import {groundTile} from './map-surfaces.js';
const geographies=new Map(),assets={};
let queue=Promise.resolve();
async function render(type,args){
 if(type==='init'){
  await Promise.all(Object.entries(args.sources).map(async([name,url])=>{const response=await fetch(url);if(!response.ok)throw new Error('지도 그림을 불러오지 못했습니다.');const image=await createImageBitmap(await response.blob());image.complete=true;image.naturalWidth=image.width;image.naturalHeight=image.height;assets[name]=image;}));return true;
 }
 if(args.geography)geographies.set(args.key,args.geography);
 const g=geographies.get(args.key);if(!g)throw new Error('지도 지형이 준비되지 않았습니다.');
 geographies.delete(args.key);geographies.set(args.key,g);while(geographies.size>8)geographies.delete(geographies.keys().next().value);
 const canvas=type==='river'?riverTile(g,args.x,args.y,args.spec,assets):groundTile(g,args.x,args.y,args.size);
 return canvas.transferToImageBitmap();
}
self.onmessage=({data:{id,type,args}})=>{queue=queue.then(async()=>{
 try{const result=await render(type,args);self.postMessage({id,result},result instanceof ImageBitmap?[result]:[]);}catch(error){self.postMessage({id,error:error.message});}
});};
