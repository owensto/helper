/* Generic articulated captain. No scanned person, no licensed character asset. */
(function(G){'use strict';G.Sea12Captain={build(T){
const group=new T.Group();group.name='SEA12_CAPTAIN';const limbs=[];
const shirt=new T.MeshStandardMaterial({color:'#dce7e2',roughness:.85}),vest=new T.MeshStandardMaterial({color:'#bd652d',roughness:.75}),pants=new T.MeshStandardMaterial({color:'#31434a',roughness:.91}),skin=new T.MeshStandardMaterial({color:'#bd9176',roughness:.83}),dark=new T.MeshStandardMaterial({color:'#172932',roughness:.58});
const mesh=(g,m,p,parent=group)=>{const o=new T.Mesh(g,m);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
const torso=mesh(new T.CapsuleGeometry(.18,.28,6,16),shirt,[0,.18,0]);torso.scale.set(.75,1,1.14);
for(const side of[-1,1]){const v=mesh(new T.CapsuleGeometry(.10,.21,6,14),vest,[.075,.21,side*.115]);v.scale.set(.76,1,.90);v.rotation.x=side*.08;mesh(new T.BoxGeometry(.03,.36,.028),dark,[.157,.2,side*.018]);mesh(new T.BoxGeometry(.20,.035,.40),dark,[.02,.03,0]);}
const head=new T.Group();head.name='CAPTAIN_HEAD';head.position.set(.0,.65,0);group.add(head);mesh(new T.CylinderGeometry(.065,.07,.10,12),skin,[0,-.17,0],head);const face=mesh(new T.SphereGeometry(.13,20,16),skin,[0,0,0],head);face.scale.set(.84,1.15,.92);mesh(new T.SphereGeometry(.029,10,8),skin,[.112,-.013,0],head);
mesh(new T.SphereGeometry(.137,18,12,0,Math.PI*2,0,Math.PI/2),dark,[0,.05,0],head);const brim=mesh(new T.SphereGeometry(.12,16,8),dark,[.085,.055,0],head);brim.scale.set(1,.075,1.13);
for(const side of[-1,1]){mesh(new T.SphereGeometry(.026,8,8),skin,[-.01,-.013,side*.119],head);const lens=mesh(new T.BoxGeometry(.022,.037,.070),dark,[.098,.035,side*.047],head);lens.rotation.y=side*.2;}
mesh(new T.BoxGeometry(.016,.012,.037),dark,[.112,.035,0],head);
for(const side of[-1,1]){const leg=new T.Group();leg.position.set(0,-.16,side*.105);group.add(leg);const thigh=mesh(new T.CapsuleGeometry(.077,.23,5,12),pants,[.15,-.04,0],leg);thigh.rotation.z=-Math.PI/2;mesh(new T.CapsuleGeometry(.067,.22,5,12),pants,[.31,-.24,0],leg);const shoe=mesh(new T.CapsuleGeometry(.062,.13,4,10),dark,[.37,-.42,0],leg);shoe.rotation.z=Math.PI/2;limbs.push(leg);}
const arms=[];for(const side of[-1,1]){const shoulder=new T.Vector3(.025,.32,side*.24),upper=mesh(new T.CapsuleGeometry(.068,.17,4,12),shirt,[0,0,0]),lower=mesh(new T.CapsuleGeometry(.052,.16,4,12),skin,[0,0,0]),hand=mesh(new T.SphereGeometry(.063,12,8),skin,[0,0,0]);hand.scale.set(.92,.78,.84);arms.push({shoulder,upper,lower,hand,side});limbs.push(upper,lower);}
function bone(obj,a,b,length){obj.position.copy(a).lerp(b,.5);obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());obj.scale.y=a.distanceTo(b)/length;}
const scratch=new T.Vector3();group.userData.animateCaptain=(A,s)=>{group.updateWorldMatrix(true,true);const wheel=A.model.getObjectByName('PLAY_STEERING'),lever=A.model.getObjectByName('PLAY_THROTTLE');const rudder=s.rudder||0;head.rotation.y=-rudder*.20;head.rotation.z=-Math.min(.055,(s.acceleration12||0)*.009);
for(const arm of arms){const a=arm.shoulder.clone(),angle=arm.side*.78-rudder*2.2;let target;
 if(wheel){target=wheel.localToWorld(new T.Vector3(0,Math.cos(angle)*.14,Math.sin(angle)*.14));group.worldToLocal(target);}else target=new T.Vector3(.45,.25,arm.side*.13);
 // Briefly move the right hand to the throttle while power changes.
 if(arm.side<0&&lever&&s.elapsed-(s.lastThrottleAt12||-99)<.55){target=lever.getWorldPosition(scratch).clone();group.worldToLocal(target);}
 const delta=target.clone().sub(a),distance=delta.length(),d=Math.max(.06,Math.min(.64,distance)),dir=delta.normalize();if(distance>.64)target.copy(a).addScaledVector(dir,.64);
 const along=(.33*.33-.32*.32+d*d)/(2*d),height=Math.sqrt(Math.max(0,.33*.33-along*along));const bend=new T.Vector3(-.2,-.7,arm.side*.45);bend.addScaledVector(dir,-bend.dot(dir)).normalize();const elbow=a.clone().addScaledVector(dir,along).addScaledVector(bend,height);bone(arm.upper,a,elbow,.306);bone(arm.lower,elbow,target,.264);arm.hand.position.copy(target);}
};return {group,limbs};}};
})(window);
