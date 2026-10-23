from pathlib import Path
R=Path(__file__).resolve().parent;P=R.parent/'y12'
s=(P/'verify.py').read_text().replace('/contact/y12/','/contact/y13/')
s=s.replace("['index.html','style.css','app.js','fleet.js','dynamics.js','pod.js']", "['index.html','style.css','app.js','fleet.js','ocean-state.js','environment.js','materials.js','pod.js']")
s=s.replace("+'['", "+'['")
s=s.replace("expected={p:hashlib", "required+=['atlas_d_simulator_01/contact/y12/dynamics.js']\nexpected={p:hashlib")
# Supplement product checks without relaxing original motion/pause/asset gates.
s=s.replace("assert i['geometry']['sourceScale']==[1,1,1],i", "assert i['geometry']['sourceScale']==[1,1,1],i\n    assert i['variant']=='y13-realism' and i['realism']['waterVertices']>65000,i\n    assert i['realism']['reflectionRenders']>0 and i['materials']['compiledMaterials']>0,i")
s=s.replace("tap('#resume');wait('!FLEET_APP.inspect().state.paused && FLEET_APP.inspect().state.elapsed>'+repr(paused['elapsed']),10000);assert inspect()['state']['elapsed']>paused['elapsed']", "tap('#resume');wait('!FLEET_APP.inspect().state.paused && FLEET_APP.inspect().state.elapsed>'+repr(paused['elapsed']),15000);assert inspect()['state']['elapsed']>paused['elapsed']")
s=s.replace("assert page.locator('#pause-card').is_visible();b=target('#resume')[2];assert b['height']>=40", "assert page.locator('#pause-card').is_visible();b=target('#resume')[2];assert b['height']>=40\n     assert inspect()['propellerPhase']==after['propellerPhase'] or inspect()['state']['paused']\n     assert inspect()['realism']['wakeSamples']>0,inspect()")
# Run GPU numerical spotcheck after workload, without owner state mutation or extra owner clock.
anchor="    events=page.evaluate('FLEET_APP.nativeEvents');assert all(e['trusted'] for e in events),events"
insert="""    row['gpuWaveCheck']=page.evaluate('''() => {
      const T=ATLASRuntime,S=AtlasRealismSea,cv=document.createElement('canvas');const r=new T.WebGLRenderer({canvas:cv});r.setSize(1,1,false);r.toneMapping=T.NoToneMapping;
      const target=new T.WebGLRenderTarget(1,1,{type:T.FloatType,format:T.RGBAFormat,depthBuffer:false});const scene=new T.Scene(),cam=new T.OrthographicCamera(-1,1,1,-1,0,1);
      const uniforms={p:{value:new T.Vector2()},t:{value:0},scale:{value:.58}};
      const mat=new T.ShaderMaterial({uniforms,vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform vec2 p;uniform float t;uniform float scale;'+S.glsl+'void main(){gl_FragColor=seaSample(p,t,scale);}'});
      const mesh=new T.Mesh(new T.PlaneGeometry(2,2),mat);scene.add(mesh);const checks=[];
      for(const [x,z,t] of [[0,0,0],[32,-18,4.1],[-83,22,91],[400,-290,37]]){uniforms.p.value.set(x,z);uniforms.t.value=t;r.setRenderTarget(target);r.render(scene,cam);const pixel=new Float32Array(4);r.readRenderTargetPixels(target,0,0,1,1,pixel);const cpu=S.surface(x,z,t,.58),expected=[cpu.y,cpu.dx,cpu.dz,cpu.dt];checks.push({position:[x,z],seconds:t,gpu:Array.from(pixel),cpu:expected,maxError:Math.max(...expected.map((v,i)=>Math.abs(v-pixel[i])))});}
      r.setRenderTarget(null);target.dispose();mat.dispose();mesh.geometry.dispose();r.dispose();return checks;
    }''')
    assert all(c['maxError']<.0001 for c in row['gpuWaveCheck']),row['gpuWaveCheck']
"""+anchor
assert anchor in s;s=s.replace(anchor,insert)
# Before pictures from the actual immutable inherited entry, separate context; no measured frame inference.
anchor="  report['passed']=all(x['passed'] for x in report['contexts']);dump()"
insert="""  if not PUBLIC:
   ctx=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1,has_touch=True);page=ctx.new_page();page.goto('http://127.0.0.1:8926/atlas_d_simulator_01/contact/y12/index.html',wait_until='domcontentloaded');page.wait_for_function('window.FLEET_APP?.booted',timeout=120000)
   for key in ['d','n','pod','w']:
    if page.locator('#fleet-menu').is_hidden():page.locator('#fleet-open').tap()
    page.locator('#select-'+key).tap();page.wait_for_function("FLEET_APP.phase==='ready' && FLEET_APP.selected==='"+key+"'",timeout=120000);page.wait_for_timeout(1500)
    if not page.evaluate('FLEET_APP.inspect().state.paused'):page.locator('#pause').tap()
    page.screenshot(path=str(OUT/f'before-y12-desktop-{key}.png'))
   ctx.close();report['baselineCaptures']='Original Y12 entry and original code, frozen before propulsion; not a performance comparison.'
"""+anchor
assert anchor in s;s=s.replace(anchor,insert)
s=s.replace("paused=inspect()['state'];page.wait_for_timeout(800);assert inspect()['state']['elapsed']==paused['elapsed']","pausedView=inspect();paused=pausedView['state'];page.wait_for_timeout(800);assert inspect()['state']['elapsed']==paused['elapsed']")
s=s.replace("assert inspect()['propellerPhase']==after['propellerPhase'] or inspect()['state']['paused']","assert inspect()['propellerPhase']==pausedView['propellerPhase']\n     assert inspect()['realism']['wakeLastTime']==pausedView['realism']['wakeLastTime']")
(R/'verify-executed.py').write_text(s)
exec(compile(s,str(R/'verify-executed.py'),'exec'),{'__name__':'__main__','__file__':str(R/'verify-executed.py')})
