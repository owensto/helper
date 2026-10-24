import {WORLD} from '../standalone/world.mjs';
import {COLORS} from './protocol.mjs';
import {loadScript,loadOriginalBoat} from './assets.mjs';
export function makeScene(T){
  const scene=new T.Scene();scene.background=new T.Color('#9cbfce');scene.fog=new T.FogExp2('#9cbfce',.001);
  scene.add(new T.HemisphereLight('#e6faff','#405349',2.6));const sun=new T.DirectionalLight('#fff0d3',3);sun.position.set(-100,250,150);scene.add(sun);
  const mesh=(g,c)=>new T.Mesh(g,new T.MeshStandardMaterial({color:c,roughness:.65}));
  const water=mesh(new T.PlaneGeometry(12000,12000),'#175568');water.rotation.x=-Math.PI/2;water.position.y=-.2;scene.add(water);
  for(const i of WORLD.islands){const sand=mesh(new T.CylinderGeometry(i.radius*.95,i.radius,1,48),'#c8bc96');sand.position.set(i.x,0,i.z);scene.add(sand);const land=mesh(new T.SphereGeometry(1,24,16),'#5c7758');land.scale.set(i.radius*.92,14,i.radius*.92);land.position.set(i.x,0,i.z);scene.add(land);}
  for(const p of WORLD.route){const buoy=mesh(new T.CylinderGeometry(.7,1.4,3.4,12),'#eac879');buoy.position.set(p.x,1,p.z);scene.add(buoy);}
  const dock=mesh(new T.BoxGeometry(245,1,5),'#635746');dock.position.set(-140,0,303);scene.add(dock);return scene;
}
function drawLabels(canvas,T,camera,others,w,h){
  const c=canvas?.getContext('2d');if(!c)return;
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}c.clearRect(0,0,w,h);c.font='600 13px system-ui';c.textAlign='center';
  for(const p of others){const point=new T.Vector3(p.pose.p[0],p.pose.p[1]+4.5,p.pose.p[2]).project(camera);if(point.z< -1||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1)continue;
    const x=(point.x*.5+.5)*w,y=(-point.y*.5+.5)*h,label=`${(p.slot??0)+1} · ${p.name}${p.stale?' · delayed':''}`,width=Math.min(280,c.measureText(label).width+20);
    c.fillStyle='#082532dd';c.fillRect(x-width/2,y-17,width,25);c.fillStyle=COLORS[p.slot??0];c.fillText(label,x,y,260);
  }
}
export async function createGraphics(canvas,onStatus=()=>{}){
  onStatus('Loading 3D library');await loadScript(new URL('../standalone/public/assets/runtime.js',import.meta.url).href,{test:()=>!!globalThis.ATLASRuntime?.GLTFLoader});
  const T=globalThis.ATLASRuntime;let renderer,scene;
  try{
    onStatus('Creating WebGL renderer');renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'default'});renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
    scene=makeScene(T);const camera=new T.PerspectiveCamera(52,1,.2,10000),target=new T.Vector3();
    const gltf=await loadOriginalBoat(T,{onStatus}),template=gltf.scene;const boat=new T.Group();boat.add(template.clone(true));scene.add(boat);const remotes=new Map();let initialized=false;
    const labelCanvas=globalThis.document?.getElementById('labels');
    return {
      draw(pose,others,view,dt){
        const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
        if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
        boat.position.fromArray(pose.p);boat.quaternion.fromArray(pose.q);
        const ids=new Set();for(const other of others){ids.add(other.entityId);let b=remotes.get(other.entityId);if(!b){b=template.clone(true);scene.add(b);remotes.set(other.entityId,b);}b.position.fromArray(other.pose.p);b.quaternion.fromArray(other.pose.q);}
        for(const [id,b] of remotes)if(!ids.has(id)){scene.remove(b);remotes.delete(id);}
        const [x,,z]=pose.p,[qx,qy,qz,qw]=pose.q,hg=Math.atan2(2*(qx*qz-qw*qy),1-2*(qy*qy+qz*qz));
        if(view===0)target.set(x-Math.cos(hg)*22,12,z-Math.sin(hg)*22);else if(view===1)target.set(x-28,32,z+36);else target.set(x-Math.cos(hg)*1.8,2.7,z-Math.sin(hg)*1.8);
        if(!initialized){camera.position.copy(target);initialized=true;}else camera.position.lerp(target,1-Math.exp(-Math.min(dt,.1)*6));
        camera.lookAt(view===2?x+Math.cos(hg)*45:x+Math.cos(hg)*6,view===2?2.6:1,view===2?z+Math.sin(hg)*45:z+Math.sin(hg)*6);renderer.render(scene,camera);
        drawLabels(labelCanvas,T,camera,others,w,h);
      },
      dispose(){const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});for(const x of [...geometries,...materials,...textures])x.dispose();renderer.dispose();}
    };
  }catch(e){renderer?.dispose();throw e;}
}
export function drawChart(canvas,controller,others,routeIndex,selfSlot=0){
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('CANVAS_2D_UNAVAILABLE');
  const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight,dpr=Math.min(globalThis.devicePixelRatio||1,2);
  if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#113e51';ctx.fillRect(0,0,w,h);
  const zoom=Math.min(w,h)/420;ctx.save();ctx.translate(w/2,h/2);ctx.scale(zoom,zoom);ctx.translate(-controller.x,-controller.z);
  ctx.strokeStyle='#8ac4d617';ctx.lineWidth=1/zoom;
  for(let x=Math.floor((controller.x-w/zoom/2)/50)*50;x<controller.x+w/zoom/2;x+=50){ctx.beginPath();ctx.moveTo(x,controller.z-h/zoom);ctx.lineTo(x,controller.z+h/zoom);ctx.stroke();}
  for(let z=Math.floor((controller.z-h/zoom/2)/50)*50;z<controller.z+h/zoom/2;z+=50){ctx.beginPath();ctx.moveTo(controller.x-w/zoom,z);ctx.lineTo(controller.x+w/zoom,z);ctx.stroke();}
  for(const i of WORLD.islands){ctx.fillStyle='#c8bc96';ctx.beginPath();ctx.arc(i.x,i.z,i.radius,0,Math.PI*2);ctx.fill();ctx.fillStyle='#597356';ctx.beginPath();ctx.arc(i.x,i.z,i.radius*.91,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#736452';ctx.fillRect(-262,300,245,5);
  WORLD.route.forEach((p,i)=>{ctx.fillStyle=i===routeIndex?'#ffe1a0':'#9caeac';ctx.beginPath();ctx.arc(p.x,p.z,i===routeIndex?5:3,0,Math.PI*2);ctx.fill();});
  const draw=(p,q,name,color,stale=false)=>{const heading=Math.atan2(2*(q[0]*q[2]-q[3]*q[1]),1-2*(q[1]*q[1]+q[2]*q[2]));ctx.save();ctx.translate(p[0],p[2]);ctx.rotate(heading);ctx.globalAlpha=stale?.35:1;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(1,-2.4);ctx.lineTo(-5,-2.2);ctx.lineTo(-5,2.2);ctx.lineTo(1,2.4);ctx.closePath();ctx.fill();ctx.fillStyle='#294552';ctx.fillRect(-2,-1.4,3,2.8);ctx.restore();if(name){ctx.fillStyle=color;ctx.font=`${12/zoom}px system-ui`;ctx.textAlign='center';ctx.fillText(name,p[0],p[2]-12/zoom);}};
  for(const r of others)draw(r.pose.p,r.pose.q,`${r.slot+1} · ${r.name}${r.stale?' (delayed)':''}`,COLORS[r.slot??0],r.stale);
  const p=controller.pose();draw(p.p,p.q,`${selfSlot+1} · YOU`,COLORS[selfSlot]);ctx.restore();
}
