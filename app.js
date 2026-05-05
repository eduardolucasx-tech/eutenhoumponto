const STORAGE_KEY = 'euTenhoUmPontoV2Preview';
const APP_VERSION = 'v1.3.5';
const nowSP = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
const pad = n => String(n).padStart(2,'0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const brDate = isoDate => isoDate.split('-').reverse().join('/');
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const weekFull = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const weekShort = ['dom','seg','ter','qua','qui','sex','sáb'];
const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const parseHM = t => { if(!t) return null; const [h,m] = t.split(':').map(Number); return h*60+m; };
const fmtMin = mins => { const sign = mins < 0 ? '-' : ''; mins = Math.abs(Math.round(mins)); return `${sign}${pad(Math.floor(mins/60))}:${pad(mins%60)}`; };
const dateObj = isoDate => { const [y,m,d] = isoDate.split('-').map(Number); return new Date(y, m-1, d); };

const MODELS = {
  tribuna_hub_prog: {
    title:'TRIBUNA HUB/PROG', city:'Santos', punchMode:'autoLunch', bankCycle:'semestral',
    desc:'Seg-sex 8h, sábado 4h, domingo 0h. Almoço automático.',
    expected(date){ const d = dateObj(date); const wd = d.getDay(); if(isHoliday(date,'Santos')) return 0; if(wd>=1 && wd<=5) return 480; if(wd===6) return 240; return 0; }
  },
  tribuna_jornalismo: {
    title:'TRIBUNA JORNALISMO', city:'Santos', punchMode:'autoLunch', bankCycle:'semestral', needsScaleStart:true,
    desc:'Escala 12x2, data inicial manual. Almoço automático.',
    expected(date, profile){ if(isHoliday(date,'Santos')) return 0; if(!profile.scaleStartDate) return 0; const start = dateObj(profile.scaleStartDate); const cur = dateObj(date); const diff = Math.floor((cur-start)/(86400000)); const mod = ((diff % 14) + 14) % 14; return mod < 12 ? 480 : 0; }
  },
  tradicional: {
    title:'TRADICIONAL', city:'Praia Grande', punchMode:'manualLunch', bankCycle:'semestral',
    desc:'Seg-sex 8h, sábado/domingo 0h. Quatro batidas manuais.',
    expected(date, profile){ const city = profile.city || 'Praia Grande'; if(isHoliday(date, city)) return 0; const wd = dateObj(date).getDay(); return (wd>=1 && wd<=5) ? 480 : 0; }
  },
  personalizavel: {
    title:'PERSONALIZÁVEL', city:'Santos', punchMode:'manualLunch', bankCycle:'semestral', custom:true,
    desc:'Cidade, carga, dias e almoço configuráveis.',
    expected(date, profile){ const city = profile.city || 'Santos'; if(isHoliday(date, city)) return 0; const wd = dateObj(date).getDay(); const map = profile.customHours || {1:480,2:480,3:480,4:480,5:480}; return map[wd] || 0; }
  }
};

// Lista inicial 2026 para protótipo. Em produção, isso virá de publicConfig/holidays no Firebase.
const HOLIDAYS_2026 = {
  national: ['2026-01-01','2026-04-03','2026-04-21','2026-05-01','2026-09-07','2026-10-12','2026-11-02','2026-11-15','2026-11-20','2026-12-25'],
  sp: ['2026-07-09'],
  santos: ['2026-01-26','2026-09-08'],
  praiaGrande: ['2026-01-19','2026-05-20']
};
function isHoliday(date, city='Santos'){
  const base = [...HOLIDAYS_2026.national, ...HOLIDAYS_2026.sp];
  if(city === 'Santos') base.push(...HOLIDAYS_2026.santos);
  if(city === 'Praia Grande') base.push(...HOLIDAYS_2026.praiaGrande);
  return base.includes(date);
}



var firebaseReady = false;
var firebaseAuth = null;
var firebaseProvider = null;
var firebaseFns = null;
var firebaseDb = null;
var firestoreFns = null;
var cloudReady = false;
var cloudHydrating = false;
var cloudSyncTimer = null;
var cloudLastSyncAt = null;

function hasRealFirebaseConfig(){
  const cfg = window.FIREBASE_CONFIG || {};
  return !!(cfg.apiKey && !String(cfg.apiKey).includes("COLE_") && cfg.authDomain && !String(cfg.authDomain).includes("SEU_PROJETO"));
}

async function initFirebaseAuth(){
  if(firebaseReady || !hasRealFirebaseConfig()) return firebaseReady;
  try{
    const appMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const authMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    const fsMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

    const firebaseApp = appMod.initializeApp(window.FIREBASE_CONFIG);
    firebaseAuth = authMod.getAuth(firebaseApp);
    firebaseProvider = new authMod.GoogleAuthProvider();
    firebaseFns = authMod;
    firebaseDb = fsMod.getFirestore(firebaseApp);
    firestoreFns = fsMod;
    firebaseReady = true;

    authMod.onAuthStateChanged(firebaseAuth, async (user) => {
      if(user){
        state.user = {
          uid: user.uid,
          name: user.displayName || "Usuário Google",
          email: user.email || "",
          photoURL: user.photoURL || "",
          provider: "firebase_google"
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        await hydrateFromCloud('smart');
        render();
      } else {
        cloudReady = false;
      }
    });

    return true;
  }catch(err){
    console.warn("Firebase Auth/Firestore não iniciou:", err);
    return false;
  }
}

function stateForCloud(){
  return {
    profile: state.profile || null,
    days: state.days || {},
    imports: state.imports || [],
    officialBank: state.officialBank || {},
    updatedAtLocal: new Date().toISOString()
  };
}

async function cloudDocRef(){
  if(!firebaseDb || !firestoreFns || !state.user?.uid) return null;
  return firestoreFns.doc(firebaseDb, "users", state.user.uid, "profile", "main");
}

function countDayEntries(days){
  return Object.values(days || {}).filter(d => d && ((d.punches && d.punches.length) || d.note || d.closed || d.official)).length;
}

function mergeCloudWithLocal(cloud, mode='smart'){
  const local = stateForCloud();
  const cloudDays = cloud.days || {};
  const localDays = local.days || {};

  const localCount = countDayEntries(localDays);
  const cloudCount = countDayEntries(cloudDays);

  // Em outro navegador/celular, normalmente o local vem vazio.
  // Nesse caso, a nuvem precisa ganhar sem briga.
  const profile =
    mode === 'cloud' ? (cloud.profile || local.profile) :
    mode === 'local' ? (local.profile || cloud.profile) :
    (local.profile || cloud.profile || null);

  const days =
    mode === 'cloud' ? { ...localDays, ...cloudDays } :
    mode === 'local' ? { ...cloudDays, ...localDays } :
    (localCount === 0 && cloudCount > 0 ? { ...cloudDays } : { ...cloudDays, ...localDays });

  const imports =
    mode === 'cloud' ? (cloud.imports || local.imports || []) :
    (Array.isArray(local.imports) && local.imports.length ? local.imports : (cloud.imports || []));

  const officialBank =
    mode === 'cloud' ? { ...(local.officialBank || {}), ...(cloud.officialBank || {}) } :
    { ...(cloud.officialBank || {}), ...(local.officialBank || {}) };

  return { profile, days, imports, officialBank };
}

async function hydrateFromCloud(mode='smart'){
  if(!firebaseDb || !firestoreFns || !state.user?.uid) return false;
  cloudHydrating = true;
  try{
    const ref = await cloudDocRef();
    const snap = await firestoreFns.getDoc(ref);
    if(snap.exists()){
      const merged = mergeCloudWithLocal(snap.data() || {}, mode);
      state.profile = merged.profile || state.profile;
      state.days = merged.days || {};
      state.imports = merged.imports || [];
      state.officialBank = merged.officialBank || {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    await pushStateToCloud(true);
    cloudReady = true;
    cloudLastSyncAt = new Date();
    return true;
  }catch(err){
    console.warn("Falha ao carregar/salvar dados na nuvem:", err);
    cloudReady = false;
    return false;
  }finally{
    cloudHydrating = false;
  }
}

async function pushStateToCloud(immediate=false){
  if(cloudHydrating || !firebaseDb || !firestoreFns || !state.user?.uid) return false;
  const doPush = async () => {
    try{
      const ref = await cloudDocRef();
      if(!ref) return false;
      await firestoreFns.setDoc(ref, {
        ...stateForCloud(),
        userMeta: {
          name: state.user?.name || "",
          email: state.user?.email || "",
          photoURL: state.user?.photoURL || ""
        },
        updatedAt: firestoreFns.serverTimestamp()
      }, { merge: true });
      cloudReady = true;
      cloudLastSyncAt = new Date();
      return true;
    }catch(err){
      console.warn("Falha ao sincronizar com Firestore:", err);
      cloudReady = false;
      return false;
    }
  };

  if(immediate) return doPush();
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(doPush, 700);
  return true;
}

async function pullStateFromCloud(){
  const ok = await hydrateFromCloud('cloud');
  if(ok){
    showToast('Dados baixados da nuvem.', 'ok');
    render();
  } else {
    showToast('Não foi possível baixar da nuvem.', 'warn');
  }
  return ok;
}

async function loginWithGoogle(){
  const ok = await initFirebaseAuth();
  if(!ok){
    showToast('Firebase ainda não iniciou. Confira a configuração e os domínios autorizados.', 'danger');
    return;
  }
  try{
    await firebaseFns.signInWithPopup(firebaseAuth, firebaseProvider);
  }catch(err){
    showToast('Não foi possível entrar com Google.', 'danger');
  }
}

async function logoutGoogle(){
  try{
    if(firebaseReady && firebaseAuth && firebaseFns){
      await firebaseFns.signOut(firebaseAuth);
    }
  }catch(err){
    console.warn("Falha ao desconectar:", err);
  }
  state.user = null;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  tab = "home";
  render();
}

function renderFallback(message='Não consegui carregar esta tela.'){
  screenEl.innerHTML = `<section class="card"><h2>Carregamento interrompido</h2><p class="muted">${message}</p><button class="primary full" id="fallbackReset">Resetar app local</button></section>`;
  const btn = document.getElementById('fallbackReset');
  if(btn){
    btn.onclick = () => {
      localStorage.removeItem(STORAGE_KEY);
      state = load();
      tab = 'home';
      render();
    };
  }
}


function ensureToastHost(){
  let host = document.getElementById('toastHost');
  if(!host){
    host = document.createElement('div');
    host.id = 'toastHost';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  return host;
}
function showToast(message, type='info'){
  const host = ensureToastHost();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  host.appendChild(toast);
  requestAnimationFrame(()=> toast.classList.add('show'));
  const remove = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 220);
  };
  setTimeout(remove, 2600);
  toast.addEventListener('click', remove);
}
function syncStatusLabel(){
  if(!state.user) return 'Sem conta conectada';
  if(cloudReady && cloudLastSyncAt) return `Sincronizado às ${hm(cloudLastSyncAt)}`;
  return cloudReady ? 'Sincronizado com a nuvem' : 'Salvando localmente';
}
function syncStatusClass(){
  return cloudReady ? 'ok' : 'warn';
}

let state = load();
let tab = 'home';
let selectedMonthValue = null;
let registerView = 'manual';
const screenEl = document.getElementById('screen');
function load(){
  const fresh = { user:null, profile:null, days:{}, imports:[], officialBank:{} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return fresh;
    const parsed = JSON.parse(raw);
    if(!parsed || typeof parsed !== 'object') return fresh;
    if(parsed.profile && !MODELS[parsed.profile.model]) parsed.profile = null;
    parsed.days = parsed.days || {};
    parsed.imports = parsed.imports || [];
    parsed.officialBank = parsed.officialBank || {};
    return { ...fresh, ...parsed };
  } catch (e) {
    console.warn('Falha ao carregar dados locais. Reiniciando prévia.', e);
    localStorage.removeItem(STORAGE_KEY);
    return fresh;
  }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); pushStateToCloud(); render(); }
function model(){ return state.profile ? MODELS[state.profile.model] : null; }
function day(date=iso(nowSP())){ if(!state.days[date]) state.days[date] = { date, punches:[], note:'' }; return state.days[date]; }
function punchesOf(dayObj){ return [...(dayObj.punches||[])]; }
function isOpenShift(dayObj){
  if(!state.profile || !dayObj) return false;
  const p = punchesOf(dayObj);
  return expectedMinutes(dayObj.date) > 0 && p.length > 0 && p.length < requiredPunches();
}
function openShiftDate(){
  const now = nowSP();
  for(let offset=1; offset<=7; offset++){
    const d = new Date(now); d.setDate(now.getDate()-offset);
    const id = iso(d);
    if(isOpenShift(state.days[id])) return id;
  }
  const today = iso(now);
  if(isOpenShift(state.days[today])) return today;
  return null;
}
function activeWorkDate(){ return openShiftDate() || iso(nowSP()); }
function minutesSinceFirstPunch(date, dayObj){
  const p = punchesOf(dayObj);
  if(!p.length) return 0;
  const startMin = parseHM(p[0].time);
  if(startMin === null) return 0;
  const base = dateObj(date);
  base.setHours(Math.floor(startMin/60), startMin%60, 0, 0);
  return Math.max(0, Math.floor((nowSP().getTime() - base.getTime()) / 60000));
}
function displayPunchTime(punches, index){
  if(!punches[index]) return '--:--';
  let dayOffset = 0;
  for(let i=1;i<=index;i++){
    const prev = parseHM(punches[i-1]?.time);
    const cur = parseHM(punches[i]?.time);
    if(cur !== null && prev !== null && cur < prev) dayOffset++;
  }
  return `${punches[index].time}${dayOffset ? ` (+${dayOffset})` : ''}`;
}
function undoLastPunch(date=activeWorkDate()){
  const d = state.days[date];
  if(!d || !d.punches || !d.punches.length){
    showToast('Não há batidas para remover.', 'warn');
    return;
  }
  const removed = d.punches.pop();
  save();
  showToast(`Última batida removida: ${removed?.time || '--:--'}.`, 'warn');
}
function targetDateForImportedPunch(foundDate, foundTime){
  const mins = parseHM(foundTime);
  if(mins !== null && mins < 360){
    const prev = dateObj(foundDate);
    prev.setDate(prev.getDate()-1);
    const prevId = iso(prev);
    if(isOpenShift(state.days[prevId])) return prevId;
  }
  return foundDate;
}

function addMinutesToTime(time, minutes){
  const base = parseHM(time);
  if(base === null || Number.isNaN(base)) return '--:--';
  const total = ((base + Math.round(minutes)) % 1440 + 1440) % 1440;
  return `${pad(Math.floor(total/60))}:${pad(total%60)}`;
}
function defaultLunchMinutes(){ return Number(state.profile?.lunchMinutes) || 60; }
function grossMinutesForExpected(net){
  if(!net || net <= 0) return 0;
  // Regra Tribuna: até 6h brutas desconta 15min; acima de 6h brutas desconta 1h.
  // Para prever o fim da jornada, 8h líquidas viram 9h de permanência; 4h líquidas viram 4h15.
  return net >= 360 ? net + 60 : net + 15;
}
function homeStatusLine(dayObj){
  const p = punchesOf(dayObj);
  const exp = expectedMinutes(dayObj.date);
  if(model()?.punchMode === 'autoLunch'){
    if(p.length === 0) return 'Aguardando entrada';
    if(p.length >= 2) return 'Saída registrada';
    if(exp <= 0) return 'Final de expediente: --:--';
    return `Final de expediente: ${addMinutesToTime(p[0].time, grossMinutesForExpected(exp))}`;
  }
  if(p.length === 0) return 'Aguardando entrada';
  if(p.length >= 4) return 'Saída registrada';
  const lunch = defaultLunchMinutes();
  if(p.length === 1){
    if(exp <= 0) return 'Final de expediente: --:--';
    return `Final de expediente: ${addMinutesToTime(p[0].time, exp + lunch)}`;
  }
  if(p.length === 2) return `Retorno do almoço: ${addMinutesToTime(p[1].time, lunch)}`;
  if(p.length === 3){
    const workedBeforeLunch = Math.max(0, parseHM(p[1].time) - parseHM(p[0].time));
    const remaining = Math.max(0, exp - workedBeforeLunch);
    return `Final de expediente: ${addMinutesToTime(p[2].time, remaining)}`;
  }
  return 'Aguardando entrada';
}

function workedMinutes(dayObj, partial=false){
  const p = punchesOf(dayObj);
  if(!state.profile || p.length === 0) return 0;
  const currentMin = parseHM(hm(nowSP()));
  const safeDiff = (end, start) => {
    if(end === null || start === null || Number.isNaN(end) || Number.isNaN(start)) return 0;
    let diff = end - start;
    if(diff < 0) diff += 1440;
    return Math.max(0, diff);
  };
  if(model().punchMode === 'autoLunch'){
    if(p.length < 2){
      return partial ? safeDiff(currentMin, parseHM(p[0].time)) : 0;
    }
    const bruto = safeDiff(parseHM(p[p.length-1].time), parseHM(p[0].time));
    if(bruto <= 15) return bruto;
    const lunch = bruto > 360 ? 60 : 15;
    return Math.max(0, bruto - lunch);
  }
  if(p.length === 1){
    return partial ? safeDiff(currentMin, parseHM(p[0].time)) : 0;
  }
  if(p.length === 2){
    return safeDiff(parseHM(p[1].time), parseHM(p[0].time));
  }
  if(p.length === 3){
    const firstBlock = safeDiff(parseHM(p[1].time), parseHM(p[0].time));
    const secondBlock = partial ? safeDiff(currentMin, parseHM(p[2].time)) : 0;
    return firstBlock + secondBlock;
  }
  const m1 = safeDiff(parseHM(p[1].time), parseHM(p[0].time));
  const m2 = safeDiff(parseHM(p[3].time), parseHM(p[2].time));
  return m1 + m2;
}
function expectedMinutes(date){ return model() ? model().expected(date, state.profile) : 0; }
function requiredPunches(){ return model()?.punchMode === 'autoLunch' ? 2 : 4; }
function complete(dayObj){ return !!dayObj?.closed || (dayObj.punches||[]).length >= requiredPunches() || expectedMinutes(dayObj.date) === 0; }
function isPending(dayObj){
  if(dayObj?.closed) return false;
  const exp = expectedMinutes(dayObj.date);
  if(exp <= 0) return false;
  return (dayObj.punches||[]).length < requiredPunches();
}
function jornadaStatus(dayObj, partial=false){
  if(isPending(dayObj)) return { text:'Marcação pendente', cls:'warn' };
  const exp = expectedMinutes(dayObj.date);
  const w = workedMinutes(dayObj, partial);
  const saldo = w - exp;
  if(saldo < 0) return { text:'Jornada incompleta', cls:'danger' };
  if(saldo > 0) return { text:'Jornada superior', cls:'ok' };
  return { text:'Jornada cravada', cls:'neutral' };
}

function tribunaLikeModel(){
  return ['tribuna_hub_prog','tribuna_jornalismo'].includes(state.profile?.model);
}
function dayOfficialImpact(dayObj){
  const off = dayObj?.official;
  if(!off) return null;
  const debit = Number(off.debitMinutes || 0);
  const credit = Number(off.creditMinutes || 0);
  return { debit, credit, saldo: credit - debit, source:'official_daily' };
}
function estimatedBankImpact(dayObj){
  const official = dayOfficialImpact(dayObj);
  if(official) return official;
  const exp = expectedMinutes(dayObj.date);
  const w = workedMinutes(dayObj);
  if(exp <= 0 && !(dayObj.punches||[]).length) return { debit:0, credit:0, saldo:0, source:'estimated' };
  if(isPending(dayObj)) return { debit:0, credit:0, saldo:0, source:'open' };
  const saldo = w - exp;
  return { debit: Math.max(0, -saldo), credit: Math.max(0, saldo), saldo, source:'estimated' };
}
function officialMonthSaldo(year, month){
  const key = `${year}-${pad(month+1)}`;
  const b = state.officialBank?.[key];
  if(!b) return null;
  const deb = Number(b.debito || 0);
  const cred = Number(b.credito || 0);
  return { key, debit:deb, credit:cred, saldo:cred-deb, saldoAtual:Number(b.saldoAtual||0), saldoAnterior:Number(b.saldoAnterior||0) };
}
function parseSignedTime(value){
  if(value === null || value === undefined) return 0;
  const str = String(value).trim().replace(',',':');
  const sign = str.startsWith('-') ? -1 : 1;
  const clean = str.replace(/^[+-]/,'');
  const [h,m='0'] = clean.split(':').map(Number);
  if(Number.isNaN(h) || Number.isNaN(m)) return 0;
  return sign * (Math.abs(h)*60 + Math.abs(m));
}
function bankCycleFor(date){
  const d = dateObj(date);
  const year = d.getFullYear();
  const first = d.getMonth() < 6;
  return {
    id: `${year}-${first ? 'H1' : 'H2'}`,
    label: first ? `1º semestre ${year}` : `2º semestre ${year}`,
    start: `${year}-${first ? '01' : '07'}-01`,
    end: `${year}-${first ? '06' : '12'}-${first ? '30' : '31'}`
  };
}

function monthKeyFromDate(date){ return date.slice(0,7); }
function monthEndDateFromKey(key){ const [y,m]=key.split('-').map(Number); return new Date(y,m,0); }
function findLatestOfficialBank(cycle, year, month){
  const maxKey = `${year}-${pad(month+1)}`;
  const entries = Object.entries(state.officialBank || {})
    .filter(([key,b]) => key >= cycle.start.slice(0,7) && key <= maxKey)
    .sort(([a],[b]) => a.localeCompare(b));
  if(!entries.length) return null;
  const [key, bank] = entries[entries.length-1];
  return {key, ...bank};
}
function localSaldoAfterOfficial(cycle, official, year, month){
  if(!official) return cycleConfirmedSaldo(cycle, year, month);
  const now = nowSP();
  const after = monthEndDateFromKey(official.key);
  after.setDate(after.getDate()+1);
  const cycleEnd = dateObj(cycle.end);
  const selectedEnd = new Date(year, month + 1, 0);
  const end = new Date(Math.min(now.getTime(), cycleEnd.getTime(), selectedEnd.getTime()));
  if(after > end) return 0;
  let saldo = 0;
  for(let d=new Date(after); d<=end; d.setDate(d.getDate()+1)){
    const id = iso(d);
    const obj = state.days[id] || {date:id,punches:[]};
    const exp = expectedMinutes(id);
    const done = complete(obj) && (obj.punches?.length || exp===0);
    if(done) saldo += estimatedBankImpact(obj).saldo;
  }
  return saldo;
}
function cycleConfirmedSaldo(cycle, selectedYear, selectedMonth){
  const now = nowSP();
  const start = dateObj(cycle.start);
  const cycleEnd = dateObj(cycle.end);
  const selectedEnd = new Date(selectedYear, selectedMonth + 1, 0);
  const end = new Date(Math.min(now.getTime(), cycleEnd.getTime(), selectedEnd.getTime()));
  let saldo = 0;
  for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)){
    const id = iso(d);
    const obj = state.days[id] || {date:id,punches:[]};
    const exp = expectedMinutes(id);
    const done = complete(obj) && (obj.punches?.length || exp===0);
    if(done) saldo += estimatedBankImpact(obj).saldo;
  }
  return saldo;
}
function monthStats(year, month){
  const now = nowSP();
  const first = new Date(year, month, 1); const last = new Date(year, month+1, 0);
  let prev=0, trab=0, saldoConfirmado=0, pend=0, cravada=0, superior=0, incompleta=0;
  let debitEstimated=0, creditEstimated=0;
  const rows=[], issues=[];
  for(let d=new Date(first); d<=last; d.setDate(d.getDate()+1)){
    const id=iso(d); const obj=state.days[id] || {date:id,punches:[]}; const exp=expectedMinutes(id); const w=workedMinutes(obj); const isPastOrToday = d <= now; const done = complete(obj) && (obj.punches?.length || exp===0);
    if(isPastOrToday){ prev += exp; trab += w; if(isPending(obj)) pend++; }
    const impact = estimatedBankImpact(obj);
    if(done && isPastOrToday){ saldoConfirmado += impact.saldo; debitEstimated += impact.debit; creditEstimated += impact.credit; }
    const status = jornadaStatus(obj);
    if(isPastOrToday && done){ if(status.text==='Jornada cravada') cravada++; if(status.text==='Jornada superior') superior++; if(status.text==='Jornada incompleta') incompleta++; }
    const punches = punchesOf(obj);
    const dup = punches.some((p,i)=>i>0 && p.time===punches[i-1].time);
    if(isPastOrToday && exp>0 && isPending(obj)) issues.push(`${brDate(id)}: marcação pendente`);
    if(dup) issues.push(`${brDate(id)}: marcação duplicada`);
    if(isHoliday(id,state.profile.city) && punches.length) issues.push(`${brDate(id)}: feriado com marcação registrada`);
    rows.push({date:id, weekday:weekShort[d.getDay()].toUpperCase(), punches, expected:exp, worked:w, saldo:impact.saldo, bankImpact:impact, status, holiday:isHoliday(id,state.profile.city), pastOrToday:isPastOrToday, done});
  }
  const cycle = bankCycleFor(`${year}-${pad(month+1)}-01`);
  const officialBank = findLatestOfficialBank(cycle, year, month);
  const officialMonth = officialMonthSaldo(year, month);
  const localAfterOfficial = localSaldoAfterOfficial(cycle, officialBank, year, month);
  const cycleSaldo = officialBank ? localAfterOfficial : cycleConfirmedSaldo(cycle, year, month);
  const cycleBase = officialBank ? officialBank.saldoAtual : (Number(state.profile.bankStart)||0);
  const cycleTotal = cycleBase + cycleSaldo;
  const monthSaldo = officialMonth ? officialMonth.saldo : saldoConfirmado;
  const monthDebit = officialMonth ? officialMonth.debit : debitEstimated;
  const monthCredit = officialMonth ? officialMonth.credit : creditEstimated;
  return {prev, trab, saldo:monthSaldo, saldoEstimado:saldoConfirmado, debitEstimated, creditEstimated, monthDebit, monthCredit, officialMonth, saldoConfirmado, cycleSaldo, cycleTotal, cycleBase, officialBank, pend, cravada, superior, incompleta, rows, issues, cycle};
}
function escapeCsv(v){
  const str = String(v ?? '');
  return /[";\n]/.test(str) ? '"' + str.replace(/"/g,'""') + '"' : str;
}
function downloadBlob(filename, content, type){
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function exportMonthCsv(year, month){
  const st = monthStats(year,month);
  const headers = ['Data','Dia','Modelo','Entrada','Saída almoço','Volta almoço','Saída','Trabalhado','Previsto','Saldo','Status','Origem','Observação'];
  const lines = [headers.map(escapeCsv).join(';')];
  st.rows.forEach(r=>{
    const p = r.punches || [];
    const origem = [...new Set(p.map(x=>x.source||'manual'))].join(', ');
    const note = state.days[r.date]?.note || '';
    const vals = [brDate(r.date), r.weekday, model().title, p.length?displayPunchTime(p,0):'', model().punchMode==='manualLunch' ? (p[1]?.time||'') : '', model().punchMode==='manualLunch' ? (p[2]?.time||'') : '', p.length?displayPunchTime(p,p.length-1):'', fmtMin(r.worked), fmtMin(r.expected), fmtMin(r.saldo), r.status.text, origem, note];
    lines.push(vals.map(escapeCsv).join(';'));
  });
  downloadBlob(`eu_tenho_um_ponto_${year}_${pad(month+1)}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
}
function exportMonthExcel(year, month){
  const st = monthStats(year,month);
  const rows = st.rows.map(r=>{
    const p = r.punches || [];
    return `<tr><td>${brDate(r.date)}</td><td>${r.weekday}</td><td>${model().title}</td><td>${p.length?displayPunchTime(p,0):''}</td><td>${model().punchMode==='manualLunch' ? (p[1]?.time||'') : ''}</td><td>${model().punchMode==='manualLunch' ? (p[2]?.time||'') : ''}</td><td>${p.length?displayPunchTime(p,p.length-1):''}</td><td>${fmtMin(r.worked)}</td><td>${fmtMin(r.expected)}</td><td>${fmtMin(r.saldo)}</td><td>${r.status.text}</td><td>${state.days[r.date]?.note||''}</td></tr>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>Eu tenho um ponto. - ${monthNames[month]} ${year}</h1><table border="1"><tr><th>Previsto até hoje</th><th>Trabalhado</th><th>Saldo mês</th><th>Banco do ciclo</th><th>Marcações pendentes</th></tr><tr><td>${fmtMin(st.prev)}</td><td>${fmtMin(st.trab)}</td><td>${fmtMin(st.saldo)}</td><td>${fmtMin(st.cycleTotal)}</td><td>${st.pend}</td></tr></table><br><table border="1"><tr><th>Data</th><th>Dia</th><th>Modelo</th><th>Entrada</th><th>Saída almoço</th><th>Volta almoço</th><th>Saída</th><th>Trabalhado</th><th>Previsto</th><th>Saldo</th><th>Status</th><th>Observação</th></tr>${rows}</table></body></html>`;
  downloadBlob(`eu_tenho_um_ponto_${year}_${pad(month+1)}.xls`, html, 'application/vnd.ms-excel;charset=utf-8');
}
function reportText(year, month){
  const st = monthStats(year,month);
  return `Relatório - Eu tenho um ponto.\n${monthNames[month]} de ${year}\nModelo: ${model().title}\nCiclo: ${st.cycle.label}\n\nPrevisto até hoje: ${fmtMin(st.prev)}\nTrabalhado: ${fmtMin(st.trab)}\nSaldo do mês ${st.officialMonth ? '(oficial)' : '(estimado)'}: ${fmtMin(st.saldo)}\nDébito do mês: ${fmtMin(st.monthDebit)}
Crédito do mês: ${fmtMin(st.monthCredit)}
Banco do ciclo: ${fmtMin(st.cycleTotal)}${st.officialBank ? ` (oficial importado até ${st.officialBank.key.split('-').reverse().join('/')})` : ''}\nMarcações pendentes: ${st.pend}\nJornadas incompletas: ${st.incompleta}\nJornadas cravadas: ${st.cravada}\nJornadas superiores: ${st.superior}\n\nConferência:\n${st.issues.length ? st.issues.join('\n') : 'Nenhuma inconsistência encontrada.'}`;
}
function addPunch(date, time, source='manual'){
  const d = day(date);
  if(d.punches.find(p=>p.time===time)){
    showToast('Essa marcação já existe neste dia.', 'warn');
    return;
  }
  d.punches.push({time, source, createdAt:new Date().toISOString()});
  save();
  const idx = d.punches.length - 1;
  showToast(`${labelForIndex(Math.min(idx, requiredPunches()-1))} registrada às ${time}.`, 'ok');
}
function labelForIndex(i){ return model()?.punchMode === 'autoLunch' ? ['Entrada','Saída final de expediente'][i] : ['Entrada','Saída almoço','Volta almoço','Saída'][i]; }
function punchCards(dayObj){
  const p = punchesOf(dayObj);
  const auto = model()?.punchMode === 'autoLunch';
  const labels = auto ? ['Entrada','Saída final de expediente'] : ['Entrada','Saída almoço','Volta almoço','Saída'];
  const colors = auto ? ['green','blue'] : ['green','orange','blue','gray'];
  const icons = auto ? ['ENT','SAI'] : ['ENT','ALM','RET','SAI'];
  return `<div class="grid4 ${auto ? 'two' : ''}">${labels.map((l,i)=>`<div class="punch-card"><div class="ico bg-${colors[i]||'gray'} ${colors[i]||'gray'}">${icons[i]||'--'}</div><h3>${l}</h3><strong class="${colors[i]||'gray'}">${displayPunchTime(p,i)}</strong></div>`).join('')}</div>`;
}

function userFirstName(){
  const name = state.user?.name || state.user?.displayName || 'Usuário';
  return name.split(' ')[0] || 'Usuário';
}
function userPhotoHtml(size='small'){
  const photo = state.user?.photoURL;
  const initial = userFirstName().charAt(0).toUpperCase();
  return photo ? `<img src="${photo}" alt="Foto do perfil">` : initial;
}
function renderHeaderProfile(){
  const btn = document.getElementById('profileBtn');
  if(!btn) return;
  btn.innerHTML = state.user ? userPhotoHtml() : 'P';
  btn.title = state.user ? 'Abrir perfil' : 'Perfil';
}

function goHome(){
  if(!state.profile) return;
  tab='home';
  document.querySelectorAll('.bottom-nav button').forEach(x=>x.classList.toggle('active', x.dataset.tab==='home'));
  render();
}

function goProfile(){
  if(!state.profile) return;
  tab = 'config';
  document.querySelectorAll('.bottom-nav button').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === 'config' || button.dataset.tab === 'profile');
  });
  renderProfileScreen();
}

function render(){
  try{
    const currentTab = tab || 'home';
    document.querySelectorAll('.bottom-nav button').forEach((button) => {
      const btnTab = button.dataset.tab;
      button.classList.toggle('active', btnTab === currentTab || ((btnTab === 'config' || btnTab === 'profile') && (currentTab === 'config' || currentTab === 'profile')));
    });
    const badge = document.getElementById('modelBadge');
    if(badge) badge.textContent = state.profile ? `${APP_VERSION} · ${model().title}` : APP_VERSION;
    renderHeaderProfile();
    const bottomNav = document.getElementById('bottomNav');
    if(bottomNav) bottomNav.classList.toggle('hidden', !state.profile);
    if(!state.user) return renderLogin();
    if(!state.profile) return renderModelChoice();
    if(currentTab === 'config' || currentTab === 'profile') return renderProfileScreen();
    if(currentTab === 'register') return renderRegister();
    if(currentTab === 'month') return renderMonth();
    return renderHome();
  }catch(err){
    console.error("Erro no render:", err);
    return renderFallback(err?.message || "Erro ao renderizar.");
  }
}

function renderLogin(){
  screenEl.innerHTML = `<div class="login-wrap"><section class="card center" style="width:100%"><div class="login-logo">1.</div><h2>Eu tenho um ponto.</h2><p class="muted">Entre com sua conta Google para sincronizar seu perfil, marcações e banco de horas.</p><button class="google" id="googleLogin">Entrar com Google</button><p class="muted" style="margin-top:12px">Versão ${APP_VERSION}</p></section></div>`;
  const btn = document.getElementById('googleLogin');
  if(btn) btn.onclick = loginWithGoogle;
}

function renderModelChoice(){
  screenEl.innerHTML = `<section class="card"><h2>Escolha seu modelo de jornada</h2><p class="muted">Cada usuário escolhe seu próprio modelo.</p><div class="models">${Object.entries(MODELS).map(([key,m])=>`<button class="model-btn" data-model="${key}">${m.title}<small>${m.desc}</small></button>`).join('')}</div></section>`;
  document.querySelectorAll('.model-btn').forEach((button) => {
    button.onclick = () => {
      const key = button.dataset.model;
      const m = MODELS[key];
      state.profile = {
        model: key,
        city: m.city || 'Santos',
        bankStart: 0,
        scaleStartDate: null,
        createdAt: new Date().toISOString()
      };
      if(key === 'tribuna_jornalismo'){
        screenEl.innerHTML = `<section class="card"><h2>Data inicial da escala</h2><p class="muted">Informe o primeiro dia trabalhado do ciclo 12x2.</p><label>Data inicial</label><input id="scaleStart" class="input" type="date" value="${iso(nowSP())}"><button class="primary full" id="saveScale">Salvar</button></section>`;
        saveScale.onclick = () => {
          state.profile.scaleStartDate = scaleStart.value;
          save();
        };
      } else {
        save();
      }
    };
  });
}

function renderScaleSetup(){
  screenEl.innerHTML = `<section class="card"><h2>TRIBUNA JORNALISMO</h2><p class="muted">Informe a data inicial da escala 12x2. Ela deve ser o primeiro dia trabalhado do ciclo.</p><label>Data inicial da escala</label><input id="scaleStart" class="input" type="date" value="${iso(nowSP())}"><button class="primary" style="width:100%;margin-top:14px" id="saveScale">Salvar modelo</button></section>`;
  saveScale.onclick = () => { state.profile.scaleStartDate = scaleStart.value; save(); };
}
function renderHome(){
  const n = nowSP(), date = activeWorkDate(), d = day(date), worked = workedMinutes(d, true), exp = expectedMinutes(date), saldo = worked-exp, st = jornadaStatus(d, true);
  const baseDate = dateObj(date);
  const isOpen = isOpenShift(d);
  const openMins = isOpen ? minutesSinceFirstPunch(date, d) : 0;
  const overdue = isOpen && openMins >= 18*60;
  const yesterday = new Date(baseDate); yesterday.setDate(baseDate.getDate()-1); const yIso = iso(yesterday); const yd = state.days[yIso] || {date:yIso,punches:[]};
  const activeLabel = date !== iso(n) ? 'Jornada em andamento' : 'Hoje';
  const protection = overdue ? `<section class="card warning-card"><h2 class="section-title">Jornada aberta</h2><p>Existe uma jornada aberta há ${fmtMin(openMins)}. Confira antes de continuar.</p><div class="actions"><button class="secondary" id="finishOpenBtn">Concluir agora</button><button class="secondary danger-text" id="undoOpenBtn">Limpar última batida</button></div></section>` : '';
  const undoButton = (d.punches||[]).length ? `<button class="secondary full" id="undoLastBtn">Limpar última batida</button>` : '';
  const ySaldo = workedMinutes(yd)-expectedMinutes(yIso);
  const ySummary = yd.punches?.length
    ? `<div class="history-mini"><span>${displayPunchTime(yd.punches,0)} → ${displayPunchTime(yd.punches, yd.punches.length-1)}</span><strong class="${ySaldo<0?'danger':'ok'}">${fmtMin(ySaldo)}</strong></div>`
    : `<div class="empty-state compact">Nenhuma marcação registrada no dia anterior.</div>`;
  screenEl.innerHTML = `
  <section class="card home-profile slim">
    <div class="hello">
      <small>Olá, ${userFirstName()}</small>
      <strong>Vamos registrar seu ponto?</strong>
      <p class="tagline">${model().title}</p>
    </div>
    <div class="sync-pill ${syncStatusClass()}">${syncStatusLabel()}</div>
  </section>
  ${protection}
  <section class="card soft center hero-card">
    <div class="date-line">${activeLabel} · ${pad(baseDate.getDate())} de ${monthNames[baseDate.getMonth()]} de ${baseDate.getFullYear()} · ${weekFull[baseDate.getDay()]}</div>
    <div class="clock" id="clockNow">${hm(n)}</div>
    <button class="cta" id="beatBtn">BATER PONTO</button>
    <div class="status-line ${st.cls==='danger'?'danger-tone':st.cls==='ok'?'ok-tone':''}" id="homeStatus">${homeStatusLine(d)}</div>
    ${undoButton}
  </section>
  <section class="card"><h2 class="section-title">Batidas de hoje</h2>${punchCards(d)}</section>
  <section class="card soft"><h2 class="section-title">Resumo do dia</h2><div class="kpi-strip two"><div class="kpi-mini"><span>Esperado</span><strong>${fmtMin(exp)}</strong></div><div class="kpi-mini"><span>Trabalhado</span><strong>${fmtMin(worked)}</strong></div><div class="kpi-mini"><span>Saldo parcial</span><strong class="${saldo<0?'danger':'ok'}">${fmtMin(saldo)}</strong></div><div class="kpi-mini"><span>Status</span><strong class="${st.cls}">${st.text}</strong></div></div></section>
  <section class="card"><h2 class="section-title">Histórico do dia anterior</h2><div class="row"><span>${brDate(yIso)} · ${weekShort[yesterday.getDay()].toUpperCase()}</span><b>${yd.punches?.length ? 'Registrado' : 'Sem registro'}</b></div>${ySummary}</section>`;
  beatBtn.onclick = () => { addPunch(activeWorkDate(), hm(nowSP()), 'button'); };
  const undoBtn = document.getElementById('undoLastBtn');
  if(undoBtn) undoBtn.onclick = () => undoLastPunch(date);
  const finishBtn = document.getElementById('finishOpenBtn');
  if(finishBtn) finishBtn.onclick = () => addPunch(date, hm(nowSP()), 'button');
  const undoOpenBtn = document.getElementById('undoOpenBtn');
  if(undoOpenBtn) undoOpenBtn.onclick = () => undoLastPunch(date);
}


function brToIso(dateBr){
  const [dd,mm,yyyy] = dateBr.split('/');
  return `${yyyy}-${mm}-${dd}`;
}
function parseEspelhoPontoText(text){
  const lines = String(text||'').replace(/\r/g,'\n').split('\n').map(x=>x.trim()).filter(Boolean);
  const rows = [];
  const summary = { extraNormal:null, extraNoturna:null, faltaIntegral:null, saidaAntecipada:null, hrsNaoRealiz:null, saldoAnterior:null, debito:null, credito:null, saldoAtual:null, saldoAnteriorValorizado:null, saldoAtualValorizado:null, month:null };
  const timeRe = /\b\d{1,2}:\d{2}\b/g;

  for(const rawLine of lines){
    const line = rawLine.replace(/\s+/g,' ');
    let m = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+([A-Za-zÀ-ÿ]+)\s*(.*)$/);
    if(m){
      const date = brToIso(m[1]);
      const weekday = m[2];
      const rest = m[3] || '';
      const upper = rest.toUpperCase();
      const times = [...rest.matchAll(timeRe)].map(x=>x[0].padStart(5,'0'));
      const isAusente = /AUSENTE/.test(upper);
      const isDsr = /D\.S\.R|DSR/.test(upper);
      const obsBits = [];
      if(isAusente) obsBits.push('Ausente');
      if(isDsr) obsBits.push('DSR');
      if(/PAIXAO|PAIXÃO/.test(upper)) obsBits.push('Paixão de Cristo');
      if(/TIRADENTES/.test(upper)) obsBits.push('Tiradentes');

      // Heurística focada no espelho da Tribuna: os primeiros horários da linha são batidas.
      // Horários no fim da linha como H.E., Absent. e Ad. Not. são durações e ficam fora das batidas.
      let punches = [];
      if(!isAusente && !isDsr){
        if(times.length >= 4) punches = times.slice(0,4);
        else if(times.length === 3) punches = times.slice(0,2); // terceiro costuma ser H.E. no espelho
        else if(times.length === 2){
          const a = parseHM(times[0]); const b = parseHM(times[1]);
          if(!(b < a && ['04:00','08:00'].includes(times[1]))) punches = times.slice(0,2);
          else punches = [times[0]];
        } else if(times.length === 1){
          if(!['04:00','08:00'].includes(times[0])) punches = times.slice(0,1);
        }
      }
      rows.push({ date, weekday, punches, closed:isAusente, note:obsBits.join(' · '), raw:line });
      continue;
    }

    const norm = line.toUpperCase();
    const normal = line.match(/H\.EXTRA NORMAL 100%\s+([\d,.]+)/i);
    if(normal) summary.extraNormal = parseSignedTime(normal[1]);
    const noturna = line.match(/H\.E\. NOT NORMAL 100%\s+([\d,.]+)/i);
    if(noturna) summary.extraNoturna = parseSignedTime(noturna[1]);
    const falta = line.match(/FALTA INTEGRAL\s+([\d,.]+)/i);
    if(falta) summary.faltaIntegral = parseSignedTime(falta[1]);
    const saldoAtual = line.match(/SALDO ATUAL(?:\s+VALORIZADO)?\s+(-?[\d,.]+)/i);
    if(saldoAtual) summary.saldoAtual = parseSignedTime(saldoAtual[1]);
  }

  // Fallback: resumo inferior em PDF texto costuma vir em uma única linha com códigos.
  const all = String(text||'').replace(/\s+/g,' ');
  const normal2 = all.match(/129\s+H\.EXTRA NORMAL 100%\s+([\d,.]+)/i);
  if(normal2) summary.extraNormal = parseSignedTime(normal2[1]);
  const noturna2 = all.match(/132\s+H\.E\. NOT NORMAL 100%\s+([\d,.]+)/i);
  if(noturna2) summary.extraNoturna = parseSignedTime(noturna2[1]);
  const falta2 = all.match(/008\s+FALTA INTEGRAL\s+([\d,.]+)/i);
  if(falta2) summary.faltaIntegral = parseSignedTime(falta2[1]);
  const saida2 = all.match(/013\s+SAIDA ANTECIPADA\s+([\d,.]+)/i);
  if(saida2) summary.saidaAntecipada = parseSignedTime(saida2[1]);
  const naoRealiz2 = all.match(/041\s+HRS NORMAIS N REALIZ\s+([\d,.]+)/i);
  if(naoRealiz2) summary.hrsNaoRealiz = parseSignedTime(naoRealiz2[1]);
  const interJor2 = all.match(/037\s+HE EXTRA INTER JOR\s+([\d,.]+)/i);
  if(interJor2) summary.extraNormal = (summary.extraNormal||0) + parseSignedTime(interJor2[1]);
  const feriado2 = all.match(/121\s+H\.EXTRA FERIADO 100%\s+([\d,.]+)/i);
  if(feriado2) summary.extraNormal = (summary.extraNormal||0) + parseSignedTime(feriado2[1]);
  const bankMatch = all.match(/Saldo Anterior\s+Saldo Anterior Valorizado\s+D[eé]bito\s+Cr[eé]dito\s+Saldo Atual\s+Saldo Atual Valorizado\s+(-?\d+,\d{2})\s+(-?\d+,\d{2})\s+(-?\d+,\d{2})\s+(-?\d+,\d{2})\s+(-?\d+,\d{2})\s+(-?\d+,\d{2})/i);
  if(bankMatch){
    summary.saldoAnterior = parseSignedTime(bankMatch[1]);
    summary.saldoAnteriorValorizado = parseSignedTime(bankMatch[2]);
    summary.debito = parseSignedTime(bankMatch[3]);
    summary.credito = parseSignedTime(bankMatch[4]);
    summary.saldoAtual = parseSignedTime(bankMatch[5]);
    summary.saldoAtualValorizado = parseSignedTime(bankMatch[6]);
  } else {
    const bankStart = all.search(/Banco de Horas/i);
    const bankEnd = bankStart >= 0 ? all.indexOf('Assinatura', bankStart) : -1;
    const bankSection = bankStart >= 0 ? all.slice(bankStart, bankEnd > bankStart ? bankEnd : bankStart + 600) : '';
    const bankNums = [...bankSection.matchAll(/-?\d+,\d{2}/g)].map(x=>x[0]);
    if(bankNums.length >= 6){
      summary.saldoAnterior = parseSignedTime(bankNums[0]);
      summary.saldoAnteriorValorizado = parseSignedTime(bankNums[1]);
      summary.debito = parseSignedTime(bankNums[2]);
      summary.credito = parseSignedTime(bankNums[3]);
      summary.saldoAtual = parseSignedTime(bankNums[4]);
      summary.saldoAtualValorizado = parseSignedTime(bankNums[5]);
    } else {
      const saldos = [...all.matchAll(/(-?\d+,\d{2})/g)].map(x=>parseSignedTime(x[1]));
      const negatives = saldos.filter(x=>x<0);
      if(negatives.length) summary.saldoAtual = negatives[negatives.length-1];
    }
  }
  if(summary.debito === null && summary.hrsNaoRealiz !== null) summary.debito = summary.hrsNaoRealiz;
  if(summary.credito === null && (summary.extraNormal !== null || summary.extraNoturna !== null)) summary.credito = (summary.extraNormal||0) + (summary.extraNoturna||0);
  if(rows.length){
    const first = rows.find(r=>r.date)?.date;
    if(first) summary.month = first.slice(0,7);
  }

  return { rows, summary };
}
function adaptedPunchesForModel(punches){
  const clean = (punches||[]).filter(Boolean);
  if(model()?.punchMode === 'autoLunch'){
    if(clean.length >= 2) return [clean[0], clean[clean.length-1]];
    return clean.slice(0,2);
  }
  return clean.slice(0,4);
}
function previewEspelhoImport(parsed){
  const rows = parsed.rows || [];
  const withPunches = rows.filter(r=>r.punches?.length).length;
  const absent = rows.filter(r=>r.closed).length;
  const feriados = rows.filter(r=>r.note && /Paixão|Tiradentes/.test(r.note)).length;
  const sample = rows.slice(0,10).map(r=>{
    const p = adaptedPunchesForModel(r.punches);
    const line = p.length ? `${p[0]} → ${p[p.length-1]}` : (r.note || 'sem batidas');
    return `<div class="day-item"><div class="day-head"><span>${brDate(r.date)} · ${r.weekday}</span><span>${p.length ? `${p.length} bat.` : ''}</span></div><div class="day-sub">${line}</div></div>`;
  }).join('');
  const extraTotal = (parsed.summary.extraNormal||0) + (parsed.summary.extraNoturna||0);
  return `<h2>Prévia do espelho</h2>
    <div class="row"><span>Dias encontrados</span><b>${rows.length}</b></div>
    <div class="row"><span>Dias com batida</span><b>${withPunches}</b></div>
    <div class="row"><span>Ausências fechadas</span><b>${absent}</b></div>
    <div class="row"><span>Feriados identificados</span><b>${feriados}</b></div>
    <div class="row"><span>Crédito do resumo</span><b>${fmtMin((parsed.summary.credito ?? extraTotal) || 0)}</b></div>
    ${parsed.summary.month ? `<div class="row"><span>Mês do espelho</span><b>${parsed.summary.month.split('-').reverse().join('/')}</b></div>` : ''}
    ${parsed.summary.saldoAnterior!==null && parsed.summary.saldoAnterior!==undefined ? `<div class="row"><span>Saldo anterior oficial</span><b>${fmtMin(parsed.summary.saldoAnterior)}</b></div>` : ''}
    ${parsed.summary.debito!==null && parsed.summary.debito!==undefined ? `<div class="row"><span>Débito oficial</span><b class="danger">${fmtMin(parsed.summary.debito)}</b></div>` : ''}
    ${parsed.summary.credito!==null && parsed.summary.credito!==undefined ? `<div class="row"><span>Crédito oficial</span><b class="ok">${fmtMin(parsed.summary.credito)}</b></div>` : ''}
    ${parsed.summary.saldoAtual!==null && parsed.summary.saldoAtual!==undefined ? `<div class="row"><span>Saldo atual oficial</span><b class="${parsed.summary.saldoAtual<0?'danger':'ok'}">${fmtMin(parsed.summary.saldoAtual)}</b></div>` : ''}
    <h2 class="section-title" style="margin-top:16px">Amostra</h2>${sample || '<p class="muted">Nenhuma linha diária encontrada.</p>'}
    <button class="primary full" id="confirmPdfImport">Confirmar importação do espelho</button>
    <p class="muted">A importação usa a primeira e a última batida para modelos Tribuna. No Tradicional, usa até quatro batidas.</p>`;
}
function applyEspelhoImport(parsed){
  (parsed.rows||[]).forEach(r=>{
    const dd = day(r.date);
    const punches = adaptedPunchesForModel(r.punches);
    if(punches.length) dd.punches = punches.map(t=>({time:t, source:'pdf_espelho'}));
    if(r.closed) dd.closed = true;
    if(r.note) dd.note = [dd.note, r.note].filter(Boolean).join(' · ');
  });
  if(parsed.summary?.saldoAtual !== null && parsed.summary?.saldoAtual !== undefined){
    state.imports = state.imports || [];
    state.officialBank = state.officialBank || {};
    const monthKey = parsed.summary.month || ((parsed.rows||[])[0]?.date || iso(nowSP())).slice(0,7);
    state.officialBank[monthKey] = {
      month: monthKey,
      saldoAnterior: parsed.summary.saldoAnterior,
      debito: parsed.summary.debito ?? parsed.summary.hrsNaoRealiz ?? 0,
      credito: parsed.summary.credito ?? ((parsed.summary.extraNormal||0)+(parsed.summary.extraNoturna||0)),
      saldoAtual: parsed.summary.saldoAtual,
      importedAt: new Date().toISOString()
    };
    state.imports.push({type:'espelho_ponto', month:monthKey, createdAt:new Date().toISOString(), saldoOficial:parsed.summary.saldoAtual, extraNormal:parsed.summary.extraNormal, extraNoturna:parsed.summary.extraNoturna});
  }
  save();
}
async function extractPdfText(file){
  if(!window.pdfjsLib) throw new Error('Leitor de PDF não carregado. Use o campo de texto ou rode com internet para carregar o PDF.js.');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({data}).promise;
  let text = '';
  for(let i=1;i<=pdf.numPages;i++){
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item=>item.str).join(' ') + '\n';
  }
  return text;
}

function renderRegister(){
  const date = iso(nowSP());
  const manualFields = model().punchMode === 'autoLunch' ? ['Entrada','Saída final de expediente'] : ['Entrada','Saída almoço','Volta almoço','Saída'];
  screenEl.innerHTML = `
  <section class="card">
    <div class="section-head">
      <div><h2>Registrar</h2><p class="muted">Escolha entre lançar manualmente ou importar um comprovante/espelho.</p></div>
    </div>
    <div class="segmented" id="registerSegment">
      <button class="${registerView==='manual'?'active':''}" data-view="manual">Manual</button>
      <button class="${registerView==='import'?'active':''}" data-view="import">Importar</button>
    </div>
  </section>
  <div id="registerBody"></div>`;

  const renderManual = () => {
    const d = state.days[date] || { punches:[], note:'' };
    const body = document.getElementById('registerBody');
    body.innerHTML = `<section class="card"><h2>Registro manual</h2><p class="muted">Formulário adaptado ao modelo ${model().title}. Apenas os campos necessários são exibidos.</p><label>Data</label><input id="regDate" type="date" class="input" value="${date}"><div id="regFields"></div><label>Observação</label><textarea id="note" rows="3" placeholder="Opcional">${d.note||''}</textarea><button class="primary full" id="saveReg">Salvar marcações</button><button class="secondary full" id="undoRegBtn">Limpar última batida deste dia</button></section><section class="card subtle-card"><div class="empty-state compact"><strong>Dica rápida</strong><span>${model().punchMode === 'autoLunch' ? 'Nos modelos Tribuna, o app considera apenas entrada e saída final.' : 'Nos modelos com almoço manual, lance as quatro batidas na ordem correta.'}</span></div></section>`;
    const draw = () => {
      const dd = state.days[regDate.value] || {punches:[]};
      regFields.innerHTML = manualFields.map((f,i)=>`<label>${f}</label><input class="input punchInput" type="time" value="${dd.punches?.[i]?.time||''}" placeholder="HH:MM">`).join('');
      note.value = dd.note || '';
    };
    regDate.onchange = draw;
    draw();
    saveReg.onclick = () => {
      const dd = day(regDate.value);
      dd.punches = [...document.querySelectorAll('.punchInput')].map(i=>i.value).filter(Boolean).map(t=>({time:t,source:'typed'}));
      dd.note = note.value;
      save();
      showToast('Marcações manuais salvas.', 'ok');
      tab='home';
      render();
    };
    undoRegBtn.onclick = () => undoLastPunch(regDate.value);
  };

  const renderImportView = () => {
    const body = document.getElementById('registerBody');
    body.innerHTML = `
    <section class="card"><h2>Importar comprovante</h2><p class="muted">Cole o texto do e-mail, comprovante digital ou papel. O app procura DATA e HORA e adiciona a marcação ao dia correto.</p><label>Texto do comprovante</label><textarea id="rawImport" rows="5" placeholder="Ex.: DATA: 30/04/2026 HORA: 21:23"></textarea><button class="secondary full" id="parseText">Ler DATA e HORA</button><label>Imagem do comprovante</label><input id="proofImage" class="file-input-hidden" type="file" accept="image/*"><label for="proofImage" class="file-picker"><div class="file-picker-copy"><span class="file-picker-title">Selecionar imagem</span><span class="file-picker-sub">Print ou foto do comprovante</span></div><span class="file-picker-icon">↑</span></label><div id="proofImageSelected" class="file-selected hidden"><div class="file-selected-copy"><span class="file-selected-label">Arquivo selecionado</span><span id="proofImageName" class="file-selected-name"></span></div><label for="proofImage" class="file-change-btn">Trocar arquivo</label></div><p class="muted">A leitura de imagem/OCR será ligada na versão Firebase com processamento em nuvem.</p></section>
    <section class="card hidden" id="foundBox"></section>
    <section class="card"><h2>Importar espelho oficial</h2><p class="muted">Leitor focado no PDF do espelho da Tribuna. Ele importa as batidas e usa o bloco oficial Banco de Horas como referência principal do saldo.</p><label>PDF do espelho</label><input id="pdfEspelho" class="file-input-hidden" type="file" accept="application/pdf"><label for="pdfEspelho" class="file-picker"><div class="file-picker-copy"><span class="file-picker-title">Selecionar PDF</span><span class="file-picker-sub">PDF do espelho oficial da Tribuna</span></div><span class="file-picker-icon">PDF</span></label><div id="pdfEspelhoSelected" class="file-selected hidden"><div class="file-selected-copy"><span class="file-selected-label">Arquivo selecionado</span><span id="pdfEspelhoName" class="file-selected-name"></span></div><label for="pdfEspelho" class="file-change-btn">Trocar arquivo</label></div><button class="secondary full" id="readPdfEspelho">Ler PDF do espelho</button><label>Ou cole o texto extraído do PDF</label><textarea id="rawEspelho" rows="6" placeholder="Cole aqui o texto do espelho mensal, se o leitor de PDF não carregar."></textarea><button class="secondary full" id="parseEspelhoTextBtn">Ler texto do espelho</button></section>
    <section class="card hidden" id="espelhoBox"></section>
    <section class="card subtle-card"><div class="empty-state compact"><strong>Importação inteligente</strong><span>Comprovantes adicionam batidas individuais. O espelho oficial também atualiza a referência do banco de horas do mês.</span></div></section>`;

    const bindSelectedFile = (inputEl, boxEl, nameEl) => {
      if(!inputEl || !boxEl || !nameEl) return;
      const refresh = () => {
        const file = inputEl.files?.[0];
        if(file){ nameEl.textContent = file.name; boxEl.classList.remove('hidden'); }
        else { nameEl.textContent = ''; boxEl.classList.add('hidden'); }
      };
      inputEl.addEventListener('change', refresh);
      refresh();
    };
    bindSelectedFile(document.getElementById('proofImage'), document.getElementById('proofImageSelected'), document.getElementById('proofImageName'));
    bindSelectedFile(document.getElementById('pdfEspelho'), document.getElementById('pdfEspelhoSelected'), document.getElementById('pdfEspelhoName'));

    const parseTextBtn = document.getElementById('parseText');
    const rawImportEl = document.getElementById('rawImport');
    const foundBoxEl = document.getElementById('foundBox');
    const espelhoBoxEl = document.getElementById('espelhoBox');
    const parseEspelhoTextBtnEl = document.getElementById('parseEspelhoTextBtn');
    const readPdfEspelhoBtn = document.getElementById('readPdfEspelho');
    const rawEspelhoEl = document.getElementById('rawEspelho');
    const pdfEspelhoEl = document.getElementById('pdfEspelho');

    if(parseTextBtn) parseTextBtn.onclick = () => {
      const text = rawImportEl?.value || '';
      const m1 = text.match(/DATA[:\s]*(\d{2}\/\d{2}\/\d{4})[\s\S]*?HORA[:\s]*(\d{2}:\d{2})/i) || text.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/);
      if(!m1){ foundBoxEl.className='card'; foundBoxEl.innerHTML='<h2>Nada encontrado</h2><p class="muted">Não consegui localizar DATA e HORA nesse texto.</p>'; return; }
      const [dd,mm,yyyy] = m1[1].split('/'); const foundDate = `${yyyy}-${mm}-${dd}`; const foundTime = m1[2];
      const targetDate = targetDateForImportedPunch(foundDate, foundTime);
      const extra = targetDate !== foundDate ? `<div class="row"><span>Salvar em</span><b>${brDate(targetDate)}</b></div><p class="muted">Marcação de madrugada vinculada à jornada aberta do dia anterior.</p>` : '';
      foundBoxEl.className='card result-card'; foundBoxEl.innerHTML = `<h2>Marcação encontrada</h2><div class="row"><span>Data do comprovante</span><b>${brDate(foundDate)}</b></div><div class="row"><span>Hora</span><b>${foundTime}</b></div>${extra}<button class="primary full" id="confirmImport">Adicionar marcação</button>`;
      foundBoxEl.scrollIntoView({behavior:'smooth', block:'nearest'});
      const confirmImportBtn = document.getElementById('confirmImport');
      if(confirmImportBtn) confirmImportBtn.onclick = () => { addPunch(targetDate,foundTime,'import_text'); tab='home'; render(); };
    };
    const handleParsedEspelho = (parsed) => {
      if(!parsed.rows.length){ espelhoBoxEl.className='card'; espelhoBoxEl.innerHTML='<h2>Nada encontrado</h2><p class="muted">Não encontrei linhas diárias no padrão do espelho.</p>'; return; }
      espelhoBoxEl.className='card result-card'; espelhoBoxEl.innerHTML = previewEspelhoImport(parsed);
      espelhoBoxEl.scrollIntoView({behavior:'smooth', block:'nearest'});
      const confirmPdfImportBtn = document.getElementById('confirmPdfImport');
      if(confirmPdfImportBtn) confirmPdfImportBtn.onclick = () => { applyEspelhoImport(parsed); showToast('Espelho importado com sucesso.', 'ok'); tab='month'; render(); };
    };
    if(parseEspelhoTextBtnEl) parseEspelhoTextBtnEl.onclick = () => handleParsedEspelho(parseEspelhoPontoText(rawEspelhoEl?.value || ''));
    if(readPdfEspelhoBtn) readPdfEspelhoBtn.onclick = async () => {
      const file = pdfEspelhoEl?.files?.[0];
      if(!file){ espelhoBoxEl.className='card'; espelhoBoxEl.innerHTML='<h2>Selecione um PDF</h2><p class="muted">Escolha o arquivo do espelho de ponto.</p>'; return; }
      espelhoBoxEl.className='card'; espelhoBoxEl.innerHTML='<h2>Lendo PDF</h2><p class="muted">Aguarde...</p>';
      try{
        const text = await extractPdfText(file);
        if(rawEspelhoEl) rawEspelhoEl.value = text;
        handleParsedEspelho(parseEspelhoPontoText(text));
      }catch(e){
        espelhoBoxEl.className='card'; espelhoBoxEl.innerHTML=`<h2>Não consegui ler o PDF localmente</h2><p class="muted">${e.message}</p><p class="muted">Como alternativa, abra o PDF, copie o texto e cole no campo de texto do espelho.</p>`;
      }
    };
  };

  document.querySelectorAll('#registerSegment button').forEach(btn => btn.onclick = () => { registerView = btn.dataset.view; renderRegister(); });
  if(registerView === 'manual') renderManual(); else renderImportView();
}


function renderMonth(){
  const n = nowSP();
  const currentValue = `${n.getFullYear()}-${pad(n.getMonth()+1)}`;
  const value = selectedMonthValue || currentValue;
  const [yearStr, monthStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const st = monthStats(year, month);
  const saldoFonte = st.officialMonth ? 'oficial' : 'estimado';
  const saldoFonteLongo = st.officialMonth ? 'Baseado no espelho oficial importado.' : 'Baseado apenas nas batidas e regras do app.';
  const rowsHtml = st.rows.map(r=>{
    const p = punchesOf(state.days[r.date] || {punches:r.punches||[]});
    const short = p.length ? `${displayPunchTime(p,0)} → ${displayPunchTime(p,p.length-1)}` : (r.holiday ? 'Feriado' : 'Sem registro');
    return `<div class="day-item"><div class="day-head"><span>${brDate(r.date)} · ${r.weekday}</span><div style="display:flex;gap:8px;align-items:center">${isPending(state.days[r.date]||{date:r.date,punches:r.punches||[]}) ? '<span class="alert">!</span>' : ''}<span class="bal ${r.saldo<0?'neg':r.saldo>0?'pos':''}">${fmtMin(r.saldo)}</span></div></div><div class="day-sub">${short}</div></div>`;
  }).join('');
  const bankBody = st.officialBank ?
    `<div class="kpi-strip two"><div class="kpi-mini"><span>Período</span><strong>${brDate(st.cycle.start)} a ${brDate(st.cycle.end)}</strong></div><div class="kpi-mini"><span>Último mês oficial</span><strong>${st.officialBank.key.split('-').reverse().join('/')}</strong></div><div class="kpi-mini"><span>Saldo oficial importado</span><strong class="${st.officialBank.saldoAtual<0?'danger':'ok'}">${fmtMin(st.officialBank.saldoAtual)}</strong></div><div class="kpi-mini"><span>Movimentação após oficial</span><strong class="${st.cycleSaldo<0?'danger':'ok'}">${fmtMin(st.cycleSaldo)}</strong></div><div class="kpi-mini"><span>Total do ciclo</span><strong class="${st.cycleTotal<0?'danger':'ok'}">${fmtMin(st.cycleTotal)}</strong></div></div>` :
    `<div class="kpi-strip two"><div class="kpi-mini"><span>Período</span><strong>${brDate(st.cycle.start)} a ${brDate(st.cycle.end)}</strong></div><div class="kpi-mini"><span>Saldo inicial</span><strong>${fmtMin(Number(state.profile.bankStart)||0)}</strong></div><div class="kpi-mini"><span>Débito do mês</span><strong class="danger">${fmtMin(st.monthDebit)}</strong></div><div class="kpi-mini"><span>Crédito do mês</span><strong class="ok">${fmtMin(st.monthCredit)}</strong></div><div class="kpi-mini"><span>Total do ciclo</span><strong class="${st.cycleTotal<0?'danger':'ok'}">${fmtMin(st.cycleTotal)}</strong></div></div>`;
  const emptyMonth = !st.rows.some(r => (r.punches||[]).length);
  const issues = st.issues.length ? `<ul class="issues">${st.issues.slice(0,6).map(i=>`<li>${i}</li>`).join('')}${st.issues.length>6?`<li>Mais ${st.issues.length-6} item(ns) no relatório.</li>`:''}</ul>` : '<p class="muted">Nenhuma inconsistência encontrada.</p>';
  screenEl.innerHTML = `
  <section class="card"><div class="section-head"><div><h2>Mês</h2><p class="muted">Resumo executivo do período selecionado.</p></div></div><label>Mês</label><input id="monthPicker" type="month" class="input" value="${value}"><div class="kpi-strip two" style="margin-top:14px"><div class="metric"><small>Trabalhado</small><b>${fmtMin(st.trab)}</b></div><div class="metric"><small>Saldo do mês ${saldoFonte}</small><b class="${st.saldo<0?'danger':'ok'}">${fmtMin(st.saldo)}</b></div><div class="metric"><small>Marcações pendentes</small><b class="warn">${st.pend}</b></div><div class="metric"><small>Previsto até hoje</small><b>${fmtMin(st.prev)}</b></div></div><p class="muted" style="margin-top:12px">${saldoFonteLongo}</p></section>
  <section class="card"><h2 class="section-title">Banco do ciclo</h2><p class="muted">${st.officialBank ? 'O espelho oficial mais recente foi usado como base do ciclo.' : 'Sem espelho oficial importado para este recorte. O ciclo está sendo estimado.'}</p>${bankBody}</section>
  <section class="card"><h2 class="section-title">Registro mensal</h2>${emptyMonth ? '<div class="empty-state"><strong>Sem marcações neste mês</strong><span>Use a aba Registrar para lançar batidas ou importar um espelho oficial.</span></div>' : rowsHtml}</section>
  <section class="card"><h2 class="section-title">Exportação</h2><div class="actions"><button class="secondary" id="csvBtn">CSV</button><button class="secondary" id="excelBtn">Excel</button></div><button class="primary full" id="copyReportBtn">Copiar relatório</button><button class="secondary full" id="sheetsBtn">Preparar Google Sheets</button><p class="muted">Na versão Firebase, o envio direto para Google Sheets será conectado à conta Google. Nesta versão, o botão prepara arquivo/relatório para colar ou importar.</p></section>
  <section class="card"><h2 class="section-title">Conferência inteligente</h2>${issues}</section>`;
  monthPicker.onchange = () => { selectedMonthValue = monthPicker.value; renderMonth(); };
  csvBtn.onclick = ()=>{ exportMonthCsv(year,month); showToast('CSV exportado.', 'ok'); };
  excelBtn.onclick = ()=>{ exportMonthExcel(year,month); showToast('Arquivo Excel exportado.', 'ok'); };
  copyReportBtn.onclick = async ()=>{
    const txt = reportText(year,month);
    try { await navigator.clipboard.writeText(txt); showToast('Relatório copiado.', 'ok'); }
    catch(e){ downloadBlob(`relatorio_${year}_${pad(month+1)}.txt`, txt, 'text/plain;charset=utf-8'); showToast('Relatório gerado em arquivo.', 'ok'); }
  };
  sheetsBtn.onclick = ()=>{
    exportMonthCsv(year,month);
    showToast('CSV gerado para importação no Google Sheets.', 'ok');
  };
}


function renderImport(){
  screenEl.innerHTML = `<section class="card"><h2>Importar marcação</h2><p class="muted">Prévia do fluxo para comprovante TOTVS/Carol, print de e-mail ou foto do papel. Na versão Firebase, a imagem vai para Storage e uma Cloud Function chama OCR em nuvem.</p><label>Colar texto do comprovante</label><textarea id="rawImport" rows="6" placeholder="Cole aqui o texto do e-mail/comprovante. Ex: DATA: 30/04/2026 HORA: 21:23"></textarea><button class="primary" style="width:100%;margin-top:12px" id="parseText">Ler DATA e HORA</button><label>Ou selecionar imagem</label><input class="input" type="file" accept="image/*"><p class="muted">Nesta prévia, imagem fica como fluxo visual. OCR real entra na v2 Firebase.</p></section><section class="card hidden" id="foundBox"></section>`;
  parseText.onclick = () => {
    const text = rawImport.value;
    const m1 = text.match(/DATA[:\s]*(\d{2}\/\d{2}\/\d{4})[\s\S]*?HORA[:\s]*(\d{2}:\d{2})/i) || text.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/);
    if(!m1){ foundBoxEl.className='card'; foundBoxEl.innerHTML='<h2>Nada encontrado</h2><p class="muted">Não consegui localizar DATA e HORA nesse texto.</p>'; return; }
    const [dd,mm,yyyy] = m1[1].split('/'); const date = `${yyyy}-${mm}-${dd}`; const time = m1[2];
    const targetDate = targetDateForImportedPunch(date, time);
    const extra = targetDate !== date ? `<div class="row"><span>Salvar em</span><b>${brDate(targetDate)}</b></div><p class="muted">Marcação de madrugada vinculada à jornada aberta do dia anterior.</p>` : '';
    foundBox.className='card'; foundBox.innerHTML = `<h2>Comprovante encontrado</h2><div class="row"><span>Data do comprovante</span><b>${brDate(date)}</b></div><div class="row"><span>Hora</span><b>${time}</b></div>${extra}<button class="primary" style="width:100%;margin-top:12px" id="confirmImport">Confirmar marcação</button>`;
    confirmImport.onclick = () => { addPunch(targetDate,time,'import_text'); tab='home'; render(); };
  };
}
function renderProfileScreen(){
  const currentModel = state.profile?.model || 'tribuna_hub_prog';
  const currentCity = state.profile?.city || (MODELS[currentModel]?.city || 'Santos');
  const currentBank = fmtMin(Number(state.profile?.bankStart) || 0);

  screenEl.innerHTML = `<section class="card"><div class="profile-card"><div class="profile-photo">${userPhotoHtml('large')}</div><div><h2 style="margin:0">Perfil</h2><p class="muted" style="margin:4px 0 0">${state.user?.name || 'Usuário Google'}<br>${state.user?.email || ''}</p><p class="muted" style="margin:6px 0 0">Versão ${APP_VERSION}</p></div></div></section>
  <section class="card"><h2 class="section-title">Conta</h2><div class="row"><span>Sincronização</span><b class="${syncStatusClass()}">${syncStatusLabel()}</b></div><button class="secondary full" id="syncNow">Enviar para a nuvem</button><button class="secondary full" id="pullCloud">Baixar da nuvem</button><button class="secondary full" id="disconnectGoogle">Desconectar conta Google</button></section>
  <section class="card"><h2 class="section-title">Jornada</h2><label>Modelo</label><select id="cfgModel">${Object.entries(MODELS).map(([k,m])=>`<option value="${k}" ${currentModel===k?'selected':''}>${m.title}</option>`).join('')}</select><label>Cidade</label><select id="cfgCity"><option ${currentCity==='Santos'?'selected':''}>Santos</option><option ${currentCity==='Praia Grande'?'selected':''}>Praia Grande</option></select><label>Saldo inicial do ciclo</label><input id="cfgBank" class="input" type="text" value="${currentBank}"><div id="scaleWrap"></div><button class="primary full" id="saveCfg">Salvar configurações</button></section>
  <section class="card"><h2 class="section-title">Dados</h2><p class="muted">Use o reset apenas se quiser limpar completamente os dados salvos neste navegador.</p><button class="secondary full" id="reset">Resetar dados locais</button></section>`;

  const cfgModelEl = document.getElementById('cfgModel');
  const cfgCityEl = document.getElementById('cfgCity');
  const cfgBankEl = document.getElementById('cfgBank');
  const scaleWrapEl = document.getElementById('scaleWrap');

  const drawScale = () => {
    if(!scaleWrapEl || !cfgModelEl) return;
    scaleWrapEl.innerHTML = cfgModelEl.value === 'tribuna_jornalismo'
      ? `<label>Data inicial da escala 12x2</label><input id="cfgScale" class="input" type="date" value="${state.profile.scaleStartDate || iso(nowSP())}">`
      : '';
  };
  drawScale();
  cfgModelEl.onchange = drawScale;

  document.getElementById('reset').onclick = () => {
    if(confirm('Limpar todos os dados locais?')){
      localStorage.removeItem(STORAGE_KEY);
      state = load();
      tab = 'home';
      render();
    }
  };

  document.getElementById('saveCfg').onclick = () => {
    state.profile.model = cfgModelEl.value;
    state.profile.city = cfgCityEl.value;
    state.profile.bankStart = parseSignedTime(cfgBankEl.value);
    if(cfgModelEl.value === 'tribuna_jornalismo'){
      const scaleInput = document.getElementById('cfgScale');
      if(scaleInput) state.profile.scaleStartDate = scaleInput.value;
    }
    save();
    showToast('Configurações salvas.', 'ok');
  };

  document.getElementById('syncNow').onclick = async () => {
    const ok = await pushStateToCloud(true);
    showToast(ok ? 'Dados enviados para a nuvem.' : 'Não foi possível confirmar o envio.', ok ? 'ok' : 'warn');
    renderProfileScreen();
  };

  document.getElementById('pullCloud').onclick = async () => {
    await pullStateFromCloud();
  };

  document.getElementById('disconnectGoogle').onclick = () => {
    if(confirm('Desconectar a conta Google deste navegador? Seus dados locais de ponto serão mantidos.')){
      logoutGoogle();
      showToast('Conta Google desconectada.', 'warn');
    }
  };
}


function renderConfig(){
  return renderProfileScreen();
}



const profileTopButton = document.getElementById('profileBtn');
if(profileTopButton){
  profileTopButton.onclick = goProfile;
}

const homeBrandButton = document.getElementById('homeBrand');
if(homeBrandButton){
  homeBrandButton.onclick = () => {
    if(state.profile){
      tab = 'home';
      render();
    }
  };
}

function bindBottomNav(){
  document.querySelectorAll('.bottom-nav button').forEach((button) => {
    button.onclick = (event) => {
      event.preventDefault();
      const nextTab = button.dataset.tab;
      if(nextTab === 'config' || nextTab === 'profile'){
        goProfile();
        return;
      }
      tab = nextTab;
      render();
    };
  });
}
bindBottomNav();

setInterval(() => {
  if(state.profile && tab === 'home'){
    const el = document.getElementById('clockNow');
    if(el) el.textContent = hm(nowSP());
  }
}, 1000);

initFirebaseAuth()
  .catch((err) => console.warn("Firebase init falhou:", err))
  .finally(() => render());
