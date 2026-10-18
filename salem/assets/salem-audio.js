/* Local Salem sound palette. Never opens microphone or sends voice without server authorization. */
(()=>{
'use strict';
let enabled=false,context=null,ambient=null;
let dayAudio=null;
function initAudio(){
 if(!context){const AC=window.AudioContext||window.webkitAudioContext;if(AC)context=new AC();}
 if(context?.state==='suspended')context.resume().catch(()=>{});
}
function quiet(){
 if(ambient){try{ambient.gain.gain.setTargetAtTime(.0001,context.currentTime,.24);const node=ambient;setTimeout(()=>{try{node.osc.stop();node.osc.disconnect();node.gain.disconnect();}catch(e){}},900);}catch(e){}ambient=null;}
}
function night(){
 quiet();if(!enabled)return;initAudio();if(!context)return;
 try{
 const osc=context.createOscillator(),gain=context.createGain(),filter=context.createBiquadFilter();
 osc.type='sine';osc.frequency.value=88;filter.type='lowpass';filter.frequency.value=200;
 gain.gain.value=.0001;osc.connect(filter);filter.connect(gain);gain.connect(context.destination);osc.start();
 gain.gain.setTargetAtTime(.018,context.currentTime,1.5);ambient={osc,gain};
 }catch(e){}
}
function sunrise(){
 quiet();if(!enabled)return;
 const audio=new Audio('assets/audio/rooster-crowing.ogg');
 audio.volume=.65;dayAudio=audio;
 audio.play().catch(()=>{}); // browser may block autoplay; user controls sound
}
function toggle(){
 enabled=!enabled;
 if(enabled)initAudio();else{quiet();if(dayAudio)dayAudio.pause();}
 if(enabled&&document.querySelector('#salemDawn:not(.sunrise)'))night();
 return enabled;
}
window.SalemAudio={toggle,isEnabled:()=>enabled,night,sunrise,stop:()=>{quiet();if(dayAudio)dayAudio.pause();}};
})();