/* Y10: text only. Native readiness, disabled/hidden and handlers are untouched. */
(function(G){'use strict';
 function label(status,text){
  if(!status||typeof status.ready!=='boolean')return null;
  if(typeof status.error==='string'&&status.error.length)return 'Retry ATLAS D — load error';
  if(status.ready)return 'Board original ATLAS D';
  return /^Loading (?:original )?ATLAS D(?:\s|…|$)/.test(text)?text:'Loading original ATLAS D…';
 }
 function paint(button,status){
  if(!button)return false;
  const next=label(status,button.textContent);
  if(next===null||next===button.textContent)return false;
  button.textContent=next;return true;
 }
 G.AtlasDY10BoardingLabel={label,paint};
 if(typeof module!=='undefined')module.exports=G.AtlasDY10BoardingLabel;
 if(typeof window==='undefined')return;
 const iframe=document.getElementById('host');if(!iframe)return;
 let observer=null;
 function connect(){
  if(observer)observer.disconnect();
  const h=iframe.contentWindow,d=h.document;let button=null;
  if(!d.documentElement)return;
  function update(){
   if(!button){
    button=d.getElementById('ad-board');if(!button)return;
    observer.disconnect();
    observer.observe(button,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['disabled']});
   }
   paint(button,h.ATLAS_D_SIM);
  }
  observer=new MutationObserver(update);
  observer.observe(d.documentElement,{childList:true,subtree:true});update();
 }
 iframe.addEventListener('load',connect);connect();
})(typeof window==='undefined'?globalThis:window);
