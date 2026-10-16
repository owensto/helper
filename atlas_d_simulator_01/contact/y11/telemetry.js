/* Read-only presentation. Same renderer path and owner input handlers; no new clock. */
(()=>{'use strict';const frame=document.getElementById('host');let connected=false;
function connect(){if(connected)return;const h=frame.contentWindow;if(!h.ATLAS_D_SIM?.ready||!window.Y4?.ready)return setTimeout(connect,100);
 connected=true;const d=h.document,detail=d.createElement('div');detail.id='y11-physics-line';detail.style.cssText='font:10px system-ui;line-height:1.5;color:#d2e1e7;white-space:normal;padding:5px 10px;border-top:1px solid #446777';
 const dock=d.getElementById('y4-dock');dock.append(detail);
 const render=h.BAYPLAY.renderer.render;
 h.BAYPLAY.renderer.render=function(...args){const result=render.apply(this,args),p=h.ATLAS_D_SIM,s=p.state;
  if(p.active){const text=`Y11 FORCE MODEL · thrust ${(s.thrustN/1000).toFixed(0)} kN · drift ${s.swayMps.toFixed(2)} m/s · turn ${(s.yawRate*180/Math.PI).toFixed(2)}°/s · rudder ${(s.rudderAngleRad*180/Math.PI).toFixed(1)}°`;
   if(detail.textContent!==text)detail.textContent=text;}
  return result;};
 window.Y11_PUBLIC={version:'y11-3dof-1',physics:h.AtlasDY11.PARAMETERS,isolated:true,multiplayer:false,seaTrialValidated:false};
}frame.addEventListener('load',connect,{once:true});if(frame.contentDocument?.readyState==='complete')connect();})();
