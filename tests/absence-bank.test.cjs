'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const PontoSync=require('../sync-core.js');
const appSource=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
class TestDate extends Date{
  constructor(...args){super(...(args.length?args:['2026-10-08T12:00:00-03:00']));}
  static now(){return Date.parse('2026-10-08T12:00:00-03:00');}
}
const element=()=>({innerHTML:'',textContent:'',value:'',dataset:{},onclick:null,
  classList:{toggle(){},add(){},remove(){}},appendChild(){},addEventListener(){},remove(){}});
function boot(model='tribuna_hub_prog'){
  const nodes={screen:element()},store=new Map();
  const node=id=>nodes[id]||(nodes[id]=element());
  const document={getElementById:node,querySelectorAll:()=>[],createElement:element,body:{appendChild(){}}};
  const localStorage={
    getItem:k=>store.get(k)||null,
    setItem:(k,v)=>store.set(k,String(v)),
    removeItem:k=>store.delete(k)
  };
  const globals=['beatBtn','monthPicker','csvBtn','excelBtn','copyReportBtn','sheetsBtn',
    'regDate','regFields','note','saveReg','undoRegBtn','bankDayBtn',
    'medicalDayBtn','faultDayBtn','clearAbsenceBtn'];
  const ctx=vm.createContext({
    window:{location:{search:'?demo=1',protocol:'https:'},FIREBASE_CONFIG:{}},
    document,localStorage,PontoSync,URLSearchParams,Date:TestDate,
    console:{warn(){},error(){},log(){}},
    setInterval(){},clearTimeout(){},setTimeout(){},requestAnimationFrame(){},
    ...Object.fromEntries(globals.map(id=>[id,node(id)]))
  });
  vm.runInContext(appSource+";showToast=()=>{};globalThis.api={state,expectedMinutes,estimatedBankImpact,monthStats,annualBankStats,bankCycleFor,cycleConfirmedSaldo,isPending,complete,setDayAbsence,clearDayAbsence,renderMonth,renderHome,addPunch,iso,nowSP,fmtMin};",ctx);
  ctx.api.state.profile={model,city:'Santos',bankStart:0};
  ctx.api.state.days={};
  return {api:ctx.api,nodes};
}
const DAY='2026-10-06',SAT='2026-10-03',SUN='2026-10-04';
test('sem registro não equivale a débito de 8 horas',()=>{
  const {api}=boot(),m=api.monthStats(2026,9);
  assert.equal(m.saldo,0);
  assert.equal(m.cycleTotal,0);
  assert.equal(m.semRegistro,m.pend);
});
test('atestado é neutro e remove pendência',()=>{
  const {api}=boot(),prev=api.monthStats(2026,9).pend;
  api.setDayAbsence(DAY,'atestado');
  assert.equal(api.monthStats(2026,9).saldo,0);
  assert.equal(api.monthStats(2026,9).pend,prev-1);
  assert.equal(api.state.days[DAY].note,'Atestado');
});
for(const [code,label] of [['banco','Folga Banco'],['falta','Falta']]){
  test(label+' debita oito horas em dia útil',()=>{
    const {api}=boot();
    api.setDayAbsence(DAY,code);
    const m=api.monthStats(2026,9);
    assert.equal(m.saldo,-480);
    assert.equal(m.debitEstimated,480);
    assert.equal(m.cycleSaldo,-480);
  });
}
test('sábado consome quatro horas; domingo não consome',()=>{
  const {api}=boot();
  api.setDayAbsence(SAT,'banco');
  assert.equal(api.monthStats(2026,9).saldo,-240);
  api.setDayAbsence(SUN,'falta');
  assert.equal(api.monthStats(2026,9).saldo,-240);
});
test('duas ausências somam uma vez e troca de tipo recalcula',()=>{
  const {api}=boot();
  api.setDayAbsence(DAY,'falta');
  api.setDayAbsence(SAT,'banco');
  assert.equal(api.monthStats(2026,9).saldo,-720);
  api.setDayAbsence(DAY,'atestado');
  assert.equal(api.monthStats(2026,9).saldo,-240);
});
test('batidas antigas e anotação sobrevivem à ausência',()=>{
  const {api}=boot();
  api.state.days[DAY]={date:DAY,punches:[{time:'09:00'},{time:'18:15'}],note:'Anterior'};
  api.setDayAbsence(DAY,'atestado');
  assert.equal(api.state.days[DAY].punches.length,0);
  assert.equal(api.state.days[DAY].absenceBackup.punches.length,2);
  api.clearDayAbsence(DAY);
  assert.equal(api.state.days[DAY].punches.length,2);
  assert.equal(api.state.days[DAY].note,'Anterior');
});
test('dia fechado com apenas uma batida continua pendente sem desconto',()=>{
  const {api}=boot();
  api.state.days[DAY]={date:DAY,punches:[{time:'09:00'}],closed:true};
  const m=api.monthStats(2026,9);
  assert.equal(m.saldo,0);
  assert.equal(m.parcial,1);
  assert.equal(m.rows.find(r=>r.date===DAY).pending,true);
});
test('jornada apurada gera crédito positivo correto',()=>{
  const {api}=boot();
  api.state.days[DAY]={date:DAY,punches:[{time:'09:00'},{time:'19:00'}]};
  assert.equal(api.monthStats(2026,9).saldo,60);
});
test('modelo Tradicional ignora dias não registrados',()=>{
  const {api}=boot('tradicional');
  assert.equal(api.annualBankStats(2026).total,0);
  api.setDayAbsence(DAY,'falta');
  assert.equal(api.annualBankStats(2026).negative,480);
});
test('calendário identifica os três tipos de ausência',()=>{
  const {api,nodes}=boot();
  for(const [type,css] of [['atestado','tf-medical'],['banco','tf-bank'],['falta','tf-absence']]){
    api.setDayAbsence(DAY,type);
    api.renderMonth();
    assert.match(nodes.screen.innerHTML,new RegExp(css));
  }
});
test('saldo da Home não imputa horas negativas ao atestado',()=>{
  const {api,nodes}=boot(),today=api.iso(api.nowSP());
  api.setDayAbsence(today,'atestado');
  api.renderHome();
  assert.match(nodes.screen.innerHTML,/Saldo do dia/);
  assert.match(nodes.screen.innerHTML,/Atestado registrado/);
  assert.match(nodes.screen.innerHTML,/00:00/);
});
test('a sincronização respeita cancelamento e devolve batidas',()=>{
  const original={date:DAY,punches:[{time:'09:00'},{time:'18:00'}],note:'Original'};
  const absent=PontoSync.setAbsence(original,'banco');
  const restored=PontoSync.clearAbsence(absent);
  const merged=PontoSync.mergeDay(restored,absent);
  assert.equal(merged.punches.length,2);
  assert.equal(merged.absenceType,null);
  assert.equal(merged.closed,false);
  assert.equal(merged.note,'Original');
});
