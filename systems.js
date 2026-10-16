
'use strict';
(()=>{
const G=window.SUTO_GAME;if(!G)return;
const B=window.SUTO_BALANCE;
const $=id=>document.getElementById(id), tabs=$('systemTabs'),view=$('systemView');
const oldNames=['青葉の森','古い街道','川沿いの平原','石切場','風の丘','赤土の谷','霧の湿原','白樺の林','砂丘','海辺の洞窟','黒岩山','地下水路','雪原','凍った湖','古代庭園','風化した砦','溶岩地帯','大地の裂け目','機械遺跡','深い森林','月影の沼','空中遺構','忘れられた神殿','最果ての地'];
const names=(window.SUTO_WORLD_DATA?.regions||[]).map(r=>r.name);if(!names.length)names.push(...oldNames);
const slots=['武器','防具','装飾品','紋章','秘宝'], prefixes=['丈夫な','軽い','精密な','古い','鍛えた','静かな','鋭い','厚手の','磨いた','丈夫な','熟練の','上質な'];
const types=[['短剣','長剣','弓','槍','斧','杖','籠手','大剣'],['革鎧','鉄鎧','外套','胸当て','旅装','防護服'],['指輪','腕輪','首飾り','護符'],['紋章','印章','記章'],['結晶','古代片','核石','秘石']];
const rarities=['コモン','アンコモン','レア','エピック','レジェンド','ミシック'];
const storageKey='suto_world_systems_v1';const freshState=()=>({items:[],equipped:{},materials:0,stones:0,essence:0,pity:0,awakened:{},limit:{},skillLv:{},lastSeen:Date.now(),dailyKills:0});let state=freshState();
try{const x=JSON.parse(localStorage.getItem(storageKey));if(x&&typeof x==='object')state={...state,...x};}catch{}
state.items=Array.isArray(state.items)?state.items:[];state.equipped=state.equipped||{};
let active='探索';const save=()=>{state.lastSeen=Date.now();try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}G.persist();};
const note=t=>{G.notify(t);refresh();};
const card=(title,desc,buttons='',cls='')=>`<div class="syscard ${cls}"><strong>${title}</strong><p>${desc}</p>${buttons}</div>`;
const btn=(text,action,value='',disabled=false)=>`<button data-act="${action}" data-value="${value}" ${disabled?'disabled':''}>${text}</button>`;
const random=(n)=>Math.floor(Math.random()*n);
const equipStats=item=>{const template=item.templateId?equipmentData[item.templateId-1]:null;const factor=(1+item.tier*.55)*(1+item.lv*.085)*(template?Math.max(.85,Math.min(1.5,template.base_value/40)):1);return {hp:Math.round((item.slot===1?16:4)*factor),atk:Math.round((item.slot===0?3:1)*factor),def:Math.round((item.slot===1?5:1)*factor),speed:item.slot===2?Math.round(factor):0};};
function bonuses(id){let b={hp:0,atk:0,def:0,speed:0};const eq=state.equipped[id]||{};for(const itemId of Object.values(eq)){const item=state.items.find(x=>x.id===itemId);if(item){const s=equipStats(item);for(const k in b)b[k]+=s[k];}}const lim=state.limit[id]||0;const awake=state.awakened[id]||0;b.hp+=lim*12+awake*28;b.atk+=lim*2+awake*5;return b;}
const equipmentData=window.SUTO_WORLD_DATA?.equipment||[];
const gearName=item=>item.templateId?equipmentData[item.templateId-1]?.name||'装備':`${prefixes[item.seed%prefixes.length]}${types[item.slot][item.seed%types[item.slot].length]}`;
const gearIcon=item=>{const i=Math.max(0,(item.templateId||1)-1);return `<span class="gear-icon" style="display:inline-block;width:32px;height:32px;background-image:url('equipment-atlas.png');background-size:1280px 960px;background-position:-${(i%40)*32}px -${Math.floor(i/40)*32}px;image-rendering:pixelated"></span>`;};
function generateItem(tier=null){const r=tier??B.dropTier(G.data.zone||0,false,Math.random());return {id:`i${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`,slot:random(5),tier:r,seed:random(10000),templateId:1+random(1200),lv:0};}
function onKill(e){state.materials+=(e.boss?10:1)+Math.floor((G.data.zone||0)/5);if(e.boss){state.stones+=3;state.essence+=1;}else if(Math.random()<.12)state.stones++;if(Math.random()<(e.boss?.9:.16)&&state.items.length<350)state.items.push(generateItem(B.dropTier(G.data.zone||0,e.boss,Math.random())));state.dailyKills++;if(G.data.kills%5===0){save();if(active==='冒険記録'||active==='装備')refresh();}}
function render(){tabs.innerHTML=['探索','召喚','装備','育成','図鑑','冒険記録'].map(t=>`<button class="${active===t?'active':''}" data-tab="${t}">${t}</button>`).join('');
if(active==='探索'){view.innerHTML=`<p class="sysnote">全24エリア。敵を15体倒すごとに次のエリアが解放されます。エリアを変更すると敵が強くなります。</p><div class="sysgrid">${names.map((n,i)=>card(`${i+1}. ${n}`,i<G.data.stage?`探索可能 / ${window.SUTO_WORLD_DATA?.regions?.[i]?.unique_mechanic||''}`:'未解放',btn(i===G.data.zone?'探索中':'移動','zone',i,i>=G.data.stage),' '+(i===G.data.zone?'selected':''))).join('')}</div>`;}
if(active==='召喚'){view.innerHTML=`<p class="sysnote">召喚石：${state.stones}個 / 天井まで：${100-state.pity}回。重複時は強化素材を獲得。現金購入なし。</p><div class="sysrow">${btn('1回召喚（石5個）','summon',1,state.stones<5)}${btn('10回召喚（石50個）','summon',10,state.stones<50)}</div><p class="sysnote">レアリティ確率：コモン40% / アンコモン28% / レア17% / エピック9% / レジェンド5% / ミシック1%</p>`;}

if(active==='装備'){const equipped=state.equipped[G.data.selected]||{};view.innerHTML=`<p class="sysnote">装備所持：${state.items.length}/350　素材：${state.materials}。装備の強化にはゴールドと素材が必要です。</p><div class="sysrow">${slots.map((s,i)=>`<span>${s}：${state.items.find(x=>x.id===equipped[i])?gearName(state.items.find(x=>x.id===equipped[i])):'なし'}</span>`).join(' / ')}</div><div class="sysgrid">${state.items.slice().reverse().slice(0,80).map(x=>card(`${gearIcon(x)}${gearName(x)} +${x.lv}`,`${slots[x.slot]} / <span class="rarity-${rarities[x.tier]}">${rarities[x.tier]}</span> / 攻撃+${equipStats(x).atk} 防御+${equipStats(x).def}`,btn(equipped[x.slot]===x.id?'装備中':'装備','equip',x.id)+btn('強化','upgrade',x.id,x.lv>=20),'')).join('')||'<p>装備なし。敵を倒して入手しよう。</p>'}</div>`;}
if(active==='育成'){const i=G.data.selected,c=G.HEROES[i];view.innerHTML=`${card(c.name,`Lv.${G.data.level} / 限界突破 ${state.limit[i]||0}/5 / 覚醒 ${state.awakened[i]||0}/3 / 技強化 ${state.skillLv[i]||0}/10`,btn('限界突破：素材40','limit',i,state.materials<40||(state.limit[i]||0)>=5)+btn('覚醒：結晶5','awake',i,state.essence<5||(state.awakened[i]||0)>=3)+btn('技強化：素材20','skillup',i,state.materials<20||(state.skillLv[i]||0)>=10))}<p class="sysnote">限界突破・覚醒は能力値に反映されます。技強化はスキルのダメージに反映されます。</p>`;}
if(active==='図鑑'){view.innerHTML=`<p class="sysnote">収集：${G.data.unlocked.length}/250体。未入手キャラは名前だけ表示。</p><div class="sysgrid">${G.HEROES.map((c,i)=>card(`${i+1}. ${G.data.unlocked.includes(i)?c.name:'？？？'}`,G.data.unlocked.includes(i)?`${c.kind} / ${c.element} / ${c.rarity}`:'未入手',G.data.unlocked.includes(i)?btn('操作する','hero',i):'',i===G.data.selected?'selected':'')).join('')}</div>`;}
if(active==='冒険記録'){view.innerHTML=`${card('冒険の記録',`討伐数：${G.data.kills} / 最高解放エリア：${G.data.stage}/24 / 所持金：${G.data.gold}`)}${card('資源',`素材：${state.materials} / 召喚石：${state.stones} / 覚醒結晶：${state.essence}`)}${card('ボス戦',`現在のエリアのボスを召喚します。`,btn('ボスに挑戦','boss'))}${card('自動周回',`クリア済みエリアでAUTOを使って敵を倒し続けられます。`,btn(G.auto?'AUTO停止':'AUTO開始','auto'))}${card('セーブ',`ゲームの進行状況をブラウザ内に保存します。`,btn('今すぐ保存','save'))}`;}
}
function summon(){const x=Math.random()*100;const tier=B.summonTier(x/100,state.pity);state.pity=tier===5?0:state.pity+1;const pool=G.HEROES.map((h,i)=>({h,i})).filter(o=>rarities.indexOf(o.h.rarity)===tier);const fallback=G.HEROES.map((h,i)=>({h,i}));const list=pool.length?pool:fallback;const target=list[random(list.length)].i;if(G.data.unlocked.includes(target)){state.materials+=15;return `${G.HEROES[target].name}（重複→素材+15）`;}G.data.unlocked.push(target);G.roster();return G.HEROES[target].name;}
view.addEventListener('click',e=>{const b=e.target.closest('button[data-act]');if(!b)return;const act=b.dataset.act,v=b.dataset.value,id=Number(v);switch(act){case'zone':G.changeZone(id);note(`${names[id]}へ移動`);break;case'summon':{const n=id;if(state.stones<n*5)return;state.stones-=n*5;let results=[];for(let i=0;i<n;i++)results.push(summon());note(results.length>1?`召喚結果：${results.slice(0,3).join('、')} ほか${results.length-3}体`:results[0]);break;}case'equip':{const item=state.items.find(x=>x.id===v);if(!item)return;state.equipped[G.data.selected]??={};state.equipped[G.data.selected][item.slot]=item.id;G.syncHero();note('装備を変更');break;}case'upgrade':{const item=state.items.find(x=>x.id===v);if(!item||item.lv>=20)return;const cost=20+item.lv*12;if(G.data.gold<cost||state.materials<3){note(`強化には${cost}Gと素材3個が必要`);return;}G.data.gold-=cost;state.materials-=3;item.lv++;G.syncHero();note('装備強化成功');break;}case'limit':if(state.materials>=40&&(state.limit[id]||0)<5){state.materials-=40;state.limit[id]=(state.limit[id]||0)+1;G.syncHero();note('限界突破！');}break;case'awake':if(state.essence>=5&&(state.awakened[id]||0)<3){state.essence-=5;state.awakened[id]=(state.awakened[id]||0)+1;G.syncHero();note('覚醒！');}break;case'skillup':if(state.materials>=20&&(state.skillLv[id]||0)<10){state.materials-=20;state.skillLv[id]=(state.skillLv[id]||0)+1;note('技レベルアップ');}break;case'hero':G.setCharacter(id);note('操作キャラを変更');break;case'boss':G.spawn(true);note('ボス出現');break;case'auto':G.setAuto(!G.auto);refresh();break;case'save':save();note('保存完了');break;}save();refresh();});
tabs.addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(!b)return;active=b.dataset.tab;render();});

