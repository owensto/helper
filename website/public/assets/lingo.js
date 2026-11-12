/* All terms stay in the document, including when JavaScript is unavailable. */
(() => {
  const root=document.querySelector('.lingo-page'); if(!root) return;
  const $=id=>document.getElementById(id), cards=[...root.querySelectorAll('[data-lingo-term]')];
  const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const params=new URLSearchParams(location.search);
  let region=params.get('region')||'', continent=params.get('continent')||'', letter=params.get('letter')||'';
  if(![...root.querySelectorAll('button[data-region]')].some(b=>b.dataset.region===region))region='';
  if(![...root.querySelectorAll('button[data-continent]')].some(b=>b.dataset.continent===continent))continent='';
  if(!/^[A-Z]$/.test(letter))letter='';
  $('lingo-search').value=params.get('q')||'';
  const data=cards.map(card=>({card,parent:card.parentElement,search:norm(card.dataset.search),regions:card.dataset.regions.split(' '),continents:JSON.parse(card.dataset.continents)}));
  function filter(write=true) {
    const query=norm($('lingo-search').value.trim()).split(/\s+/).filter(Boolean); let count=0;
    // A merged term appears under the selected region, while its anchor stays stable.
    data.forEach(d=>d.parent.append(d.card));
    if(region||continent)data.forEach(d=>{
      const id=region||d.regions.find(id=>document.getElementById(id).dataset.continent===continent);
      if(id&&d.regions.includes(id))document.getElementById(id).querySelector('.lingo-grid').append(d.card);
    });
    data.forEach(d=>{
      const show=query.every(q=>d.search.includes(q))&&(!region||d.regions.includes(region))&&(!continent||d.continents.includes(continent))&&(!letter||d.card.dataset.letter===letter);
      d.card.hidden=!show; count+=Number(show);
    });
    root.querySelectorAll('[data-lingo-region]').forEach(group=>{const count=[...group.querySelectorAll('[data-lingo-term]')].filter(c=>!c.hidden).length;group.hidden=!count;group.querySelector('.region-count').textContent=String(count).padStart(2,'0')+' TERMS';});
    root.querySelectorAll('button[data-region]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.region===region)));
    root.querySelectorAll('button[data-continent]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.continent===continent)));
    root.querySelectorAll('button[data-letter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.letter===letter)));
    $('lingo-count').textContent=`${count} ${count===1?'term':'terms'} / ${region?root.querySelector(`button[data-region="${region}"]`)?.textContent||'selected region':continent||'all waters'}${letter?' / '+letter:''}`;
    $('lingo-empty').hidden=count!==0;
    $('slams').hidden=Boolean(query.length||region||continent||letter);
    if(write){const url=new URL(location.href); for(const [k,v]of Object.entries({q:$('lingo-search').value.trim(),region,continent,letter}))v?url.searchParams.set(k,v):url.searchParams.delete(k); history.replaceState(null,'',url);}
  }
  function clear(){region=continent=letter='';$('lingo-search').value='';filter();}
  $('lingo-search').addEventListener('input',()=>filter());
  $('lingo-clear').onclick=()=>{clear();$('lingo-search').focus();};
  root.querySelectorAll('button[data-region]').forEach(b=>b.onclick=()=>{region=b.dataset.region;continent='';filter();});
  root.querySelectorAll('button[data-continent]').forEach(b=>b.onclick=()=>{continent=b.dataset.continent;region='';filter();});
  root.querySelectorAll('button[data-letter]').forEach(b=>b.onclick=()=>{letter=b.dataset.letter;filter();});
  function revealHash(){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const target=document.getElementById(id),card=target?.closest('[data-lingo-term]');if(card){clear();card.querySelector('details').open=true;requestAnimationFrame(()=>target.scrollIntoView({block:'center'}));}}
  window.addEventListener('hashchange',revealHash);
  // A same-hash click also needs to reveal a filtered-out destination.
  root.addEventListener('click',e=>{const link=e.target.closest('a[href^="#"]');if(link&&link.hash===location.hash)revealHash();});
  filter(false);revealHash();
})();
