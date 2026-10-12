'use strict';
const $=id=>document.getElementById(id), calc=GravityPhysics.calculate, RAD=Math.PI/180;
let factors={...GravityFactors.defaults,time:new Date().toISOString()}, upgradeReady=false;
let state={lat:39.9042,lon:116.4074,h:0,mass:1,spin:1}, result, view={lat:20,lon:105};
const colors={grav:'#8be6ce',cent:'#eaba79',total:'#f2f6fa'};
function value(id){return $(id).value.trim()===''?NaN:Number($(id).value)}
function setState(next,center=false){
  const candidate={...state,...next};
  try{result=GravityFactors.evaluate(candidate,factors)}catch(e){$('error').textContent=e.message;return false}
  state=candidate;$('error').textContent='';
  for(const [id,key] of [['lat','lat'],['lon','lon'],['height','h'],['mass','mass'],['spin','spin']])$(id).value=key==='h'?+state[key].toFixed(5):state[key];
  $('latRange').value=state.lat;$('lonRange').value=state.lon;
  if(center)view={lat:state.lat*0.7,lon:state.lon};
  render();return true;
}
function render(){
  const r=result;$('gValue').textContent=r.g.toFixed(6);$('grav').textContent=r.grav.toFixed(6);$('cent').textContent=r.cent.toFixed(6);$('force').textContent=r.force.toLocaleString('en-US',{minimumFractionDigits:5,maximumFractionDigits:5})+' N';
  $('coordinate').textContent=Math.abs(r.lat).toFixed(4)+'° '+(r.lat<0?'S':'N')+' / '+Math.abs(r.lon).toFixed(4)+'° '+(r.lon<0?'W':'E');
  let place='自选位置';document.querySelectorAll('[data-lat]').forEach(b=>{const active=Math.abs(+b.dataset.lat-r.lat)<0.00005&&Math.abs(+b.dataset.lon-r.lon)<0.00005;b.classList.toggle('active',active);if(active)place=b.textContent});$('placeTag').textContent=place;
  $('modelBadge').textContent=r.terms.slice(2).some(t=>t.on)?'多因素正演':(!factors.rotation||r.spin!==1)?'自转假想实验':'正常重力';$('spinValue').textContent=r.spin.toFixed(2);
  const rows=document.querySelectorAll('.result-row');
  rows[0].querySelector('small').textContent='引力 '+(r.mass*r.grav).toFixed(5)+' N';
  rows[1].querySelector('small').textContent='离心力 '+(r.mass*r.cent).toFixed(5)+' N';
  $('spinNote').textContent=!factors.rotation?'自转因素已关闭 · 离心项为零':r.spin===1?'真实自转 · 恒星日约 23 小时 56 分':r.spin===0?'假想实验 · 地球停止自转':'假想实验 · 自转周期约 '+(2*Math.PI/(GravityPhysics.constants.omega*r.spin)/3600).toFixed(2)+' 小时';
  $('insight').textContent=Math.abs(r.lat)>89.9?'在极点，距自转轴为零，离心加速度也为零。':'此处离心加速度约为引力的 '+(100*r.cent/r.grav).toFixed(3)+'%。纬度越接近赤道，离心作用通常越明显。';
  const tilt=Math.abs(r.tilt)<0.0000005?0:r.tilt;$('tilt').textContent=Math.abs(tilt).toFixed(6)+'°'+(tilt===0?'':'，方位 '+r.azimuth.toFixed(1)+'°');
  $('components').innerHTML=[['地球引力',r.earthGravity],['离心',r.centrifugal],['引潮',r.tides?r.tides.total:{east:0,north:0,up:0}],['合成',r.total]].map(([name,v])=>'<tr><td>'+name+'</td><td>'+clean(v.east)+'</td><td>'+clean(v.north)+'</td><td>'+clean(v.up)+'</td></tr>').join('');
  drawGlobe();drawVectors();drawChart();if(upgradeReady)renderUpgrade();
}
function clean(n){return (Math.abs(n)<0.000000005?0:n).toFixed(8)}
for(const [id,key] of [['lat','lat'],['lon','lon'],['height','h'],['mass','mass']])$(id).addEventListener('input',()=>setState({[key]:value(id)},id==='lat'||id==='lon'));
for(const id of ['lat','lon'])$(id+'Range').addEventListener('input',()=>setState({[id]:value(id+'Range')},true));
$('spin').addEventListener('input',()=>setState({spin:value('spin')}));$('restore').onclick=()=>{factors.rotation=true;setState({spin:1})};
document.querySelectorAll('[data-lat]').forEach(b=>b.onclick=()=>setState({lat:+b.dataset.lat,lon:+b.dataset.lon},true));
$('resetView').onclick=()=>{view={lat:state.lat,lon:state.lon};drawGlobe()};
$('exaggerate').onchange=drawVectors;$('theoryBtn').onclick=()=>$('theory').showModal();$('closeTheory').onclick=()=>$('theory').close();
$('theory').addEventListener('click',e=>{if(e.target===$('theory')){const b=$('theory').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)$('theory').close()}});
function surface(id){const el=$(id), box=el.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);el.width=Math.round(box.width*dpr);el.height=Math.round(box.height*dpr);const ctx=el.getContext('2d');ctx.scale(dpr,dpr);return {ctx,w:box.width,h:box.height}}
let globeSize;
function drawGlobe(){
  const {ctx:c,w,h}=surface('globe'), immersive=!!window.WorldFactors, R=immersive?Math.min(w*.36,h*.31):Math.min(w*.405,h*.445), cx=immersive?w*.47:w/2,cy=immersive?h*.36:h/2;globeSize={R,cx,cy,w,h};
  const vp=view.lat*RAD, vl=view.lon*RAD;
  function project(lon,lat){const p=lat*RAD,l=lon*RAD-vl;return [cx+R*Math.cos(p)*Math.sin(l),cy-R*(Math.cos(vp)*Math.sin(p)-Math.sin(vp)*Math.cos(p)*Math.cos(l)),Math.sin(vp)*Math.sin(p)+Math.cos(vp)*Math.cos(p)*Math.cos(l)]}
  if(window.GravityField?.potatoActive()){window.GravityField.drawPotato(c,project,globeSize);return}
  const halo=c.createRadialGradient(cx,cy,R*.92,cx,cy,R*1.15);halo.addColorStop(0,'#57aeb32a');halo.addColorStop(1,'#57aeb300');c.fillStyle=halo;c.beginPath();c.arc(cx,cy,R*1.15,0,Math.PI*2);c.fill();
  const ocean=c.createRadialGradient(cx-R*.3,cy-R*.35,0,cx,cy,R*1.1);ocean.addColorStop(0,'#1c3d49');ocean.addColorStop(.7,'#122a37');ocean.addColorStop(1,'#091521');c.fillStyle=ocean;c.beginPath();c.arc(cx,cy,R,0,Math.PI*2);c.fill();
  c.save();c.beginPath();c.arc(cx,cy,R,0,Math.PI*2);c.clip();
  function strokeLine(points,color,width=1){c.beginPath();let pen=false;for(const p of points){const [x,y,z]=project(p[0],p[1]);if(z<0){pen=false;continue}if(pen)c.lineTo(x,y);else c.moveTo(x,y);pen=true}c.strokeStyle=color;c.lineWidth=width;c.stroke()}
  for(let lat=-60;lat<=60;lat+=30){const pts=[];for(let lon=-180;lon<=180;lon+=2)pts.push([lon,lat]);strokeLine(pts,lat===0?'#54808088':'#48717d55',lat===0?1.2:.6)}
  for(let lon=-180;lon<180;lon+=30){const pts=[];for(let lat=-90;lat<=90;lat+=2)pts.push([lon,lat]);strokeLine(pts,'#48717d55',.6)}
  if(upgradeReady)drawGlobeLayer(c,project,R);
  // Public-domain Natural Earth geographic coordinates, projected orthographically.
  for(const ring of window.LAND||[])strokeLine(ring,'#6caca8b0',1.05);
  const shade=c.createLinearGradient(cx-R,cy-R,cx+R,cy+R);shade.addColorStop(0,'#03101a00');shade.addColorStop(.55,'#03101a00');shade.addColorStop(1,'#020916aa');c.fillStyle=shade;c.fillRect(cx-R,cy-R,R*2,R*2);c.restore();
  c.strokeStyle='#63929188';c.lineWidth=1;c.beginPath();c.arc(cx,cy,R,0,Math.PI*2);c.stroke();
  const [px,py,pz]=project(state.lon,state.lat);if(pz>=0){c.strokeStyle='#8be6ce';c.lineWidth=1;c.beginPath();c.arc(px,py,11,0,Math.PI*2);c.stroke();c.fillStyle='#8be6ce';c.shadowColor='#8be6ce';c.shadowBlur=14;c.beginPath();c.arc(px,py,4,0,Math.PI*2);c.fill();c.shadowBlur=0;c.strokeStyle='#8be6ce88';c.beginPath();c.moveTo(px+12,py);c.lineTo(px+32,py-20);c.lineTo(px+58,py-20);c.stroke();c.fillStyle='#c6e8e2';c.font='11px Segoe UI';c.fillText('P',px+62,py-17)}else{c.fillStyle='#91a2b3';c.font='12px Microsoft YaHei';c.textAlign='center';c.fillText('观测点在背面 · 点击「定位观测点」',cx,h-8);c.textAlign='left'}
  c.fillStyle='#7298a5';c.font='11px Consolas';const n=project(view.lon,90),s=project(view.lon,-90);if(n[2]>=0)c.fillText('N',n[0]-4,n[1]-10);if(s[2]>=0)c.fillText('S',s[0]-4,s[1]+17);
  if(window.WorldFactors)window.WorldFactors.draw(c,project,globeSize);
}
let drag=null;
$('globe').addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,lon:view.lon,lat:view.lat,moved:false};$('globe').setPointerCapture(e.pointerId)});
$('globe').addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved){view.lon=drag.lon-dx*.35;view.lat=Math.max(-89.9,Math.min(89.9,drag.lat+dy*.35));drawGlobe()}});
$('globe').addEventListener('pointerup',e=>{if(!drag)return;if(!drag.moved){const box=$('globe').getBoundingClientRect(),{R,cx,cy}=globeSize,x=(e.clientX-box.left-cx)/R,y=-(e.clientY-box.top-cy)/R,r=Math.hypot(x,y),potato=!!window.GravityField?.potatoActive();if(r<=(potato?1.35:1)){const scale=r>1?1/r:1,xx=x*scale,yy=y*scale,z=Math.sqrt(Math.max(0,1-xx*xx-yy*yy)),p=view.lat*RAD;const lat=Math.asin(Math.max(-1,Math.min(1,yy*Math.cos(p)+z*Math.sin(p))))/RAD;let lon=view.lon+Math.atan2(xx,z*Math.cos(p)-yy*Math.sin(p))/RAD;lon=((lon+180)%360+360)%360-180;setState({lat:+lat.toFixed(4),lon:+lon.toFixed(4)})}}drag=null});
$('globe').addEventListener('pointercancel',()=>drag=null);
function arrow(c,x,y,dx,dy,color,width=2){if(Math.hypot(dx,dy)<.3)return;c.strokeStyle=color;c.fillStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x+dx,y+dy);c.stroke();const a=Math.atan2(dy,dx),len=7;c.beginPath();c.moveTo(x+dx,y+dy);c.lineTo(x+dx-len*Math.cos(a-.45),y+dy-len*Math.sin(a-.45));c.lineTo(x+dx-len*Math.cos(a+.45),y+dy-len*Math.sin(a+.45));c.closePath();c.fill()}
function drawVectors(){
  const {ctx:c,w,h}=surface('vectors'),x=w*.52,y=h*.32,scale=12;
  const boost=$('exaggerate').checked?100:1;
  c.strokeStyle='#314453';c.setLineDash([3,5]);c.beginPath();c.moveTo(20,y);c.lineTo(w-15,y);c.moveTo(x,20);c.lineTo(x,h-10);c.stroke();c.setLineDash([]);c.fillStyle='#91a2b3';c.font='11px Microsoft YaHei';c.fillText('北 N',w-38,y-9);c.fillText('天顶 U',x+8,22);
  // A consistent schematic vector sum: deviation from a vertical reference is
  // multiplied by k. G' = B + k(G-B), C' = kC, T' = B + k(T-B).
  const base={north:0,up:result.total.up};
  const gv={north:base.north+boost*(result.gravity.north-base.north),up:base.up+boost*(result.gravity.up-base.up)};
  const cv={north:boost*result.centrifugal.north,up:boost*result.centrifugal.up};
  const tv={north:gv.north+cv.north,up:gv.up+cv.up};
  const extent=Math.max(10,Math.abs(gv.north)*2,Math.abs(cv.north)*2,Math.abs(tv.north)*2,Math.abs(gv.up),Math.abs(tv.up));const sc=Math.min(scale,(h-y-20)/extent,(w/2-20)/Math.max(1,Math.abs(gv.north),Math.abs(tv.north)));
  arrow(c,x,y,gv.north*sc,-gv.up*sc,colors.grav,2.4);
  arrow(c,x+gv.north*sc,y-gv.up*sc,cv.north*sc,-cv.up*sc,colors.cent,2.4);
  arrow(c,x,y,tv.north*sc,-tv.up*sc,colors.total,1.3);
  c.fillStyle=colors.total;c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();c.fillStyle='#91a2b3';c.fillText('P',x-15,y-9);
  $('vectorNote').textContent=boost>1?'示意：离心矢量与相对铅直基准的偏差放大 100 倍；首尾相接仍满足矢量合成。真实方向与分量见下表。':'真实等比例矢量：离心力很小，两条向下的箭头几乎重合。金色矢量从引力箭头末端出发。';
}
let chartDims;
function drawChart(){const {ctx:c,w,h}=surface('chart'),left=62,right=20,top=30,bottom=32;let data=[];for(let lat=-90;lat<=90;lat+=2)data.push([lat,GravityFactors.evaluate({...state,lat,mass:1},factors).g]);const vals=data.map(p=>p[1]),min=Math.min(...vals,result.g)-.005,max=Math.max(...vals,result.g)+.005;const X=lat=>left+(lat+90)/180*(w-left-right),Y=v=>top+(max-v)/(max-min)*(h-top-bottom);chartDims={left,right,w};c.font='11px Consolas';for(let i=0;i<4;i++){const v=min+(max-min)*i/3,y=Y(v);c.strokeStyle='#253744';c.beginPath();c.moveTo(left,y);c.lineTo(w-right,y);c.stroke();c.fillStyle='#91a2b3';c.fillText(v.toFixed(3),4,y+4)}c.fillStyle='#91a2b3';c.fillText('m/s²',4,15);c.beginPath();data.forEach(([lat,v],i)=>i?c.lineTo(X(lat),Y(v)):c.moveTo(X(lat),Y(v)));c.strokeStyle='#8be6ce';c.lineWidth=2;c.stroke();c.lineTo(X(90),h-bottom);c.lineTo(X(-90),h-bottom);c.closePath();const grad=c.createLinearGradient(0,top,0,h-bottom);grad.addColorStop(0,'#8be6ce20');grad.addColorStop(1,'#8be6ce00');c.fillStyle=grad;c.fill();for(const lat of [-90,-45,0,45,90]){c.textAlign='center';c.fillStyle='#91a2b3';c.fillText(lat===0?'赤道 0°':Math.abs(lat)+'°'+(lat<0?'S':'N'),X(lat),h-10)}const x=X(state.lat),y=Y(result.g);c.setLineDash([3,4]);c.strokeStyle='#eaba7980';c.beginPath();c.moveTo(x,top);c.lineTo(x,h-bottom);c.stroke();c.setLineDash([]);c.fillStyle='#eaba79';c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();c.textAlign=x>w-140?'right':'left';c.fillText(result.g.toFixed(6),x+(x>w-140?-8:8),Math.max(17,y-10));c.textAlign='left'}
$('chart').addEventListener('click',e=>{const box=$('chart').getBoundingClientRect(),{left,right,w}=chartDims;setState({lat:+Math.max(-90,Math.min(90,(e.clientX-box.left-left)/(w-left-right)*180-90)).toFixed(4)},true)});
window.addEventListener('resize',()=>{drawGlobe();drawVectors();drawChart()});setState({});
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'set_observation',description:'设置观测经纬度、椭球高和质量，并更新可见重力结果。',inputSchema:{type:'object',properties:{lat:{type:'number',minimum:-90,maximum:90},lon:{type:'number',minimum:-180,maximum:180},h:{type:'number',minimum:-1000,maximum:100000},mass:{type:'number',exclusiveMinimum:0,maximum:1000000}},required:['lat','lon'],additionalProperties:false},execute(input){if(!input||typeof input!=='object'||!Number.isFinite(input.lat)||!Number.isFinite(input.lon)||Object.keys(input).some(k=>!['lat','lon','h','mass'].includes(k)))throw Error('无效观测输入');if(!setState(input,true))throw Error('参数超出范围');return {lat:result.lat,lon:result.lon,g:result.g,grav:result.grav,cent:result.cent,force:result.force}}})).catch(()=>{})}catch{}}

