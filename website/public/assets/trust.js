(() => {
  'use strict';
  const id='G-4NYGJ2BF32', key='castward.analytics-consent.v1';
  let allowed=false, loaded=false, consentReturnFocus;
  const read=()=>{try {const v=JSON.parse(localStorage.getItem(key));return v&&Date.now()-v.at<15552000000?v.choice:null;} catch{return null;}};
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments);};
  gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  const banner=document.getElementById('cookie-banner');
  function event(name, props={}) { if(allowed) gtag('event',name,{...props,page_location:location.origin+location.pathname}); }
  window.castwardEvent=event;
  function pageEvent(){const kind=document.body.dataset.analyticsKind;if(kind==='planner')event('plan_start');if(kind==='trip'||kind==='destination')event('trip_view');if(['article','habitat-guide'].includes(kind))event('guide_view');}
  function apply(choice, persist=false) {
    if(navigator.globalPrivacyControl)choice='reject';
    allowed=choice==='accept';window['ga-disable-'+id]=!allowed;
    if(persist)try{localStorage.setItem(key,JSON.stringify({choice,at:Date.now()}));}catch{}
    banner.hidden=!!choice;
    if(allowed){
      gtag('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      if(!loaded){loaded=true;gtag('js',new Date());gtag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:15552000,page_location:location.origin+location.pathname,page_referrer:document.referrer?new URL(document.referrer).origin:''});const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.append(s);}
      event('page_view');pageEvent();
    } else {
      gtag('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      for(const cookie of document.cookie.split(';')){const name=cookie.split('=')[0].trim();if(name.startsWith('_ga'))for(const domain of ['',location.hostname,'.'+location.hostname,'.castward.app'])document.cookie=name+'=; Max-Age=0; Path=/'+(domain?'; Domain='+domain:'');}
      try{localStorage.removeItem('fishing-atlas.events.v1');localStorage.removeItem('fishing-atlas.attribution.v1');}catch{}
    }
  }
  apply(navigator.globalPrivacyControl?'reject':read());
  document.addEventListener('click',e=>{const b=e.target.closest('[data-consent]');if(b){apply(b.dataset.consent,true);consentReturnFocus?.focus();}if(e.target.closest('[data-cookie-settings]')){consentReturnFocus=e.target.closest('[data-cookie-settings]');banner.hidden=false;banner.querySelector('button').focus();}const a=e.target.closest('a[data-outbound]');if(a&&a.dataset.outbound==='operator')event('outbound_booking_click',{link_domain:new URL(a.href).hostname});});
  window.addEventListener('storage',e=>{if(e.key===key)apply(read());});
  window.addEventListener('atlas:event',e=>{if(e.detail.event==='atlas_search')event('search');if(e.detail.event==='plan_saved')event('plan_save');});
  let searchTimer;document.addEventListener('input',e=>{if(['trip-search','destination-search'].includes(e.target.id)){clearTimeout(searchTimer);searchTimer=setTimeout(()=>event('search'),800);}});
  document.addEventListener('play',e=>{if(e.target.tagName==='VIDEO'&&!e.target.autoplay)event('video_play',{video_title:e.target.getAttribute('aria-label')||'Castward film'});},true);
  const form=document.getElementById('contact-form');
  if(form){let startedAt=Date.now(), requestId=crypto.randomUUID();form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const status=document.getElementById('contact-status'),button=form.querySelector('[type=submit]');button.disabled=true;status.textContent='Send in progress…';try{const b=Object.fromEntries(new FormData(form));b.consent=form.elements.consent.checked;b.startedAt=startedAt;b.requestId=requestId;const r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'The message was not accepted.');status.textContent='Your message was accepted by our email provider. Thank you. This does not confirm a booking.';event('contact_submit',{topic:b.topic});form.reset();startedAt=Date.now();requestId=crypto.randomUUID();}catch(err){status.textContent=err.message||'The message was not sent. Please email contact@castward.app.';}finally{button.disabled=false;}});}
})();
