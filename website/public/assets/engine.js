/* Pure planning rules. No API calls, inferred prices, or fabricated availability. */
(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.AtlasEngine=factory();}})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(n,min,max,fallback)=>Number.isFinite(Number(n))&&n!==''?Math.max(min,Math.min(max,Math.trunc(Number(n)))):fallback;
  function normalize(input,data){
    const i=input&&typeof input==='object'?input:{};
    const destination=data.destinations.find(d=>d.id===i.destination)||data.destinations[0];
    const type=(data.tripTypes||[]).find(t=>t.slug===i.tripType&&t.profileIds.includes(destination.id));
    const tripType=type?.slug||'';
    const style=type?type.plannerStyle:(destination.styles.includes(i.style)?i.style:destination.defaultStyle);
    let date=typeof i.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(i.date)?i.date:'';
    if(date){const dt=new Date(date+'T12:00:00Z');if(!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==date)date='';}
    const valid=new Set(data.gear.map(g=>g.id));const statuses={};const packed={};
    if(i.statuses&&typeof i.statuses==='object')for(const [k,v] of Object.entries(i.statuses))if(valid.has(k)&&['need','owned','provided'].includes(v))statuses[k]=v;
    if(i.packed&&typeof i.packed==='object')for(const [k,v] of Object.entries(i.packed))if(valid.has(k)&&v===true)packed[k]=true;
    return {version:1,destination:destination.id,tripType,style,date,days:clamp(i.days,1,30,7),party:clamp(i.party,1,12,2),laundry:i.laundry===true,essentialOnly:i.essentialOnly===true,statuses,packed};
  }
  function requirements(plan,data){
    const p=normalize(plan,data);const month=p.date?Number(p.date.slice(5,7)):0;
    const dest=data.destinations.find(d=>d.id===p.destination);
    // A climate profile is a packing starting point, not an inferred weather forecast.
    // Retain the original three profiles while allowing explicit world-trip defaults.
    const cool=dest.climate?['cool','cold','mixed'].includes(dest.climate):(p.destination==='yakutat'||p.destination==='bozeman');
    const warm=dest.climate?['warm','mixed'].includes(dest.climate):(p.destination==='florida-keys'||(p.destination==='bozeman'&&(!month||month>=5&&month<=9)));
    const wade=['river','guidedwade'].includes(p.style);const boat=['boat','flats','float','skiff','guidedboat','charter'].includes(p.style);
    return data.gear.filter(g=>!p.essentialOnly||g.essential)
      .filter(g=>!(dest.technicalGear&&['rod','terminal'].includes(g.id)))
      // Tropical flats use their guide-specific footwear decision, not default chest waders.
      .filter(g=>!(dest.tripProfile&&dest.climate==='warm'&&['waders','boots'].includes(g.id)))
      .filter(g=>g.scope==='tripType'?g.tripTypeId===p.tripType:g.scope==='trip'?g.tripId===dest.tripProfile&&!p.tripType:(g.scope==='all'||g.scope==='cool'&&cool||g.scope==='warm'&&warm||g.scope==='wade'&&wade||g.scope==='boat'&&boat))
      .map(g=>{
      let quantity=1;if(g.qty==='socks')quantity=p.laundry?Math.min(p.days+1,3):Math.min(p.days+1,8);if(g.qty==='layers')quantity=p.days<=2?1:p.laundry?2:Math.min(3,Math.ceil(p.days/3));
      return {...g,quantity,status:p.statuses[g.id]||'need',packed:p.packed[g.id]===true};
    });
  }
  function summarize(items){return {total:items.length,covered:items.filter(g=>g.status==='owned'||g.status==='provided').length,toShop:items.filter(g=>g.status==='need'&&!g.confirm&&!g.packed).length,toConfirm:items.filter(g=>g.status==='need'&&g.confirm).length,packed:items.filter(g=>g.packed).length};}
  function shoppingUrl(item,tag){if(!item.query)return null;const url=new URL('https://www.amazon.com/s');url.searchParams.set('k',item.query);if(typeof tag==='string'&&/^[A-Za-z0-9-]{3,60}$/.test(tag))url.searchParams.set('tag',tag);return url.href;}
  function attribution(params){const out={};for(const k of ['utm_source','utm_medium','utm_campaign','ref']){const v=params.get(k);if(v)out[k]=v.replace(/[\x00-\x1f<>]/g,'').slice(0,120);}return out;}
  return {normalize,requirements,summarize,shoppingUrl,attribution};
});
