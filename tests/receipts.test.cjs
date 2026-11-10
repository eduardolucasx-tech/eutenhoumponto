'use strict';
// v2.2.0: vários comprovantes "Carol: Comprovante Clock-In" colados de uma vez.
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
    globalThis.api={state,parseReceiptsText,compareReceiptsWithApp,applyMissingReceipts,receiptsReportHtml};`,ctx);
  ctx.api.state.user={uid:'__test__'};
  ctx.api.state.profile={model,city:'Santos',bankStart:0};
  ctx.api.state.days={};
  return ctx.api;
}
// Texto no formato do comprovante (dados fictícios).
const plain=v=>JSON.parse(JSON.stringify(v));
const receipt=(nsr,date,time)=>`COMPROVANTE DE REGISTRO DE PONTO DO TRABALHADOR
EMPREGADOR: EMPRESA TESTE LTDA
CNPJ: 00000000000000 NSR: ${nsr}
LOCAL: Rua Teste, 1
NOME: Pessoa Teste
CPF: 00000000000
DATA: ${date} HORA: ${time}`;

test('lê vários comprovantes colados juntos, com NSR, em ordem',()=>{
  const api=boot();
  const text=[receipt('70010','10/11/2026','08:02'),receipt('69975','09/11/2026','19:23'),receipt('69901','09/11/2026','10:31')].join('\n\n');
  const r=api.parseReceiptsText(text);
  assert.deepEqual(plain(r.map(x=>[x.date,x.time,x.nsr])),[['2026-11-09','10:31','69901'],['2026-11-09','19:23','69975'],['2026-11-10','08:02','70010']]);
});

test('ignora comprovante repetido',()=>{
  const api=boot();
  const r=api.parseReceiptsText(receipt('1','09/11/2026','19:23')+'\n'+receipt('1','09/11/2026','19:23'));
  assert.equal(r.length,1);
});

test('compara com o app: confere, diferença e falta',()=>{
  const api=boot();
  api.state.days['2026-11-09']={date:'2026-11-09',punches:[{id:'a',time:'10:31',source:'button'},{id:'b',time:'19:20',source:'button'}]};
  const r=api.parseReceiptsText([receipt('1','09/11/2026','10:31'),receipt('2','09/11/2026','19:23'),receipt('3','10/11/2026','08:02')].join('\n'));
  const c=api.compareReceiptsWithApp(r);
  assert.deepEqual(plain(c.map(x=>x.status)),['match','diff','missing']);
  assert.equal(c[1].diff,-3);
  assert.equal(c[1].appTime,'19:20');
});

test('comparar não altera nada; adicionar só inclui o que falta',()=>{
  const api=boot();
  api.state.days['2026-11-09']={date:'2026-11-09',punches:[{id:'a',time:'10:31',source:'button'}]};
  const c=api.compareReceiptsWithApp(api.parseReceiptsText([receipt('1','09/11/2026','10:31'),receipt('2','09/11/2026','19:23')].join('\n')));
  assert.equal(api.state.days['2026-11-09'].punches.length,1);
  assert.equal(api.applyMissingReceipts(c),1);
  assert.deepEqual(plain(api.state.days['2026-11-09'].punches.map(p=>p.time)),['10:31','19:23']);
  assert.equal(api.applyMissingReceipts(c),0);
});

test('dia já completo e dia de ausência não recebem batida',()=>{
  const api=boot();
  api.state.days['2026-11-09']={date:'2026-11-09',punches:[{id:'a',time:'08:00'},{id:'b',time:'17:00'}]};
  api.state.days['2026-11-10']={date:'2026-11-10',punches:[],absenceType:'atestado'};
  const c=api.compareReceiptsWithApp(api.parseReceiptsText([receipt('1','09/11/2026','12:00'),receipt('2','10/11/2026','08:00')].join('\n')));
  assert.deepEqual(plain(c.map(x=>x.status)),['full','blocked']);
  assert.equal(api.applyMissingReceipts(c),0);
});

test('relatório não mostra CPF nem nome',()=>{
  const api=boot();
  const html=api.receiptsReportHtml(api.compareReceiptsWithApp(api.parseReceiptsText(receipt('1','09/11/2026','19:23'))));
  assert.ok(!/CPF|Pessoa Teste|00000000000/.test(html));
  assert.ok(/NSR 1/.test(html));
});

test('texto do "Copiar texto" do iPhone: HORA e CNPJ quebrados em outra linha',()=>{
  const api=boot();
  // Layout real copiado do e-mail no iPhone (dados pessoais trocados por zeros).
  const iphone=`COMPROVANTE DE REGISTRO DE PONTO DO TRABALHADOR

EMPREGADOR: EMPRESA TESTE LTDA
CNPJ:
00000000000000
 NSR: 69975
CEI/CNO/CAEPF: N/A
LOCAL: Rua Teste, 1
DISPOSITIVO: 0000000000000000
NOME: Pessoa Teste
CPF: 00000000000
DATA: 09/11/2026 HORA:
19:23
`;
  const r=api.parseReceiptsText(iphone+'\n'+iphone.replace('69975','69990').replace('09/11/2026','10/11/2026').replace('19:23','08:01'));
  assert.deepEqual(plain(r),[{date:'2026-11-09',time:'19:23',nsr:'69975'},{date:'2026-11-10',time:'08:01',nsr:'69990'}]);
});
