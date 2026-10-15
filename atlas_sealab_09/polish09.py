"""Final near-boat water tessellation and control-state refinements."""
from pathlib import Path
r=Path(__file__).parent

def patch(name,old,new):
 p=r/name;s=p.read_text();assert s.count(old)==1,(name,old[:75],s.count(old));p.write_text(s.replace(old,new))
# Keep vertex count bounded while allocating 0.5 m cells near the boat rather
# than using 7.5 m cells (about an entire boat length) right under the camera.
old='coast.water.geometry.rotateX(-Math.PI/2);'
new=old+'''
 const wg=coast.water.geometry,wp=wg.attributes.position,wu=wg.attributes.uv;
 const warp=v=>{const n=Math.abs(v)/7.5;return Math.sign(v)*(n<=80?n*.5:40+860*Math.pow((n-80)/40,2));};
 for(let i=0;i<wp.count;i++){const x=warp(wp.getX(i)),z=warp(wp.getZ(i));wp.setX(i,x);wp.setZ(i,z);wu.setXY(i,x/1800+.5,.5-z/1800);}
 wp.needsUpdate=true;wu.needsUpdate=true;wg.computeBoundingSphere();report.nearWaterGridMetres=.5;report.waterVertices=wp.count;
'''
patch('site/water09.js',old,new)
patch('site/water09.js',"clock.value=S.elapsed;coast.ocean.visible=true;", """clock.value=S.elapsed;
 const wx=Math.round(S.x/2)*2,wz=Math.round(S.z/2)*2;coast.water.position.set(wx,tide.value,wz);
 if(coast.waterShader)coast.waterShader.uniforms.uWorldOffset.value.set(wx,wz);
 const normal=coast.water.material.normalMap;if(normal)normal.offset.set(S.elapsed*.0011+wx/1800*normal.repeat.x,S.elapsed*.0007-wz/1800*normal.repeat.y);
 coast.ocean.visible=true;""")
patch('site/helm09.js','previousImpact=-1,muted=false;', 'previousImpact=-1,muted=false,high=A.renderer.shadowMap.enabled;')
patch('site/helm09.js',";let high=false;$('helm09-detail').onclick", ";$('helm09-detail').textContent=high?'Detail: high':'Detail: smooth';$('helm09-detail').onclick")
patch('site/helm09.js',"$('helm09-sea').value=S.environment;", "$('helm09-clarity').value=SEA09_WATER.inspect().turbidity*100;$('helm09-sea').value=S.environment;")
patch('site/helm09.js',"yt=new YT.Player(el,{", """let fallback=document.getElementById('helm09-yt-external');if(!fallback){fallback=document.createElement('a');fallback.id='helm09-yt-external';fallback.target='_blank';fallback.rel='noopener noreferrer';fallback.textContent='Open this video on YouTube ↗';fallback.style.cssText='display:block;margin:0 12px 12px';$('helm09-youtube').append(fallback);}fallback.href='https://www.youtube.com/watch?v='+id;
 yt=new YT.Player(el,{""")
# Provider player must load visibly; report playback separately without faking it.
p=r/'verify09.py';s=p.read_text();old="r['youtubeFramePresent']=page.locator('#helm09-youtube iframe').count()>0;shot(page,'desktop_youtube.png');"
new="""r['youtubeFramePresent']=page.locator('#helm09-youtube iframe').count()>0
    if r['youtubeFramePresent']:
     frame=page.locator('#helm09-youtube iframe').bounding_box();assert frame['width']>=200 and frame['height']>=200;r['youtubePlayerSize']=frame
     try:
      page.frame_locator('#helm09-youtube iframe').locator('.ytp-large-play-button').click(timeout=6000);page.wait_for_timeout(2500)
     except Exception as ex:r['youtubePlayAttempt']=str(ex)[:250]
     r['youtubePlaybackStatus']=page.locator('#helm09-ytstatus').inner_text()
    shot(page,'desktop_youtube.png');"""
assert old in s;s=s.replace(old,new)
needle="   r['layout']=page.evaluate("
extra='''   if device=='desktop':
    page.evaluate('SEA09.relocate("basin",56,-40,0);BAYPLAY.setPaused(true);BAYPLAY.setQuality(false);SEA09.view("follow");BAYPLAY.refresh()');page.wait_for_timeout(800);shot(page,'desktop_shallows_high_detail.png')
    page.evaluate('SEA09.view("helm");BAYPLAY.refresh()');shot(page,'desktop_helm_high_detail.png');page.evaluate('BAYPLAY.setQuality(true)')
'''
assert needle in s;s=s.replace(needle,extra+needle)
s=s.replace("assert r['final']['water']['knownSamples']>0;", "assert r['final']['water']['knownSamples']>0;assert r['final']['water']['nearWaterGridMetres']==.5;")
p.write_text(s)
print('Prepared 0.5m near-boat water grid, persistent panel controls, honest provider playback result and detail screenshots')
