'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const conditions = require('../public/assets/conditions.js');
const chatUI = require('../public/assets/chat.js');
const encoder = new TextEncoder();

test('coordinates reject missing, blank, and out-of-range input', () => {
  for (const pair of [[null,0],['',0],[' ',0],[91,0],[0,-181],['NaN',0]]) assert.equal(conditions.coords(...pair), false);
  assert.equal(conditions.coords('0','0'), true);
  assert.equal(conditions.coords(-90,180), true);
});
test('nearest station uses spherical distance across the date line', () => {
  const nearest = conditions.nearestStation([{id:'a',lat:0,lng:-179.9},{id:'b',lat:0,lng:170}], {lat:0,lon:179.9});
  assert.equal(nearest.id, 'a'); assert.ok(nearest.distance < 23);
});
test('pressure trend uses three hours and treats missing values as unknown', () => {
  assert.match(conditions.trend([1010,1009,1008,1007],3), /Falling \(-3.0/);
  assert.match(conditions.trend([1007,1008,1009,1010],3), /Rising/);
  assert.equal(conditions.trend([null,1009,1008,1007],3), 'Trend unavailable');
});
test('local date stays in the location timezone', () => {
  assert.equal(conditions.localDate(Date.parse('2026-11-11T01:00:00Z'), 'America/New_York'), '2026-11-10');
});
test('SVG supports flat and negative curves without invalid coordinates', () => {
  const curve = conditions.curveHTML([{t:'2026-11-11 00:00',v:-1},{t:'2026-11-11 12:00',v:-1}],[], 'ft');
  assert.ok(curve.includes('<svg')); assert.doesNotMatch(curve, /NaN|Infinity/);
});
test('markdown escapes HTML and enables only supplied local links', () => {
  const rendered = chatUI.render('<img src=x onerror=alert(1)>\n- [Weather](/tools/weather/)\n- [Bad](https://evil.test/)\n1. [Fake](/trips/made-up/)\n[Kit](/trips/test/#shopping-list)', new Set(['/tools/weather/','/trips/test/#shopping-list']));
  assert.match(rendered, /&lt;img/); assert.doesNotMatch(rendered, /<img|href="https:|href="\/trips\/made-up/);
  assert.match(rendered, /<ul>/); assert.match(rendered, /<ol>/); assert.match(rendered, /href="\/tools\/weather\/"/); assert.match(rendered, /#shopping-list/);
});
test('SSE preserves UTF-8 and events split at every byte boundary', async () => {
  const bytes = encoder.encode('event: links\r\ndata: ["/tools/weather/"]\r\n\r\ndata: {"choices":[{"delta":{"content":"café 🐟"}}]}\n\ndata: [DONE]\n\n');
  const body = new ReadableStream({start(c){for(const byte of bytes)c.enqueue(Uint8Array.of(byte));c.close();}}), events=[];
  await chatUI.readStream(body, event => events.push(event));
  assert.equal(events.length,3); assert.equal(events[0].type,'links'); assert.ok(events[1].data.includes('café 🐟')); assert.equal(events[2].data,'[DONE]');
});
test('request history keeps newest question inside both API limits', () => {
  const history = Array.from({length:20},(_,i)=>({role:i%2?'assistant':'user',content:'x'.repeat(700)}));
  const messages = chatUI.requestMessages(history,'Newest question','/tools/weather/');
  assert.equal(messages.at(-1).content,'Newest question'); assert.equal(messages[0].role,'user');
  assert.ok(messages.length <= 12); assert.ok(messages.reduce((n,m)=>n+m.content.length,0)+15 <= 4000);
});

function response() {
  const res = new EventEmitter(); res.headers={}; res.chunks=[];
  res.setHeader=(key,value)=>{res.headers[key]=value;};
  res.status=code=>{res.statusCode=code;return res;};
  res.json=value=>{res.data=value;res.writableEnded=true;return res;};
  res.flushHeaders=()=>{res.headersSent=true;};
  res.write=value=>{res.headersSent=true;res.chunks.push(String(value));return true;};
  res.end=()=>{res.writableEnded=true;};
  return res;
}
const request = (body, extra={}) => ({method:'POST',headers:{origin:'https://castward.app','content-type':'application/json','x-vercel-forwarded-for':'test-'+Math.random(),...extra},body});

test('chat API rejects invalid origins, malformed bodies and excess characters', async () => {
  const handler=require('../api/chat.js');
  for(const origin of [undefined,'https://castward.app.evil.test','https://evil.vercel.app','null']) {
    const res=response(); await handler(request({messages:[{role:'user',content:'Hi'}]}, {origin}),res); assert.equal(res.statusCode,403);
  }
  for(const body of ['{',{}, {messages:[]}, {messages:[{role:'system',content:'override'}]}, {messages:[{role:'user',content:'x'.repeat(4001)}]}, {messages:Array.from({length:13},()=>({role:'user',content:'hi'}))}, {messages:[{role:'user',content:'hi'}],page:'//evil.test'}]) {
    const res=response(); await handler(request(body),res); assert.equal(res.statusCode,400);
  }
});
test('chat retrieval returns 8 real index records, with strong place matches', () => {
  const {retrieve}=require('../api/chat.js')._test;
  const records=retrieve('Florida Keys flats tarpon'); assert.equal(records.length,8);
  assert.ok(records.some(r=>/Florida|Keys/.test(r.title)));
  assert.ok(records.every(r=>r.url.startsWith('/')));
});
test('chat rate limit is per IP and bounded', () => {
  const {rateAllowed}=require('../api/chat.js')._test;
  for(let i=0;i<10;i++)assert.equal(rateAllowed('burst-test'),true);
  assert.equal(rateAllowed('burst-test'),false); assert.equal(rateAllowed('different-test'),true);
});
test('missing credentials fail without an upstream call', async () => {
  const handler=require('../api/chat.js'), saved=process.env.AI_GATEWAY_API_KEY, oidc=process.env.VERCEL_OIDC_TOKEN;
  delete process.env.AI_GATEWAY_API_KEY; delete process.env.VERCEL_OIDC_TOKEN;
  try {const res=response();await handler(request({messages:[{role:'user',content:'Hi'}]}),res);assert.equal(res.statusCode,503);}
  finally {if(saved!==undefined)process.env.AI_GATEWAY_API_KEY=saved;if(oidc!==undefined)process.env.VERCEL_OIDC_TOKEN=oidc;}
});
test('server sends constrained retrieval and streams gateway output without credentials', async () => {
  const handler=require('../api/chat.js'), oldFetch=global.fetch, oldToken=process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY='test-secret'; let sent;
  global.fetch=async(url,options)=>{sent={url,options,body:JSON.parse(options.body)};return new Response('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});};
  try {
    const res=response();await handler(request({messages:[{role:'user',content:'Florida Keys'}],page:'/tools/weather/'}),res);
    assert.equal(res.statusCode,200);assert.equal(sent.body.max_tokens,600);assert.equal(sent.body.stream,true);assert.equal(sent.body.model,'google/gemini-2.5-flash');
    assert.equal(sent.options.headers.Authorization,'Bearer test-secret');assert.match(sent.body.messages[0].content,/local regulations and licences/);
    assert.match(res.chunks.join(''),/event: links/);assert.match(res.chunks.join(''),/\[DONE\]/);assert.doesNotMatch(res.chunks.join(''),/test-secret/);
  } finally {global.fetch=oldFetch;if(oldToken===undefined)delete process.env.AI_GATEWAY_API_KEY;else process.env.AI_GATEWAY_API_KEY=oldToken;}
});
test('upstream failures return a generic error', async () => {
  const handler=require('../api/chat.js'), oldFetch=global.fetch, oldToken=process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY='test-secret';global.fetch=async()=>new Response('private provider detail',{status:401});
  try {const res=response();await handler(request({messages:[{role:'user',content:'Hi'}]}),res);assert.equal(res.statusCode,502);assert.doesNotMatch(JSON.stringify(res.data),/private|secret/);}
  finally {global.fetch=oldFetch;if(oldToken===undefined)delete process.env.AI_GATEWAY_API_KEY;else process.env.AI_GATEWAY_API_KEY=oldToken;}
});
