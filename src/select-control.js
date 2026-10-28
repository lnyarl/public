// Keep the select as the value/event source; draw its entire interface in-game.
let opened=null;
const popupId='realm-select-list';

function labelFor(select){
 const label=select.closest('label')||[...select.getRootNode().querySelectorAll('label[for]')].find(el=>el.htmlFor===select.id);
 if(!label)return select.getAttribute('aria-label')||select.id;
 const copy=label.cloneNode(true);copy.querySelectorAll('select,button,.immediate-hint').forEach(el=>el.remove());
 return copy.textContent.trim();
}
function choiceCopy(option){
 const copy=document.createElement('span');copy.className='realm-select-copy';
 const [name,...detail]=option.textContent.split(' · '),title=document.createElement('span');
 title.textContent=name;copy.append(title);
 if(detail.length){const small=document.createElement('small');small.textContent=detail.join(' · ');copy.append(small);}
 return copy;
}
export function prepareSelectControls(fragment){
 for(const select of fragment.querySelectorAll('select')){
  const label=labelFor(select),wrapper=document.createElement('span'),button=document.createElement('button');
  wrapper.className='realm-select';select.before(wrapper);wrapper.append(select);
  select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  button.type='button';button.id=select.id+'-control';button.className='realm-select-trigger';button.disabled=select.disabled||!select.options.length;
  button.dataset.label=label;button.setAttribute('role','combobox');
  button.setAttribute('aria-label',label);button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-controls',popupId);
  button.setAttribute('aria-expanded',String(opened?.select.id===select.id));
  if(select.hasAttribute('aria-describedby'))button.setAttribute('aria-describedby',select.getAttribute('aria-describedby'));
  const value=document.createElement('span');value.className='realm-select-value';value.textContent=select.selectedOptions[0]?.textContent||'선택할 항목 없음';
  const arrow=document.createElement('span');arrow.className='realm-select-arrow';arrow.setAttribute('aria-hidden','true');button.append(value,arrow);wrapper.append(button);
  const parent=wrapper.closest('label');if(parent)parent.htmlFor=button.id;
  for(const external of fragment.querySelectorAll('label[for]'))if(external.htmlFor===select.id)external.htmlFor=button.id;
 }
}
function close(returnFocus=false){
 if(!opened)return;
 const {button,popup}=opened;opened=null;popup.remove();button.setAttribute('aria-expanded','false');button.removeAttribute('aria-activedescendant');
 if(returnFocus&&button.isConnected)button.focus({preventScroll:true});
}
function position(){
 if(!opened)return;
 const {button,popup}=opened,box=button.getBoundingClientRect(),margin=12,gap=7;
 if(!button.isConnected||!button.checkVisibility()||box.bottom<0||box.top>innerHeight){close();return;}
 const below=innerHeight-box.bottom-margin-gap,above=box.top-margin-gap,up=below<Math.min(260,popup.scrollHeight)&&above>below;
 const width=Math.min(Math.max(box.width,240),innerWidth-margin*2),space=Math.max(0,up?above:below);
 popup.style.width=width+'px';popup.style.maxHeight=Math.min(330,space)+'px';
 popup.style.left=Math.max(margin,Math.min(box.left,innerWidth-width-margin))+'px';popup.dataset.direction=up?'up':'down';
 popup.style.top=(up?box.top-gap-popup.getBoundingClientRect().height:box.bottom+gap)+'px';
}
function highlight(index){
 const rows=[...opened.popup.querySelectorAll('[role=option]')];
 rows.forEach(row=>row.classList.toggle('is-active',Number(row.dataset.index)===index));
 opened.active=index;const active=rows.find(row=>Number(row.dataset.index)===index);
 if(active){opened.button.setAttribute('aria-activedescendant',active.id);active.scrollIntoView({block:'nearest'});}
}
function renderOptions(){
 const {select,button,popup}=opened;popup.replaceChildren();
 const heading=document.createElement('div');heading.className='realm-select-heading';heading.textContent=button.dataset.label;heading.setAttribute('aria-hidden','true');popup.append(heading);
 [...select.options].forEach((option,index)=>{
  const row=document.createElement('div');row.className='realm-select-option';row.id=popupId+'-'+index;row.dataset.index=index;
  row.setAttribute('role','option');row.setAttribute('aria-selected',String(index===select.selectedIndex));row.setAttribute('aria-disabled',String(option.disabled));
  const mark=document.createElement('span');mark.className='realm-select-mark';mark.setAttribute('aria-hidden','true');mark.textContent=index===select.selectedIndex?'✓':'◇';
  row.append(mark,choiceCopy(option));popup.append(row);
 });
 position();highlight(opened.active);
}
export function refreshSelectControls(root){
 for(const button of root.querySelectorAll('.realm-select-trigger')){
  const select=button.previousElementSibling;
  button.querySelector('.realm-select-value').textContent=select.selectedOptions[0]?.textContent||'선택할 항목 없음';
  button.disabled=select.disabled||!select.options.length;
 }
 if(opened){
  if(!opened.select.isConnected||opened.button.disabled){close();return;}
  opened.button.setAttribute('aria-expanded','true');
  opened.button.setAttribute('aria-activedescendant',popupId+'-'+opened.active);
  const signature=opened.select.innerHTML+'|'+opened.select.selectedIndex;
  if(signature!==opened.signature){opened.signature=signature;opened.active=opened.select.selectedIndex;renderOptions();}else position();
 }
}
function open(button){
 close();const select=button.previousElementSibling,popup=document.createElement('div');
 popup.id=popupId;popup.className='realm-select-popup';popup.setAttribute('role','listbox');popup.setAttribute('aria-label',button.dataset.label);
 if(button.closest('.diplomacy-panel'))popup.dataset.theme='parchment';
 document.body.append(popup);opened={select,button,popup,active:select.selectedIndex,signature:select.innerHTML+'|'+select.selectedIndex,search:'',searchedAt:0};
 button.setAttribute('aria-expanded','true');button.focus({preventScroll:true});renderOptions();
}
function choose(index){
 const {select,button}=opened;if(!select.options[index]||select.options[index].disabled)return;
 const changed=select.selectedIndex!==index;select.selectedIndex=index;close();refreshSelectControls(select.parentElement);
 if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));}
 if(button.isConnected&&button.checkVisibility())button.focus({preventScroll:true});
}
export function initSelectControls(root){
 document.addEventListener('click',e=>{
  const button=e.target.closest('.realm-select-trigger');
  if(button&&root.contains(button)){
   e.preventDefault();e.stopPropagation();if(button.disabled)return;
   if(opened?.button===button)close();else open(button);return;
  }
  const option=e.target.closest('.realm-select-option');
  if(opened&&option&&opened.popup.contains(option)){e.preventDefault();choose(Number(option.dataset.index));}
 },true);
 document.addEventListener('pointerdown',e=>{if(opened&&!opened.popup.contains(e.target)&&!opened.button.contains(e.target))close();},true);
 document.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const row=e.target.closest('.realm-select-option');if(opened&&row&&opened.popup.contains(row)&&row.getAttribute('aria-disabled')!=='true')highlight(Number(row.dataset.index));});
 document.addEventListener('focusin',e=>{if(opened&&e.target!==opened.button&&!opened.popup.contains(e.target))close();});
 document.addEventListener('keydown',e=>{
  const button=e.target.closest('.realm-select-trigger');if(!button||!root.contains(button)||button.disabled)return;
  if(e.key==='Tab'){close();return;}
  if(e.key==='Escape'){if(opened){e.preventDefault();e.stopPropagation();close(true);}return;}
  const navigation=['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key),typing=e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey;
  if(!navigation&&!typing)return;e.preventDefault();e.stopPropagation();
  if(!opened){open(button);if(e.key==='Enter'||e.key===' ')return;}
  const options=[...opened.select.options],enabled=options.map((option,i)=>option.disabled?-1:i).filter(i=>i>=0);if(!enabled.length)return;
  if(e.key==='Enter'||e.key===' '){choose(opened.active);return;}
  let index=opened.active;
  if(e.key==='Home')index=enabled[0];
  else if(e.key==='End')index=enabled.at(-1);
  else if(e.key==='ArrowDown'||e.key==='ArrowUp')index=enabled[Math.max(0,Math.min(enabled.length-1,enabled.indexOf(index)+(e.key==='ArrowDown'?1:-1)))];
  else if(typing){const now=performance.now();opened.search=(now-opened.searchedAt>700?'':opened.search)+e.key.toLocaleLowerCase();opened.searchedAt=now;index=enabled.find(i=>options[i].textContent.trim().toLocaleLowerCase().startsWith(opened.search))??index;}
  highlight(index);
 },true);
 document.addEventListener('change',e=>{if(root.contains(e.target)&&e.target.matches('select'))refreshSelectControls(root);});
 document.addEventListener('scroll',e=>{if(opened&&!opened.popup.contains(e.target))position();},true);
 window.addEventListener('resize',position);
}
