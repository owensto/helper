const {randomUUID} = require('node:crypto');
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({error:'Use POST.'}); }
  if (req.headers.origin && !['https://castward.app','https://www.castward.app'].includes(req.headers.origin)) return res.status(403).json({error:'Invalid origin.'});
  let b; try { b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { return res.status(400).json({error:'Invalid request.'}); }
  const topics=['trip question','guide or captain listing','partnership','press','other'];
  const age=Date.now()-Number(b?.startedAt);
  if (!b || b.website || !Number.isFinite(age) || age<3000 || age>86400000 || b.consent!==true ||
      typeof b.name!=='string' || !b.name.trim() || b.name.length>100 ||
      typeof b.email!=='string' || b.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) ||
      !topics.includes(b.topic) || typeof b.message!=='string' || b.message.trim().length<10 || b.message.length>5000)
    return res.status(400).json({error:'Check the fields and consent box. Wait at least three seconds before you send.'});
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return res.status(503).json({error:'Email is unavailable. Please email contact@castward.app.'});
  try {
    const response=await fetch('https://api.resend.com/emails', {method:'POST', signal:AbortSignal.timeout(12000), headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':typeof b.requestId==='string'&&/^[a-f0-9-]{36}$/.test(b.requestId)?b.requestId:randomUUID()}, body:JSON.stringify({from:process.env.EMAIL_FROM,to:['contact@mediaatl.as'],reply_to:b.email,subject:b.message.startsWith('Castward contact form test')?'Castward contact form test':`Castward contact: ${b.topic}`,text:`Name: ${b.name}\nEmail: ${b.email}\nTopic: ${b.topic}\n\n${b.message}\n\nContact data consent: accepted`})});
    const result=await response.json();
    if (!response.ok || !result.id) return res.status(502).json({error:'The email provider did not accept your message. Please try later or email contact@castward.app.'});
    return res.status(200).json({ok:true,id:result.id});
  } catch { return res.status(502).json({error:'We could not confirm delivery to the email provider. Please try again or email contact@castward.app.'}); }
};