function refresh(){
 if(tabs&&view)render();
 G.hud();
}
function skillLevel(id){
 return Math.max(0,Math.min(10,Number(state.skillLv[id])||0));
}
function reset(){
 state=freshState();
 save();
 refresh();
}
function offlineReward(){
 const now=Date.now();
 const previous=Number(state.lastSeen)||now;
 const seconds=Math.max(0,Math.min(28800,(now-previous)/1000));
 if(seconds<300)return;
 const minutes=Math.floor(seconds/60);
 const zone=G.data.zone||0;
 const gold=Math.floor(minutes*(2+zone*.5));
 const materials=Math.floor(minutes/5);
 const stones=Math.floor(minutes/30);
 G.data.gold+=gold;
 state.materials+=materials;
 state.stones+=stones;
 G.persist();
 save();
 G.notify(`放置報酬：${gold}G・素材${materials}個・召喚石${stones}個`);
}
function adminButton(label,action){
 const b=document.createElement('button');
 b.textContent=label;
 b.addEventListener('click',action);
 return b;
}
function setupAdminExtras(){
 const modal=$('adminModal');
 if(!modal)return;
 const root=document.createElement('div');
 root.className='admin-extra';
 const title=document.createElement('h3');
 title.textContent='追加管理機能';
 root.append(title);
 root.append(
  adminButton('召喚石 +100',()=>{
   state.stones+=100;
   save();
   note('召喚石 +100');
  }),
  adminButton('強化素材 +1000',()=>{
   state.materials+=1000;
   save();
   note('強化素材 +1000');
  }),
  adminButton('覚醒結晶 +100',()=>{
   state.essence+=100;
   save();
   note('覚醒結晶 +100');
  }),
  adminButton('全キャラクター解放',()=>{
   G.data.unlocked=G.HEROES.map((_,i)=>i);
   G.roster();
   save();
   note('全250体を解放！');
  }),
  adminButton('全エリア解放',()=>{
   G.data.stage=24;
   save();
   note('全24エリア解放！');
  }),
  adminButton('レベル100',()=>{
   G.data.level=100;
   G.data.xp=0;
   G.syncHero(true);
   save();
   note('レベル100になった！');
  }),
  adminButton('全回復',()=>{
   G.syncHero(true);
   note('HP全回復！');
  })
 );
 modal.append(root);
}
window.SUTO_SYSTEMS={
 bonuses,
 onKill,
 skillLevel,
 refresh,
 reset,
 save,
 get state(){return state;},
 get active(){return active;},
 setTab(name){
  if(['探索','召喚','装備','育成','図鑑','冒険記録'].includes(name)){
   active=name;
   refresh();
  }
 }
};
offlineReward();
setupAdminExtras();
refresh();
window.addEventListener('beforeunload',()=>{
 save();
});
})();
