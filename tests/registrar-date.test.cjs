'use strict';
// v2.3.3: dia copiado do anterior por engano (jornada que passa da meia-noite).
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const PontoSync=require('../sync-core.js');
const appSource=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
class TestDate extends Date{
  constructor(...args){super(...(args.length?args:['2026-11-13T23:15:00-03:00']));}
  static now(){return Date.parse('2026-11-13T23:15:00-03:00');}
}
const element=()=>({innerHTML:'',textContent:'',value:'',dataset:{},onclick:null,
  classList:{toggle(){},add(){},remove(){}},appendChild(){},addEventListener(){},remove(){}});
function boot(){
  const store=new Map();
  const ctx=vm.createContext({
    window:{location:{search:'?demo=1',protocol:'https:'},FIREBASE_CONFIG:{}},
    document:{getElementById:element,querySelectorAll:()=>[],createElement:element,body:{appendChild(){}},querySelector:()=>null},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    PontoSync,URLSearchParams,Date:TestDate,console:{warn(){},error(){},log(){}},
    setInterval(){},clearTimeout(){},setTimeout(){},requestAnimationFrame(){}
  });
  vm.runInContext(appSource+`;render=()=>{};showToast=()=>{};globalThis.api={state,monthStats};`,ctx);
  const api=ctx.api;
  api.state.user={uid:'__test__'};
  api.state.profile={model:'tribuna_hub_prog',city:'Santos',bankStart:0};
  api.state.days={};
  api.state.officialBank={};
  return api;
}
const put=(api,date,times)=>{api.state.days[date]=PontoSync.replacePunches({date,punches:[]},times.map(time=>({time,source:'typed'})));};
const copied=st=>st.issues.filter(i=>i.includes('mesmas batidas'));

test('dia com as mesmas batidas do anterior, passando da meia-noite, aparece no Conferir',()=>{
  const api=boot();
  put(api,'2026-11-12',['15:25','00:31']);
  put(api,'2026-11-13',['15:25','00:31']);
  const found=copied(api.monthStats(2026,10));
  assert.equal(found.length,1);
  assert.match(found[0],/^13\/11/);
});

test('dias diferentes ou jornada de dia comum não geram o aviso',()=>{
  const api=boot();
  put(api,'2026-11-12',['15:25','00:31']);
  put(api,'2026-11-13',['15:20','00:40']);
  put(api,'2026-11-10',['08:00','17:00']);
  put(api,'2026-11-11',['08:00','17:00']);
  assert.equal(copied(api.monthStats(2026,10)).length,0);
});
