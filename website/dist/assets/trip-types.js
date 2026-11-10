/* Optional local-name filters. All guide links remain available without JavaScript. */
(function(){
  'use strict';
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function setup(inputId,selector,countId,emptyId,label){
    const input=document.getElementById(inputId);if(!input)return;
    const rows=[...document.querySelectorAll(selector)];
    const update=()=>{
      const words=norm(input.value).trim().split(/\s+/).filter(Boolean);let count=0;
      for(const row of rows){const text=norm((row.dataset.search||'')+' '+row.textContent);row.hidden=!words.every(w=>text.includes(w));if(!row.hidden)count++;}
      document.getElementById(countId).textContent=`${count} ${label}`;
      document.getElementById(emptyId).hidden=count>0;
    };
    input.addEventListener('input',update);update();
  }
  setup('type-search','[data-type-card]','type-count','type-empty','trip types');
  setup('glossary-search','[data-glossary-term]','glossary-count','glossary-empty','local terms');
})();
