'use strict';
// v2.2.0: rotas do cache offline (sw.js) com navegador simulado.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function makeEnv({online=true}={}){
  const store=new Map();
  const handlers={};
  const fetched=[];
  const key=r=>typeof r==='string'?new URL(r,'https://app.test/').href:r.url;
  const cache={
    put:async(r,res)=>{store.set(key(r),res);},
    addAll:async(list)=>{for(const u of list)store.set(key(u),{ok:true,body:'core:'+u,clone(){return this;}});}
  };
  const caches={
    open:async()=>cache,
    keys:async()=>['ponto-v2.3.1','ponto-v2.3.2','outro-cache'],
    delete:async()=>true,
    match:async(r,opts={})=>{
      let k=key(r);
      if(opts.ignoreSearch)k=k.split('?')[0];
      return store.get(k);
    }
  };
  const self={location:{origin:'https://app.test'},addEventListener:(t,h)=>{handlers[t]=h;},skipWaiting(){},clients:{claim(){}}};
  const fetch=async(r)=>{
    fetched.push(r.url);
    if(!online)throw new TypeError('offline');
    return {ok:true,type:'basic',body:'net:'+r.url,clone(){return this;}};
  };
  const ctx=vm.createContext({self,caches,fetch,URL,Promise});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8'),ctx);
  async function request(url,{mode='cors',method='GET'}={}){
    let responded=null;
    handlers.fetch({request:{url,mode,method},respondWith:p=>{responded=p;}});
    return responded?await responded:'passthrough';
  }
  return {handlers,store,fetched,request};
}

test('página vem da rede quando online (nunca fica presa em versão velha)',async()=>{
  const env=makeEnv();
  const res=await env.request('https://app.test/index.html',{mode:'navigate'});
  assert.equal(res.body,'net:https://app.test/index.html');
});

test('página abre do cache quando offline',async()=>{
  const env=makeEnv({online:false});
  await new Promise(r=>env.handlers.install({waitUntil:p=>p.then(r)}));
  const res=await env.request('https://app.test/index.html?demo=1',{mode:'navigate'});
  assert.equal(res.body,'core:index.html');
});

test('arquivos com versão na URL saem do cache sem ir à rede',async()=>{
  const env=makeEnv();
  await new Promise(r=>env.handlers.install({waitUntil:p=>p.then(r)}));
  const res=await env.request('https://app.test/app.js?v=2.3.2');
  assert.equal(res.body,'core:app.js?v=2.3.2');
  assert.equal(env.fetched.length,0);
});

test('Firestore e login não passam pelo cache',async()=>{
  const env=makeEnv();
  assert.equal(await env.request('https://firestore.googleapis.com/v1/projects/x'),'passthrough');
  assert.equal(await env.request('https://app.test/salvar',{method:'POST'}),'passthrough');
});

test('bibliotecas com versão fixa (Firebase, PDF.js) ficam em cache',async()=>{
  const env=makeEnv();
  const url='https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
  await env.request(url);
  await env.request(url);
  assert.equal(env.fetched.filter(u=>u===url).length,1);
});
