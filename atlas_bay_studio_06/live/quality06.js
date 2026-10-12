/* Bay-only presentation. Visual staging, not waterline predictions. */
(()=>{'use strict';const T=window.ATLASRuntime;let sky=null,environment=null,water=null,floor=null,mode='coastal',loaded=false;
 const wait=()=>{if(!window.FLEET?.scene){setTimeout(wait,100);return}init()};wait();
 function init(){const F=window.FLEET,S=F.scene,R=F.renderer;const originalEnvironment=S.environment;const clean=document.createElement('button');clean.id='cleanscene';clean.textContent='Model only';clean.setAttribute('aria-label','Toggle model-only view');document.body.append(clean);let isolated=false;function clearView(value){isolated=value;F.capture(value);clean.textContent=value?'Show controls':'Model only';F.pose(F.progress)}clean.onclick=()=>clearView(!isolated);addEventListener('keydown',e=>{if(e.key==='Escape'&&isolated)clearView(false)});
  const oldWater=S.children.find(o=>o.isMesh&&o.geometry?.parameters?.width===4500);
  const button=document.createElement('button');button.id='bayenvironment';button.textContent='Studio lighting';document.querySelector('.presentation').append(button);
  button.onclick=()=>{mode=mode==='coastal'?'studio':'coastal';button.textContent=mode==='coastal'?'Studio lighting':'Coastal light';F.pose(F.progress)};
  floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:'#c5cbd0',roughness:.94,metalness:0}));floor.rotation.x=-Math.PI/2;floor.position.y=-.77;floor.receiveShadow=true;floor.visible=false;S.add(floor);
  new T.TextureLoader().load('assets/waternormals.jpg',norm=>{norm.wrapS=norm.wrapT=T.RepeatWrapping;
   water=new T.Water(new T.PlaneGeometry(4500,4500),{textureWidth:window.innerWidth<900?384:768,textureHeight:window.innerWidth<900?384:768,waterNormals:norm,sunDirection:new T.Vector3(-.45,.78,.45).normalize(),sunColor:0xffffff,waterColor:0x409eac,distortionScale:.65,fog:false});
   water.material.fragmentShader=water.material.fragmentShader.replace('float rf0 = 0.3;', 'float rf0 = 0.035;').replace('vec3( 1.5, 1.0, 1.5 )','vec3( 0.7, 1.0, 0.7 )').replace('100.0, 2.0, 0.5','160.0, 0.7, 0.5').replace('( sunColor * diffuseLight * 0.3 + scatter )','( waterColor * (0.80 + diffuseLight * 0.28) + scatter * 0.10 )').replace('( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight )','( reflectionSample * 0.80 + reflectionSample * specularLight )');water.material.needsUpdate=true;water.rotation.x=-Math.PI/2;water.position.y=.008;water.material.uniforms.size.value=1.6;water.material.uniforms.time.value=18;water.visible=false;water.name='STUDIO06_REFLECTIVE_WATER';S.add(water);sync();F.pose(F.progress);
  },undefined,e=>console.warn('Water texture failed; original water retained',e));
  new T.RGBELoader().load('assets/coastal_sky.hdr',texture=>{texture.mapping=T.EquirectangularReflectionMapping;sky=texture;const pm=new T.PMREMGenerator(R);environment=pm.fromEquirectangular(texture).texture;pm.dispose();loaded=true;sync();F.pose(F.progress);},undefined,e=>console.warn('Sky failed; neutral environment retained',e));
  function sync(){const bay=F.id==='bay',inspect=F.inspect(),dry=document.querySelector('#dry').classList.contains('active');button.hidden=!bay;floor.visible=bay&&mode==='studio'&&!dry;
   if(!bay){if(water)water.visible=false;S.environment=originalEnvironment;S.environmentIntensity=.72;S.environmentRotation.set(0,0,0);S.backgroundIntensity=1;return}
   if(sky){S.background=(mode==='coastal'&&!dry)?sky:new T.Color('#bec7ce');S.backgroundIntensity=.88;S.backgroundBlurriness=0;S.environment=environment;S.environmentIntensity=.68;S.backgroundRotation.set(0,.55,0);S.environmentRotation.set(0,.55,0);}
   if(water){water.visible=mode==='coastal'&&!dry&&!inspect.cutaway;oldWater.visible=false;water.material.uniforms.sunColor.value.set(document.querySelector('#sunset').classList.contains('active')?'#ffddbc':'#fff1d9');}
   const lights=S.children.filter(o=>o.isLight),sun=lights.find(o=>o.isDirectionalLight&&o.castShadow),hemi=lights.find(o=>o.isHemisphereLight),fill=lights.find(o=>o.isDirectionalLight&&!o.castShadow);
   if(sun){sun.intensity=2.1;sun.position.set(-3.8,7.8,5.6);sun.target.position.set(0,0,0);sun.shadow.mapSize.set(window.innerWidth<900?1024:2048,window.innerWidth<900?1024:2048);sun.shadow.normalBias=.0015;sun.shadow.bias=-.000015;Object.assign(sun.shadow.camera,{left:-6.8,right:6.8,top:6.8,bottom:-6.8,near:.1,far:40});sun.shadow.camera.updateProjectionMatrix();if(water)water.material.uniforms.sunDirection.value.copy(sun.position).normalize()}
   if(hemi)hemi.intensity=.28;if(fill)fill.intensity=.32;R.toneMappingExposure=.95;R.shadowMap.needsUpdate=true;
  }
  window.BAY_QUALITY={sync,get ready(){return loaded&&!!water},get mode(){return mode},get water(){return water},studio(value){mode=value?'studio':'coastal';button.textContent=mode==='coastal'?'Studio lighting':'Coastal light';F.pose(F.progress)},render(){sync();R.render(S,F.camera)}};
  sync();F.pose(F.progress);
 }
})();
