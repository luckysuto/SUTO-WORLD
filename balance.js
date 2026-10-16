
"use strict";
// v0.6 shared balance rules: pure functions, usable by browser and Node tests.
(function(root){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const B={
  levelScale(level){return 1+Math.max(0,level-1)*0.072;},
  healthScale(level){return 1+Math.max(0,level-1)*0.095;},
  zoneLevel(zone){return 1+Math.max(0,zone)*4;},
  enemyHp(zone,boss=false){const z=clamp(zone,0,23);return Math.round((boss?190:36)*(1+z*.20));},
  enemyAtk(zone,boss=false){const z=clamp(zone,0,23);return (boss?15:5.5)*(1+z*.14);},
  bossMultiplier(level){return clamp(1+Math.max(0,level-1)*.012,1,2.1);},
  xpRequired(level){return Math.round(28*Math.pow(Math.max(1,level),1.25));},
  xpReward(zone,boss=false){return Math.round((boss?75:12)*(1+zone*.16));},
  goldReward(zone,boss=false){return Math.round((boss?85:5)*(1+zone*.13));},
  attackInterval(speed){return clamp(.95-(speed-150)*.0022,.48,.95);},
  defenseDamage(raw,def){return Math.max(1,raw*100/(100+Math.max(0,def)*1.6));},
  dropTier(zone,boss,roll){const cap=clamp(Math.floor(zone/5)+(boss?2:1),0,5);const t=roll<.50?0:roll<.78?1:roll<.92?2:roll<.985?3:roll<.998?4:5;return Math.min(t,cap);},
  skillMultiplier(slot,lv){return [1.8,2.25,2.8,3.45][clamp(slot,0,3)]*(1+clamp(lv,0,10)*.055);},
  summonTier(roll,pity){if(pity>=99)return 5;return roll<.4?0:roll<.68?1:roll<.85?2:roll<.94?3:roll<.99?4:5;},
  stageFromKills(kills){return clamp(1+Math.floor(Math.max(0,kills)/15),1,24);}
 };
 root.SUTO_BALANCE=B;if(typeof module!=='undefined'&&module.exports)module.exports=B;
})(typeof window!=='undefined'?window:globalThis);
