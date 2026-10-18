'use strict';
/* Owner-receiving proposal only. Never applied by the Sea13 preview/installer. */
const fs=require('node:fs'),crypto=require('node:crypto');
const BEFORE="nav.hidden=false;$('helm09-close').click();SEA11.setOption('docking',true);";
const AFTER="nav.hidden=false;$('helm09-close').click();root.classList.toggle('s14-tools-open',!$('helm09-panel').hidden);root.classList.toggle('s11-panel-open',!$('helm09-panel').hidden);if(!$('helm09-mapcard').hidden)SEA09.toggleMap();root.classList.toggle('s12-map-open',!$('helm09-mapcard').hidden);SEA11.setOption('docking',true);";
function patch(source,expected){if(typeof source!=='string'||typeof expected!=='string'||!/^[0-9a-f]{64}$/.test(expected))throw Error('An exact source hash is required.');if(crypto.createHash('sha256').update(source).digest('hex')!==expected)throw Error('Waterfront14 source changed; do not apply this proposal blindly.');if(source.split(BEFORE).length!==2)throw Error('Practice source anchor changed.');return source.replace(BEFORE,AFTER);}
module.exports={patch};
if(require.main===module){const[source,expected,out]=process.argv.slice(2);if(!source||!out)throw Error('Usage: node waterfront14-receiving-fix.cjs INPUT_JS SHA256 NEW_OUTPUT_JS');if(fs.existsSync(out))throw Error('Output must not exist; never overwrite owner source.');fs.writeFileSync(out,patch(fs.readFileSync(source,'utf8'),expected));}
