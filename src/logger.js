const entries=[];
let sequence=0;
export function trace(scope,event,data={},level='debug') {
  const entry={seq:++sequence,time:new Date().toISOString(),scope,event,...structuredClone(data),level};
  entries.push(entry);
  if(entries.length>5000) entries.splice(0,entries.length-5000);
  if(typeof window!=='undefined') {
    const method=level==='error'?'error':level==='warn'?'warn':'debug';
    console[method](`[왕관과 대지][${scope}] ${event}`,entry);
  }
  return entry;
}
export const diagnostics=()=>entries.slice();
export function exportDiagnostics(state) {
  return JSON.stringify({version:state?.version===4?'0.4':'0.3',exportedAt:new Date().toISOString(),state,entries},null,2);
}
if(typeof window!=='undefined') {
  window.addEventListener('error',e=>trace('error','window.error',{message:e.message,source:e.filename,line:e.lineno,stack:e.error?.stack},'error'));
  window.addEventListener('unhandledrejection',e=>trace('error','unhandledrejection',{message:String(e.reason),stack:e.reason?.stack},'error'));
}
