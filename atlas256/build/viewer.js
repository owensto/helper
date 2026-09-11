import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas=document.querySelector('#scene'), status=document.querySelector('#status'), bar=document.querySelector('#progress');
const start=performance.now();
let renderer,scene,camera,controls,model,sea,ready=false,dirty=true,spin=false,viewName='hero';
const error=(err)=>{console.error(err);status.textContent='The 3D model could not load. Use Reload to try again.';document.querySelector('#retry').hidden=false;document.body.classList.add('failed');};
document.querySelector('#retry').onclick=()=>location.reload();
try {
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene=new THREE.Scene();scene.background=new THREE.Color('#c7dde3');scene.fog=new THREE.Fog('#c7dde3',240,700);
 camera=new THREE.PerspectiveCamera(38,1,.12,1500);
 controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.085;
 controls.minDistance=5;controls.maxDistance=260;controls.maxPolarAngle=Math.PI*.92;controls.target.set(0,7,0);
 controls.addEventListener('change',()=>{dirty=true;});
 controls.addEventListener('start',()=>{spin=false;document.querySelector('#rotate').setAttribute('aria-pressed','false');});
 const pm=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
 scene.environment=pm.fromScene(room,.08).texture;room.dispose();pm.dispose();
 const hemi=new THREE.HemisphereLight(0xecf8ff,0x4b606b,1.1);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xfff4df,3.3);sun.position.set(-48,85,55);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-60,right:60,top:45,bottom:-45,near:1,far:210});sun.shadow.bias=-.00012;sun.shadow.normalBias=.08;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xc4e7ff,.7);fill.position.set(20,30,-40);scene.add(fill);
 const pixels=new Uint8Array(256*256*4);for(let y=0;y<256;y++)for(let x=0;x<256;x++){let i=(y*256+x)*4;pixels[i]=128+Math.sin(x*.13+y*.05)*12;pixels[i+1]=128+Math.cos(y*.19+x*.03)*9;pixels[i+2]=252;pixels[i+3]=255;}
 const normal=new THREE.DataTexture(pixels,256,256);normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.repeat.set(70,70);normal.needsUpdate=true;
 sea=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),new THREE.MeshStandardMaterial({color:0x347682,roughness:.28,metalness:.18,normalMap:normal,normalScale:new THREE.Vector2(.18,.18)}));sea.rotation.x=-Math.PI/2;sea.receiveShadow=true;scene.add(sea);
 function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;}
 addEventListener('resize',resize);resize();
 const presets={
  hero:{direction:[.85,.4,1.1],center:[0,8,0],size:[81,30,15]},
  profile:{direction:[0,.09,1],center:[0,9,0],size:[81,29,15]},
  aft:{direction:[-1,.43,.7],center:[-27.5,8,0],size:[28,19,17]},
  bow:{direction:[1,.5,.75],center:[29,6,0],size:[23,15,15]},
  sundeck:{direction:[-.45,1,.72],center:[-1.5,18,0],size:[25,13,15]},
  pool:{direction:[-.85,.9,.65],center:[-29.7,5.7,0],size:[16,10,14]},
  hardware:{direction:[.7,.9,1],center:[34,6.5,0],size:[11,7,9]},
  underwater:{direction:[-1,.15,.8],center:[-28,-1,0],size:[27,11,21]}
 };
 function setView(name){const p=presets[name]||presets.hero;viewName=name;const target=new THREE.Vector3(...p.center),dir=new THREE.Vector3(...p.direction).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),dir).normalize(),up=new THREE.Vector3().crossVectors(dir,right).normalize();let d=0;const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){let c=new THREE.Vector3(x*p.size[0]/2,y*p.size[1]/2,z*p.size[2]/2);d=Math.max(d,Math.abs(c.dot(right))/(tan*camera.aspect)+c.dot(dir),Math.abs(c.dot(up))/tan+c.dot(dir));}d*=1.08;camera.position.copy(target).addScaledVector(dir,d);controls.target.copy(target);controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));if(name==='underwater'){sea.visible=false;document.querySelector('#dry').setAttribute('aria-pressed','true');}dirty=true;}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
 document.querySelector('#dry').onclick=()=>{sea.visible=!sea.visible;document.querySelector('#dry').setAttribute('aria-pressed',String(!sea.visible));dirty=true;};
 document.querySelector('#rotate').onclick=()=>{spin=!spin;document.querySelector('#rotate').setAttribute('aria-pressed',String(spin));dirty=true;};
 document.querySelector('#figures').onclick=()=>{if(!model)return;let visible;model.traverse(o=>{if(o.name.toLowerCase().includes('scalefigures')){o.visible=!o.visible;visible=o.visible;}});document.querySelector('#figures').setAttribute('aria-pressed',String(visible));dirty=true;};
 setView('hero');
 const loader=new GLTFLoader();
 const timeout=setTimeout(()=>{if(!ready)status.textContent='Still downloading the full model…';},15000);
 loader.load('./ATLAS_256_Exterior_Web.glb',(gltf)=>{
  model=gltf.scene;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material?.map)o.material.map.anisotropy=4;}});scene.add(model);
  ready=true;clearTimeout(timeout);dirty=true;renderer.render(scene,camera);renderer.shadowMap.autoUpdate=false;
  requestAnimationFrame(()=>{document.body.classList.add('ready');status.textContent='Full exterior loaded';bar.style.width='100%';window.ATLAS={ready:true,firstFrameMs:Math.round(performance.now()-start),triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,setView,scene,model,renderer,camera};});
 },(e)=>{if(e.total){const p=Math.round(e.loaded/e.total*100);bar.style.width=p+'%';status.textContent='Loading complete exterior · '+p+'%';}},error);
 let prev=performance.now();
 function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-prev)/1000,.05);prev=now;if(document.hidden)return;if(spin&&ready){const p=camera.position.clone().sub(controls.target);p.applyAxisAngle(new THREE.Vector3(0,1,0),dt*.055);camera.position.copy(controls.target).add(p);dirty=true;}controls.update();if(dirty){renderer.render(scene,camera);dirty=false;}}
 requestAnimationFrame(frame);
} catch(e){error(e);}
