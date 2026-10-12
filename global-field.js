/* GFZ EIGEN-6C4 degree 179: ellipsoidal gravity disturbance and geoid. */
window.GravityField=(()=>{
 const payload=window.GLOBAL_FIELD_DATA, off=document.createElement('canvas'),ox=off.getContext('2d');
 const fieldOff=document.createElement('canvas'),fx=fieldOff.getContext('2d');
 let disturbance,geoid,pixels={},ready=false,mix=50,exaggeration=12000,hover=null;
 const active=()=>globeLayer,fieldMode=()=>['gravity-field','geoid-field','potato-field','compare-field'].includes(active());
 const panel=document.createElement('section');panel.className='field-panel';panel.hidden=true;
 panel.innerHTML=`<div class="field-heading"><strong id="fieldTitle">全球重力场</strong><span>EIGEN-6C4 · GFZ</span></div><div id="fieldSubtitle"></div><div class="field-ramp"></div><div class="field-ticks"><span id="fieldMin"></span><span id="fieldMid"></span><span id="fieldMax"></span></div><div class="field-reading" id="fieldReading">正在载入场图…</div><label class="field-control" id="fieldExaggerationRow" hidden>形状夸张倍率 <b id="fieldExaggerationValue">×12,000</b><input id="fieldExaggeration" type="range" min="0" max="20000" value="12000" step="500"></label><label class="field-control" id="fieldMixRow" hidden>地形 ← 分界 → 重力扰动 <b id="fieldMixValue">50%</b><input id="fieldMix" type="range" min="10" max="90" value="50" step="1"></label><p id="fieldHover">拖动旋转地球；对照模式可直接拖动地球上的分界线，点击测点查看读数。</p><p class="field-caveat" id="fieldCaveat"></p><a href="https://doi.org/10.5880/icgem.2015.1" target="_blank" rel="noreferrer">GFZ 模型来源 ↗</a>`;
 document.querySelector('.globe-tools').append(panel);
 const selector=$('globeLayer'),terrainOption=selector.querySelector('[value="terrain"]');
 for(const [value,label] of [['compare-field','地形 ↔ 重力场对照'],['potato-field','波茨坦重力土豆'],['geoid-field','大地水准面场图'],['gravity-field','真实全球重力扰动']])terrainOption.after(new Option(label,value));
 async function unpack(b){const bytes=Uint8Array.from(atob(b),c=>c.charCodeAt(0));return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()}
 async function imagePixels(src){const img=new Image();img.src=src;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return {data:ctx.getImageData(0,0,canvas.width,canvas.height).data,width:canvas.width,height:canvas.height}}
 function sampleGrid(values,lat,lon){if(!values)return null;const x=((((lon+180)%360)+360)%360)*2,y=Math.max(0,Math.min(360,(90-lat)*2)),x0=Math.floor(x)%720,y0=Math.floor(y),tx=x-x0,ty=y-y0,x1=(x0+1)%720,y1=Math.min(360,y0+1),a=values[y0*720+x0],b=values[y0*720+x1],c=values[y1*720+x0],d=values[y1*720+x1];return ((a*(1-tx)+b*tx)*(1-ty)+(c*(1-tx)+d*tx)*ty)}
 function sample(lat,lon){return {disturbance:sampleGrid(disturbance,lat,lon)/10,geoid:sampleGrid(geoid,lat,lon)/100}}
 function renderMap(c,R,kind){const tex=pixels[kind];if(!tex)return;const size=Math.max(160,Math.min(700,Math.round(R*2))),key=kind+':'+size+':'+view.lat+':'+view.lon;
  if(fieldOff.dataset.key!==key){fieldOff.width=fieldOff.height=size;const im=fx.createImageData(size,size),dst=im.data,p=view.lat*RAD,l=view.lon*RAD,sp=Math.sin(p),cp=Math.cos(p);
   for(let y=0;y<size;y++)for(let x=0;x<size;x++){const xx=(x+.5)/size*2-1,yy=1-(y+.5)/size*2,q=xx*xx+yy*yy;if(q>1)continue;const z=Math.sqrt(1-q),lat=Math.asin(yy*cp+z*sp),lon=l+Math.atan2(xx,z*cp-yy*sp),r=Math.min(tex.height-1,Math.max(0,Math.floor((90-lat/RAD)/180*tex.height))),k=Math.floor((((lon/RAD+180)%360+360)%360)/360*tex.width)%tex.width,src=(r*tex.width+k)*4,d=(y*size+x)*4;dst[d]=tex.data[src];dst[d+1]=tex.data[src+1];dst[d+2]=tex.data[src+2];dst[d+3]=255}fx.putImageData(im,0,0);fieldOff.dataset.key=key}
  c.drawImage(fieldOff,globeSize.cx-R,globeSize.cy-R,R*2,R*2)
 }
 const oldLayer=drawGlobeLayer;
 drawGlobeLayer=function(c,project,R){const mode=active();if(!fieldMode())return oldLayer(c,project,R);if(!ready)return;
  if(mode==='compare-field'){const {cx,cy}=globeSize,x=cx-R+R*2*mix/100;c.save();c.beginPath();c.rect(cx-R-1,cy-R-1,x-(cx-R)+1,R*2+2);c.clip();globeLayer='terrain';try{oldLayer(c,project,R)}finally{globeLayer=mode;c.restore()}c.save();c.beginPath();c.rect(x,cy-R-1,cx+R-x+1,R*2+2);c.clip();renderMap(c,R,'gravity');c.restore();const dx=(x-cx)/R,dy=R*Math.sqrt(Math.max(0,1-dx*dx));c.strokeStyle='#f7eee0';c.lineWidth=1.5;c.beginPath();c.moveTo(x,cy-dy);c.lineTo(x,cy+dy);c.stroke();$('layerLegend').textContent='左：ETOPO 地形 / 右：EIGEN-6C4 重力扰动';return}
  if(mode==='gravity-field')renderMap(c,R,'gravity');
  else if(mode==='geoid-field')renderMap(c,R,'geoid');
  $('layerLegend').textContent=mode==='gravity-field'?'GFZ EIGEN-6C4 · 椭球面重力扰动':mode==='geoid-field'?'GFZ EIGEN-6C4 · 大地水准面起伏':'GFZ EIGEN-6C4 · 夸张大地水准面形状';
 };
 function potatoActive(){return ready&&active()==='potato-field'&&Terrain.ready}
 const stops=[-120,-80,-40,-10,0,10,40,80,120],colors=[[18,25,69],[32,65,125],[37,131,166],[99,192,192],[224,230,192],[238,193,137],[219,121,99],[158,58,85],[91,27,73]];
 function color(n,light){let i=1;while(i<stops.length-1&&n>stops[i])i++;const t=Math.max(0,Math.min(1,(n-stops[i-1])/(stops[i]-stops[i-1])));return 'rgb('+[0,1,2].map(k=>Math.round(Math.max(0,Math.min(255,(colors[i-1][k]*(1-t)+colors[i][k]*t)*light)))).join(',')+')'}
 function drawPotato(c,project,dim){const {cx,cy,R,w,h}=dim,gain=exaggeration/6378137;
  const halo=c.createRadialGradient(cx,cy,R*.75,cx,cy,R*1.36);halo.addColorStop(0,'#56b5ba25');halo.addColorStop(1,'#56b5ba00');c.fillStyle=halo;c.beginPath();c.arc(cx,cy,R*1.36,0,Math.PI*2);c.fill();
  const verts=[];for(let lat=-90;lat<=90;lat+=3){let row=[];for(let lon=-180;lon<=180;lon+=3){const [x,y,z]=project(lon,lat),n=sampleGrid(geoid,lat,lon)/100,s=1+n*gain;row.push({x:cx+(x-cx)*s,y:cy+(y-cy)*s,z,n})}verts.push(row)}
  for(let r=0;r<60;r++)for(let k=0;k<120;k++){const corners=[verts[r][k],verts[r][k+1],verts[r+1][k+1],verts[r+1][k]],poly=[];for(let j=0;j<4;j++){const a=corners[j],b=corners[(j+1)%4];if(a.z>=0)poly.push(a);if((a.z<0)!==(b.z<0)){const t=a.z/(a.z-b.z);poly.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:0})}}if(poly.length<3)continue;const mid=corners.reduce((s,v)=>s+v.n,0)/4,light=.7+.3*Math.max(0,Math.min(1,(corners[0].z+corners[1].z+corners[2].z+corners[3].z)/4));c.fillStyle=color(mid,light);c.strokeStyle=c.fillStyle;c.lineWidth=.7;c.beginPath();poly.forEach((v,j)=>j?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();c.fill();c.stroke()}
  const [px,py,pz]=project(state.lon,state.lat);if(pz>=0){const n=sampleGrid(geoid,state.lat,state.lon)/100,s=1+n*gain,x=cx+(px-cx)*s,y=cy+(py-cy)*s;c.strokeStyle='#d9fff2';c.fillStyle='#b5fff0';c.lineWidth=1.5;c.beginPath();c.arc(x,y,10,0,Math.PI*2);c.stroke();c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();c.font='12px Segoe UI';c.fillText('P · '+n.toFixed(1)+' m',x+14,y-12)}else{c.fillStyle='#b4c9d1';c.font='12px Segoe UI';c.fillText('测点在背面 · 点击定位观测点',cx-R*.8,h-10)}
  if(window.WorldFactors)WorldFactors.draw(c,project,dim)
 }
 function sync(){const mode=active();panel.hidden=!fieldMode();document.querySelector('.terrain-panel').hidden=fieldMode();if(!fieldMode())return;
  $('fieldExaggerationRow').hidden=mode!=='potato-field';$('fieldMixRow').hidden=mode!=='compare-field';
  const potato=mode==='potato-field',geo=mode==='geoid-field'||potato,compare=mode==='compare-field';$('fieldTitle').textContent=potato?'波茨坦重力土豆 · 概念复现':geo?'全球大地水准面场图':compare?'地形与重力扰动对照':'全球重力扰动场图';
  $('fieldSubtitle').textContent=geo?'EIGEN 大地水准面 N；地形高度换算仍使用 EGM2008':'模型重力与 WGS‑84 正常重力之差 · 椭球面 h=0';
  $('fieldMin').textContent=geo?'−110 m':'−320 mGal';$('fieldMid').textContent=geo?'0 m':'0 mGal';$('fieldMax').textContent=geo?'+85 m':'+320 mGal';
  $('fieldCaveat').textContent=potato?'形状按倍率放大；真实起伏仅约百米。GFZ EIGEN-6C4 截断到 179 阶，展示约 200 km 及更宽的结构。':geo?'颜色是等位面的高差，不等于重力异常；与地形高度也不同。模型截断到 179 阶。':compare?'左右为同一视角和测点。右侧为 h=0 的模型重力扰动，不直接叠加到当前地形测点计算值。':'单位 mGal；正负表示相对正常重力的模型差值。截断到 179 阶，非实测布格异常。';
  if(!ready){$('fieldReading').textContent='正在载入 GFZ 全球场图…';return}
  const v=sample(state.lat,state.lon),terrain=Terrain.selected?.lat===state.lat&&Terrain.selected?.lon===state.lon?Terrain.selected:Terrain.coarse(state.lat,state.lon);
  $('fieldReading').innerHTML=`<strong>${geo?'N = '+(v.geoid>=0?'+':'')+v.geoid.toFixed(2)+' m':'δg = '+(v.disturbance>=0?'+':'')+v.disturbance.toFixed(1)+' mGal'}</strong><span>测点 ${state.lat.toFixed(3)}°，${state.lon.toFixed(3)}°${terrain==null?'':terrain.ocean?' · 海底 H '+terrain.H.toFixed(0)+' m（测点取海面）':' · 地表 H '+terrain.H.toFixed(0)+' m'}</span>`;
  $('fieldHover').textContent=hover&&mode===hover.mode?hover.text:'拖动旋转地球；对照模式可直接拖动地球上的分界线，点击测点查看读数。'
 }
 const oldRender=renderUpgrade;renderUpgrade=function(){oldRender();sync()};
 const oldChange=selector.onchange;selector.onchange=e=>{hover=null;oldChange(e);sync()};
 $('fieldExaggeration').oninput=e=>{exaggeration=+e.target.value;$('fieldExaggerationValue').textContent='×'+exaggeration.toLocaleString();drawGlobe()};
 $('fieldMix').oninput=e=>{mix=+e.target.value;$('fieldMixValue').textContent=mix+'%';drawGlobe()};
 let splitPointer=null;
 const canvas=$('globe');
 function setSplit(e){const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,{cx,R}=globeSize;mix=Math.max(10,Math.min(90,Math.round((x-(cx-R))/(2*R)*100)));$('fieldMix').value=mix;$('fieldMixValue').textContent=mix+'%';drawGlobe()}
 canvas.addEventListener('pointerdown',e=>{if(active()!=='compare-field')return;const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,{cx,cy,R}=globeSize,divider=cx-R+2*R*mix/100;if(Math.abs(x-divider)>14||Math.abs(y-cy)>R)return;splitPointer=e.pointerId;canvas.setPointerCapture(e.pointerId);e.stopImmediatePropagation();e.preventDefault();setSplit(e)},true);
 canvas.addEventListener('pointermove',e=>{if(splitPointer===e.pointerId){e.stopImmediatePropagation();e.preventDefault();setSplit(e)}else if(active()==='compare-field'){const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,{cx,R}=globeSize;canvas.style.cursor=Math.abs(x-(cx-R+2*R*mix/100))<14?'ew-resize':'grab'}},true);
 const stopSplit=e=>{if(splitPointer!==e.pointerId)return;e.stopImmediatePropagation();e.preventDefault();splitPointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)};
 canvas.addEventListener('pointerup',stopSplit,true);canvas.addEventListener('pointercancel',stopSplit,true);
 $('globe').addEventListener('pointermove',e=>{if(!ready||!fieldMode()||e.buttons)return;const rect=$('globe').getBoundingClientRect(),{cx,cy,R}=globeSize,x=(e.clientX-rect.left-cx)/R,y=(cy-e.clientY+rect.top)/R,q=x*x+y*y;if(q>1)return;const z=Math.sqrt(1-q),p=view.lat*RAD,lat=Math.asin(y*Math.cos(p)+z*Math.sin(p))/RAD,lon=((view.lon+Math.atan2(x,z*Math.cos(p)-y*Math.sin(p))/RAD+540)%360)-180,v=sample(lat,lon);hover={mode:active(),text:`${lat.toFixed(2)}°，${lon.toFixed(2)}° · δg ${(v.disturbance>=0?'+':'')+v.disturbance.toFixed(1)} mGal · N ${(v.geoid>=0?'+':'')+v.geoid.toFixed(2)} m`};$('fieldHover').textContent=hover.text});
 const initialized=(async()=>{try{[disturbance,geoid,pixels.gravity,pixels.geoid]=await Promise.all([unpack(payload.disturbance).then(b=>new Int16Array(b)),unpack(payload.geoid).then(b=>new Int16Array(b)),imagePixels(payload.gravityTexture),imagePixels(payload.geoidTexture)]);ready=true;delete window.GLOBAL_FIELD_DATA;sync();drawGlobe()}catch(e){$('fieldReading').textContent='场图载入失败：'+e.message;throw e}})();
 return {sample,drawPotato,potatoActive,get ready(){return ready},get mode(){return active()},get mix(){return mix},initialized};
})();
