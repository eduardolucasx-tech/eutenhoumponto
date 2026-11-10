'use strict';
// v2.3.0: no banco vale a última edição: espelho importado ou correção feita no app depois dele.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const PontoSync=require('../sync-core.js');
const appSource=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
class TestDate extends Date{
  constructor(...args){super(...(args.length?args:['2026-11-10T12:00:00-03:00']));}
  static now(){return Date.parse('2026-11-10T12:00:00-03:00');}
}
const element=()=>({innerHTML:'',textContent:'',value:'',dataset:{},onclick:null,
  classList:{toggle(){},add(){},remove(){}},appendChild(){},addEventListener(){},remove(){}});
function boot(model='tribuna_hub_prog'){
  const store=new Map();
  const ctx=vm.createContext({
    window:{location:{search:'?demo=1',protocol:'https:'},FIREBASE_CONFIG:{}},
    document:{getElementById:element,querySelectorAll:()=>[],createElement:element,body:{appendChild(){}},querySelector:()=>null},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    PontoSync,URLSearchParams,Date:TestDate,console:{warn(){},error(){},log(){}},
    setInterval(){},clearTimeout(){},setTimeout(){},requestAnimationFrame(){}
  });
  vm.runInContext(appSource+`;render=()=>{};showToast=()=>{};
    globalThis.api={state,monthStats,applyEspelhoImport};`,ctx);
  const api=ctx.api;
  api.state.user={uid:'__test__'};
  api.state.profile={model,city:'Santos',bankStart:0};
  api.state.days={};
  api.state.officialBank={};
  return api;
}
// Espelho fictício de outubro: dias úteis 08:00–17:00, saldo oficial +01:40.
const october=['2026-10-14','2026-10-15','2026-10-16'];
const espelho=()=>({rows:october.map(date=>({date,punches:['08:00','17:00']})),
  summary:{month:'2026-10',saldoAtual:100,debito:0,credito:0}});
const edit=(api,date,times)=>{
  api.state.days[date]=PontoSync.replacePunches(api.state.days[date]||{date,punches:[]},times.map(time=>({time,source:'typed'})));
};

test('sem edição, o banco é o saldo oficial do espelho',()=>{
  const api=boot();
  api.applyEspelhoImport(espelho());
  const st=api.monthStats(2026,9);
  assert.equal(st.cycleTotal,100);
  assert.equal(st.saldo,0);
});

test('edição depois do espelho entra no mês e no banco',()=>{
  const api=boot();
  api.applyEspelhoImport(espelho());
  edit(api,'2026-10-15',['08:00','19:00']);
  const oct=api.monthStats(2026,9), nov=api.monthStats(2026,10);
  assert.equal(oct.saldo,120);
  assert.equal(oct.monthCredit,120);
  assert.equal(oct.cycleTotal,220);
  assert.equal(nov.cycleTotal-api.monthStats(2026,10).localAfterOfficial,220);
  assert.deepEqual([...oct.cycleEdits.dates],['2026-10-15']);
});

test('desfazer a edição volta ao valor oficial',()=>{
  const api=boot();
  api.applyEspelhoImport(espelho());
  edit(api,'2026-10-15',['08:00','19:00']);
  edit(api,'2026-10-15',['08:00','17:00']);
  assert.equal(api.monthStats(2026,9).cycleTotal,100);
});

test('ausência lançada depois do espelho também conta',()=>{
  const api=boot();
  api.applyEspelhoImport(espelho());
  api.state.days['2026-10-16']=PontoSync.setAbsence(api.state.days['2026-10-16'],'atestado');
  const st=api.monthStats(2026,9);
  assert.equal(st.cycleTotal,100+st.cycleEdits.saldo);
  assert.ok(st.cycleEdits.saldo<=0);
});

test('importar o espelho de novo mantém o dia editado e continua contando',()=>{
  const api=boot();
  api.applyEspelhoImport(espelho());
  edit(api,'2026-10-15',['08:00','19:00']);
  const res=api.applyEspelhoImport(espelho());
  assert.deepEqual([...res.kept],['2026-10-15']);
  assert.deepEqual(api.state.days['2026-10-15'].punches.map(p=>p.time),['08:00','19:00']);
  assert.equal(api.monthStats(2026,9).cycleTotal,220);
});

test('espelho importado antes da regra nova: aviso e cálculo antigo',()=>{
  const api=boot();
  api.state.officialBank={'2026-10':{month:'2026-10',saldoAtual:100,debito:0,credito:0,importedAt:'2026-11-01T10:00:00.000Z'}};
  edit(api,'2026-10-15',['08:00','19:00']);
  const st=api.monthStats(2026,9);
  assert.equal(st.cycleTotal,100);
  assert.deepEqual([...st.legacyOfficial],['2026-10']);
  // Reimportar guarda o retrato do espelho e mantém a edição feita antes.
  const res=api.applyEspelhoImport(espelho());
  assert.deepEqual([...res.kept],['2026-10-15']);
  assert.equal(api.monthStats(2026,9).cycleTotal,220);
});

// v2.3.1: Falta em mês com espelho antigo e o novo botão Diária viagem.
const legacy=api=>{api.state.officialBank={'2026-10':{month:'2026-10',saldoAtual:100,debito:0,credito:0,importedAt:'2026-11-01T10:00:00.000Z'}};};
const espelhoDay=(api,date)=>{api.state.days[date]=PontoSync.replacePunches({date,punches:[]},[{time:'08:00',source:'pdf_espelho'},{time:'17:00',source:'pdf_espelho'}]);};

test('Falta lançada sobre o espelho antigo desconta do banco sem reimportar',()=>{
  const api=boot();
  legacy(api);
  espelhoDay(api,'2026-10-15');
  api.state.days['2026-10-15']=PontoSync.setAbsence(api.state.days['2026-10-15'],'falta');
  const st=api.monthStats(2026,9);
  assert.equal(st.cycleTotal,100-480);
  assert.equal(st.saldo,-480);
});

test('Falta em dia vazio de mês com espelho antigo também desconta',()=>{
  const api=boot();
  legacy(api);
  api.state.days['2026-10-15']=PontoSync.setAbsence({date:'2026-10-15',punches:[]},'falta');
  assert.equal(api.monthStats(2026,9).cycleTotal,100-480);
});

test('Diária viagem desconta 08:00 do banco, mesmo em dia sem jornada',()=>{
  const api=boot();
  api.state.days['2026-11-02']={date:'2026-11-02',punches:[{id:'a',time:'08:00'},{id:'b',time:'17:00'}]};
  const before=api.monthStats(2026,10).cycleTotal;
  api.state.days['2026-11-03']=PontoSync.setAbsence({date:'2026-11-03',punches:[]},'viagem');
  assert.equal(api.monthStats(2026,10).cycleTotal,before-480);
  api.state.days['2026-11-08']=PontoSync.setAbsence({date:'2026-11-08',punches:[]},'viagem');
  assert.equal(api.monthStats(2026,10).cycleTotal,before-960);
  assert.equal(api.state.days['2026-11-08'].note,'Diária viagem');
});

test('Diária viagem em outubro com espelho conta no banco',()=>{
  const api=boot();
  api.applyEspelhoImport(espelho());
  api.state.days['2026-10-14']=PontoSync.setAbsence(api.state.days['2026-10-14'],'viagem');
  const st=api.monthStats(2026,9);
  // O dia do espelho (08:00–17:00) fechava a jornada: a diária tira 08:00 do saldo oficial.
  assert.equal(st.cycleTotal,100-480);
});
