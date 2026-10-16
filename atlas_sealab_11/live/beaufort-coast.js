/* Render sourced shoreline at geographic coordinates; vertical scenery is illustrative. */
(()=>{'use strict';const Base=window.BayCoast;
class BeaufortCoast extends Base{
 constructor(T,scene,renderer,state){const before=new Set(scene.children);super(T,scene,renderer,state);this.original=scene.children.filter(o=>!before.has(o)&&o!==this.water&&o!==this.foamMesh);this.region=new T.Group();this.region.name='NOAA_BEAUFORT_SHORELINE';scene.add(this.region);this.region.visible=false;this.originPos=this.water.position.clone();
 const ocean=new T.Mesh(new T.PlaneGeometry(40000,40000),new T.MeshStandardMaterial({color:'#396F78',roughness:.45,metalness:.1}));ocean.rotation.x=-Math.PI/2;ocean.position.y=-1.5;scene.add(ocean);this.ocean=ocean;
 window.BayGeo.promise.then(g=>{if(g.ready)this.buildRegion(g)});
 }
 buildRegion(g){const T=this.T,landMat=new T.MeshStandardMaterial({color:'#667A52',roughness:.94,side:T.DoubleSide}),bankMat=new T.MeshStandardMaterial({color:'#a39970',roughness:1});
 for(const rings of g.data.land){const shape=new T.Shape(rings[0].map(p=>new T.Vector2(p[0],-p[1])));for(const h of rings.slice(1))shape.holes.push(new T.Path(h.map(p=>new T.Vector2(p[0],-p[1]))));const geo=new T.ExtrudeGeometry(shape,{depth:2.2,steps:1,bevelEnabled:false,curveSegments:1});geo.rotateX(-Math.PI/2);const mesh=new T.Mesh(geo,[landMat,bankMat]);mesh.position.y=-.15;mesh.receiveShadow=true;this.region.add(mesh);}
 // Modest vegetation clusters above source land. Not scanned trees or exact buildings.
 const treePoints=[];for(let i=0;i<1500;i++){const x=g.data.bounds[0]+(g.data.bounds[2]-g.data.bounds[0])*((i*.61803398875)%1),z=g.data.bounds[1]+(g.data.bounds[3]-g.data.bounds[1])*((i*.41421356237)%1);if(g.isLand(x,z))treePoints.push([x,z]);}
 const crowns=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#3e624a',roughness:.98}),treePoints.length),o=new T.Object3D();treePoints.forEach((p,i)=>{o.position.set(p[0],3+i%3,p[1]);o.scale.set(7+i%7,2.3+i%4,7+i%6);o.updateMatrix();crowns.setMatrixAt(i,o.matrix)});this.region.add(crowns);this.regionReady=true;
 }
 update(dt,mode){const geo=this.state.location==='beaufort'&&this.regionReady;this.original.forEach(o=>o.visible=!geo);this.region.visible=geo;this.ocean.visible=geo;super.update(dt,mode);if(geo){this.water.position.set(Math.round(this.state.x/200)*200,this.state.config?.tide||0,Math.round(this.state.z/200)*200);if(this.waterShader?.uniforms.uWorldOffset)this.waterShader.uniforms.uWorldOffset.value.set(this.water.position.x,this.water.position.z);}else{this.water.position.set(Math.round(this.state.x/200)*200,0,Math.round(this.state.z/200)*200);if(this.waterShader?.uniforms.uWorldOffset)this.waterShader.uniforms.uWorldOffset.value.set(this.water.position.x,this.water.position.z);}this.obstaclesActive=geo?[]:this.obstacles;}
}
window.BayCoast=BeaufortCoast;
})();
