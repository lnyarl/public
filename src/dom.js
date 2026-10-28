import {prepareSelectControls,refreshSelectControls} from './select-control.js';

// Retain matching DOM nodes so progress transitions and keyboard focus survive
// daily updates. A changed entity gets a fresh node instead of inheriting motion.
function patch(target,source){
 const key=node=>node.nodeType===1?node.getAttribute('data-project')||node.getAttribute('data-army')||node.getAttribute('data-menu-route'):null;
 if(target.nodeType!==source.nodeType||target.nodeName!==source.nodeName||key(target)!==key(source)){target.replaceWith(source.cloneNode(true));return;}
 if(target.nodeType===3){if(target.data!==source.data)target.data=source.data;return;}
 if(target.nodeType!==1)return;
 for(const attr of [...target.attributes])if(!source.hasAttribute(attr.name))target.removeAttribute(attr.name);
 for(const attr of source.attributes)if(target.getAttribute(attr.name)!==attr.value)target.setAttribute(attr.name,attr.value);
 syncChildren(target,source);
 if(['SELECT','INPUT'].includes(target.tagName)&&target.value!==source.value)target.value=source.value;
}
function syncChildren(target,source){
 for(let i=0;i<source.childNodes.length;i++){
  if(target.childNodes[i])patch(target.childNodes[i],source.childNodes[i]);
  else target.append(source.childNodes[i].cloneNode(true));
 }
 while(target.childNodes.length>source.childNodes.length)target.lastChild.remove();
}
export function setHTML(id,html){
 const el=document.getElementById(id);if(el.innerHTML===html)return;
 const template=document.createElement('template');template.innerHTML=html;prepareSelectControls(template.content);syncChildren(el,template.content);refreshSelectControls(el);
 if(el.tagName==='SELECT')el.value=(template.content.querySelector('option[selected]')||template.content.querySelector('option'))?.value||'';
}
