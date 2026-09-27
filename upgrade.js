'use strict';
const F=GravityFactors;
const factorMeta=[
 {id:'height',label:'观测高度',icon:'↟',note:'完整正常势',color:'#8be6ce'},
 {id:'rotation',label:'地球自转',icon:'↻',note:'离心作用',color:'#eaba79'},
 {id:'slab',label:'等效岩层',icon:'▰',note:'平板近似',color:'#c8ac88'},
 {id:'sphere',label:'地下异常体',icon:'◉',note:'球体正演',color:'#ff9a7c'},
 {id:'water',label:'地下水变化',icon:'≈',note:'等效水厚',color:'#7ebcfa'},
 {id:'tide',label:'日月引潮',icon:'☽',note:'刚性地球',color:'#c6b4f6'}
];
let selectedFactor='height', pinned=null, dataEvidence=null, elevationSerial=0, timeBase=new Date(factors.time),playTimer=null;
const signed=(n,d=4)=>(n>=0?'+':'−')+Math.abs(n).toFixed(d);
$('factorSwitches').innerHTML=factorMeta.map(f=>`<div class="factor-card" data-card="${f.id}" style="--factor:${f.color}"><button class="factor-select" data-select="${f.id}" aria-label="调整${f.label}参数"><span class="factor-icon">${f.icon}</span><span><strong>${f.label}</strong><small>${f.note}</small></span></button><label class="toggle"><input id="toggle-${f.id}" type="checkbox" aria-label="考虑${f.label}" ${factors[f.id]?'checked':''}><span></span></label></div>`).join('');
function selectFactor(id){selectedFactor=id;document.querySelectorAll('[data-detail]').forEach(el=>el.hidden=el.dataset.detail!==id);document.querySelectorAll('[data-card]').forEach(el=>el.classList.toggle('selected',el.dataset.card===id));}
document.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>selectFactor(b.dataset.select));
function updateFactors(patch){
 const next={...factors,...patch};
 try{F.validate(next);F.evaluate(state,next)}catch(e){$('factorError').textContent=e.message;return false}
 factors=next;$('factorError').textContent='';setState({});return true;
}
factorMeta.forEach(f=>$('toggle-'+f.id).onchange=e=>{const on=e.target.checked;if(!updateFactors({[f.id]:on})){e.target.checked=factors[f.id];return}selectFactor(f.id)});
for(const id of ['thickness','density','contrast','radius','depth','east','north','waterMM'])$(id).addEventListener('input',()=>updateFactors({[id]:value(id)}));
$('heightPlay').oninput=()=>setState({h:value('heightPlay')});
$('waterPlay').oninput=()=>updateFactors({waterMM:value('waterPlay')});
$('orthometric').oninput=()=>setState({h:value('orthometric')+F.geoidHeight(state.lat,state.lon)});
document.querySelectorAll('[data-density]').forEach(b=>b.onclick=()=>updateFactors({density:+b.dataset.density}));
$('useSurfaceThickness').onclick=()=>{const t=state.h-F.geoidHeight(state.lat,state.lon);if(t<0||t>10000){$('factorError').textContent='当前海拔不在 0–10000 m 内，请手动设置等效厚度。';return}updateFactors({thickness:+t.toFixed(1)})};
function stopPlayback(){if(playTimer){clearInterval(playTimer);playTimer=null}$('playTime').textContent='▶ 播放 24 小时'}
function setTime(iso,reset=true){if(updateFactors({time:iso})&&reset){timeBase=new Date(iso);$('timePlay').value=0;$('timeOffset').textContent='+0.0 h';stopPlayback()}}
$('tideTime').onchange=()=>{if(!$('tideTime').value){$('factorError').textContent='请输入 UTC 时间';return}setTime($('tideTime').value+':00Z')};
$('timeNow').onclick=()=>setTime(new Date().toISOString());
function applyTimeOffset(){const offset=value('timePlay');updateFactors({time:new Date(+timeBase+offset*3600000).toISOString()});$('timeOffset').textContent='+'+offset.toFixed(2)+' h'}
$('timePlay').oninput=()=>{stopPlayback();applyTimeOffset()};
$('playTime').onclick=()=>{if(playTimer){stopPlayback();return}if(!factors.tide)updateFactors({tide:true});if(value('timePlay')>=24)$('timePlay').value=0;$('playTime').textContent='Ⅱ 暂停';playTimer=setInterval(()=>{const t=value('timePlay')+.25;$('timePlay').value=Math.min(24,t);applyTimeOffset();if(t>=24)stopPlayback()},350)};
const coordKey=(lat=state.lat,lon=state.lon)=>lat.toFixed(6)+','+lon.toFixed(6);
function sampleAt(lat,lon){return (window.ELEVATION_SAMPLES?.results||[]).find(r=>Math.abs(r.location.lat-lat)<1e-6&&Math.abs(r.location.lng-lon)<1e-6)}
function applyElevation(data,lat,lon,cached=false){
 const H=Math.max(0,data.elevation),N=F.geoidHeight(lat,lon),h=H+N;
 dataEvidence={...data,lat,lon,orthometric:H,geoid:N,h,cached,key:coordKey(lat,lon),retrieved:data.retrieved||window.ELEVATION_SAMPLES?.retrieved};
 if(!setState({lat,lon,h},true)){dataEvidence=null;return false}return true;
}
$('fetchElevation').onclick=async()=>{
 const {lat,lon,h:requestedHeight}=state,serial=++elevationSerial,key=coordKey(),sample=sampleAt(lat,lon);
 if(sample){applyElevation(sample,lat,lon,true);return}
 if(location.protocol==='file:'){$('elevationStatus').textContent='任意地点在线查询：请双击同文件夹的“启动实验室.cmd”。预置地点已内置高程；也可直接输入海拔。';return}
 const button=$('fetchElevation');button.disabled=true;button.textContent='正在读取 DEM…';$('elevationStatus').textContent='正在查询 SRTM / ETOPO1…';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
 try{const response=await fetch('/api/elevation?lat='+lat+'&lon='+lon,{signal:controller.signal});if(!response.ok)throw Error('高程服务暂不可用');const data=await response.json();if(!Number.isFinite(data.elevation)||typeof data.dataset!=='string')throw Error('高程数据格式无效');if(serial!==elevationSerial||key!==coordKey()||state.h!==requestedHeight){$('elevationStatus').textContent='位置或高度已改变，已忽略旧请求的高程结果。';return}applyElevation(data,lat,lon)}catch(e){$('elevationStatus').textContent='读取失败，当前参数保留。请检查网络后重试，或手动输入海拔。'}finally{clearTimeout(timeout);button.disabled=false;button.textContent='↙ 读取此处真实高程'}
};
document.querySelectorAll('[data-scenario]').forEach(b=>b.onclick=()=>{
 stopPlayback();const kind=b.dataset.scenario;factors={...F.defaults,time:new Date().toISOString()};
 if(kind==='normal'){setState({h:0,spin:1});selectFactor('height')}
 if(kind==='mountain'){factors.slab=true;factors.thickness=3000;const sample=sampleAt(29.652,91.172);if(sample){factors.thickness=sample.elevation;applyElevation(sample,29.652,91.172,true)}else setState({lat:29.652,lon:91.172,h:3661},true);selectFactor('slab')}
 if(kind==='ore'||kind==='cavity'){factors.sphere=true;factors.contrast=kind==='ore'?800:-600;factors.east=800;setState({spin:1});selectFactor('sphere')}
 if(kind==='tides'){factors.tide=true;setState({spin:1});timeBase=new Date(factors.time);$('timePlay').value=0;$('timeOffset').textContent='+0.0 h';selectFactor('tide')}
});
$('pinResult').onclick=()=>{pinned={g:result.g,lat:state.lat,lon:state.lon,h:state.h,factors:{...factors}};renderUpgrade()};
$('exportResult').onclick=()=>{
 const report={application:'Gravity Atlas 2.1',exported:new Date().toISOString(),coordinates:{...state},factors:{...factors},elevationEvidence:dataEvidence&&dataEvidence.key===coordKey()&&Math.abs(dataEvidence.h-state.h)<.001?dataEvidence:null,geoid:{model:'EGM96 15 arcmin',N:F.geoidHeight(state.lat,state.lon)},result:{g:result.g,forceN:result.force,earthGravity:result.earthGravity,centrifugal:result.centrifugal,tide:result.tides?.total||null,totalENU:result.total,deltaMgal:result.delta},contributions:result.terms,pinnedComparison:pinned,limitations:'WGS84 reference plus optional idealized local forward models; not a full EGM gravity field or measured gravity. Tide is rigid-Earth direct attraction only.',sources:['https://www.opentopodata.org/','https://download.osgeo.org/proj/vdatum/egm96_15/','https://github.com/cosinekitty/astronomy','https://www.fatiando.org/harmonica/latest/api/generated/harmonica.bouguer_correction.html']};
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='gravity-experiment-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
};
function renderUpgrade(){
 const r=result,N=F.geoidHeight(state.lat,state.lon);
 $('gValue').textContent=r.g.toFixed(8);
 $('orthometric').value=(state.h-N).toFixed(2);$('geoidLabel').textContent='EGM96 起伏 N = '+signed(N,2)+' m · 15′ 格网';
 $('heightInfo').textContent='h = '+state.h.toFixed(2)+' m  /  H ≈ '+(state.h-N).toFixed(2)+' m';$('heightPlay').value=Math.max(0,Math.min(10000,state.h));
 $('deltaValue').textContent=signed(r.delta,4)+' mGal';
 $('activeFactors').innerHTML=factorMeta.filter(f=>factors[f.id]).map(f=>`<span style="--factor:${f.color}">${f.icon} ${f.label}</span>`).join('');
 factorMeta.forEach(f=>{$('toggle-'+f.id).checked=factors[f.id];document.querySelector('[data-card="'+f.id+'"]').classList.toggle('enabled',factors[f.id])});
 for(const id of ['thickness','density','contrast','radius','depth','east','north','waterMM'])$(id).value=factors[id];
 $('waterPlay').value=Math.max(-2000,Math.min(2000,factors.waterMM));$('tideTime').value=factors.time.slice(0,16);
 $('tideSplit').textContent=r.tides?'向下分量：月球 '+signed(-r.tides.moon.up*1e5,5)+' mGal；太阳 '+signed(-r.tides.sun.up*1e5,5)+' mGal':'开启日月因素，显示两者的独立贡献。';
 if(dataEvidence&&dataEvidence.key===coordKey()&&Math.abs(dataEvidence.h-state.h)<.001){const e=dataEvidence;$('elevationStatus').textContent=(e.cached?'内置查询记录 · ':'在线数据 · ')+e.dataset.toUpperCase()+'，DEM '+e.elevation.toFixed(1)+' m。'+(e.elevation<0?'负 DEM 按海底显示；观测点取海面 H=0，若为陆地凹地请手动输入。':'已换算为椭球高。')+' 查询日期 '+e.retrieved.slice(0,10)}else if(!$('fetchElevation').disabled){$('elevationStatus').textContent='当前为手动高度。读取 DEM 可更新此处地表高度。'}
 $('comparison').textContent=pinned?'对比 A（'+pinned.lat.toFixed(2)+'°, '+pinned.lon.toFixed(2)+'°，h='+pinned.h.toFixed(1)+' m）：'+signed((r.g-pinned.g)*1e5,4)+' mGal':'固定一次结果，再改变位置或开关，观察差异。';
 const max=Math.max(1,...r.terms.map(t=>Math.log10(1+Math.abs(t.delta)/.001)));
 $('contributions').innerHTML=r.terms.map((t,i)=>{const size=Math.log10(1+Math.abs(t.delta)/.001)/max*48;return `<div class="contribution"><div><span style="color:${factorMeta[i].color}">${t.name}</span><strong>${signed(t.delta,5)}</strong></div><div class="contribution-track"><i style="background:${factorMeta[i].color};width:${size}%;left:${t.delta<0?50-size:50}%"></i></div></div>`}).join('');
 drawGeology();drawProfile();
}
let geoDimensions,dragDimensions;
function drawGeology(){
 const {ctx:c,w,h}=surface('geology'),margin=25,top=50;
 const extent=Math.max(3500,Math.abs(factors.east)+factors.radius*1.5),depthExtent=Math.max(4000,factors.depth+factors.radius*1.5);
 const sx=(w-2*margin)/(2*extent),sy=(h-top-22)/depthExtent,scale=geoDrag&&dragDimensions?dragDimensions.scale:Math.min(sx,sy),x0=w/2;
 geoDimensions={w,h,x0,top,scale};
 const slabHeight=factors.slab?Math.min(65,factors.thickness*scale):0;
 c.fillStyle='#0c1722';c.fillRect(margin,top,w-2*margin,h-top-22);
 if(slabHeight){c.fillStyle='#b3957130';c.fillRect(margin,top,w-2*margin,slabHeight);c.strokeStyle='#b3957140';for(let y=top+7;y<top+slabHeight;y+=9){c.beginPath();c.moveTo(margin,y);c.lineTo(w-margin,y);c.stroke()}}
 if(factors.water){c.strokeStyle='#7ebcfa';c.lineWidth=3;c.beginPath();c.moveTo(margin,top+14);c.lineTo(w-margin,top+14);c.stroke()}
 c.strokeStyle='#697d87';c.lineWidth=1;c.beginPath();c.moveTo(margin,top);c.lineTo(w-margin,top);c.stroke();
 c.setLineDash([3,5]);c.strokeStyle='#324b59';c.beginPath();c.moveTo(x0,top);c.lineTo(x0,h-20);c.stroke();c.setLineDash([]);
 const x=x0+factors.east*scale,y=top+factors.depth*scale,R=Math.max(2,factors.radius*scale);
 c.fillStyle=factors.sphere?(factors.contrast>=0?'#ff9a7c40':'#7ebcfa35'):'#71829222';c.strokeStyle=factors.sphere?(factors.contrast>=0?'#ff9a7c':'#7ebcfa'):'#718292';c.lineWidth=2;c.beginPath();c.arc(x,y,R,0,2*Math.PI);c.fill();c.stroke();
 c.fillStyle='#e3edf3';c.font='12px Segoe UI';c.textAlign='center';c.fillText('P · 测点',x0,top-15);c.fillStyle='#8be6ce';c.beginPath();c.arc(x0,top,4,0,2*Math.PI);c.fill();
 c.fillStyle='#9cafbc';c.font='11px Consolas';c.fillText('Δρ '+factors.contrast+' kg/m³',Math.max(85,Math.min(w-85,x)),Math.min(h-5,y+R+17));c.textAlign='left';c.fillText('W',margin,top-12);c.textAlign='right';c.fillText('E',w-margin,top-12);c.textAlign='left';
 $('geologyNote').textContent=(factors.sphere?'已计入':'未计入')+'球体 · 深度 '+factors.depth.toFixed(0)+' m · 东向 '+signed(factors.east,0)+' m · 北向 '+signed(factors.north,0)+' m。剖面按实际半径绘制。';
}
let geoDrag=false;
$('geology').onpointerdown=e=>{dragDimensions={...geoDimensions};geoDrag=true;$('geology').setPointerCapture(e.pointerId);moveBody(e)};
$('geology').onpointermove=e=>{if(geoDrag)moveBody(e)};
$('geology').onpointerup=$('geology').onpointercancel=()=>{geoDrag=false;drawGeology()};
function moveBody(e){const rect=$('geology').getBoundingClientRect(),d=geoDimensions;let east=(e.clientX-rect.left-d.x0)/d.scale,depth=(e.clientY-rect.top-d.top)/d.scale;east=Math.max(-20000,Math.min(20000,east));depth=Math.max(factors.radius,Math.min(20000,depth));updateFactors({east:Math.round(east),depth:Math.round(depth)});selectFactor('sphere')}
function drawProfile(){const {ctx:c,w,h}=surface('profile'),pad=45,top=18,bottom=h-30,extent=Math.max(5000,Math.abs(factors.east)+3*factors.depth),vals=[];for(let i=0;i<=100;i++){const x=-extent+2*extent*i/100;vals.push([x,-F.sphere(factors.radius,factors.depth,factors.east-x,factors.north,factors.contrast).up*1e5])}const max=Math.max(.1,...vals.map(v=>Math.abs(v[1]))),zeroY=factors.contrast>=0?bottom:top,X=x=>pad+(x+extent)/(2*extent)*(w-2*pad),Y=g=>zeroY-g/max*(bottom-top)*(factors.contrast>=0?1:1);c.strokeStyle='#344a58';c.beginPath();c.moveTo(pad,zeroY);c.lineTo(w-pad,zeroY);c.stroke();c.beginPath();vals.forEach(([x,y],i)=>i?c.lineTo(X(x),Y(y)):c.moveTo(X(x),Y(y)));c.strokeStyle=factors.sphere?(factors.contrast>=0?'#ff9a7c':'#7ebcfa'):'#697984';c.lineWidth=2;c.stroke();const at=-F.sphere(factors.radius,factors.depth,factors.east,factors.north,factors.contrast).up*1e5;c.fillStyle='#eaba79';c.beginPath();c.arc(X(0),Y(at),3,0,2*Math.PI);c.fill();c.font='11px Consolas';c.fillStyle='#9cafbc';c.fillText('mGal',2,12);c.fillText(signed(at,3),Math.min(w-92,X(0)+8),Math.max(13,Math.min(h-32,Y(at)-7)));c.textAlign='center';for(const x of [-extent,0,extent])c.fillText((x/1000).toFixed(1)+' km',X(x),h-8);c.textAlign='left'}
let globeLayer='none',layerCache={};
function drawGlobeLayer(c,project,R){
 if(globeLayer==='none')return;
 const key=globeLayer+(globeLayer==='tide'?factors.time:'');
 if(layerCache.key!==key){let points=[];for(let lat=-87;lat<=87;lat+=6)for(let lon=-180;lon<180;lon+=6){const v=globeLayer==='geoid'?F.geoidHeight(lat,lon):globeLayer==='tide'?-F.tide(lat,lon,0,factors.time).total.up*1e5:calc(lat,lon,0).g;points.push({lat,lon,v})}layerCache={key,points,min:Math.min(...points.map(p=>p.v)),max:Math.max(...points.map(p=>p.v))}}
 for(const p of layerCache.points){const corners=[project(p.lon-3,p.lat-3),project(p.lon+3,p.lat-3),project(p.lon+3,p.lat+3),project(p.lon-3,p.lat+3)];if(corners.some(v=>v[2]<0))continue;const t=(p.v-layerCache.min)/(layerCache.max-layerCache.min||1);c.fillStyle=`hsla(${220-185*t},65%,60%,.40)`;c.beginPath();corners.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()}
 const unit=globeLayer==='geoid'?'m':globeLayer==='tide'?'mGal':'m/s²';
 if($('layerLegend'))$('layerLegend').textContent='蓝 → 金：'+layerCache.min.toFixed(3)+' → '+layerCache.max.toFixed(3)+' '+unit+(globeLayer==='geoid'?'':' · h=0');
}
const toolbar=document.createElement('div');toolbar.className='globe-tools';toolbar.innerHTML='<label for="globeLayer">地球图层</label><select id="globeLayer"><option value="none">地理轮廓</option><option value="normal">椭球面正常重力</option><option value="geoid">EGM96 水准面起伏</option><option value="tide">所选时刻直接引潮</option></select><span id="layerLegend">拖动探索全球</span>';
document.querySelector('.planet-top').after(toolbar);
$('globeLayer').onchange=e=>{globeLayer=e.target.value;drawGlobe();if(globeLayer==='none')$('layerLegend').textContent='拖动探索全球'};
window.addEventListener('resize',()=>{drawGeology();drawProfile()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlayback()});
upgradeReady=true;selectFactor('height');setState({});


