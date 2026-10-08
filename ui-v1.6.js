/* v1.6.0: visual theme controller, no business logic changed */
(function(){
 'use strict';
 const root=document.documentElement, key='euTenhoUmPontoThemeV16';
 function read(){try{return localStorage.getItem(key)}catch{return null}}
 const preferred=read();
 root.dataset.theme=(preferred==='light'||preferred==='dark')?preferred:'dark';
 function apply(){
  const btn=document.getElementById('themeToggle');
  if(btn){
   const light=root.dataset.theme==='light';
   btn.setAttribute('aria-label',light?'Ativar tema escuro':'Ativar tema claro');
   btn.setAttribute('title',light?'Tema escuro':'Tema claro');
   btn.setAttribute('aria-pressed',String(light));
  }
  const themeMeta=document.querySelector('meta[name="theme-color"]');
  if(themeMeta) themeMeta.content=root.dataset.theme==='light'?'#f4f7f5':'#10171c';
 }
 function init(){
  const btn=document.getElementById('themeToggle');
  if(btn)btn.addEventListener('click',()=>{
   root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';
   try{localStorage.setItem(key,root.dataset.theme)}catch{}
   apply();
  });
  apply();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
