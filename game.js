
'use strict';
(() => {
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const W = canvas.width, H = canvas.height;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const B = window.SUTO_BALANCE;
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const HEROES = SUTO_CHARACTERS.map((c,i)=>({name:c.name,color:['#ef866d','#71c8e8','#d7b782','#e9d16e','#bd92e5','#7fd5a1'][i%6],hp:Math.round(c.statsLv100.hp/65),atk:Math.round(c.statsLv100.attack/55),speed:Math.round(155+c.statsLv100.speed*.5),kind:c.role,element:c.element,rarity:c.rarity,skills:c.skills,ultimate:c.ultimate,spriteIndex:i}));
const spriteSheet = new Image(); spriteSheet.src='characters-animated-atlas.png';
const bossSheet = new Image(); bossSheet.src='bosses-atlas.png';
const BOSS_MOVES=['突進','遠距離','円形衝撃','扇形攻撃','連続突進','追尾弾','跳躍','回転攻撃','分裂召喚','吸引','連続射撃','突撃波'];
const mapSheet = new Image(); let mapLoaded=-1;
const world=window.SUTO_WORLD_DATA||{regions:[],bosses:[],equipment:[]};
let elapsed=0;
function setMap(){const z=Math.max(0,Math.min(23,data.zone||0));if(mapLoaded!==z){mapLoaded=z;mapSheet.src='maps/area-'+String(z+1).padStart(2,'0')+'.png';const r=world.regions[z];const n=document.getElementById('regionName');if(n)n.textContent=r?.name||'エリア '+(z+1);}}

const ATLAS_COLS = 20;
const KEY = 'suto_world_save_v02';
const fresh = () => ({level:1,xp:0,gold:0,kills:0,unlocked:[0,1,2],selected:0,stage:1,zone:0,party:[0,1,2]});
let data = fresh();
try {const saved=JSON.parse(localStorage.getItem(KEY));if(saved && Array.isArray(saved.unlocked)) data={...data,...saved,unlocked:saved.unlocked.filter(n=>Number.isInteger(n)&&n>=0&&n<HEROES.length)};}catch(e){}
if(!data.unlocked.length)data.unlocked=[0];
if(!data.unlocked.includes(data.selected))data.selected=data.unlocked[0];
function fixParty(){
 const valid=Array.isArray(data.party)?data.party.filter(i=>Number.isInteger(i)&&data.unlocked.includes(i)):data.unlocked.slice(0,5);
 data.party=[...new Set([data.selected,...valid])].slice(0,5);
}
fixParty();
const allies=[];
function rebuildAllies(){const old=new Map(allies.map(a=>[a.id,a]));allies.length=0;for(const id of data.party.filter(id=>id!==data.selected).slice(0,4)){const prev=old.get(id);allies.push(prev||{id,x:W/2+(allies.length%2?65:-65),y:H/2+60,attack:0,hp:1});}}
function chooseHero(id){if(!data.unlocked.includes(id))return;const previous=data.selected;data.selected=id;if(!data.party.includes(id)){const at=data.party.indexOf(previous);if(at>=0)data.party[at]=id;else data.party.unshift(id);}fixParty();rebuildAllies();syncHero(true);roster();persist();}
function toggleParty(id){if(!data.unlocked.includes(id))return;if(data.party.includes(id)){if(id===data.selected)return;data.party=data.party.filter(v=>v!==id);}else{if(data.party.length>=5){notify('編成は最大5体');return;}data.party.push(id);}rebuildAllies();roster();persist();}
const admin={god:false,oneHit:false,noCooldown:false};
let hero={x:W/2,y:H/2,hp:1,maxHp:1,face:0,attack:0,skill:0,dodge:0,inv:0};
let enemies=[],particles=[],spawnClock=0,auto=false,toastClock=0,attackFx=0,skillFx=0,saveClock=0;
let keys=new Set(),joystick=null,last=performance.now(),mouse={x:W/2+100,y:H/2},secretSequence="",tapS=0,tapT=0;
const current=()=>HEROES[data.selected];
const bonus=()=>window.SUTO_SYSTEMS?.bonuses?.(data.selected)||{hp:0,atk:0,def:0,speed:0};
const maxHp=()=>Math.round(current().hp*B.healthScale(data.level)+bonus().hp);
const atk=()=>current().atk*B.levelScale(data.level)+bonus().atk;
const xpNeed=()=>B.xpRequired(data.level);
function notify(t){$('toast').textContent=t;toastClock=2.2;}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){notify('保存できませんでした');}}
function syncHero(heal=false){let old=hero.maxHp||1;hero.maxHp=maxHp();hero.hp=heal?hero.maxHp:clamp(hero.hp/old*hero.maxHp,0,hero.maxHp);}
function roster(){const root=$('roster');root.replaceChildren();for(const i of data.unlocked){const line=document.createElement('div');line.className='roster-entry';const select=document.createElement('button');select.textContent=(data.selected===i?'▶ ':'')+HEROES[i].name;select.className=data.selected===i?'active':'';select.onclick=()=>chooseHero(i);const slot=document.createElement('button');slot.textContent=data.party.includes(i)?'編成から外す':'編成する';slot.disabled=data.selected===i;slot.onclick=()=>toggleParty(i);line.append(select,slot);root.append(line);}const p=$('partySlots');if(p){p.replaceChildren();data.party.forEach((id,idx)=>{const b=document.createElement('button');b.textContent=(idx+1)+' '+HEROES[id].name+(id===data.selected?' ★':'');b.className=id===data.selected?'active':'';b.onclick=()=>chooseHero(id);p.append(b);});}}
function hud(){ $('heroInfo').textContent=`${current().name} Lv.${data.level} / HP ${Math.ceil(hero.hp)}/${hero.maxHp}`;$('stageInfo').textContent=`エリア ${(data.zone||0)+1} / 解放 ${data.stage}`;$('hpFill').style.width=(hero.hp/hero.maxHp*100)+'%';$('xpFill').style.width=(data.xp/xpNeed()*100)+'%';$('resources').textContent=`ゴールド：${data.gold}　討伐：${data.kills}　仲間：${data.unlocked.length}/${HEROES.length}`;$('partyCount').textContent=`編成 ${data.party.length}/5体・所持 ${data.unlocked.length}体`;}
function spawn(boss=false){const side=Math.floor(Math.random()*4);const x=side===0?25:side===1?W-25:Math.random()*W;const y=side===2?25:side===3?H-25:Math.random()*H;const zone=data.zone||0;const hp=B.enemyHp(zone,boss);const candidates=world.bosses.filter(b=>b.area_id===zone+1);
const chosen=boss&&candidates.length?candidates[Math.floor(Math.random()*candidates.length)]:null;
const mult=chosen?B.bossMultiplier(chosen.level):1;if(boss)window.SUTO_AUDIO?.changeBoss?.(chosen?.id||1);
enemies.push({x,y,hp:hp*mult,maxHp:hp*mult,r:boss?29:15,speed:boss?58:80+Math.random()*28,atk:B.enemyAtk(zone,boss),boss,hit:0,variant:Math.floor(Math.random()*8),bossId:chosen?.id||1,bossName:chosen?.name||'',style:chosen?BOSS_MOVES[(chosen.id-1)%12]:'突進',telegraph:chosen?.telegraph_ms||1100,windup:0,attackClock:2,phase:1,phases:chosen?.phases||1,attackCooldown:0,attackCount:0,aimX:hero.x,aimY:hero.y,telegraphAngle:0,stun:0});}
function addXp(n){if(data.level>=100)return;data.xp+=n;while(data.level<100&&data.xp>=xpNeed()){data.xp-=xpNeed();data.level++;syncHero(true);notify('レベルアップ！ Lv.'+data.level);}}
function defeat(e){if(e.boss&&!enemies.some(x=>x!==e&&x.boss))window.SUTO_AUDIO?.changeArea?.(data.zone||0);data.kills++;data.gold+=B.goldReward(data.zone||0,e.boss);addXp(B.xpReward(data.zone||0,e.boss));window.SUTO_SYSTEMS?.onKill?.(e);if(data.kills%15===0){data.stage=B.stageFromKills(data.kills);notify('新エリア解放！ '+data.stage);window.SUTO_SYSTEMS?.refresh?.();}if(Math.random()<(e.boss?.65:.11)){const pool=HEROES.map((_,i)=>i).filter(i=>!data.unlocked.includes(i));if(pool.length){const i=pool[Math.floor(Math.random()*pool.length)];data.unlocked.push(i);roster();notify('新しい仲間：'+HEROES[i].name);}}}
function strike(power,range,area=false){if(hero.hp<=0)return;let hit=false;for(let i=enemies.length-1;i>=0;i--){const e=enemies[i],d=dist(hero,e),angle=Math.atan2(e.y-hero.y,e.x-hero.x);const diff=Math.atan2(Math.sin(angle-hero.face),Math.cos(angle-hero.face));if(d<range&&(area||Math.abs(diff)<1.25)){e.hp-=power;e.hit=.14;hit=true;for(let j=0;j<5;j++)particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*160,vy:(Math.random()-.5)*160,life:.25});if(e.hp<=0){enemies.splice(i,1);defeat(e);}}}return hit;}
function attack(){if(hero.attack>0)return;hero.attack=.32;attackFx=.15;strike(admin.oneHit?1e9:atk(),68);}
function skill(slot=0){if(hero.skill>0)return;hero.skill=admin.noCooldown?.12:([3,4,5,7][slot]||4);skillFx=.32;
const lv=window.SUTO_SYSTEMS?.skillLevel?.(data.selected)||0;
strike(admin.oneHit?1e9:atk()*B.skillMultiplier(slot,lv),[105,125,145,175][slot]||105,true);
notify(current().skills?.[slot]||'スキル');}
function dodge(){if(hero.dodge>0)return;hero.dodge=1.2;hero.inv=.45;hero.x=clamp(hero.x+Math.cos(hero.face)*100,20,W-20);hero.y=clamp(hero.y+Math.sin(hero.face)*100,20,H-20);}

