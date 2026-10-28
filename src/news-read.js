export function createNewsReadState(storage){
 let scope='',read=new Set();
 const eventKey=e=>JSON.stringify([e.id,e.at,e.kind,e.text]);
 function select(game){
  const key=`three-kingdoms-news-read:${game.worldSeed}:${game.player}`;
  if(scope===key)return;
  scope=key;
  try{const stored=JSON.parse(storage.getItem(scope));read=new Set(Array.isArray(stored)?stored:[]);}catch{read=new Set();}
 }
 return {
  has(game,event){select(game);return read.has(eventKey(event));},
  mark(game,events){
   select(game);
   const retained=new Set([...game.events,...game.reports].map(eventKey));
   read=new Set([...read].filter(key=>retained.has(key)));
   for(const event of events)read.add(eventKey(event));
   try{storage.setItem(scope,JSON.stringify([...read]));return true;}catch{return false;}
  },
  reset(game){select(game);read.clear();try{storage.removeItem(scope);}catch{}}
 };
}
