// One byte budget covers all sectors and zoom levels; evicted bitmaps release GPU memory.
const TILE_CACHE_BYTES=64*1024*1024;
export function createTileCache(maxBytes=TILE_CACHE_BYTES){
 const entries=new Map();let bytes=0;
 const remove=key=>{const entry=entries.get(key);if(!entry)return;bytes-=entry.bytes;entry.value?.close?.();entries.delete(key);};
 return {
  get(key){const entry=entries.get(key);if(!entry)return;entries.delete(key);entries.set(key,entry);return entry.value;},
  set(key,value,cost=value?value.width*value.height*4:0){remove(key);entries.set(key,{value,bytes:cost});bytes+=cost;while(bytes>maxBytes||entries.size>4096)remove(entries.keys().next().value);},
  clear(){for(const key of entries.keys())remove(key);},
  stats(){return {entries:entries.size,bytes,maxBytes};}
 };
}

export function tileSpec(zoom,bounds=null,g=null){
 let size=512*2**Math.max(0,Math.floor(Math.log2(.5/zoom)));
 const width=bounds?bounds.right-bounds.left:0,height=bounds?bounds.bottom-bounds.top:0;
 // Include grid alignment and the extra tiles where sector-local grids restart.
 const count=()=> (Math.ceil(width/size)+Math.ceil(width/(g?.width||Infinity))+1)*(Math.ceil(height/size)+Math.ceil(height/(g?.height||Infinity))+1);
 if(bounds)while(count()>96&&size<Math.max(width,height))size*=2;
 const scale=zoom*size/512;let resolution=scale>2?3:scale>.8?2:scale>.5?1:scale>.33?.75:.5;
 if(bounds){
  // Ground shares this cache. Leave room for it and for tiles finishing after a zoom.
  const pixels=Math.sqrt(Math.max(0,TILE_CACHE_BYTES*.8/count()-256*256*4)/4)-4;
  resolution=Math.min(resolution,Math.max(.25,Math.floor(pixels/128)/4));
 }
 return {size,resolution,detail:zoom>.32?1:zoom>.28?.3:.2};
}

export const makeCanvas=(width,height=width)=>{
 const canvas=typeof document==='undefined'?new OffscreenCanvas(width,height):document.createElement('canvas');
 canvas.width=width;canvas.height=height;return canvas;
};
