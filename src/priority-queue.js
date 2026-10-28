// Stable min-heap shared by drainage and weighted land routes.
export class PriorityQueue{
 constructor(){this.items=[];}
 get length(){return this.items.length;}
 push(id,cost){const item={id,cost},a=this.items;let i=a.length;a.push(item);while(i){const p=(i-1)>>1;if(a[p].cost<cost||a[p].cost===cost&&a[p].id<=id)break;a[i]=a[p];i=p;}a[i]=item;}
 pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&(a[c+1].cost<a[c].cost||a[c+1].cost===a[c].cost&&a[c+1].id<a[c].id))c++;if(a[c].cost>last.cost||a[c].cost===last.cost&&a[c].id>=last.id)break;a[i]=a[c];i=c;}a[i]=last;}return first;}
}
