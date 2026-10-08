/* Eu tenho um ponto. | v1.5.0 | Marcação e merge sem perda de exclusões */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  if(root) root.PontoSync=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const array=x=>Array.isArray(x)?x:[];
  const uniq=x=>[...new Set(x)];
  const legacyId=(date,time)=>'legacy:'+date+':'+time;
  const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID
    ? 'p:'+crypto.randomUUID()
    : 'p:'+Date.now().toString(36)+':'+Math.random().toString(36).slice(2);
  const validTime=t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  function normalizeDay(original,date){
    if(!original)return null;
    const d={...original,date:original.date||date};
    d.deletedPunchIds=uniq(array(d.deletedPunchIds).filter(x=>typeof x==='string'));
    const deleted=new Set(d.deletedPunchIds);
    d.punches=array(d.punches).filter(p=>p&&validTime(p.time))
      .map(p=>({...p,id:p.id||legacyId(d.date,p.time)}))
      .filter(p=>!deleted.has(p.id));
    d.absenceRevision=Math.max(0,Number(d.absenceRevision)||0);
    return d;
  }
  function replacePunches(original,entries,source='typed'){
    const d=normalizeDay(original,original?.date);
    if(!d)throw Error('Dia não identificado.');
    const available=[...d.punches];
    const punches=array(entries).map((entry,index)=>{
      const data=typeof entry==='string'?{time:entry,source}:({...entry});
      if(!validTime(data.time))throw Error('Horário inválido: '+data.time);
      const at=available.findIndex(p=>p.time===data.time);
      const old=at>=0?available.splice(at,1)[0]:null;
      return {...old,...data,id:old?.id||uid(),createdAt:data.createdAt||old?.createdAt||new Date().toISOString(),slot:index};
    });
    if(new Set(punches.map(p=>p.time)).size!==punches.length)throw Error('Existem batidas duplicadas.');
    const note=d.absenceType&&d.note===absenceNames[d.absenceType]
      ? d.absenceBackup?.note||'' : d.note||'';
    return {...d,punches,note,deletedPunchIds:uniq([...d.deletedPunchIds,...available.map(p=>p.id)]),
      absenceType:null,absenceBackup:null,absenceRevision:d.absenceRevision+1,closed:false};
  }
  function addPunch(original,time,source='manual'){
    const d=normalizeDay(original,original?.date);
    if(!d||!validTime(time))throw Error('Data ou horário inválido.');
    if(d.punches.some(p=>p.time===time))throw Error('Marcação duplicada.');
    return {...d,punches:[...d.punches,{id:uid(),time,source,createdAt:new Date().toISOString()}]};
  }
  function removeLastPunch(original){
    const d=normalizeDay(original,original?.date);
    if(!d||!d.punches.length)return {day:d,removed:null};
    const removed=d.punches[d.punches.length-1];
    return {removed,day:{...d,punches:d.punches.slice(0,-1),
      deletedPunchIds:uniq([...d.deletedPunchIds,removed.id])}};
  }
  const absenceNames={banco:'Folga banco',atestado:'Atestado',falta:'Falta'};
  function setAbsence(original,type){
    const d=normalizeDay(original,original?.date);
    if(!d)throw Error('Dia não identificado.');
    if(!Object.prototype.hasOwnProperty.call(absenceNames,type))throw Error('Ausência desconhecida.');
    // A primeira alteração protege os dados existentes. Trocar o tipo mantém o backup original.
    const backup=d.absenceType ? d.absenceBackup||null : {
      punches:d.punches.map(p=>({...p})),
      note:d.note||'',
      closed:Boolean(d.closed)
    };
    const previousType=d.absenceType;
    const generatedLabel=previousType&&d.note===absenceNames[previousType];
    return {...d,punches:[],
      deletedPunchIds:uniq([...d.deletedPunchIds,...d.punches.map(p=>p.id)]),
      absenceBackup:backup,
      absenceType:type,absenceRevision:d.absenceRevision+1,closed:true,
      note:(!d.note||generatedLabel)?absenceNames[type]:d.note};
  }
  function clearAbsence(original){
    const d=normalizeDay(original,original?.date);
    if(!d)throw Error('Dia não identificado.');
    if(!d.absenceType)return d;
    const backup=d.absenceBackup;
    // Novos IDs são essenciais: os IDs anteriores permanecem como tombstones na nuvem.
    const punches=backup?.punches?array(backup.punches).map(p=>({...p,id:uid()})):[];
    const autoLabel=d.note===absenceNames[d.absenceType];
    return {...d,punches,
      absenceBackup:null,absenceType:null,absenceRevision:d.absenceRevision+1,
      closed:Boolean(backup?.closed),
      note:autoLabel?(backup?.note||''):(d.note||'')};
  }
  function mergeDay(localValue,cloudValue,date){
    const l=normalizeDay(localValue,date),c=normalizeDay(cloudValue,date);
    if(!l)return c;
    if(!c)return l;
    const deletedPunchIds=uniq([...c.deletedPunchIds,...l.deletedPunchIds]);
    const tombstones=new Set(deletedPunchIds);
    const merged=[];
    const contains=p=>merged.some(q=>q.id===p.id||q.time===p.time);
    for(const p of l.punches)if(!tombstones.has(p.id)&&!contains(p))merged.push(p);
    const cloud=c.punches.filter(p=>!tombstones.has(p.id));
    for(let i=0;i<cloud.length;i++){
      const p=cloud[i];if(contains(p))continue;
      let index=merged.length;
      for(let j=i-1;j>=0;j--){const at=merged.findIndex(q=>q.id===cloud[j].id||q.time===cloud[j].time);
        if(at>=0){index=at+1;break;}}
      if(index===merged.length)for(let j=i+1;j<cloud.length;j++){
        const at=merged.findIndex(q=>q.id===cloud[j].id||q.time===cloud[j].time);
        if(at>=0){index=at;break;}}
      merged.splice(index,0,p);
    }
    const absenceWinner=l.absenceRevision>c.absenceRevision?l
      :c.absenceRevision>l.absenceRevision?c
      :l.absenceRevision===0?(l.absenceType?l:c):l;
    const revisionConflict=l.absenceRevision!==c.absenceRevision;
    const absenceActive=Boolean(absenceWinner.absenceType);
    return {...c,...l,date:l.date||c.date||date,
      punches:absenceActive?[]:merged,
      deletedPunchIds:absenceActive?uniq([...deletedPunchIds,...merged.map(p=>p.id)]):deletedPunchIds,
      absenceType:absenceWinner.absenceType||null,
      absenceBackup:absenceWinner.absenceBackup||l.absenceBackup||c.absenceBackup||null,
      absenceRevision:Math.max(l.absenceRevision,c.absenceRevision),
      note:revisionConflict?(absenceWinner.note||''):(l.note||c.note||''),
      closed:absenceActive?true:revisionConflict?Boolean(absenceWinner.closed):Boolean(l.closed||c.closed)};
  }
  function mergeDays(localDays={},cloudDays={}){
    const result={};
    for(const date of new Set([...Object.keys(localDays||{}),...Object.keys(cloudDays||{})]))
      result[date]=mergeDay(localDays?.[date],cloudDays?.[date],date);
    return result;
  }
  return {normalizeDay,replacePunches,addPunch,removeLastPunch,setAbsence,clearAbsence,mergeDay,mergeDays};
});