function moveInput(){let x=0,y=0;if(keys.has('a')||keys.has('arrowleft'))x--;if(keys.has('d')||keys.has('arrowright'))x++;if(keys.has('w')||keys.has('arrowup'))y--;if(keys.has('s')||keys.has('arrowdown'))y++;if(joystick){x+=joystick.x;y+=joystick.y;}if(auto){const target=enemies.reduce((a,e)=>!a||dist(hero,e)<dist(hero,a)?e:a,null);if(target){const d=dist(hero,target);if(d>55){x+= (target.x-hero.x)/d;y+=(target.y-hero.y)/d;}hero.face=Math.atan2(target.y-hero.y,target.x-hero.x);if(d<80)attack();if(d<130&&enemies.length>=3)skill(0);}}const len=Math.hypot(x,y);if(len>.1){x/=Math.max(1,len);y/=Math.max(1,len);if(!auto||!enemies.length)hero.face=Math.atan2(y,x);}return{x,y};}
function updateAllies(dt){
 for(let ai=0;ai<allies.length;ai++){
  const a=allies[ai],c=HEROES[a.id];a.attack=Math.max(0,a.attack-dt);
  const target=enemies.reduce((best,e)=>!best||dist(a,e)<dist(a,best)?e:best,null);
  const offset=(ai+1)*Math.PI/2.5, tx=hero.x+Math.cos(offset)*65,ty=hero.y+Math.sin(offset)*65;
  const follow=target&&dist(a,target)<180?target:{x:tx,y:ty};const d=dist(a,follow);
  if(d>(target===follow?49:12)){const v=Math.min(d,(c.speed*.73)*dt);a.x=clamp(a.x+(follow.x-a.x)/d*v,18,W-18);a.y=clamp(a.y+(follow.y-a.y)/d*v,18,H-18);}
  if(target&&dist(a,target)<82&&a.attack<=0){a.attack=B.attackInterval(c.speed);target.hp-=(c.atk*B.levelScale(data.level)+(window.SUTO_SYSTEMS?.bonuses?.(a.id)?.atk||0))*.53;target.hit=.12;
    particles.push({x:target.x,y:target.y,vx:(Math.random()-.5)*100,vy:-55,life:.22});
    if(target.hp<=0){const idx=enemies.indexOf(target);if(idx>=0){enemies.splice(idx,1);defeat(target);}}
  }
 }
}
function update(dt){elapsed+=dt;setMap();if(toastClock>0){toastClock-=dt;if(toastClock<=0)$('toast').textContent='';}for(const k of ['attack','skill','dodge','inv'])hero[k]=Math.max(0,hero[k]-dt);attackFx=Math.max(0,attackFx-dt);skillFx=Math.max(0,skillFx-dt);if(hero.hp<=0){hero.x=W/2;hero.y=H/2;syncHero(true);enemies=[];window.SUTO_AUDIO?.changeArea?.(data.zone||0);notify('拠点に帰還した');}const v=moveInput();hero.x=clamp(hero.x+v.x*(current().speed+bonus().speed)*dt,20,W-20);hero.y=clamp(hero.y+v.y*(current().speed+bonus().speed)*dt,20,H-20);spawnClock+=dt;if(spawnClock>Math.max(.75,2.4-(data.zone||0)*.05)&&enemies.length<20){spawnClock=0;spawn();}for(const e of enemies){e.hit=Math.max(0,e.hit-dt);const d=Math.max(0.01,dist(hero,e));
if(e.boss){
  if(e.phases>1&&e.hp/e.maxHp<.5)e.phase=2;
  e.attackCooldown=Math.max(0,e.attackCooldown-dt);
  e.stun=Math.max(0,(e.stun||0)-dt);
  if(e.windup>0){e.windup-=dt;
    if(e.windup<=0){
      const a=e.telegraphAngle;const aimDist=Math.hypot(hero.x-e.aimX,hero.y-e.aimY);
      const nowDist=dist(hero,e);const relative=Math.atan2(hero.y-e.y,hero.x-e.x);
      const delta=Math.abs(Math.atan2(Math.sin(relative-a),Math.cos(relative-a)));
      const style=e.style;let hits=false;
      if(style==='突進'||style==='連続突進'||style==='突撃波'){
        const len=style==='突撃波'?190:style==='連続突進'?155:110;
        e.x=clamp(e.x+Math.cos(a)*len,25,W-25);e.y=clamp(e.y+Math.sin(a)*len,25,H-25);
        hits=dist(hero,e)<(style==='突撃波'?90:65);
      }else if(style==='遠距離'||style==='追尾弾'||style==='連続射撃'){
        hits=(style==='追尾弾'?nowDist<215:aimDist<(style==='連続射撃'?80:52));
      }else if(style==='円形衝撃'||style==='回転攻撃')hits=nowDist<(style==='回転攻撃'?165:125);
      else if(style==='扇形攻撃')hits=nowDist<165&&delta<.8;
      else if(style==='跳躍'){e.x=clamp(e.aimX,25,W-25);e.y=clamp(e.aimY,25,H-25);hits=dist(hero,e)<95;}
      else if(style==='吸引'){if(nowDist<210){hero.x=clamp(hero.x+(e.x-hero.x)*.27,20,W-20);hero.y=clamp(hero.y+(e.y-hero.y)*.27,20,H-20);}hits=dist(hero,e)<80;}
      else if(style==='分裂召喚'){if(enemies.length<22){spawn(false);spawn(false);}hits=nowDist<80;}
      if(hits&&hero.inv<=0&&!admin.god){hero.hp=Math.max(0,hero.hp-B.defenseDamage(e.atk*(e.phase===2?1.3:1),bonus().def));hero.inv=.8;}
      e.attackCount++;e.attackCooldown=e.phase===2?1.35:2.5;
    }
  }else if(e.attackCooldown<=0&&d<250){e.windup=Math.max(.35,e.telegraph/1000*(e.phase===2?.72:1));e.aimX=hero.x;e.aimY=hero.y;e.telegraphAngle=Math.atan2(hero.y-e.y,hero.x-e.x);e.attackCooldown=4;}
  if(e.windup<=0&&d>e.r+55){const mult=e.style==='遠距離'?.45:1;e.x+=(hero.x-e.x)/d*e.speed*mult*dt;e.y+=(hero.y-e.y)/d*e.speed*mult*dt;}
}else if(d>e.r+16){e.x+=(hero.x-e.x)/d*e.speed*dt;e.y+=(hero.y-e.y)/d*e.speed*dt;}else if(hero.inv<=0&&!admin.god){hero.hp=Math.max(0,hero.hp-B.defenseDamage(e.atk,bonus().def));hero.inv=.75;}
}updateAllies(dt);for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1);}saveClock+=dt;if(saveClock>15){saveClock=0;persist();}hud();}
function draw(){
ctx.fillStyle='#1b332f';ctx.fillRect(0,0,W,H);
if(mapSheet.complete&&mapSheet.naturalWidth){ctx.globalAlpha=.8;ctx.drawImage(mapSheet,0,0,W,H);ctx.globalAlpha=1;}
else{ctx.strokeStyle='#29473f';for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}}
for(const e of enemies){
 if(e.boss&&bossSheet.complete&&bossSheet.naturalWidth){const i=Math.max(0,e.bossId-1);ctx.drawImage(bossSheet,(i%15)*64,Math.floor(i/15)*64,64,64,e.x-42,e.y-42,84,84);}
 else{ctx.fillStyle=e.hit>0?'#fff':'#bd6c65';ctx.fillRect(e.x-e.r,e.y-e.r,e.r*2,e.r*2);ctx.fillStyle='#251b2b';ctx.fillRect(e.x-8,e.y-5,5,5);ctx.fillRect(e.x+3,e.y-5,5,5);}
 if(e.windup>0){ctx.save();ctx.strokeStyle='rgba(255,108,92,.9)';ctx.fillStyle='rgba(255,95,76,.15)';ctx.lineWidth=3;const st=e.style;
 if(['突進','連続突進','突撃波','扇形攻撃'].includes(st)){ctx.translate(e.x,e.y);ctx.rotate(e.telegraphAngle);ctx.beginPath();ctx.moveTo(0,0);const len=st==='突撃波'?220:st==='扇形攻撃'?165:155;const spread=st==='扇形攻撃'?95:35;ctx.lineTo(len,-spread);ctx.lineTo(len,spread);ctx.closePath();ctx.fill();ctx.stroke();}
 else{const target=['遠距離','追尾弾','連続射撃','跳躍'].includes(st);const px=target?e.aimX:e.x,py=target?e.aimY:e.y;ctx.beginPath();ctx.arc(px,py,target?70:st==='吸引'?210:140,0,Math.PI*2);ctx.fill();ctx.stroke();}ctx.restore();}
 ctx.fillStyle='#1b2028';ctx.fillRect(e.x-e.r,e.y-e.r-12,e.r*2,5);ctx.fillStyle='#df7076';ctx.fillRect(e.x-e.r,e.y-e.r-12,e.r*2*clamp(e.hp/e.maxHp,0,1),5);
 if(e.boss){ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(e.bossName,e.x,e.y-48);ctx.textAlign='left';}
}
for(const a of allies){ctx.save();ctx.translate(a.x,a.y);const si=a.id*4+(a.attack>0?2:Math.floor(elapsed*5)%2);if(spriteSheet.complete&&spriteSheet.naturalWidth){ctx.drawImage(spriteSheet,(si%20)*64,Math.floor(si/20)*64,64,64,-25,-25,50,50);}else{ctx.fillStyle=HEROES[a.id].color;ctx.fillRect(-10,-12,20,24);}ctx.restore();ctx.fillStyle='#d5f5db';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(HEROES[a.id].name,a.x,a.y-28);ctx.textAlign='left';}
if(skillFx>0){ctx.fillStyle='rgba(130,170,255,.24)';ctx.beginPath();ctx.arc(hero.x,hero.y,132,0,Math.PI*2);ctx.fill();}
if(attackFx>0){ctx.strokeStyle='#fff1a1';ctx.lineWidth=11;ctx.beginPath();ctx.arc(hero.x,hero.y,58,hero.face-.9,hero.face+.9);ctx.stroke();}
ctx.save();ctx.translate(hero.x,hero.y);ctx.rotate(hero.face);ctx.globalAlpha=hero.inv>0?.65:1;
if(spriteSheet.complete&&spriteSheet.naturalWidth){const f=attackFx>0?2:Math.floor(elapsed*7)%2?1:3;const si=current().spriteIndex*4+(hero.attack>0?2:f);ctx.drawImage(spriteSheet,(si%20)*64,Math.floor(si/20)*64,64,64,-32,-32,64,64);}
else{ctx.fillStyle=current().color;ctx.fillRect(-14,-18,28,32);ctx.fillStyle='#f8f4df';ctx.fillRect(3,-8,13,6);}ctx.restore();
for(const p of particles){ctx.fillStyle='#f5d27e';ctx.fillRect(p.x,p.y,5,5);}ctx.fillStyle='#e8f3ed';ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.fillText(current().name,hero.x,hero.y-35);ctx.textAlign='left';
if(joystick){ctx.strokeStyle='#d8e6f099';ctx.lineWidth=3;ctx.beginPath();ctx.arc(joystick.sx,joystick.sy,45,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(joystick.sx+joystick.x*40,joystick.sy+joystick.y*40,16,0,Math.PI*2);ctx.stroke();}
}
function frame(t){const dt=Math.min(.05,(t-last)/1000);last=t;update(dt);draw();requestAnimationFrame(frame);}
function pointerPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}

canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;const p=pointerPos(e);if(p.x<W*.55){joystick={id:e.pointerId,sx:p.x,sy:p.y,x:0,y:0};canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointermove',e=>{if(!joystick||joystick.id!==e.pointerId)return;const p=pointerPos(e),dx=p.x-joystick.sx,dy=p.y-joystick.sy,len=Math.hypot(dx,dy);joystick.x=dx/Math.max(45,len);joystick.y=dy/Math.max(45,len);});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,e=>{if(joystick?.id===e.pointerId)joystick=null;});
function toggleAuto(){auto=!auto;$('autoBtn').textContent='AUTO '+(auto?'ON':'OFF');notify(auto?'自動戦闘 ON':'自動戦闘 OFF');}
function openGate(){$('adminGate').classList.remove('hidden');$('adminCode').value='';$('gateError').textContent='';$('adminCode').focus();}
$('secretS').addEventListener('click',()=>{tapS++;if(tapS>5){tapS=1;tapT=0;}});
$('secretT').addEventListener('click',()=>{if(tapS===5){tapT++;if(tapT===4){tapS=0;tapT=0;openGate();}}else{tapS=0;tapT=0;}});
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k==='escape'){if(!$('adminGate').classList.contains('hidden'))$('adminGate').classList.add('hidden');else if(!$('adminModal').classList.contains('hidden'))$('adminModal').classList.add('hidden');return;}if(!$('adminGate').classList.contains('hidden')||!$('adminModal').classList.contains('hidden')){if(k==='enter'&&!$('adminGate').classList.contains('hidden'))$('gateSubmit').click();return;}if(document.activeElement?.tagName==='INPUT'){if(k==='enter'&&!$('adminGate').classList.contains('hidden'))$('gateSubmit').click();return;}if(['arrowup','arrowdown','arrowleft','arrowright',' ','tab'].includes(k))e.preventDefault();keys.add(k);if(e.repeat)return;if($('adminGate').classList.contains('hidden')&&$('adminModal').classList.contains('hidden')){if(k.length===1){secretSequence=(secretSequence+k).slice(-9);if(secretSequence==='kk2556739'){secretSequence='';openGate();}}if(k==='tab'||k==='shift')toggleAuto();if(k===' ')dodge();if(k==='q')skill(0);if(k==='e')skill(1);if(k==='r')skill(2);if(k==='f')skill(3);if(k>='1'&&k<='5'){const idx=data.party[Number(k)-1];if(idx!==undefined)chooseHero(idx);}}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();joystick=null;});
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')mouse=pointerPos(e);});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){hero.face=Math.atan2(mouse.y-hero.y,mouse.x-hero.x);if(e.button===2)skill(3);else attack();}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('attackBtn').onclick=attack;$('skillBtn').onclick=()=>skill(0);$('skill2Btn').onclick=()=>skill(1);$('skill3Btn').onclick=()=>skill(2);$('skill4Btn').onclick=()=>skill(3);$('dodgeBtn').onclick=dodge;
$('autoBtn').onclick=toggleAuto;
$('gateSubmit').onclick=()=>{if($('adminCode').value.trim()==='ADMIN'){$('adminGate').classList.add('hidden');$('adminModal').classList.remove('hidden');}else{$('gateError').textContent='コードが違います';}};
$('gateClose').onclick=()=>$('adminGate').classList.add('hidden');
$('saveBtn').onclick=()=>{persist();notify('セーブした！');};
$('resetBtn').onclick=()=>{if(!confirm('すべての進行状況を削除しますか？'))return;localStorage.removeItem('suto_world_systems_v1');window.SUTO_SYSTEMS?.reset?.();data=fresh();window.SUTO_GAME.data=data;fixParty();rebuildAllies();enemies=[];window.SUTO_AUDIO?.changeArea?.(0);hero.x=W/2;hero.y=H/2;syncHero(true);roster();persist();notify('最初から開始');};
$('closeAdmin').onclick=()=>$('adminModal').classList.add('hidden');
$('godMode').onchange=e=>admin.god=e.target.checked;$('oneHit').onchange=e=>admin.oneHit=e.target.checked;$('noCooldown').onchange=e=>admin.noCooldown=e.target.checked;
$('adminGold').onclick=()=>{data.gold+=1000;persist();notify('ゴールド +1000');};
$('adminHeal').onclick=()=>{syncHero(true);notify('全回復');};
$('adminUnlock').onclick=()=>{const next=HEROES.findIndex((_,i)=>!data.unlocked.includes(i));if(next<0){notify('試作版の仲間は全員解放済み');return;}data.unlocked.push(next);roster();persist();notify(HEROES[next].name+' を解放');};
$('adminBoss').onclick=()=>{spawn(true);notify('ボス出現！');};
window.SUTO_GAME={data,HEROES,hero,admin,enemies,spawn,notify,persist,syncHero,roster,hud,defeat,addXp,changeZone(n){data.zone=clamp(n,0,Math.min(23,data.stage-1));enemies.length=0;hero.x=W/2;hero.y=H/2;persist();hud();setMap();window.SUTO_AUDIO?.changeArea?.(n);},heal(){syncHero(true);},setCharacter(i){chooseHero(i);},get auto(){return auto;},setAuto(v){if(auto!==v)toggleAuto();}};syncHero(true);rebuildAllies();roster();hud();setMap();notify('冒険開始！');requestAnimationFrame(frame);
})();
