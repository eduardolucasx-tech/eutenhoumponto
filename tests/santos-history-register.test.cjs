'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const PontoSync=require('../sync-core.js');
const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','timeflow-register-calendar-v1.8.3.css'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function el(){return {innerHTML:'',textContent:'',dataset:{},value:'',onclick:null,classList:{toggle(){},add(){},remove(){}},appendChild(){},addEventListener(){},remove(){}};}
function boot(profile={model:'tribuna_hub_prog',city:'Santos',bankStart:0}){
  const nodes={screen:el()},node=id=>nodes[id]||(nodes[id]=el());
  const cache=new Map();
  const ids=['beatBtn','monthPicker','csvBtn','excelBtn','copyReportBtn','sheetsBtn','regDate','regFields','note','saveReg','undoRegBtn','bankDayBtn','medicalDayBtn','faultDayBtn','clearAbsenceBtn'];
  const URLParams=class{constructor(q){this.q=q}get(k){return this.q.includes(k+'=1')?'1':null}};
  const context=vm.createContext({
    window:{location:{search:'?demo=1',protocol:'https:'},FIREBASE_CONFIG:{}},
    document:{getElementById:node,querySelectorAll:()=>[],createElement:el,body:{appendChild(){}}},
    localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,String(v)),removeItem:k=>cache.delete(k)},
    URLSearchParams:URLParams,PontoSync,console:{error(){},warn(){},log(){}},
    setInterval(){},clearTimeout(){},setTimeout(){},requestAnimationFrame(){},
    ...Object.fromEntries(ids.map(id=>[id,node(id)]))
  });
  vm.runInContext(source+';showToast=()=>{};globalThis.api={state,expectedMinutes,renderMonth,renderRegister,mergeCloudWithLocal,cloudHistorySummary,setMonth:m=>selectedMonthValue=m,setDate:d=>selectedRegisterDate=d};',context);
  context.api.state.profile=profile;
  context.api.state.days={};
  return {api:context.api,nodes,cache};
}
test('calendário é STQQSSD com sete colunas em toda resolução',()=>{
 assert.match(css,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
 assert.match(html,/timeflow-register-calendar-v1\.8\.3\.css/);
 const {api,nodes}=boot();
 api.setMonth('2026-10');api.renderMonth();
 const h=nodes.screen.innerHTML;
 assert.equal((h.match(/class="tf-calendar-weekday"/g)||[]).length,7);
 assert.ok(h.indexOf('aria-label="Segunda-feira"')<h.indexOf('aria-label="Terça-feira"'));
 assert.ok(h.indexOf('aria-label="Terça-feira"')<h.indexOf('aria-label="Quarta-feira"'));
 assert.ok(h.indexOf('aria-label="Sábado"')<h.indexOf('aria-label="Domingo"'));
 assert.equal((h.match(/class="tf-calendar-pad"/g)||[]).length,3);
 assert.equal((h.match(/class="tf-day-pixel /g)||[]).length,31);
 assert.match(h,/data-day="2026-10-01"/);
});
test('mês começando no domingo tem seis espaços antes do dia 1',()=>{
 const {api,nodes}=boot();
 api.setMonth('2026-11');api.renderMonth();
 assert.equal((nodes.screen.innerHTML.match(/class="tf-calendar-pad"/g)||[]).length,6);
});
test('mantém matriz original Santos para Tribuna e feriados',()=>{
 const {api}=boot();
 assert.equal(api.expectedMinutes('2026-01-26'),0);
 assert.equal(api.expectedMinutes('2026-09-08'),0);
 assert.equal(api.expectedMinutes('2026-10-03'),240);
 assert.equal(api.expectedMinutes('2026-10-04'),0);
 assert.equal(api.expectedMinutes('2026-10-06'),480);
});
test('Registrar mantém as duas batidas do modelo Tribuna',()=>{
 const {api,nodes}=boot();
 api.renderRegister();
 assert.match(nodes.registerBody.innerHTML,/tf-reg-layout/);
 assert.match(nodes.registerBody.innerHTML,/MATRIZ ORIGINAL/);
 assert.match(nodes.registerBody.innerHTML,/Calendário<\/dt><dd>Santos/);
 assert.equal((nodes.regFields.innerHTML.match(/class="input punchInput"/g)||[]).length,2);
 for(const id of ['saveReg','bankDayBtn','medicalDayBtn','faultDayBtn','clearAbsenceBtn'])
  assert.match(nodes.registerBody.innerHTML,new RegExp('id="'+id+'"'));
});
test('Registrar preserva as quatro batidas no modelo Tradicional',()=>{
 const {api,nodes}=boot({model:'tradicional',city:'Praia Grande',bankStart:0});
 api.renderRegister();
 assert.equal((nodes.regFields.innerHTML.match(/class="input punchInput"/g)||[]).length,4);
 assert.match(nodes.registerBody.innerHTML,/Calendário<\/dt><dd>Praia Grande/);
});
test('matriz Tribuna usa Santos mesmo se um perfil antigo tiver cidade divergente',()=>{
 const {api,nodes}=boot({model:'tribuna_hub_prog',city:'Praia Grande',bankStart:0});
 api.renderRegister();
 assert.match(nodes.registerBody.innerHTML,/Calendário<\/dt><dd>Santos/);
});
test('conciliação preserva meses remotos e dias apenas locais',()=>{
 const {api}=boot();
 api.state.days={'2026-10-03':{date:'2026-10-03',punches:[{time:'09:00'},{time:'14:00'}]}};
 const c={days:{
   '2026-02-11':{date:'2026-02-11',punches:[{time:'08:00'},{time:'17:00'}]},
   '2026-07-03':{date:'2026-07-03',punches:[{time:'09:00'},{time:'18:00'}]}
 },profile:{model:'tribuna_hub_prog',city:'Santos',scaleStartDate:'2026-01-05',bankStart:120},
 officialBank:{'2026-02':{balance:20}},imports:[{month:'2026-02'}]};
 const merged=api.mergeCloudWithLocal(c,'cloud');
 for(const date of ['2026-02-11','2026-07-03','2026-10-03'])
   assert.equal(merged.days[date].punches.length,2);
 assert.equal(merged.profile.bankStart,120);
 assert.equal(merged.officialBank['2026-02'].balance,20);
 assert.equal(merged.imports.length,1);
 assert.equal(api.cloudHistorySummary(c).months,2);
});
test('dados históricos da nuvem têm prioridade no modelo e escala do login',()=>{
 const {api}=boot({model:'tradicional',city:'Praia Grande',bankStart:0});
 const c={profile:{model:'tribuna_jornalismo',city:'Santos',scaleStartDate:'2026-03-01'}};
 const m=api.mergeCloudWithLocal(c,'cloud');
 assert.equal(m.profile.model,'tribuna_jornalismo');
 assert.equal(m.profile.scaleStartDate,'2026-03-01');
 assert.equal(api.mergeCloudWithLocal(c,'push').profile.model,'tradicional');
});
test('autenticação não faz upload automático sobre dados antigos',()=>{
 assert.match(source,/await hydrateFromCloud\('cloud'\);\s*render\(\)/);
 assert.doesNotMatch(source,/await hydrateFromCloud\('smart'\);\s*if\(state\.user/);
});
