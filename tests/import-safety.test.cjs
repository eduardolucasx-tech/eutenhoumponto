'use strict';
// Regressões de importação: ausências preservadas, parsers de planilha e espelho.
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
function boot(model='tradicional'){
  const nodes={},store=new Map(),toasts=[];
  const node=id=>nodes[id]||(nodes[id]=element());
  const document={getElementById:node,querySelectorAll:()=>[],createElement:element,body:{appendChild(){}}};
  const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
  const ctx=vm.createContext({
    window:{location:{search:'?demo=1',protocol:'https:'},FIREBASE_CONFIG:{}},
    document,localStorage,PontoSync,URLSearchParams,Date:TestDate,
    console:{warn(){},error(){},log(){}},
    setInterval(){},clearTimeout(){},setTimeout(){},requestAnimationFrame(){}
  });
  vm.runInContext(appSource+`;render=()=>{};showToast=(m,t)=>globalThis.__toasts.push([m,t]);
    globalThis.api={state,setDayAbsence,applyCommonSpreadsheetImport,applyEspelhoImport,
      parseCommonSpreadsheetMatrix,spreadsheetMatrixFromPastedText,parseEspelhoPontoText,
      estimatedBankImpact,isHoliday,holidaysForYear,estimateDocBytes,cloudUsageLine};`,Object.assign(ctx,{__toasts:toasts}));
  ctx.api.state.user={uid:'__test__'};
  ctx.api.state.profile={model,city:'Santos',bankStart:0};
  ctx.api.state.days={};
  return {api:ctx.api,toasts};
}

test('planilha não apaga Atestado, Falta nem Folga banco',()=>{
  const {api,toasts}=boot();
  api.setDayAbsence('2026-10-05','atestado');
  api.setDayAbsence('2026-10-06','falta');
  const parsed=api.parseCommonSpreadsheetMatrix(api.spreadsheetMatrixFromPastedText(
    '05/10/2026\t08:00\t12:00\t13:00\t17:00\n06/10/2026\t08:00\t12:00\t13:00\t17:00\n07/10/2026\t08:00\t12:00\t13:00\t17:00'));
  assert.equal(parsed.rows.length,3);
  const result=api.applyCommonSpreadsheetImport(parsed);
  assert.deepEqual([...result.skipped],['2026-10-05','2026-10-06']);
  assert.equal(api.state.days['2026-10-05'].absenceType,'atestado');
  assert.equal(api.state.days['2026-10-06'].absenceType,'falta');
  assert.equal(api.state.days['2026-10-05'].punches.length,0);
  assert.equal(api.state.days['2026-10-07'].punches.length,4);
  assert.ok(toasts.some(([m])=>/2 dia\(s\) com ausência/.test(m)));
});

const ESPELHO=`Espelho do Ponto
01/10/2026 Qui 08:00 12:00 13:00 17:00
02/10/2026 Sex AUSENTE
05/10/2026 Seg 08:00 12:00 13:00 17:30
04/10/2026 Dom D.S.R
Banco de Horas Saldo Anterior Saldo Anterior Valorizado Débito Crédito Saldo Atual Saldo Atual Valorizado 1,00 1,00 8,00 2,30 -4,30 -4,30 Assinatura`;

test('espelho: lê batidas, ausência, DSR e bloco do banco',()=>{
  const {api}=boot();
  const {rows,summary}=api.parseEspelhoPontoText(ESPELHO);
  const by=Object.fromEntries(rows.map(r=>[r.date,r]));
  assert.deepEqual([...by['2026-10-01'].punches],['08:00','12:00','13:00','17:00']);
  assert.equal(by['2026-10-02'].closed,true);
  assert.equal(by['2026-10-02'].punches.length,0);
  assert.equal(by['2026-10-04'].note,'DSR');
  assert.equal(summary.saldoAnterior,60);
  assert.equal(summary.debito,480);
  assert.equal(summary.credito,150);
  assert.equal(summary.saldoAtual,-270);
  assert.equal(summary.month,'2026-10');
});

test('espelho sem bloco do banco não inventa saldo oficial',()=>{
  const {api}=boot();
  const {summary}=api.parseEspelhoPontoText('01/10/2026 Qui 08:00 12:00 13:00 17:00\nTotal -3,15 qualquer coisa');
  assert.equal(summary.saldoAtual,null);
});

test('espelho preserva ausência manual e grava observação do dia',()=>{
  const {api}=boot();
  api.setDayAbsence('2026-10-05','atestado');
  const parsed=api.parseEspelhoPontoText(ESPELHO);
  const result=api.applyEspelhoImport(parsed);
  assert.deepEqual([...result.skipped],['2026-10-05']);
  assert.equal(api.state.days['2026-10-05'].absenceType,'atestado');
  assert.equal(api.state.days['2026-10-01'].punches.length,4);
  assert.equal(api.state.days['2026-10-02'].closed,true);
  assert.equal(api.state.days['2026-10-02'].note,'Ausente');
  assert.equal(api.state.officialBank['2026-10'].saldoAtual,-270);
});

test('compactação remove tombstones só de dias antigos, sem tocar nas batidas',()=>{
  let old={date:'2026-01-05',punches:[],note:''};
  old=PontoSync.addPunch(old,'08:00');old=PontoSync.addPunch(old,'17:00');
  old=PontoSync.removeLastPunch(old).day;
  let recent={date:'2026-10-05',punches:[],note:''};
  recent=PontoSync.addPunch(recent,'09:00');recent=PontoSync.removeLastPunch(recent).day;
  const out=PontoSync.compactTombstones({[old.date]:old,[recent.date]:recent},'2026-06-07');
  assert.equal(out['2026-01-05'].deletedPunchIds.length,0);
  assert.equal(out['2026-01-05'].punches.length,1);
  assert.equal(out['2026-10-05'].deletedPunchIds.length,1);
});
