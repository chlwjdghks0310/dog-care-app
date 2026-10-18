import { spawn } from "node:child_process";
import fs from "node:fs";
// 아이폰 기종별 화면(CSS 크기 × 배율) — 세로 방향
const DEVICES = [[320,568,2],[375,667,2],[414,736,3],[375,812,3],[414,896,2],[414,896,3],[390,844,3],[428,926,3],[393,852,3],[430,932,3],[402,874,3],[440,956,3],[420,912,3]];
const [,, url, outDir] = process.argv;
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new","--remote-debugging-port=9335",`--user-data-dir=${process.env.TMPD}/prof3`,"--window-size=500,1000","about:blank"],{stdio:"ignore"});
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let ws; for (let i=0;i<40;i++){ try{ const t=await (await fetch("http://127.0.0.1:9335/json")).json(); const p=t.find(x=>x.type==="page"); if(p){ws=new WebSocket(p.webSocketDebuggerUrl);break;} }catch{} await sleep(250); }
await new Promise(r=>ws.onopen=r); let id=0; const pend={};
ws.onmessage=(m)=>{const d=JSON.parse(m.data); if(d.id&&pend[d.id]){pend[d.id](d.result);delete pend[d.id];}};
const send=(method,params={})=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method,params}));});
for (const [w,h,d] of DEVICES) {
  await send("Emulation.setDeviceMetricsOverride",{width:w,height:h,deviceScaleFactor:d,mobile:true});
  await send("Page.navigate",{url}); await sleep(700);
  const r=await send("Page.captureScreenshot",{format:"png"});
  fs.writeFileSync(`${outDir}/splash-${w}x${h}@${d}.png`, Buffer.from(r.data,"base64"));
}
console.log(DEVICES.map(([w,h,d])=>`    <link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${d}) and (orientation: portrait)" href="/splash/splash-${w}x${h}@${d}.png" />`).join("\n"));
ws.close(); chrome.kill(); process.exit(0);
