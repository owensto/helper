'use strict';
// Executes the actual UI module with actual pinned Three math and a synthetic DOM.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 const nodes=new Map(),listeners={};
 class El{
  constructor(id=''){this.id=id;this.events={};this.style={};this.dataset={};this.hidden=false;this.textContent='';this.attrs={};this.cls=new Set();this.classList={add:(...a)=>a.forEach(x=>this.cls.add(x)),remove:(...a)=>a.forEach(x=>this.cls.delete(x)),contains:x=>this.cls.has(x),toggle:(x,on)=>{on??=!this.cls.has(x);on?this.cls.add(x):this.cls.delete(x);}};}
  set innerHTML(h){for(const m of h.matchAll(/id="([^"]+)"/g))nodes.set(m[1],new El(m[1]));for(let i=0;i<3;i++){const n=new El('gun'+i);n.dataset.gun=String(i);nodes.set('gun'+i,n);}}
  appendChild(){} setAttribute(k,v){this.attrs[k]=v;} addEventListener(k,fn){(this.events[k]??=[]).push(fn);}getBoundingClientRect(){return {left:8,top:570,width:374,height:265};}setPointerCapture(){}getContext(){return {fillRect(){},fillText(){}};}remove(){}
 }
 for(const id of ['pause','resume','reset','views-toggle','chart-toggle','settings-toggle','hide-ui','brand'])nodes.set(id,new El(id));
 const body=new El('body'),document={body,hidden:false,createElement:()=>new El(),getElementById:id=>nodes.get(id),querySelector:s=>nodes.get(s==='.brand'?'brand':s.slice(1)),querySelectorAll:s=>s==='[data-gun]'?[nodes.get('gun0'),nodes.get('gun1'),nodes.get('gun2')]:[],addEventListener:(k,f)=>(listeners[k]??=[]).push(f)};
 const window={document,addEventListener:(k,f)=>(listeners[k]??=[]).push(f)};
 const context={window,document,console,URL,TextDecoder,TextEncoder,AbortController,innerWidth:390,innerHeight:844};vm.createContext(context);vm.runInContext(fs.readFileSync('./site/vendor/runtime.js','utf8'),context);vm.runInContext(fs.readFileSync('./range-core.js','utf8'),context);context.AtlasRangeCore=window.AtlasRangeCore;vm.runInContext(fs.readFileSync('./gunnery.js','utf8'),context);
 const T=window.ATLASRuntime,model=new T.Group(),source=new T.Group();source.name='EX_StaticDeckMount';model.userData.identity='atlas-w-original-surface-v1';model.add(source);const scene=new T.Scene();scene.add(model);const s={epoch:0,time:0,paused:false,heading:0};
 const api=window.AtlasGunnery.mount({T,model,scene,camera:new T.PerspectiveCamera(49,390/844,.1,10000),controls:{enabled:true},read:()=>({...s}),clearInputs(){},closePanels(){},view:()=> 'exterior',chooseView(){}});
 function event(id,type,data={}){const n=nodes.get(id);const e={button:0,pointerType:'touch',pointerId:7,clientX:100,clientY:100,currentTarget:n,preventDefault(){},...data};for(const f of n.events[type]||[])f(e);}
 const frame=t=>{s.time=t;api.frame({...s});};
 return {nodes,scene,model,s,api,frame,event,listeners};
}
test('native-like hold then pointercancel closes actual UI trigger',()=>{const f=fixture();f.nodes.get('guns-toggle').onclick();f.event('g-fire','pointerdown');f.frame(.05);assert(f.api.inspect().holding);f.event('g-fire','pointercancel');assert(!f.api.inspect().holding);const shots=f.api.inspect().shots;f.frame(1);assert.equal(f.api.inspect().shots,shots);});
test('actual UI stops on window blur',()=>{const f=fixture();f.nodes.get('guns-toggle').onclick();f.event('g-fire','pointerdown');f.listeners.blur.forEach(fn=>fn());assert(!f.api.inspect().holding);});
test('actual module aim determines hits',()=>{const f=fixture();f.nodes.get('guns-toggle').onclick();f.event('g-fire','pointerdown');f.event('g-fire','pointerup');f.frame(.8);assert.equal(f.api.inspect().hits,1);});
test('exit removes transient muzzle flash and recoil',()=>{const f=fixture();f.nodes.get('guns-toggle').onclick();f.event('g-fire','pointerdown');f.frame(.05);f.nodes.get('g-exit').onclick();const gun=f.model.getObjectByName('ARCADE_BOW');let visible=0;gun.traverse(o=>{if(o.isMesh&&o.material.type==='MeshBasicMaterial'&&o.visible)visible++;});assert.equal(visible,0);});
