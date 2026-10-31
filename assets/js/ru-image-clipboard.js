/* ReadUp image fields: Ctrl+V / file / drag-and-drop -> local PNG base64 */
(function(){
 'use strict';
 const defs={post:{value:'postThumb',zone:'ruPostPaste',img:'postThumbPrev',status:'postThumbStatus',file:'ruPostFile',remove:'ruPostRemove'},news:{value:'newsImageUrl',zone:'ruNewsPaste',img:'ruNewsPreview',status:'newsImgStatus',file:'ruNewsFile',remove:'ruNewsRemove'}};
 const $=id=>document.getElementById(id);
 function message(d,t,fail=false){let e=$(d.status);if(e){e.textContent=t;e.classList.toggle('ru-media-error',fail);}}
 function put(d,value,msg){const inp=$(d.value),img=$(d.img),zone=$(d.zone);if(inp)inp.value=value;if(img){img.hidden=!value;img.classList.toggle('hidden',!value);if(value)img.src=value;else img.removeAttribute('src');}zone?.classList.toggle('ru-media-zone--ready',!!value);if(msg)message(d,msg);}
 function dataToFile(data){const match=data.match(/^data:(image\/(?:png|jpeg|webp|gif|bmp));base64,([a-z\d+/=\s]+)$/i);if(!match)throw Error('Base64 không đúng định dạng ảnh.');const raw=atob(match[2].replace(/\s/g,''));if(raw.length>15*1024*1024)throw Error('Ảnh vượt 15 MB.');const a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return new File([a],'clipboard-image',{type:match[1].toLowerCase()});}
 function toPng(file,maxSide=1150){return new Promise((resolve,reject)=>{
   if(!file || !/^image\/(png|jpeg|webp|gif|bmp)$/i.test(file.type))return reject(Error('Hãy chọn ảnh PNG, JPG, WebP hoặc GIF.'));
   if(file.size>15*1024*1024)return reject(Error('Ảnh gốc quá lớn (tối đa 15 MB).'));
   const objectURL=URL.createObjectURL(file),img=new Image();
   img.onerror=()=>{URL.revokeObjectURL(objectURL);reject(Error('Không đọc được ảnh.'));};
   img.onload=()=>{URL.revokeObjectURL(objectURL);const longest=Math.max(img.naturalWidth,img.naturalHeight);if(!longest)return reject(Error('Ảnh không hợp lệ.'));
    let cap=Math.min(longest,maxSide);
    for(let n=0;n<8;n++){
      const factor=Math.min(1,cap/longest),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*factor));c.height=Math.max(1,Math.round(img.naturalHeight*factor));
      const ctx=c.getContext('2d');if(!ctx)return reject(Error('Trình duyệt không hỗ trợ Canvas.'));ctx.drawImage(img,0,0,c.width,c.height);
      const png=c.toDataURL('image/png');if(png.length<=1050000)return resolve(png);cap=Math.round(cap*.72);if(cap<170)break;
    }
    reject(Error('PNG quá lớn để lưu trong CSDL. Hãy cắt hoặc giảm kích thước ảnh.'));
   };
   img.src=objectURL;
 });}
 async function take(d,file){message(d,'Đang chuyển sang PNG base64...');try{put(d,await toPng(file,d===defs.news?1280:1120),'Đã nhận ảnh PNG base64, có thể lưu ngay.');}catch(e){message(d,e.message,true);}}
 async function takeText(d,text){text=(text||'').trim();if(!text)return;
   if(/^data:image\//i.test(text)){try{await take(d,dataToFile(text));}catch(e){message(d,e.message,true);}return;}
   if(/^https:\/\/[^\s<>"']+$/i.test(text)){
     message(d,'Đang chuyển ảnh từ đường dẫn sang PNG base64...');
     try { const response=await fetch(text,{mode:'cors'});if(!response.ok)throw Error('Không tải được ảnh.');
       const blob=await response.blob(); await take(d,new File([blob],'remote-image',{type:blob.type}));
     } catch(e) {message(d,'Trang ảnh chặn truy cập (CORS). Hãy nhấp chuột phải vào ảnh → Sao chép hình ảnh rồi Ctrl+V.',true);}
     return;
   }
   message(d,'Chỉ hỗ trợ ảnh, PNG base64 hoặc URL HTTPS.',true);
 }
 function bind(d){const zone=$(d.zone);if(!zone||!$(d.value))return;
    zone.addEventListener('beforeinput',e=>{if(e.inputType!=='insertFromPaste')e.preventDefault();});
    zone.addEventListener('paste',e=>{const item=Array.from(e.clipboardData?.items||[]).find(i=>i.kind==='file'&&i.type.startsWith('image/'));e.preventDefault();if(item)take(d,item.getAsFile());else takeText(d,e.clipboardData?.getData('text/plain'));});
    zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('ru-media-zone--drag');});
    zone.addEventListener('dragleave',()=>zone.classList.remove('ru-media-zone--drag'));
    zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('ru-media-zone--drag');const f=Array.from(e.dataTransfer?.files||[]).find(f=>f.type.startsWith('image/'));if(f)take(d,f);else takeText(d,e.dataTransfer?.getData('text/plain'));});
    zone.addEventListener('keydown',e=>{if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();put(d,'','Đã xóa ảnh.');}});
    $(d.file)?.addEventListener('change',e=>{if(e.target.files?.[0])take(d,e.target.files[0]);e.target.value='';});
    $(d.remove)?.addEventListener('click',()=>put(d,'','Đã xóa ảnh.'));
    put(d,$(d.value).value);
 }
 window.RUImageClipboard={toPng,fromDataUrl:(data,maxSide)=>toPng(dataToFile(data),maxSide||1000),setPost:value=>put(defs.post,value,'Đã cập nhật ảnh bài học.'),setNews:value=>put(defs.news,value,'Đã cập nhật ảnh thông báo.')};
 document.addEventListener('DOMContentLoaded',()=>Object.values(defs).forEach(bind));
})();
