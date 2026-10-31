/* Source: assets/js/ru-assets.js */
/* Lazy-load large optional editing/export libraries only when needed. */
(function (w) {
 'use strict';
 const urls={
  xlsx:'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  exceljs:'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
  mammoth:'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
 };
 const loaded={};
 function load(name){
   if(!urls[name])return Promise.reject(new Error('Không có thư viện '+name));
   const glob={xlsx:'XLSX',exceljs:'ExcelJS',mammoth:'mammoth'}[name];
   if(w[glob])return Promise.resolve(w[glob]);
   if(loaded[name])return loaded[name];
   loaded[name]=new Promise((resolve,reject)=>{
     const el=document.createElement('script');el.src=urls[name];el.async=true;
     el.onload=()=>w[glob]?resolve(w[glob]):reject(new Error('Không khởi tạo được '+name));
     el.onerror=()=>reject(new Error('Không tải được '+name));document.head.appendChild(el);
   }).catch(e=>{delete loaded[name];throw e;});
   return loaded[name];
 }
 w.RUAssets={load};
})(window);

;
/* Source: assets/js/pages/teacher.02.js */

    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  