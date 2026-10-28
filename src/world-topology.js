// Version 3: scattered sites, Voronoi districts, and a sparse, connected road network.
export function scatteredSites(world,rand){
 const sites=[];
 for(let i=0;i<world.count;i++){
  let best=null,score=-1;
  for(let k=0;k<16;k++){
   const p={x:30+rand()*(world.width-60),y:30+rand()*(world.height-60)};
   let nearest=Infinity;for(const q of sites)nearest=Math.min(nearest,(p.x-q.x)**2+(p.y-q.y)**2);
   if(nearest>score){best=p;score=nearest;}
  }
  sites.push({...best,col:Math.floor(best.x/world.width*world.cols),row:Math.floor(best.y/world.height*world.rows)});
 }
 return sites;
}

export function shapeScatteredDistricts(cities,world){
 for(const c of cities){
  const nearby=cities.filter(n=>n!==c).sort((a,b)=>(a.x-c.x)**2+(a.y-c.y)**2-((b.x-c.x)**2+(b.y-c.y)**2));
  let poly=[[0,0],[world.width,0],[world.width,world.height],[0,world.height]],radius=Infinity;
  for(const n of nearby){
   const dx=n.x-c.x,dy=n.y-c.y;
   if(dx*dx+dy*dy>4*radius)break;
   const limit=(n.x*n.x+n.y*n.y-c.x*c.x-c.y*c.y)/2,next=[];
   for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],da=dx*a[0]+dy*a[1]-limit,db=dx*b[0]+dy*b[1]-limit;
    if(da<=0)next.push(a);
    if((da<=0)!==(db<=0)){const t=da/(da-db);next.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
   }
   poly=next;radius=Math.max(...poly.map(p=>(p[0]-c.x)**2+(p[1]-c.y)**2));
  }
  c.poly=poly;c.edges=poly.map((a,i)=>{
   const b=poly[(i+1)%poly.length],x=(a[0]+b[0])/2,y=(a[1]+b[1])/2,d=(x-c.x)**2+(y-c.y)**2;
   return nearby.find(n=>Math.abs((x-n.x)**2+(y-n.y)**2-d)<.01)?.id??null;
  });
 }
}

export function connectDistricts(cities,rand,travelWeight,maxBackboneDegree=Infinity){
 const byId=new Map(cities.map(c=>[c.id,c])),parent=new Map(cities.map(c=>[c.id,c.id])),edges=[];
 const root=id=>{while(parent.get(id)!==id){parent.set(id,parent.get(parent.get(id)));id=parent.get(id);}return id;};
 for(const c of cities){c.neighbors=[];for(const id of c.edges)if(id&&c.id<id){const n=byId.get(id);edges.push({c,n,weight:Math.hypot(c.x-n.x,c.y-n.y)*travelWeight(c,n)*(.75+rand()*.5)});}}
 edges.sort((a,b)=>a.weight-b.weight);
 const link=({c,n})=>{c.neighbors.push(n.id);n.neighbors.push(c.id);};
 // A spanning backbone guarantees that no region is cut off.
 for(const edge of edges){if(edge.c.neighbors.length>=maxBackboneDegree||edge.n.neighbors.length>=maxBackboneDegree)continue;const a=root(edge.c.id),b=root(edge.n.id);if(a!==b){parent.set(a,b);link(edge);}}
 if(Number.isFinite(maxBackboneDegree))for(const edge of edges){const a=root(edge.c.id),b=root(edge.n.id);if(a!==b){parent.set(a,b);link(edge);}}
 const targets=new Map(cities.map(c=>[c.id,2+Math.floor(rand()*3)]));
 // Add varied loops without rebuilding the full triangular Delaunay mesh.
 for(let pass=0;pass<2;pass++)for(const edge of edges){
  const {c,n}=edge;if(c.neighbors.includes(n.id)||c.neighbors.length>=5||n.neighbors.length>=5)continue;
  if(c.neighbors.some(id=>n.neighbors.includes(id)))continue;
  if(pass===0?Math.min(c.neighbors.length,n.neighbors.length)<2:c.neighbors.length<targets.get(c.id)&&n.neighbors.length<targets.get(n.id))link(edge);
 }
}
