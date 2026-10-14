/* Small original, fictional coast. Shared analytic waves with the game body pose.
   No geographical positions, charted depths or tide predictions are used. */
(()=>{'use strict';
class BayCoast{
 constructor(T,scene,renderer,state){this.T=T;this.scene=scene;this.state=state;this.obstacles=[{x0:-27,x1:22,z0:-9.7,z1:-6}];this.buoys=[];this.ready=false;this.time=0;this.sky=null;this.sunset=false;this.foam=[];this.foamTimer=0;
 const mat=(c,r=.7)=>new T.MeshStandardMaterial({color:c,roughness:r});this.mats={wood:mat('#998474'),edge:mat('#415B62'),sand:mat('#D2C5A6'),green:mat('#496D57'),white:mat('#E0E9E2'),rubber:mat('#263F47')};
 const box=(p,sz,m)=>{let o=new T.Mesh(new T.BoxGeometry(...sz),m);o.position.set(...p);o.receiveShadow=true;scene.add(o);return o};
 box([-2.5,.56,-7.85],[49,.32,3.5],this.mats.wood);box([-2.5,.36,-7.85],[49,.09,3.48],this.mats.edge);
 const pts=[];for(let x=-27;x<22;x+=.46)pts.push(new T.Vector3(x,.73,-9.55),new T.Vector3(x,.73,-6.12));scene.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:'#667875',transparent:true,opacity:.45})));
 for(const x of [-24,-12,0,12,20]){box([x,-.25,-6.22],[.28,2.5,.28],this.mats.edge);box([x,.12,-5.97],[.42,.70,.30],this.mats.rubber);box([x,.86,-6.45],[.28,.045,.065],this.mats.edge);}
 // Two slim marina fingers provide a reachable berth, not an empty open plane.
 for(const x of [-27,22]){box([x,.56,-14.4],[2,.32,9.5],this.mats.wood);this.obstacles.push({x0:x-1,x1:x+1,z0:-19.15,z1:-9.6});}
 box([-17,2.0,-9.9],[.10,2.8,.10],this.mats.edge);box([-7,2.,-9.9],[.10,2.8,.10],this.mats.edge);box([-12,3.35,-10.9],[11,.13,3.6],this.mats.white);
 const label=document.createElement('canvas');label.width=512;label.height=96;const ctx=label.getContext('2d');ctx.fillStyle='#173F4B';ctx.fillRect(0,0,512,96);ctx.fillStyle='#DDEBE5';ctx.font='500 30px sans-serif';ctx.textAlign='center';ctx.fillText('ATLAS / COASTAL LAB',256,58);const tx=new T.CanvasTexture(label);tx.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(5,.9),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}));sign.position.set(-12,2.68,-9.92);sign.rotation.y=0;scene.add(sign);
 this.islands=[[205,62,49],[-115,95,43],[95,225,46]];this.islands.forEach((v,i)=>this.island(...v,i));
 this.gates=[[30,0],[86,22],[122,76],[61,100],[0,58]];
 this.gates.forEach(([x,z])=>{this.buoy(x,z-7,'#337B6E');this.buoy(x,z+7,'#BE6C4E')});
 const points=[[-14,-4.5],[-2,-4.5],[-2,-1],[-14,-1],[-14,-4.5]].map(p=>new T.Vector3(p[0],.03,p[1]));this.berth=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#E4EADC',transparent:true,opacity:.75}));scene.add(this.berth);
 const pm=new T.PMREMGenerator(renderer);new T.RGBELoader().load('assets/coastal_sky.hdr',tx=>{tx.mapping=T.EquirectangularReflectionMapping;this.sky=tx;scene.background=tx;scene.backgroundIntensity=.84;scene.environment=pm.fromEquirectangular(tx).texture;scene.environmentIntensity=.62;scene.backgroundRotation.set(0,.55,0);scene.environmentRotation.set(0,.55,0);pm.dispose();this.skyReady=true;},undefined,()=>{this.skyReady=true});
 this.makeWater();this.makeFoam();
 }
 makeWater(){const T=this.T;const g=new T.PlaneGeometry(1800,1800,160,160);g.rotateX(-Math.PI/2);const m=new T.MeshStandardMaterial({color:'#2D8797',roughness:.24,metalness:.24});m.onBeforeCompile=sh=>{
 sh.uniforms.uBayTime={value:0};sh.uniforms.uBayAmp={value:.016};this.waterShader=sh;
 const wave=`uniform float uBayTime;uniform float uBayAmp;varying vec3 vBayWorld;
 float sea(vec2 p){return uBayAmp*(sin(dot(p,vec2(.13,.07))-1.1*uBayTime)+.48*sin(dot(p,vec2(.05,-.18))-.92*uBayTime)+.16*sin(dot(p,vec2(.37,.21))-1.8*uBayTime));}`;
 sh.vertexShader=wave+'\n'+sh.vertexShader;sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n transformed.y+=sea(transformed.xz);vBayWorld=transformed;`);
 sh.fragmentShader='varying vec3 vBayWorld;\n'+sh.fragmentShader;
 sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n float d=min(distance(vBayWorld.xz,vec2(205.,62.))-38.,min(distance(vBayWorld.xz,vec2(-115.,95.))-33.,distance(vBayWorld.xz,vec2(95.,225.))-36.));float shal=1.-smoothstep(0.,45.,d);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.085,.37,.33),shal*.66);`);
 };
 this.water=new T.Mesh(g,m);this.water.name='P02 shared-wave water';this.water.receiveShadow=true;this.scene.add(this.water);
 new T.TextureLoader().load('assets/waternormals.jpg',tx=>{tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(370,370);m.normalMap=tx;m.normalScale.set(.30,.30);m.needsUpdate=true;this.ready=true},undefined,()=>{this.ready=true});
 }
 island(x,z,r,seed){const T=this.T;const N=90, rings=7,v=[],c=[],f=[];const rr=[0,.28,.53,.69,.8,1.,1.38],hh=[4.6,4.1,2.65,1.22,.18,-.20,-.8];
 for(let k=0;k<rings;k++)for(let i=0;i<N;i++){const a=i/N*Math.PI*2;const wiggle=1+.04*Math.sin(a*5+seed)+.06*Math.sin(a*3+seed);v.push(x+Math.cos(a)*r*rr[k]*wiggle,hh[k],z+Math.sin(a)*r*rr[k]*wiggle);const col=new T.Color(k<3?'#647B58':k<5?'#B9B392':'#C7CAB2');c.push(col.r,col.g,col.b);}
 for(let k=0;k<rings-1;k++)for(let i=0;i<N;i++){let a=k*N+i,b=k*N+(i+1)%N,c0=(k+1)*N+i,e=(k+1)*N+(i+1)%N;f.push(a,c0,b,b,c0,e)}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setAttribute('color',new T.Float32BufferAttribute(c,3));geo.setIndex(f);geo.computeVertexNormals();this.scene.add(new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.96,side:T.DoubleSide})));
 const count=22,trunks=new T.InstancedMesh(new T.CylinderGeometry(.16,.24,1,6),this.mats.wood,count),crowns=new T.InstancedMesh(new T.SphereGeometry(1,10,6),this.mats.green,count);const o=new T.Object3D();
 for(let j=0;j<count;j++){const a=j*2.399+seed,rad=r*(.18+.47*((j*17%23)/23)),xx=x+Math.cos(a)*rad,zz=z+Math.sin(a)*rad,h=3.5+(j%4)*.7;o.position.set(xx,4+h/2,zz);o.scale.set(1,h,1);o.rotation.set(0,a,.09);o.updateMatrix();trunks.setMatrixAt(j,o.matrix);o.position.y=4+h;o.scale.set(2.9,1.45,2.9);o.updateMatrix();crowns.setMatrixAt(j,o.matrix);}this.scene.add(trunks,crowns);
 }
 buoy(x,z,color){const T=this.T,g=new T.Group();const b=new T.Mesh(new T.CylinderGeometry(.42,.70,.86,12),new T.MeshStandardMaterial({color,roughness:.48}));b.position.y=.22;g.add(b);const pole=new T.Mesh(new T.CylinderGeometry(.035,.04,1.4,8),this.mats.edge);pole.position.y=1.1;g.add(pole);const top=new T.Mesh(new T.SphereGeometry(.13,10,6),this.mats.white);top.position.y=1.8;g.add(top);g.position.set(x,0,z);this.scene.add(g);this.buoys.push(g);}
 makeFoam(){const T=this.T,n=192;this.maxFoam=n;const geo=new T.PlaneGeometry(1,1);geo.rotateX(-Math.PI/2);const a=new T.InstancedBufferAttribute(new Float32Array(n),1);geo.setAttribute('aFade',a);this.foamFade=a;
 const m=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{},vertexShader:'attribute float aFade;varying vec2 vUv;varying float vFade;void main(){vUv=uv;vFade=aFade;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;varying float vFade;void main(){vec2 p=(vUv-.5)*2.;float a=pow(max(0.,1.-dot(p,p)),1.5);float n=.66+.34*sin(p.x*23.)*sin(p.y*37.);gl_FragColor=vec4(.88,.97,.95,a*n*vFade);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
 // Includes start on separate lines for portable WebGL compilation.
 m.fragmentShader=m.fragmentShader.replace(';#include',';\n#include');this.foamMesh=new T.InstancedMesh(geo,m,n);this.foamMesh.frustumCulled=false;this.scene.add(this.foamMesh);this.dummy=new T.Object3D();
 }
 update(dt,mode){const B=window.BayMotion,s=this.state,T=this.T,t=s.elapsed;this.time=t;if(this.waterShader){this.waterShader.uniforms.uBayTime.value=t;this.waterShader.uniforms.uBayAmp.value=B.PRESETS[s.environment].amp;}if(this.water.material.normalMap){this.water.material.normalMap.offset.set(t*.0011,t*.0007);}this.buoys.forEach((b,i)=>{b.position.y=B.surface(b.position.x,b.position.z,t,s.environment);b.rotation.x=Math.sin(t*1.1+i)*B.PRESETS[s.environment].amp*.6});
 this.foamTimer+=dt;if(mode==='drive'&&Math.abs(s.u)>.6&&this.foamTimer>.08){this.foamTimer=0;const c=Math.cos(s.heading),si=Math.sin(s.heading);for(const side of [-1,0,1]){this.foam.unshift({x:s.x-3.9*c-si*.45*side,z:s.z-3.9*si+c*.45*side,age:0,side,heading:s.heading,strength:Math.min(.60,.12+Math.abs(s.u)*.035)});}this.foam.length=Math.min(this.maxFoam,this.foam.length);}
 for(let i=0;i<this.maxFoam;i++){const p=this.foam[i],o=this.dummy;if(!p){o.scale.setScalar(0);o.updateMatrix();this.foamMesh.setMatrixAt(i,o.matrix);this.foamFade.array[i]=0;continue;}p.age+=dt;const spread=p.side*p.age*.38;p.x+=B.PRESETS[s.environment].current[0]*dt;p.z+=B.PRESETS[s.environment].current[1]*dt;const xx=p.x-Math.sin(p.heading)*spread,zz=p.z+Math.cos(p.heading)*spread;o.position.set(xx,B.surface(xx,zz,t,s.environment)+.035,zz);o.rotation.set(0,-p.heading,0);o.scale.set(.65+p.age*.38,1,.35+p.age*.28);o.updateMatrix();this.foamMesh.setMatrixAt(i,o.matrix);this.foamFade.array[i]=p.age<6?p.strength*Math.pow(1-p.age/6,1.7):0;}this.foamMesh.instanceMatrix.needsUpdate=true;this.foamFade.needsUpdate=true;
 }
 reset(){this.foam.length=0;this.foamTimer=0;}
}
window.BayCoast=BayCoast;
})();
