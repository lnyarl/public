import {createWorkerRPC} from './worker-rpc.js';
import {CITY_STATE_FIELDS} from './campaign-runtime.js';
import {invalidateWorld,index} from './world.js';
import {setFrontierTerrainSource} from './frontier-world.js';
import {installTerrain} from './terrain.js';
import {trace} from './logger.js';

export function createCampaignClient(){
 const rpc=typeof Worker==='undefined'?null:createWorkerRPC(new URL('./simulation-worker.js',import.meta.url));
 let local,game=null,raw=null,savedAt=-1,tail=Promise.resolve(),generation=0;
 const terrains=new Map(),loading=new Map(),listeners=new Set();
 const request=async(type,args)=>rpc?rpc.request(type,args):(local??=(await import('./campaign-runtime.js')).createCampaignRuntime(),structuredClone(local.handle(type,args)));
 function terrain(seed,version){
  const key=`${version}:${seed>>>0}`;let g=terrains.get(key);if(g){terrains.delete(key);terrains.set(key,g);return g;}
  if(!loading.has(key)){
   const epoch=generation,promise=request('terrain',{seed,version}).then(value=>{if(epoch!==generation)return;installTerrain(value);terrains.set(key,value);while(terrains.size>8)terrains.delete(terrains.keys().next().value);for(const fn of listeners)fn();}).catch(error=>{if(epoch===generation)trace('worker','terrain.failed',{message:error.message},'error');}).finally(()=>{if(loading.get(key)===promise)loading.delete(key);});loading.set(key,promise);
  }return null;
 }
 function apply(packet){
  if(packet.reset){generation++;terrains.clear();loading.clear();game={...packet.state,cities:[]};}
  const selected=game.selected;Object.assign(game,packet.state);if(!packet.reset&&index(game).cities.get(selected))game.selected=selected;
  const byId=index(game).cities;for(const [id,...values] of packet.changed){const c=byId.get(id);CITY_STATE_FIELDS.forEach((k,i)=>c[k]=values[i]);}
  for(const c of packet.topology)Object.assign(byId.get(c.id),c);
  game.cities.push(...packet.added);if(packet.added.length||packet.topology.length)invalidateWorld(game);
  if(packet.raw){raw=packet.raw;savedAt=game.elapsed;}
  setFrontierTerrainSource(game,rpc?terrain:null);
  for(const e of packet.logs){const {scope,event,seq,time,level,...data}=e;trace(scope,event,data,level);}
  return packet.result;
 }
 return {
  get state(){return game;},get raw(){return raw;},get savedAt(){return savedAt;},
  run(type,args={}){const selected=game?.selected;const job=tail.then(async()=>{const packet=await request(type,{...args,selected});return apply(packet);});tail=job.catch(()=>{});return job;},
  async readyTerrain(){if(!game)return;const version=game.generatorVersion>=7?5:game.generatorVersion>=5?4:game.generatorVersion===4?3:2;terrain(game.worldSeed,version);await Promise.all(loading.values());},
  onTerrain(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  close(){generation++;rpc?.close();listeners.clear();}
 };
}
