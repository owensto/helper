(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 901px) and (pointer: fine)');
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('#site-nav');
  const menu = document.querySelector('[data-action="menu"]');
  const main = document.querySelector('main');
  const footer = document.querySelector('footer');
  let lenis, context, paused = false, filmUpdate = () => {};
  // Values remain readable before scripts run; observers only animate visible content.
  let revealCleanup = () => {};
  function revealContent(){
    const animations=new Set(), frames=new Set();
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      const el=entry.target;observer.unobserve(el);
      if(el.matches('[data-count]')){
        const end=Number(el.dataset.count),start=performance.now();
        const frame=now=>{const t=Math.min(1,(now-start)/580);el.textContent=Math.round(end*(1-Math.pow(1-t,3))).toLocaleString('en-US');if(t<1){const id=requestAnimationFrame(frame);frames.add(id);}};
        const id=requestAnimationFrame(frame);frames.add(id);
      }else{
        const a=el.animate([{opacity:.45,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,delay:Number(el.dataset.revealIndex||0)%4*40,easing:'cubic-bezier(.2,.7,.2,1)'});animations.add(a);a.onfinish=()=>animations.delete(a);
      }
    }),{threshold:.08});
    document.querySelectorAll('[data-count],.world-card,.trip-reading-chips,.month-strip,.atlas-destinations').forEach((el,i)=>{el.dataset.revealIndex=i;observer.observe(el);});
    const ambience=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('is-in-view',e.isIntersecting)),{threshold:.05});
    document.querySelectorAll('.outdoor-hero,.atlas-art').forEach(el=>ambience.observe(el));
    return()=>{observer.disconnect();ambience.disconnect();animations.forEach(a=>a.cancel());frames.forEach(cancelAnimationFrame);document.querySelectorAll('[data-count]').forEach(el=>el.textContent=Number(el.dataset.count).toLocaleString('en-US'));document.querySelectorAll('.is-in-view').forEach(el=>el.classList.remove('is-in-view'));};
  }
  // Lists update at once; a short reveal gives the new results a clear visual boundary.
  let listAnimations=[];
  document.addEventListener('castward:list-change',e=>{
    listAnimations.forEach(a=>a.cancel());listAnimations=[];
    if(reduced.matches||paused)return;
    e.detail.querySelectorAll('.world-card:not([hidden])').forEach((el,i)=>{
      if(i>11)return;
      listAnimations.push(el.animate([{opacity:.35,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,delay:i%4*25,easing:'ease-out'}));
    });
  });
  const sequence=document.querySelector('.water-sequence');
  const tripBand=document.querySelector('.trip-band-track');
  let sequenceTrigger,bandTrigger;
  sequence?.querySelectorAll('[data-water-step]').forEach(button=>button.addEventListener('click',()=>{
    if(!sequenceTrigger){const p=button.closest('.water-sequence')?.querySelectorAll('.water-story')[Number(button.dataset.waterStep)];p?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    const i=Number(button.dataset.waterStep),y=sequenceTrigger.start+(i/3)*(sequenceTrigger.end-sequenceTrigger.start);
    if(lenis)lenis.scrollTo(y,{duration:.45});else scrollTo(0,y);
  }));
  document.querySelectorAll('[data-trip-step]').forEach(button=>button.addEventListener('click',()=>{
    const step=Number(button.dataset.tripStep);
    if(bandTrigger){const y=Math.max(bandTrigger.start,Math.min(bandTrigger.end,scrollY+step*360));if(lenis)lenis.scrollTo(y,{duration:.35});else scrollTo(0,y);}
    else tripBand?.scrollBy({left:step*tripBand.clientWidth*.8,behavior:reduced.matches?'instant':'smooth'});
  }));
  function premiumDesktop(){
    const cleanup=[];
    const hero=document.querySelector('.outdoor-hero');
    if(hero){
      gsap.to(hero.querySelector('.scene-picture'),{yPercent:15,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:true}});
      gsap.to(hero.querySelector('.outdoor-hero-copy'),{y:65,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:true}});
    }
    if(false&&sequence){ // owner 2026-11-10: no scroll-locked sections
      const panels=[...sequence.querySelectorAll('.water-story')],buttons=[...sequence.querySelectorAll('[data-water-step]')];
      sequence.classList.add('sequence-pinned');
      gsap.set(panels.slice(1),{autoAlpha:0});
      let current=-1;
      const select=i=>{if(i===current)return;current=i;panels.forEach((p,j)=>{p.inert=i!==j;p.setAttribute('aria-hidden',String(i!==j));});buttons.forEach((b,j)=>b.setAttribute('aria-current',String(i===j)));};
      select(0);
      const timeline=gsap.timeline({onUpdate:()=>select(Math.min(3,Math.floor(timeline.time()+.1)))});
      panels.slice(1).forEach((p,i)=>{timeline.to(panels[i],{autoAlpha:0,duration:.3},i+.65).fromTo(p,{autoAlpha:0},{autoAlpha:1,duration:.3},i+.65).fromTo(p.querySelector('.story-image img'),{scale:1.065},{scale:1,duration:1,ease:'none'},i+.65);});
      sequenceTrigger=ScrollTrigger.create({trigger:sequence,start:'top 82px',end:'+=1800',pin:sequence.querySelector('.sequence-stage'),animation:timeline,scrub:.15,invalidateOnRefresh:true});
      cleanup.push(()=>{sequence.classList.remove('sequence-pinned');panels.forEach(p=>{p.inert=false;p.removeAttribute('aria-hidden');});sequenceTrigger=null;});
    }
    if(false&&tripBand){ // owner 2026-11-10: no scroll-locked sections
      const section=tripBand.closest('.trip-band');section.classList.add('band-pinned');
      bandTrigger=ScrollTrigger.create({trigger:section,start:'top 82px',end:()=>'+='+Math.max(500,(tripBand.scrollWidth-tripBand.clientWidth)*.65),pin:true,scrub:.18,invalidateOnRefresh:true,animation:gsap.to(tripBand,{x:()=>-(tripBand.scrollWidth-tripBand.clientWidth),ease:'none'})});
      const focus=e=>{const card=e.target.closest('.world-card');if(!card||!bandTrigger)return;const x=card.offsetLeft-tripBand.firstElementChild.offsetLeft;const ratio=Math.min(1,x/(tripBand.scrollWidth-tripBand.clientWidth));lenis?.scrollTo(bandTrigger.start+ratio*(bandTrigger.end-bandTrigger.start),{immediate:true});};
      tripBand.addEventListener('focusin',focus);cleanup.push(()=>{tripBand.removeEventListener('focusin',focus);section.classList.remove('band-pinned');bandTrigger=null;});
    }
    document.querySelectorAll('.atlas-routes path').forEach((path,i)=>gsap.fromTo(path,{strokeDasharray:1,strokeDashoffset:1},{strokeDashoffset:0,duration:1,ease:'none',scrollTrigger:{trigger:path.closest('.atlas-art'),start:`top ${85-i*8}%`,end:'bottom 65%',scrub:true}}));
    document.querySelectorAll('.guide-landscape,.guide-hero').forEach(el=>{
      gsap.fromTo(el,{clipPath:'inset(0 3% 6% 3%)'},{clipPath:'inset(0% 0% 0% 0%)',duration:.55,ease:'power2.out'});
      gsap.to(el.querySelector('img'),{yPercent:8,ease:'none',scrollTrigger:{trigger:el,start:'top top',end:'bottom top',scrub:true}});
    });
    document.querySelectorAll('.month-strip').forEach(el=>gsap.from(el.querySelectorAll('.documented'),{scaleY:.2,transformOrigin:'bottom',duration:.35,stagger:.025,scrollTrigger:{trigger:el,start:'top 94%',once:true}}));
    // Delegation keeps the 798-card library from allocating hundreds of listeners.
    let activeCard,cardFrame=0,lastEvent;
    const reset=()=>{if(activeCard){activeCard.style.removeProperty('transform');activeCard.style.removeProperty('--light-x');activeCard.style.removeProperty('--light-y');activeCard.classList.remove('card-lit');}activeCard=null;};
    const move=e=>{lastEvent=e;if(cardFrame)return;cardFrame=requestAnimationFrame(()=>{cardFrame=0;const card=lastEvent.target.closest('.world-card');if(card!==activeCard)reset();if(!card)return;activeCard=card;const r=card.getBoundingClientRect(),x=lastEvent.clientX-r.left,y=lastEvent.clientY-r.top;card.style.setProperty('--light-x',x+'px');card.style.setProperty('--light-y',y+'px');card.style.transform=`translate(${(x/r.width-.5)*5}px,${(y/r.height-.5)*4}px)`;card.classList.add('card-lit');});};
    document.addEventListener('pointermove',move);document.addEventListener('pointerleave',reset);cleanup.push(()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',reset);cancelAnimationFrame(cardFrame);reset();});
    return()=>cleanup.forEach(fn=>fn());
  }

  const motionButton = document.querySelector('.motion-toggle');
  const syncMenu = () => {
    const open = nav.classList.contains('open') && !desktop.matches;
    document.body.classList.toggle('menu-open', open);
    main.inert = open; if (footer) footer.inert = open;
    if (open) lenis?.stop(); else lenis?.start();
  };
  new MutationObserver(syncMenu).observe(nav, {attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !document.body.classList.contains('menu-open')) return;
    const links = [...header.querySelectorAll('a,button')].filter(el => el.getClientRects().length);
    const first = links[0], last = links.at(-1);
    if (e.shiftKey && document.activeElement === first) {e.preventDefault();last.focus();}
    else if (!e.shiftKey && document.activeElement === last) {e.preventDefault();first.focus();}
  });
  addEventListener('scroll', () => header.classList.toggle('is-small', scrollY > 80), {passive:true});
  desktop.addEventListener('change', () => {syncMenu();start();});
  const grain = document.createElement('div'); grain.className='grain';grain.ariaHidden='true';document.body.append(grain);
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    if (img.complete) return;
    img.classList.add('image-pending');
    img.addEventListener('load', () => {img.classList.remove('image-pending');img.classList.add('image-ready');}, {once:true});
    img.addEventListener('error', () => img.classList.remove('image-pending'), {once:true});
  });
  document.querySelectorAll('.story-copy').forEach((el,i) => {
    const index=document.createElement('span');index.className='story-index';index.textContent=`0${i+1} / WATER STUDIES`;el.querySelector('h2').before(index);
  });
  const films=document.querySelector('body[data-page="home"] .watch-section');
  let strip, count, playButton, autoPlay=true, filmTrigger, currentVideo;
  if(films){
    strip=films.querySelector('.reel-grid');const frame=document.createElement('div');frame.className='film-window';strip.before(frame);frame.append(strip);
    const controls=document.createElement('div');controls.className='film-controls';controls.innerHTML='<button type="button" data-film-step="-1" aria-label="Previous film">←</button><span class="film-count">01 / 13</span><button type="button" class="film-play" aria-pressed="false">Pause autoplay</button><button type="button" data-film-step="1" aria-label="Next film">→</button>';frame.before(controls);
    count=controls.querySelector('.film-count');playButton=controls.querySelector('.film-play');
    const videos=[...strip.querySelectorAll('video')];
    filmUpdate=()=>{
      let nearest=null,distance=Infinity;const center=innerWidth/2;
      videos.forEach(v=>{const r=v.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-center);if(r.top<innerHeight-80&&r.bottom>100&&d<distance){nearest=v;distance=d;}});
      videos.forEach(v=>{if(v!==nearest||!autoPlay||paused||reduced.matches||document.hidden){if(!v.paused)v.pause();}});
      if(nearest){count.textContent=String(videos.indexOf(nearest)+1).padStart(2,'0')+' / '+videos.length;}
      if(nearest&&nearest!==currentVideo&&autoPlay&&!paused&&!reduced.matches&&!document.hidden){const source=nearest.querySelector('source[data-src]');if(source){source.src=source.dataset.src;delete source.dataset.src;nearest.load();}nearest.muted=true;nearest.loop=true;nearest.play().catch(()=>{});}
      currentVideo=nearest;
    };
    playButton.onclick=()=>{autoPlay=!autoPlay;currentVideo=null;playButton.textContent=autoPlay?'Pause autoplay':'Play autoplay';playButton.setAttribute('aria-pressed',String(!autoPlay));filmUpdate();};
    controls.querySelectorAll('[data-film-step]').forEach(button=>button.onclick=()=>{
      const index=Math.max(0,Math.min(videos.length-1,(currentVideo?videos.indexOf(currentVideo):0)+Number(button.dataset.filmStep)));
      if(filmTrigger){const progress=index/(videos.length-1);const y=filmTrigger.start+progress*(filmTrigger.end-filmTrigger.start);lenis?lenis.scrollTo(y):scrollTo(0,y);}
      else strip.scrollTo({left:videos[index].closest('.reel-card').offsetLeft-strip.firstElementChild.offsetLeft,behavior:reduced.matches?'instant':'smooth'});
    });
    strip.addEventListener('focusin',e=>{if(!filmTrigger)return;const card=e.target.closest('.reel-card');if(!card)return;const i=[...strip.children].indexOf(card);lenis?.stop();scrollTo(0,filmTrigger.start+i/(videos.length-1)*(filmTrigger.end-filmTrigger.start));lenis?.start();});
    strip.addEventListener('scroll',filmUpdate,{passive:true});addEventListener('scroll',filmUpdate,{passive:true});document.addEventListener('visibilitychange',()=>{currentVideo=null;filmUpdate();});
  }
  const load = src => new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.append(s);});
  let libraries,startVersion=0;
  async function start(){
    const version=++startVersion;
    revealCleanup();revealCleanup=()=>{};listAnimations.forEach(a=>a.cancel());
    context?.revert();context=null;lenis?.destroy();lenis=null;filmTrigger=null;currentVideo=null;
    document.documentElement.classList.toggle('motion-paused',paused);
    document.documentElement.classList.toggle('mobile-motion',!desktop.matches&&!paused&&!reduced.matches);
    if(reduced.matches||paused){filmUpdate();if(playButton){playButton.textContent='Play autoplay';}return;}
    revealCleanup=revealContent();
    if(!desktop.matches){filmUpdate();return;}
    try{libraries ||= Promise.all([load('/assets/vendor/gsap-3.13.0.min.js'),load('/assets/vendor/ScrollTrigger-3.13.0.min.js'),load('/assets/vendor/lenis-1.3.11.min.js')]);await libraries;}catch{return;}
    if(version!==startVersion||reduced.matches||paused||!desktop.matches)return;
    gsap.registerPlugin(ScrollTrigger);
    context=gsap.matchMedia();
    context.add('(prefers-reduced-motion: no-preference)',()=>{
      gsap.from('.line-mask>span',{yPercent:110,duration:.55,stagger:.06,ease:'power3.out'});
      const hero=document.querySelector('.outdoor-hero img');
      if(hero)gsap.to(hero,{scale:1.055,duration:18,yoyo:true,repeat:-1,ease:'sine.inOut'});
      document.querySelectorAll('.outdoor-intro h2,.story-copy h2,.section-head h2,.region-band h2').forEach(title=>{
        if(!title.querySelector('.word-mask')){const text=title.innerText.replace(/\s+/g,' ').trim();title.setAttribute('aria-label',text);title.replaceChildren();text.split(' ').forEach((word,i)=>{if(i)title.append(' ');const mask=document.createElement('span');mask.className='word-mask';mask.ariaHidden='true';const inner=document.createElement('span');inner.textContent=word;mask.append(inner);title.append(mask);});}
        gsap.from(title.querySelectorAll('.word-mask>span'),{yPercent:105,duration:.5,stagger:.025,ease:'power3.out',scrollTrigger:{trigger:title,start:'top 94%',once:true}});
      });
      gsap.utils.toArray('.story-index').forEach(el=>gsap.from(el,{y:18,opacity:0,duration:.4,scrollTrigger:{trigger:el,start:'top 95%',once:true}}));
    });
    context.add('(min-width: 901px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',()=>{
      lenis=null; // owner 2026-11-10: native scroll, no smooth-scroll takeover
      const tick=time=>lenis?.raf(time*1000);gsap.ticker.add(tick);
      document.querySelectorAll('.water-story .story-image').forEach(el=>{
        if(el.closest('.water-sequence'))return;
        gsap.fromTo(el,{clipPath:'inset(8% 5% 8% 5%)'},{clipPath:'inset(0% 0% 0% 0%)',ease:'none',scrollTrigger:{trigger:el,start:'top 95%',end:'top 30%',scrub:true}});
        gsap.fromTo(el.querySelector('img'),{yPercent:-10,scale:1.025},{yPercent:0,scale:1,ease:'none',scrollTrigger:{trigger:el,start:'top bottom',end:'bottom top',scrub:true}});
      });
      const premiumCleanup=premiumDesktop();
      if(false&&films){films.classList.add('is-pinned');filmTrigger=ScrollTrigger.create({trigger:films,start:'top 82px',end:()=>'+='+(strip.scrollWidth-strip.clientWidth)*.6,pin:true,invalidateOnRefresh:true,animation:gsap.to(strip,{x:()=>-(strip.scrollWidth-strip.clientWidth),ease:'none'}),scrub:.5,onUpdate:filmUpdate});}
      const cursor=document.createElement('div');cursor.className='motion-cursor';document.body.append(cursor);
      const move=e=>{gsap.to(cursor,{x:e.clientX-14,y:e.clientY-14,duration:.22,overwrite:true});cursor.style.opacity='1';cursor.classList.toggle('active',!!e.target.closest('a,button'));};const hide=()=>cursor.style.opacity='0';document.addEventListener('pointermove',move);document.addEventListener('pointerleave',hide);
      const cleanups=[];
      document.querySelectorAll('.quiet-button,.film-controls button').forEach(el=>{const move=e=>{const r=el.getBoundingClientRect();gsap.to(el,{x:(e.clientX-r.left-r.width/2)*.12,y:(e.clientY-r.top-r.height/2)*.18,duration:.35});};const leave=()=>gsap.to(el,{x:0,y:0,duration:.3});el.addEventListener('pointermove',move);el.addEventListener('pointerleave',leave);cleanups.push(()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave);gsap.set(el,{clearProps:'transform'});});});
      document.querySelectorAll('.story-image').forEach(el=>{
        const canvas=document.createElement('canvas');canvas.className='ripple-canvas';canvas.ariaHidden='true';el.append(canvas);const ctx=canvas.getContext('2d');let frame=0,rings=[],last=0;
        const draw=t=>{ctx.clearRect(0,0,canvas.width,canvas.height);rings=rings.filter(r=>t-r.t<1200);rings.forEach(r=>{const age=(t-r.t)/1200;ctx.strokeStyle=`rgba(240,248,240,${(1-age)*.22})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(r.x,r.y,10+age*100,4+age*32,0,0,Math.PI*2);ctx.stroke();});frame=rings.length?requestAnimationFrame(draw):0;};
        const ripple=e=>{const t=performance.now();if(t-last<100)return;last=t;const r=el.getBoundingClientRect();if(canvas.width!==Math.round(r.width)){canvas.width=r.width;canvas.height=r.height;}rings.push({x:e.clientX-r.left,y:e.clientY-r.top,t});if(!frame)frame=requestAnimationFrame(draw);};el.addEventListener('pointermove',ripple);cleanups.push(()=>{el.removeEventListener('pointermove',ripple);cancelAnimationFrame(frame);canvas.remove();});
      });
      return()=>{premiumCleanup();gsap.ticker.remove(tick);lenis?.destroy();lenis=null;films?.classList.remove('is-pinned');filmTrigger=null;cursor.remove();document.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',hide);cleanups.forEach(fn=>fn());};
    });
    document.fonts.ready.then(()=>{ScrollTrigger.sort();ScrollTrigger.refresh();});filmUpdate();
  }
  motionButton?.addEventListener('click',()=>{paused=!paused;motionButton.textContent=paused?'Play motion':'Pause motion';motionButton.setAttribute('aria-pressed',String(paused));start();});
  reduced.addEventListener('change',start);
  // The hero is visible before optional libraries load; no loader delays the LCP.
  if(document.readyState==='complete')start();else addEventListener('load',start,{once:true});
})();
