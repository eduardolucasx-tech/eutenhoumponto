/* TIMEFLOW v1.7 theme controller. Business logic remains in app.js. */
(function(){
 'use strict';
 const root=document.documentElement;
 const key='euTenhoUmPontoTimeflowTheme';
 function read(){
  try {return localStorage.getItem(key);} catch {return null;}
 }
 const saved=read();
 root.dataset.theme=saved==='dark'?'dark':'light';
 function update(){
  const btn=document.getElementById('themeToggle');
  if(btn){
   const dark=root.dataset.theme==='dark';
   btn.setAttribute('aria-label',dark?'Ativar tema claro':'Ativar tema escuro');
   btn.setAttribute('title',dark?'Tema claro':'Tema escuro');
   btn.setAttribute('aria-pressed',String(dark));
  }
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=root.dataset.theme==='dark'?'#111b19':'#f6f5f0';
 }
 function init(){
  const button=document.getElementById('themeToggle');
  if(button)button.addEventListener('click',()=>{
    root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';
    try{localStorage.setItem(key,root.dataset.theme);}catch{}
    update();
  });
  update();
 }
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
