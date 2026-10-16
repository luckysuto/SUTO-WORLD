
"use strict";
(()=>{const btn=document.getElementById('musicToggle'),vol=document.getElementById('musicVolume');if(!btn)return;
const a=new Audio();a.loop=true;a.preload='none';a.volume=.24;let enabled=false,area=0;
function loadTrack(n){const track=String((n%42)+1).padStart(2,'0');if(a.src.endsWith('track-'+track+'.wav'))return;a.src='music/track-'+track+'.wav';if(enabled)a.play().catch(()=>{enabled=false;btn.textContent='♪ BGM OFF';});}
function changeArea(n){area=n;loadTrack(area);}
function changeBoss(bossId){loadTrack(24+(Math.max(1,bossId)-1)%18);}
btn.addEventListener('click',()=>{enabled=!enabled;if(enabled){if(!a.src)changeArea(area);a.play().then(()=>btn.textContent='♪ BGM ON').catch(()=>{enabled=false;btn.textContent='♪ BGM OFF';});}else{a.pause();btn.textContent='♪ BGM OFF';}});
vol.addEventListener('input',()=>a.volume=Number(vol.value)/100);window.SUTO_AUDIO={changeArea,changeBoss};
})();
