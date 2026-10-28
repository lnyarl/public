import {createCampaignRuntime} from './campaign-runtime.js';
const runtime=createCampaignRuntime();
self.onmessage=({data:{id,type,args}})=>{
 try{self.postMessage({id,result:runtime.handle(type,args)});}catch(error){self.postMessage({id,error:error.message});}
};
