import {createWorkerRPC} from './worker-rpc.js';
import {createTileCache} from './tile-cache.js';

// Bounded work queues avoid baking a trail of obsolete camera positions.
export function createMapTiles(onReady){
 if(typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined')return null;
 const rpc=createWorkerRPC(new URL('./map-tile-worker.js',import.meta.url)),cache=createTileCache(),pending=new Set(),registered=new Map();
 let active=true,ready=false,failed=false,created=0;const errors=[];
 const sources={};for(const [name,folder] of [['river-water','materials'],['river-bank','terrain'],['river-sandbar','terrain'],['reeds','terrain']])sources[name]=new URL(`..assets/art/${folder}/${name}.webp`,import.meta.url).href;
 rpc.request('init',{sources}).then(()=>{ready=true;if(active)onReady();}).catch(error=>{failed=true;errors.push(error.message);if(active)onReady();});
 function tile(type,g,x,y,spec){
  if(!active||!ready||failed)return null;
  const identity=`${g.version}:${g.seed}:${g.width}:${g.height}`,id=`${type}:${identity}:${x},${y}:${JSON.stringify(spec)}`;
  const value=cache.get(id);if(value)return value;
  if(pending.has(id)||pending.size>=8)return null;
  pending.add(id);const geography=registered.has(identity)?null:g;registered.delete(identity);registered.set(identity,true);while(registered.size>8)registered.delete(registered.keys().next().value);
  // A worker receives terrain once per resident sector, never the full campaign.
  rpc.request(type,{key:identity,geography,x,y,...(type==='river'?{spec}:{size:spec})}).then(bitmap=>{if(active){cache.set(id,bitmap);created++;onReady();}else bitmap.close();}).catch(error=>{failed=true;errors.push(error.message);if(active)onReady();}).finally(()=>pending.delete(id));
  return null;
 }
 return {
  river:(g,x,y,spec)=>tile('river',g,x,y,spec),ground:(g,x,y,size)=>tile('ground',g,x,y,size),
  get failed(){return failed;},stats(){return {...cache.stats(),pending:pending.size,created,failed,errors};},
  destroy(){active=false;rpc.close();cache.clear();}
 };
}
