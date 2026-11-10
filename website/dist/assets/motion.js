(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 901px) and (pointer: fine)');
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('#site-nav');
  const menu = document.querySelector('[data-action="menu"]');
  const main = document.querySelector('main');
  const footer = document.querySelector('footer');
  let lenis, context, paused = false, filmUpdate = () => {};
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
  let libraries;
  async function start(){
    context?.revert();context=null;lenis?.destroy();lenis=null;filmTrigger=null;currentVideo=null;
    document.documentElement.classList.toggle('motion-paused',paused);
    document.documentElement.classList.toggle('mobile-motion',!desktop.matches&&!paused&&!reduced.matches);
    if(reduced.matches||paused){filmUpdate();if(playButton){playButton.textContent='Play autoplay';}return;}
    if(!desktop.matches){filmUpdate();return;}
    try{libraries ||= Promise.all([load('/assets/vendor/gsap-3.13.0.min.js'),load('/assets/vendor/ScrollTrigger-3.13.0.min.js'),load('/assets/vendor/lenis-1.3.11.min.js')]);await libraries;}catch{return;}
    if(reduced.matches||paused)return;
    gsap.registerPlugin(ScrollTrigger);
    context=gsap.matchMedia();
    context.add('(prefers-reduced-motion: no-preference)',()=>{
      gsap.from('.line-mask>span',{yPercent:110,duration:1.1,stagger:.16,ease:'power3.out'});
      const hero=document.querySelector('.outdoor-hero img');
      if(hero)gsap.to(hero,{scale:1.055,duration:18,yoyo:true,repeat:-1,ease:'sine.inOut'});
      document.querySelectorAll('.outdoor-intro h2,.story-copy h2,.section-head h2,.region-band h2').forEach(title=>{
        if(!title.querySelector('.word-mask')){const text=title.textContent;title.setAttribute('aria-label',text);title.replaceChildren();text.split(' ').forEach((word,i)=>{if(i)title.append(' ');const mask=document.createElement('span');mask.className='word-mask';mask.ariaHidden='true';const inner=document.createElement('span');inner.textContent=word;mask.append(inner);title.append(mask);});}
        gsap.from(title.querySelectorAll('.word-mask>span'),{yPercent:105,duration:.8,stagger:.06,ease:'power3.out',scrollTrigger:{trigger:title,start:'top 94%',once:true}});
      });
      gsap.utils.toArray('.story-index').forEach(el=>gsap.from(el,{y:18,opacity:0,duration:.7,scrollTrigger:{trigger:el,start:'top 95%',once:true}}));
    });
    context.add('(min-width: 901px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',()=>{
      lenis=new Lenis({duration:1.05,anchors:true,smoothWheel:true});lenis.on('scroll',ScrollTrigger.update);
      const tick=time=>lenis?.raf(time*1000);gsap.ticker.add(tick);
      document.querySelectorAll('.story-image').forEach(el=>{
        gsap.fromTo(el,{clipPath:'inset(8% 5% 8% 5%)'},{clipPath:'inset(0% 0% 0% 0%)',ease:'none',scrollTrigger:{trigger:el,start:'top 95%',end:'top 30%',scrub:true}});
        gsap.fromTo(el.querySelector('img'),{yPercent:-10,scale:1.025},{yPercent:0,scale:1,ease:'none',scrollTrigger:{trigger:el,start:'top bottom',end:'bottom top',scrub:true}});
      });
      if(films){films.classList.add('is-pinned');filmTrigger=ScrollTrigger.create({trigger:films,start:'top 82px',end:()=>'+='+(strip.scrollWidth-strip.clientWidth),pin:true,invalidateOnRefresh:true,animation:gsap.to(strip,{x:()=>-(strip.scrollWidth-strip.clientWidth),ease:'none'}),scrub:.5,onUpdate:filmUpdate});}
      const cursor=document.createElement('div');cursor.className='motion-cursor';document.body.append(cursor);
      const move=e=>{gsap.to(cursor,{x:e.clientX-14,y:e.clientY-14,duration:.22,overwrite:true});cursor.style.opacity='1';cursor.classList.toggle('active',!!e.target.closest('a,button'));};const hide=()=>cursor.style.opacity='0';document.addEventListener('pointermove',move);document.addEventListener('pointerleave',hide);
      const cleanups=[];
      document.querySelectorAll('.quiet-button,.film-controls button').forEach(el=>{const move=e=>{const r=el.getBoundingClientRect();gsap.to(el,{x:(e.clientX-r.left-r.width/2)*.12,y:(e.clientY-r.top-r.height/2)*.18,duration:.35});};const leave=()=>gsap.to(el,{x:0,y:0,duration:.5});el.addEventListener('pointermove',move);el.addEventListener('pointerleave',leave);cleanups.push(()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave);gsap.set(el,{clearProps:'transform'});});});
      document.querySelectorAll('.story-image').forEach(el=>{
        const canvas=document.createElement('canvas');canvas.className='ripple-canvas';canvas.ariaHidden='true';el.append(canvas);const ctx=canvas.getContext('2d');let frame=0,rings=[],last=0;
        const draw=t=>{ctx.clearRect(0,0,canvas.width,canvas.height);rings=rings.filter(r=>t-r.t<1200);rings.forEach(r=>{const age=(t-r.t)/1200;ctx.strokeStyle=`rgba(240,248,240,${(1-age)*.22})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(r.x,r.y,10+age*100,4+age*32,0,0,Math.PI*2);ctx.stroke();});frame=rings.length?requestAnimationFrame(draw):0;};
        const ripple=e=>{const t=performance.now();if(t-last<100)return;last=t;const r=el.getBoundingClientRect();if(canvas.width!==Math.round(r.width)){canvas.width=r.width;canvas.height=r.height;}rings.push({x:e.clientX-r.left,y:e.clientY-r.top,t});if(!frame)frame=requestAnimationFrame(draw);};el.addEventListener('pointermove',ripple);cleanups.push(()=>{el.removeEventListener('pointermove',ripple);cancelAnimationFrame(frame);canvas.remove();});
      });
      return()=>{gsap.ticker.remove(tick);lenis?.destroy();lenis=null;films?.classList.remove('is-pinned');filmTrigger=null;cursor.remove();document.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',hide);cleanups.forEach(fn=>fn());};
    });
    document.fonts.ready.then(()=>ScrollTrigger.refresh());filmUpdate();
  }
  motionButton?.addEventListener('click',()=>{paused=!paused;motionButton.textContent=paused?'Play motion':'Pause motion';motionButton.setAttribute('aria-pressed',String(paused));start();});
  reduced.addEventListener('change',start);
  // The hero is visible before optional libraries load; no loader delays the LCP.
  if(document.readyState==='complete')start();else addEventListener('load',start,{once:true});
})();
