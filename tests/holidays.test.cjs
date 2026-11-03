'use strict';
// Feriados por regra: 2026 idêntico à lista original e anos seguintes cobertos.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const PontoSync=require('../sync-core.js');
const appSource=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const element=()=>({innerHTML:'',textContent:'',value:'',dataset:{},onclick:null,
  classList:{toggle(){},add(){},remove(){}},appendChild(){},addEventListener(){},remove(){}});
const ctx=vm.createContext({
  window:{location:{search:'?demo=1',protocol:'https:'},FIREBASE_CONFIG:{}},
  document:{getElementById:element,querySelectorAll:()=>[],createElement:element,body:{appendChild(){}}},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},PontoSync,URLSearchParams,
  console:{warn(){},error(){},log(){}},setInterval(){},clearTimeout(){},setTimeout(){},requestAnimationFrame(){}
});
vm.runInContext(appSource+';render=()=>{};globalThis.api={isHoliday,holidaysForYear,easterSunday,iso};',ctx);
const {api}=ctx;

// Lista fixa que existia até a v1.8.4.
const LEGACY_2026={
  national:['2026-01-01','2026-04-03','2026-04-21','2026-05-01','2026-09-07','2026-10-12','2026-11-02','2026-11-15','2026-11-20','2026-12-25'],
  sp:['2026-07-09'],santos:['2026-01-26','2026-09-08'],praiaGrande:['2026-01-19','2026-05-20']
};
const sorted=set=>[...set].sort();

test('2026 reproduz exatamente a lista original (Santos e Praia Grande)',()=>{
  const base=[...LEGACY_2026.national,...LEGACY_2026.sp];
  assert.deepEqual(sorted(api.holidaysForYear(2026,'Santos')),[...base,...LEGACY_2026.santos].sort());
  assert.deepEqual(sorted(api.holidaysForYear(2026,'Praia Grande')),[...base,...LEGACY_2026.praiaGrande].sort());
});

test('Páscoa calculada corretamente',()=>{
  assert.equal(api.iso(api.easterSunday(2026)),'2026-04-05');
  assert.equal(api.iso(api.easterSunday(2027)),'2027-03-28');
  assert.equal(api.iso(api.easterSunday(2028)),'2028-04-16');
});

test('2027 tem feriados (antes não tinha nenhum)',()=>{
  assert.equal(api.isHoliday('2027-01-01','Santos'),true);
  assert.equal(api.isHoliday('2027-03-26','Santos'),true); // Sexta-feira Santa
  assert.equal(api.isHoliday('2027-01-26','Santos'),true);
  assert.equal(api.isHoliday('2027-11-20','Santos'),true);
  assert.equal(api.isHoliday('2027-05-27','Santos'),false); // Corpus Christi: ponto facultativo
  assert.equal(api.isHoliday('2027-03-01','Santos'),false);
});

test('datas inválidas não quebram',()=>{
  assert.equal(api.isHoliday('',  'Santos'),false);
  assert.equal(api.isHoliday(undefined,'Santos'),false);
});
