export function createWorkerRPC(url){
 const worker=new Worker(url,{type:'module'}),pending=new Map();let serial=0,closed=false;
 const fail=error=>{closed=true;for(const {reject} of pending.values())reject(error);pending.clear();worker.terminate();};
 worker.onmessage=({data})=>{const call=pending.get(data.id);if(!call)return;pending.delete(data.id);data.error?call.reject(new Error(data.error)):call.resolve(data.result);};
 worker.onerror=event=>{event.preventDefault();fail(new Error(event.message||'백그라운드 작업을 시작하지 못했습니다.'));};
 worker.onmessageerror=()=>fail(new Error('백그라운드 작업의 응답을 읽지 못했습니다.'));
 return {
  request(type,args={}){if(closed)return Promise.reject(new Error('백그라운드 작업이 종료되었습니다.'));return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});try{worker.postMessage({id,type,args});}catch(error){pending.delete(id);reject(error);}});},
  close(){fail(new Error('백그라운드 작업이 종료되었습니다.'));}
 };
}
