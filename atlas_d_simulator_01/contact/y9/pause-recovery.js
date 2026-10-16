/* Y9 presentation only. Reads owner state; moves the existing native button.
 * No simulation step, automatic resume, input synthesis, or frame-loop hook. */
(function(G){'use strict';
 const STALL='Rendering stalled. Paused instead of pretending simulated time kept up.';
 const HIDDEN='Paused while this tab is hidden.';
 const COPY=Object.freeze({
  manual:['Paused by you','Motion is frozen. Resume when ready.'],
  stall:['Paused — rendering stalled','A frame gap exceeded 4 s. Resume when ready.'],
  visibility:['Paused — tab was hidden','Check your controls, then Resume when ready.'],
  unknown:['Simulation paused','Reason unavailable. Check controls, then Resume.']
 });
 function reduce(previous,current,nativeManualPause=false){
  const state={active:current?.active,paused:current?.paused,message:typeof current?.message==='string'?current.message:null};
  if(state.active!==true||state.paused!==true)return {...state,visible:false,reason:null,title:null,detail:null};
  let reason='unknown';
  if(nativeManualPause&&previous?.active===true&&previous.paused===false)reason='manual';
  else if(previous?.active===true&&previous.paused===true)reason=previous.reason||'unknown';
  // A retained last message is not a fresh causal reason. This deliberately
  // falls back to unavailable if an unwitnessed pause reuses stale text.
  if(!nativeManualPause&&state.message!==previous?.message){
   if(state.message===STALL)reason='stall';
   else if(state.message===HIDDEN)reason='visibility';
  }
  const [title,detail]=COPY[reason]||COPY.unknown;
  return {...state,visible:true,reason,title,detail};
 }
 G.AtlasDY9Pause={reduce,STALL,HIDDEN};
 if(typeof module!=='undefined')module.exports=G.AtlasDY9Pause;
})(typeof window!=='undefined'?window:globalThis);
if(typeof window!=='undefined')(()=>{'use strict';
 const out=window.Y9={ready:false,error:null,updates:0,latest:null};
 let previous=null;
 function connect(){try{
  if(window.Y4?.error)throw Error(window.Y4.error);
  if(!window.Y4?.ready)return setTimeout(connect,100);
  const h=document.getElementById('host').contentWindow,d=h.document,P=h.ATLAS_D_SIM;
  const root=d.getElementById('ad-root'),button=d.getElementById('ad-pause'),nativeHandler=button.onclick;
  if(!root||!button||typeof nativeHandler!=='function')throw Error('Native Pause/Resume unavailable');
  const marker=d.createComment('Y9 native Pause/Resume home');button.before(marker);
  const card=d.createElement('section');card.id='y9-pause-card';card.hidden=true;card.setAttribute('aria-label','Simulation pause and recovery');
  const text=d.createElement('div');text.className='y9-pause-copy';text.setAttribute('role','status');text.setAttribute('aria-live','polite');text.setAttribute('aria-atomic','true');
  const title=d.createElement('strong');title.id='y9-pause-title';const detail=d.createElement('span');detail.id='y9-pause-reason';text.append(title,detail);card.append(text);root.append(card);
  const originalDescription=button.getAttribute('aria-describedby');
  function read(){return {active:P.active,paused:P.state?.paused,message:P.state?.message};}
  function update(manualBefore=null){
   const current=read(),manual=manualBefore?.active===true&&manualBefore.paused===false&&current.active===true&&current.paused===true;
   const next=AtlasDY9Pause.reduce(manual?{...previous,...manualBefore}:previous,current,manual);
   if(next.visible){
    if(button.parentNode!==card)card.append(button);
    if(title.textContent!==next.title)title.textContent=next.title;
    if(detail.textContent!==next.detail)detail.textContent=next.detail;
    card.dataset.reason=next.reason;button.setAttribute('aria-describedby','y9-pause-title y9-pause-reason');
   }else{
    if(button.parentNode!==marker.parentNode)marker.parentNode.insertBefore(button,marker.nextSibling);
    if(originalDescription===null)button.removeAttribute('aria-describedby');else button.setAttribute('aria-describedby',originalDescription);
   }
   root.classList.toggle('y9-paused',next.visible);card.hidden=!next.visible;
   previous=next;out.latest={...next};out.updates++;
  }
  // Capture the actual pre-handler flag; run after the already-installed native
  // onclick. No new input handler is substituted for the original owner action.
  let manualBefore=null;
  button.addEventListener('click',e=>{manualBefore=e.isTrusted?read():null;},true);
  button.addEventListener('click',()=>{const before=manualBefore;manualBefore=null;update(before);});
  const observer=new MutationObserver(()=>update());
  observer.observe(button,{childList:true,characterData:true,subtree:true});
  observer.observe(d.getElementById('ad-notice'),{childList:true,characterData:true,subtree:true});
  observer.observe(root,{attributes:true,attributeFilter:['hidden']});
  out.inspect=()=>({ready:out.ready,latest:out.latest,nativeNodeSame:d.getElementById('ad-pause')===button,nativeHandlerSame:button.onclick===nativeHandler,nativeButtonCount:d.querySelectorAll('#ad-pause').length,paused:read().paused,active:P.active,buttonParent:button.parentNode?.id||button.parentNode?.className,cardHidden:card.hidden,updates:out.updates});
  update();out.ready=true;
 }catch(e){out.error=String(e);console.error('Y9 pause presentation:',e);}}
 connect();
})();
