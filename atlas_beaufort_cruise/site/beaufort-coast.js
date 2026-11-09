/* Render sourced shoreline at geographic coordinates; vertical scenery is illustrative. */
(()=>{'use strict';const Base=window.BayCoast;
class BeaufortCoast extends Base{
 constructor(T,scene,renderer,state){const before=new Set(scene.children);super(T,scene,renderer,state);this.original=scene.children.filter(o=>!before.has(o)&&o!==this.water&&o!==this.foamMesh);this.region=new T.Group();this.region.name='NOAA_BEAUFORT_SHORELINE';scene.add(this.region);this.region.visible=false;this.originPos=this.water.position.clone();
 const ocean=new T.Mesh(new T.PlaneGeometry(40000,40000),new T.MeshStandardMaterial({color:'#396F78',roughness:.45,metalness:.1}));ocean.rotation.x=-Math.PI/2;ocean.position.y=-1.5;scene.add(ocean);this.ocean=ocean;
 window.BayGeo.promise.then(g=>{if(g.ready)this.buildRegion(g)});
 }
 buildRegion(g){this.regionReady=true;}
 update(dt,mode){const geo=this.state.location==='beaufort'&&this.regionReady;this.original.forEach(o=>o.visible=!geo);this.region.visible=geo;this.ocean.visible=geo;super.update(dt,mode);if(geo){this.water.position.set(Math.round(this.state.x/200)*200,this.state.config?.tide||0,Math.round(this.state.z/200)*200);if(this.waterShader?.uniforms.uWorldOffset)this.waterShader.uniforms.uWorldOffset.value.set(this.water.position.x,this.water.position.z);}else{this.water.position.set(Math.round(this.state.x/200)*200,0,Math.round(this.state.z/200)*200);if(this.waterShader?.uniforms.uWorldOffset)this.waterShader.uniforms.uWorldOffset.value.set(this.water.position.x,this.water.position.z);}this.obstaclesActive=geo?[]:this.obstacles;}
}
window.BayCoast=BeaufortCoast;
})();
