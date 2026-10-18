/* Separate review entry, not a redirect or replacement of the previously tested game.
   Only exact same-repository public13 HTML is loaded. Original assets resolve
   beneath its own directory; add-ons resolve beneath this revision's directory. */
(async()=>{'use strict';
const entry=new URL(location.href),base=new URL('../../atlas_sealab_13/live/',entry),addon=new URL('../',entry);
const status=document.getElementById('preview-status');
try{
 if(!window.crypto?.subtle)throw Error('Open the HTTPS online preview to verify its source.');
 const response=await fetch(new URL('index.html',base));if(!response.ok)throw Error('Boat files are unavailable ('+response.status+').');
 const bytes=await response.arrayBuffer();const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(digest!=='03180b68004151c89a5bddb9f2f25107d22647aa3983c9b7356599336eb42caa')throw Error('Base version mismatch. This preview will not load a different boat version.');
 let html=new TextDecoder().decode(bytes);if((html.match(/<head>/g)||[]).length!==1||(html.match(/<\/head>/g)||[]).length!==1)throw Error('Unexpected boat entry.');
 const scripts=['policy.js','motor-music.js','cruise-audio.js','easy-helm.js','beaufort13-adapter.js'];
 const styles=['easy-helm.css','motor-music.css','cruise-audio.css'];
 const tags=styles.map(n=>'<link rel="stylesheet" href="'+new URL(n,addon).href+'">').join('')+scripts.map(n=>'<script defer src="'+new URL(n,addon).href+'"><\/script>').join('');
 const waveTag='<script defer src="waves11.js"><\/script>';
 if(html.split(waveTag).length!==2)throw Error('Wave initialization order changed.');
 html=html.replace(waveTag,waveTag+'<script defer src="'+new URL('water-refinements.js',addon).href+'"><\/script>');
 html=html.replace('<head>','<head><base href="'+base.href+'">').replace('</head>',tags+'</head>');
 html=html.replace('ATLAS Sea Lab 13 · Beaufort River','ATLAS · Cruise Music & Water Preview').replace('Preparing Beaufort waterfront…','Preparing Cruise Music & Water preview…').replace('Engine off · controls ready in a moment','Review preview · browser validation pending · engine stays off');
 // document.open/write runs the unchanged page's ordered script initialization;
 // it is not script evaluation against an already running boat.
 document.open();document.write(html);document.close();
}catch(e){status.textContent=e.message;}
})();
