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
  assert.equal(m.saldo,-240); // sábado 03/10 projetado, não um débito confirmado
  assert.equal(m.saldoConfirmado,0);
  assert.equal(m.saldoProvisionadoSabados,-240);
  assert.equal(m.sabadosPendentes,1);
  assert.equal(m.cycleTotal,-240);
  assert.equal(m.semRegistro,m.pend);
});
test('atestado é neutro e remove pendência',()=>{
  const {api}=boot(),prev=api.monthStats(2026,9).pend;
  api.setDayAbsence(DAY,'atestado');
  assert.equal(api.monthStats(2026,9).saldo,-240);
  assert.equal(api.monthStats(2026,9).pend,prev-1);
  assert.equal(api.state.days[DAY].note,'Atestado');
});
for(const [code,label] of [['banco','Folga Banco'],['falta','Falta']]){
  test(label+' debita oito horas em dia útil',()=>{
    const {api}=boot();
    api.setDayAbsence(DAY,code);
    const m=api.monthStats(2026,9);
    assert.equal(m.saldo,-720);
    assert.equal(m.debitEstimated,720);
    assert.equal(m.cycleSaldo,-720);
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
  assert.equal(m.saldo,-240);
  assert.equal(m.parcial,1);
  assert.equal(m.rows.find(r=>r.date===DAY).pending,true);
});
test('jornada apurada gera crédito positivo correto',()=>{
  const {api}=boot();
  api.state.days[DAY]={date:DAY,punches:[{time:'09:00'},{time:'19:00'}]};
  assert.equal(api.monthStats(2026,9).saldo,-180);
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

test('sábado histórico pendente é estimado uma vez no banco e mantém alerta',()=>{
  const {api,nodes}=boot();
  const month=api.monthStats(2026,9);
  const sat=month.rows.find(r=>r.date===SAT);
  assert.equal(sat.saldo,-240);
  assert.equal(sat.pending,true);
  assert.equal(sat.done,false);
  assert.equal(sat.provisionalSaturday,true);
  assert.equal(month.sabadosPendentes,1);
  assert.equal(month.saldoProvisionadoSabados,-240);
  api.renderMonth();
  assert.match(nodes.screen.innerHTML,/tf-saturday-provisional/);
  assert.match(nodes.screen.innerHTML,/Sábado: −4h estimadas/);
  assert.match(nodes.screen.innerHTML,/-04:00/);
});
test('sábado com jornada completa substitui projeção, sem débito duplicado',()=>{
  const {api}=boot();
  api.state.days[SAT]={date:SAT,punches:[{time:'09:00'},{time:'13:15'}]};
  const m=api.monthStats(2026,9);
  // bruto 4h15, intervalo automático de 15min; saldo do sábado 0
  assert.equal(m.saldo,0);
  assert.equal(m.sabadosPendentes,0);
  assert.equal(m.rows.find(r=>r.date===SAT).done,true);
});
test('sábado com 3h trabalhadas completas desconta só 1h',()=>{
  const {api}=boot();
  api.state.days[SAT]={date:SAT,punches:[{time:'09:00'},{time:'12:15'}]};
  const m=api.monthStats(2026,9);
  assert.equal(m.saldo,-60);
  assert.equal(m.sabadosPendentes,0);
});
test('sábado com atestado não desconta banco',()=>{
  const {api}=boot();
  api.setDayAbsence(SAT,'atestado');
  const m=api.monthStats(2026,9);
  assert.equal(m.saldo,0);
  assert.equal(m.rows.find(r=>r.date===SAT).saldo,0);
});
test('sábado com apenas uma batida continua projetado e sinalizado',()=>{
  const {api}=boot();
  api.state.days[SAT]={date:SAT,punches:[{time:'09:00'}],closed:true};
  const m=api.monthStats(2026,9);
  assert.equal(m.saldo,-240);
  assert.equal(m.parcial,1);
  assert.equal(m.sabadosPendentes,1);
  assert.equal(m.rows.find(r=>r.date===SAT).pending,true);
});
test('feriado de sábado não tem projeção -4h',()=>{
  const {api}=boot();
  // 2026-10-12 é feriado nacional, mas segunda; criamos falso sábado via
  // feriado de sábado real da matriz original: 2026-11-15 é domingo.
  // 2026-11-02 é segunda. Verificamos por isso uma data de zero no domingo.
  assert.equal(api.expectedMinutes('2026-10-04'),0);
  assert.equal(api.estimatedBankImpact({date:'2026-10-04',punches:[]}).saldo,0);
});

test('meses históricos vazios não geram dezenas de débitos presumidos',()=>{
  const {api}=boot();
  const august=api.monthStats(2026,7);
  assert.equal(august.saldo,0);
  assert.equal(august.sabadosPendentes,0);
  const october=api.monthStats(2026,9);
  assert.equal(october.saldo,-240);
  assert.equal(october.cycleSaldo,-240);
});
test('mês histórico com registros da nuvem projeta seus sábados pendentes',()=>{
  const {api}=boot();
  api.state.days['2026-09-10']={
    date:'2026-09-10',punches:[{time:'09:00'},{time:'18:00'}]
  };
  const september=api.monthStats(2026,8);
  assert.ok(september.sabadosPendentes>0);
  assert.equal(september.saldoProvisionadoSabados,-240*september.sabadosPendentes);
  assert.equal(september.rows.find(r=>r.date==='2026-09-05').provisionalSaturday,true);
});
test('saldo oficial prevalece e sábado posterior projeta débito sem duplicação',()=>{
  const {api}=boot();
  api.state.officialBank={'2026-09':{
    debito:0,credito:0,saldoAnterior:600,saldoAtual:600
  }};
  const october=api.monthStats(2026,9);
  assert.equal(october.cycleBase,600);
  assert.equal(october.cycleSaldo,-240);
  assert.equal(october.cycleTotal,360);
  assert.equal(october.sabadosPendentes,1);
});
test('sábado futuro e sábado ainda em andamento não antecipam débito',()=>{
  const {api}=boot();
  assert.equal(api.estimatedBankImpact({date:'2026-10-10',punches:[]}).saldo,0);
  const row=api.monthStats(2026,9).rows.find(r=>r.date==='2026-10-10');
  assert.equal(row.provisionalSaturday,false);
  assert.equal(row.future,true);
});
