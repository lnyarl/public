const KEY='crown-and-earth-audio';
const defaults={music:35,effects:65,muted:false};
export function audioPreferences(raw){
 let value;try{value=JSON.parse(raw);}catch{value={};}
 return {music:typeof value?.music==='number'&&Number.isFinite(value.music)?Math.max(0,Math.min(100,value.music)):defaults.music,effects:typeof value?.effects==='number'&&Number.isFinite(value.effects)?Math.max(0,Math.min(100,value.effects)):defaults.effects,muted:value?.muted===true};
}
const hz=m=>440*2**((m-69)/12);
export const AUDIO_FILES={music:'meadow-thoughts.ogg',paper:'page-turn.ogg',seal:'seal-close.ogg',coins:'coins.ogg',steel:'steel.ogg',click:'click.ogg',bell:'bell.ogg',chimes:'chimes.ogg',drum:'drum.ogg',warning:'warning.ogg',danger:'danger.ogg',loss:'loss.ogg',error:'error.ogg'};
const cues={click:['click',.12],select:['paper',.16],confirm:['seal',.3],complete:['bell',.2],success:['chimes',.16],trade:['coins',.24],march:['drum',.23],battle:['steel',.23],warning:['warning',.23],danger:['danger',.25],loss:['loss',.26],error:['error',.17],pause:['paper',.12],resume:['paper',.12]};

// Local recordings share the same mixer and first-gesture lifecycle as the fallback score.
export function createAudio(){
 let prefs;try{prefs=audioPreferences(localStorage.getItem(KEY));}catch{prefs={...defaults};}
 let ctx,music,score,fx,master,room,echo,clock=null,beat=0,next=0,hidden=false,tension=false,paused=false,unlocked=false,loading=null,destroyed=false,track=null,trackAt=0,trackOffset=0;
 const played=new Map(),voices=new Set(),buffers=new Map(),failed=new Set();
 function levels(){if(!ctx||destroyed)return;const at=ctx.currentTime;master.gain.setTargetAtTime(prefs.muted||hidden?0:.7,at,.08);music.gain.setTargetAtTime(prefs.music/100*(tension?.21:.3)*(paused?.65:1),at,.3);score.gain.setTargetAtTime(buffers.has('music')?0:1,at,.4);fx.gain.setTargetAtTime(prefs.effects/100,at,.025);}
 function note(midi,at,duration,volume,bus=score,type='sine'){
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(hz(midi),at);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+Math.min(.025,duration/5));gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(gain);gain.connect(bus);if(bus===score)gain.connect(room);voices.add(osc);osc.onended=()=>{osc.disconnect();gain.disconnect();voices.delete(osc);};osc.start(at);osc.stop(at+duration+.02);
 }
 function drum(at,volume=.18){
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.setValueAtTime(105,at);osc.frequency.exponentialRampToValueAtTime(46,at+.24);gain.gain.setValueAtTime(volume,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.42);osc.connect(gain);gain.connect(fx);voices.add(osc);osc.onended=()=>{osc.disconnect();gain.disconnect();voices.delete(osc);};osc.start(at);osc.stop(at+.45);
 }
 const phrases=[[62,null,69,null,74,72,69,null],[65,null,69,72,null,77,74,null],[67,null,74,null,79,77,74,72],[62,null,65,69,null,72,69,null]];
 function startTrack(){
  const buffer=buffers.get('music');if(!buffer||track||hidden||destroyed||ctx.state!=='running')return;
  const source=ctx.createBufferSource(),gain=ctx.createGain(),at=ctx.currentTime;
  source.buffer=buffer;source.loop=true;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.8,at+1.2);source.connect(gain);gain.connect(music);
  source.onended=()=>{source.disconnect();gain.disconnect();};track=source;trackAt=at;source.start(at,trackOffset%buffer.duration);
 }
 function pauseTrack(){if(!track)return;trackOffset=(trackOffset+ctx.currentTime-trackAt)%track.buffer.duration;track.stop();track=null;}
 function loadRecordings(){
  if(loading)return loading;
  loading=Promise.all(Object.entries(AUDIO_FILES).map(async([id,file])=>{
   try{const response=await window.fetch(`assets/audio/${file}`);if(!response.ok)throw new Error('Audio unavailable');const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(destroyed)return;buffers.set(id,buffer);if(id==='music'){stopClock();levels();startTrack();}}
   catch{if(!destroyed)failed.add(id);}
  }));return loading;
 }
 function sample(kind,at){
  const cue=cues[kind],buffer=cue&&buffers.get(cue[0]);if(!buffer)return false;
  const source=ctx.createBufferSource(),gain=ctx.createGain(),duration=buffer.duration;source.buffer=buffer;
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(cue[1],at+Math.min(.008,duration/4));gain.gain.setValueAtTime(cue[1],at+Math.max(duration/4,duration-.04));gain.gain.linearRampToValueAtTime(0,at+duration);
  source.connect(gain);gain.connect(fx);voices.add(source);source.onended=()=>{source.disconnect();gain.disconnect();voices.delete(source);};source.start(at);return true;
 }
 function schedule(){
  if(!ctx||ctx.state!=='running'||hidden)return;
  if(next<ctx.currentTime)next=ctx.currentTime+.06;
  while(next<ctx.currentTime+.3){
   const step=beat%8,bar=Math.floor(beat/8)%4,melody=phrases[bar][step];
   if(prefs.music>0&&!prefs.muted&&!buffers.has('music')){
    if(step===0){const root=[38,41,43,38][bar];note(root,next,5,.15);note(root+19,next+.08,4.5,.065);}
    if(melody!==null){note(melody,next,2.6,.13,score,'triangle');note(melody+12,next+.012,1.3,.022);}
    if(step===2||step===6)note([62,65,67,62][bar]+(step===6?7:0),next,1.9,.07);
    if(tension&&step%4===0)note(38,next,.8,.15,score,'triangle');
   }
   beat=(beat+1)%32;next+=.83;
  }
 }
 function init(){
  if(ctx)return true;const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;
  ctx=new Audio();master=ctx.createGain();music=ctx.createGain();score=ctx.createGain();score.connect(music);fx=ctx.createGain();master.gain.value=0;music.gain.value=0;fx.gain.value=0;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=3600;music.connect(filter);filter.connect(master);fx.connect(master);
  room=ctx.createDelay(1);room.delayTime.value=.31;echo=ctx.createGain();echo.gain.value=.17;room.connect(echo);echo.connect(score);
  const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-18;limiter.ratio.value=5;master.connect(limiter);limiter.connect(ctx.destination);levels();return true;
 }
 function stopClock(){clearInterval(clock);clock=null;}
 function startClock(){if(destroyed||buffers.has('music'))return;if(!clock)clock=setInterval(schedule,150);schedule();}
 return {
  get preferences(){return {...prefs};},
  get status(){return !ctx?'locked':ctx.state;},
  get recordings(){return {loaded:[...buffers.keys()],failed:[...failed]};},
  unlock(){
   if(hidden||destroyed)return;try{if(!init())return;unlocked=true;loadRecordings();const resumed=ctx.resume();resumed.then(()=>{if(!hidden&&!destroyed){startTrack();startClock();}}).catch(()=>{});}catch{/* Visual feedback remains available on devices without audio. */}
  },
  set(key,value){if(!(key in defaults))return;prefs={...prefs,[key]:value};prefs=audioPreferences(JSON.stringify(prefs));try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch{}levels();},
  setScene({danger=false,isPaused=false}={}){tension=danger;paused=isPaused;levels();},
  setHidden(value){hidden=value;levels();if(!ctx||destroyed)return;if(hidden){stopClock();pauseTrack();for(const voice of voices)voice.stop();ctx.suspend().catch(()=>{});}else if(unlocked){next=ctx.currentTime+.06;ctx.resume().then(()=>{if(!hidden&&!destroyed){startTrack();startClock();}}).catch(()=>{});}},
  play(kind){
   if(!ctx||ctx.state!=='running'||hidden||prefs.muted||!prefs.effects)return;
   const now=ctx.currentTime,cooldown={click:.07,select:.12,battle:1.8,warning:4,danger:4,loss:3,march:1.5,complete:1,trade:1.5}[kind]??.15;
   if(now-(played.get(kind)??-Infinity)<cooldown)return;played.set(kind,now);const at=now+.008;
   if(sample(kind,at))return;
   const line=(notes,spacing=.09,duration=.3,volume=.12,type='sine')=>notes.forEach((m,i)=>note(m,at+i*spacing,duration,volume,fx,type));
   switch(kind){
    case 'click':line([69],.05,.065,.065,'triangle');break;
    case 'select':line([62,69],.045,.18,.09,'triangle');break;
    case 'confirm':line([62,69,74],.075,.4,.13,'triangle');break;
    case 'complete':case 'success':line([62,65,69,74],.13,.9,.12);break;
    case 'trade':line([69,74,69],.1,.45,.085);break;
    case 'march':drum(at,.13);line([50,57],.12,.45,.08,'triangle');break;
    case 'battle':drum(at,.22);line([45,52],.08,.24,.1,'triangle');break;
    case 'danger':case 'warning':drum(at,.19);line([57,62,57],.23,.65,.13,'triangle');break;
    case 'loss':drum(at,.22);line([62,57,50],.24,1.1,.15,'triangle');break;
    case 'error':line([57,55],.1,.2,.11,'triangle');break;
    case 'pause':line([69,62],.07,.25,.08);break;
    case 'resume':line([62,69],.07,.25,.08);break;
   }
  },
  destroy(){destroyed=true;stopClock();pauseTrack();for(const voice of voices){voice.onended=null;voice.stop();voice.disconnect();}voices.clear();buffers.clear();ctx?.close();}
 };
}
