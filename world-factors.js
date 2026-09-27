/* Globe-linked scientific schematics. Geometry is deliberately magnified;
 * all parameter updates use the existing validated physics state. */
(() => {
 'use strict';
 const planet=document.querySelector('.planet');
 const dock=document.createElement('div');dock.className='world-dock';
 dock.innerHTML='<div class="world-dock-title"><span>在地球上做实验</span><button id="worldExpand" class="quiet" aria-pressed="false">⛶ 放大工作区</button></div><div class="world-chips">'+factorMeta.map(f=>`<div class="world-chip" style="--factor:${f.color}"><button data-world-select="${f.id}" aria-label="在地球上查看${f.label}">${f.icon} ${f.label}</button><input type="checkbox" id="world-${f.id}" aria-label="地球场景：计入${f.label}"></div>`).join('')+'</div>';
 document.querySelector('.globe-tools').after(dock);
 const hint=document.createElement('div');hint.className='world-hint';hint.innerHTML='<span id="worldHint">拖动高空测点改变高度；拖动地球转动视角。</span><button id="worldFocus" class="quiet">⊕ 回到测点</button>';
 $('globe').after(hint);
 const inspector=document.createElement('div');inspector.className='world-inspector';
 inspector.innerHTML='<div class="world-inspector-head"><span id="worldTitle"></span><strong id="worldDelta"></strong></div><div class="world-slider-row"><label for="worldSlider" id="worldSliderLabel"></label><output id="worldSliderValue"></output><input id="worldSlider" type="range"></div><div class="world-slider-row" id="worldSecondary"><label for="worldSlider2" id="worldSliderLabel2"></label><output id="worldSliderValue2"></output><input id="worldSlider2" type="range"></div><div class="world-actions"><button id="worldToggle" class="quiet"></button><button id="worldAction" class="quiet"></button><span id="worldResult"></span></div><p id="worldExplanation"></p>';
 hint.after(inspector);
 const note=document.createElement('p');note.className='world-scale-note';note.textContent='地球上的高度、地下剖面和天体距离均经放大或压缩示意；测点数值仍按真实参数计算。';inspector.after(note);
 const specs={
  height:{title:'把测点抬高，重力怎样变？',key:'h',label:'椭球高',min:-1000,max:10000,step:10,unit:'m',help:'拖动地球上绿色的高度手柄，或拖动这里的高度尺。',explain:'绿色连线显示测点离参考椭球面的高度，视觉长度经放大。关闭高度项后，计算回到 h=0。',action:'读取此处高程'},
  rotation:{title:'离心作用沿着远离自转轴的方向。',key:'spin',label:'自转速度',min:0,max:2,step:.01,unit:'×',help:'金色轨道与箭头显示自转和离心方向；拖动金色速度手柄。',explain:'轨道表示自转方向，金色箭头表示测点的离心方向；箭头长度为对数示意。地球形状保持固定。',action:'恢复真实自转'},
  slab:{title:'揭开测点下方的等效岩层。',key:'thickness',label:'等效岩层厚度',min:0,max:10000,step:10,unit:'m',key2:'density',label2:'岩层密度',min2:0,max2:5000,step2:10,unit2:'kg/m³',help:'拖动剖面中棕色的岩层下边界，改变厚度。',explain:'剖面与测点连线，展示相对测点定义的局部模型。岩层是无限平板近似，图中只画出有限窗口。',action:'取当前海拔作厚度'},
  sphere:{title:'拖动地下异常体，看引力方向改变。',key:'contrast',label:'相对背景密度差',min:-3000,max:5000,step:50,unit:'kg/m³',key2:'radius',label2:'异常体半径',min2:10,max2:5000,step2:10,unit2:'m',help:'拖动剖面中的球体改变东向位置和深度；拖动半径手柄改变大小。',explain:'暖色表示正密度差，蓝色表示负密度差。剖面为东—垂向投影，北向偏移由详细参数设置；深度须不小于半径。',action:'切换正 / 负密度差'},
  water:{title:'储水增减，地球上的蓝色水层同步变化。',key:'waterMM',label:'等效储水厚度变化',min:-5000,max:5000,step:10,unit:'mm',help:'上下拖动剖面里的蓝色水量手柄，增加或减少地下储水。',explain:'蓝色实带为新增储水，虚线带为储水减少；带宽夸张显示等效水厚，不表示地下水位或含水层厚度。',action:'增加 / 减少切换'},
  tide:{title:'让日月走过一天，观察此处的引潮变化。',key:'time',label:'相对所选起始时刻',min:0,max:24,step:.25,unit:'h',help:'点击日月标记选中引潮；在地球区域拖动时间尺或播放一天。',explain:'日月方位由星历投影，天体距离压缩，虚线表示天体位于视图后方。紫色箭头表示测点的直接引潮投影。',action:'▶ 播放 / 暂停一天'}
 };
 let active='height',lastActive='',hits=[],lens=null,gesture=null,expanded=false;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const getValue=key=>key==='h'?state.h:key==='spin'?state.spin:key==='time'?Number($('timePlay').value):factors[key];
 function commit(key,v){if(key==='h')return setState({h:v});if(key==='spin')return setState({spin:v});if(key==='time'){stopPlayback();$('timePlay').value=v;applyTimeOffset();return true}if(key==='radius')return updateFactors({radius:v,depth:Math.max(factors.depth,v)});return updateFactors({[key]:v})}
 function choose(id,enable=false){active=id;if(enable&&!factors[id])updateFactors({[id]:true});selectFactor(id);sync();drawGlobe()}
 function focusPoint(){view={lat:state.lat*.75,lon:state.lon};drawGlobe()}
 document.querySelectorAll('[data-world-select]').forEach(b=>b.onclick=()=>{choose(b.dataset.worldSelect);focusPoint()});
 factorMeta.forEach(f=>$('world-'+f.id).onchange=e=>{if(!updateFactors({[f.id]:e.target.checked}))e.target.checked=factors[f.id];choose(f.id);focusPoint()});
 $('worldFocus').onclick=focusPoint;
 $('worldToggle').onclick=()=>updateFactors({[active]:!factors[active]});
 const notice=document.createElement('p');notice.id='worldNotice';notice.setAttribute('role','status');inspector.append(notice);
 $('worldAction').onclick=async()=>{
  if(active==='height'){notice.textContent='正在读取测点高程…';await $('fetchElevation').onclick();notice.textContent=$('elevationStatus').textContent;return}
  if(active==='rotation')$('restore').click();
  if(active==='slab')$('useSurfaceThickness').click();
  if(active==='sphere')updateFactors({contrast:factors.contrast===0?500:clamp(-factors.contrast,-3000,5000)});
  if(active==='water')updateFactors({waterMM:-factors.waterMM});
  if(active==='tide')$('playTime').click();
  notice.textContent=$('factorError').textContent;
 };
 $('worldSlider').oninput=()=>commit(specs[active].key,Number($('worldSlider').value));
 $('worldSlider2').oninput=()=>commit(specs[active].key2,Number($('worldSlider2').value));
 $('worldExpand').onclick=()=>{expanded=!expanded;document.body.classList.toggle('world-expanded',expanded);$('worldExpand').textContent=expanded?'↙ 返回页面':'⛶ 放大工作区';$('worldExpand').setAttribute('aria-pressed',expanded);drawGlobe()};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded)$('worldExpand').click()});
 function sync(){
  active=selectedFactor;
  const s=specs[active],meta=factorMeta.find(f=>f.id===active),term=result.terms.find(t=>t.id===active);
  inspector.style.setProperty('--factor',meta.color);
  $('worldTitle').textContent=meta.icon+' '+s.title;
  $('worldDelta').textContent=signed(term.delta,5)+' mGal';
  $('worldHint').textContent=s.help;
  $('worldExplanation').textContent=s.explain;
  $('worldToggle').textContent=factors[active]?'已计入 · 点击关闭':'未计入 · 点击开启';
  $('worldToggle').setAttribute('aria-pressed',factors[active]);
  $('worldAction').textContent=s.action;
  $('worldResult').textContent='g = '+result.g.toFixed(8)+' m/s²';
  if(lastActive!==active){notice.textContent='';for(const suffix of ['','2']){const slider=$('worldSlider'+suffix),key=suffix?'key2':'key';if(!s[key])continue;slider.min=s['min'+suffix];slider.max=s['max'+suffix];slider.step=s['step'+suffix];$('worldSliderLabel'+suffix).textContent=s['label'+suffix];}lastActive=active}
  for(const suffix of ['','2']){const key=s[suffix?'key2':'key'];if(!key)continue;let v=getValue(key);const slider=$('worldSlider'+suffix);slider.max=Math.max(s['max'+suffix],v);slider.min=Math.min(s['min'+suffix],v);slider.value=v;$('worldSliderValue'+suffix).textContent=(key==='time'?v.toFixed(2):key==='spin'?v.toFixed(2):v.toFixed(0))+' '+s['unit'+suffix];}
  $('worldSecondary').hidden=!s.key2;
  factorMeta.forEach(f=>{$('world-'+f.id).checked=factors[f.id];const b=document.querySelector('[data-world-select="'+f.id+'"]');b.setAttribute('aria-pressed',active===f.id);b.parentElement.classList.toggle('is-active',active===f.id);b.parentElement.classList.toggle('is-on',factors[f.id])});
 }
 const oldRender=renderUpgrade;renderUpgrade=function(){oldRender();sync()};
 const oldSelect=selectFactor;selectFactor=function(id){oldSelect(id);active=id;sync();drawGlobe()};
 function line(c,a,b,color,width=1,dash=[]){c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();c.setLineDash([])}
 function text(c,label,x,y,color='#bed0dc',align='left',size=12){c.fillStyle=color;c.font=size+'px "Segoe UI","Microsoft YaHei",sans-serif';c.textAlign=align;c.fillText(label,x,y);c.textAlign='left'}
 function handle(c,x,y,id,color,label,dx=14,dy=4){c.fillStyle='#0d1b28';c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.fill();c.stroke();hits.push({x,y,r:17,id});if(label)text(c,label,x+dx,y+dy,color,dx<0?'right':'left',11)}
 function localVector(v){const p=state.lat*RAD,l=state.lon*RAD;return {x:-Math.sin(l)*v.east-Math.sin(p)*Math.cos(l)*v.north+Math.cos(p)*Math.cos(l)*v.up,y:Math.cos(l)*v.east-Math.sin(p)*Math.sin(l)*v.north+Math.cos(p)*Math.sin(l)*v.up,z:Math.cos(p)*v.north+Math.sin(p)*v.up}}
 function projectedVector(v){const p=view.lat*RAD,l=view.lon*RAD;return [-Math.sin(l)*v.x+Math.cos(l)*v.y,Math.sin(p)*Math.cos(l)*v.x+Math.sin(p)*Math.sin(l)*v.y-Math.cos(p)*v.z,Math.cos(p)*Math.cos(l)*v.x+Math.cos(p)*Math.sin(l)*v.y+Math.sin(p)*v.z]}
 function draw(c,project,d){
  hits=[];const {w,h,R,cx,cy}=d,P=project(state.lon,state.lat);c.save();
  if(factors.rotation){
   c.strokeStyle='#eaba7955';c.lineWidth=1.4;c.setLineDash([4,5]);c.beginPath();for(let i=0;i<=180;i++){const v=project(i*2-180,0),x=cx+(v[0]-cx)*1.12,y=cy+(v[1]-cy)*1.12;i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke();c.setLineDash([]);
   const q=project(view.lon+66,0),v=project(view.lon+70,0);arrow(c,cx+(q[0]-cx)*1.12,cy+(q[1]-cy)*1.12,(v[0]-q[0])*1.12,(v[1]-q[1])*1.12,'#eaba79',2);
   const hx=clamp(cx-R*.83,22,w-80),hy=cy+R*.78;handle(c,hx,hy,'rotation','#eaba79',state.spin.toFixed(2)+'×');
   if(P[2]>=0){const v=projectedVector(localVector(result.centrifugal)),len=Math.hypot(v[0],v[1]),size=14+20*Math.log1p(result.cent/.01);if(len>1e-10)arrow(c,P[0],P[1],size*v[0]/len,size*v[1]/len,'#eaba79',2)}
  }
  if(factors.height&&P[2]>=0){
   let vx=P[0]-cx,vy=P[1]-cy,len=Math.hypot(vx,vy);if(len<R*.25){vx=-.65;vy=-.76;len=1}vx/=len;vy/=len;
   const lift=24+clamp(state.h,-1000,100000)/10000*35,px=clamp(P[0]+vx*Math.min(115,lift),18,w-18),py=clamp(P[1]+vy*Math.min(115,lift),22,h-16);
   line(c,P,[px,py],'#8be6ce',1.4,[3,3]);handle(c,px,py,'height','#8be6ce',null);text(c,'h '+state.h.toFixed(0)+' m',clamp(px+10,8,w-95),py-10,'#8be6ce','left',11);
  }
  if(factors.tide){
   const tides=result.tides;for(const [name,body,color,mult] of [['太阳',tides.bodies.sun,'#ffd18b',1.5],['月球',tides.bodies.moon,'#c6b4f6',1.22]]){
    const v=projectedVector(body),len=Math.hypot(v[0],v[1])||1,ux=v[0]/len,uy=v[1]/len;
    const limits=[R*mult];if(ux>0)limits.push((w-32-cx)/ux);if(ux<0)limits.push((32-cx)/ux);if(uy>0)limits.push((h*.59-cy)/uy);if(uy<0)limits.push((35-cy)/uy);
    const radius=Math.max(0,Math.min(...limits)),x=cx+ux*radius,y=cy+uy*radius;
    line(c,[cx,cy],[x,y],color+'66',1,v[2]<0?[3,6]:[]);c.fillStyle=color;c.shadowBlur=name==='太阳'?16:5;c.shadowColor=color;c.beginPath();c.arc(x,y,name==='太阳'?12:8,0,2*Math.PI);c.fill();c.shadowBlur=0;text(c,name+(v[2]<0?' · 后方':' · 前方'),x,y+26,color,'center',11);hits.push({x,y,r:23,id:'tide'});
   }
   if(P[2]>=0){const v=projectedVector(localVector(tides.total)),len=Math.hypot(v[0],v[1]);if(len>0)arrow(c,P[0],P[1],v[0]/len*32,v[1]/len*32,'#c6b4f6',2)}
   text(c,new Date(factors.time).toISOString().slice(0,16).replace('T',' ')+' UTC',w-12,20,'#c6b4f6','right',11);
  }
  drawLens(c,P,d);
  if(P[2]<0){text(c,'测点在背面 · 剖面仍显示当前测点',w/2,h-8,'#c8d5df','center',11)}
  c.restore();
 }
 function drawLens(c,P,d){
  const {w,h,R,cx,cy}=d,bw=Math.min(w-28,Math.max(270,w*.67)),bh=Math.min(225,h*.34),x=clamp(cx+R*.26-bw*.28,14,w-bw-14),y=h-bh-23;
  const top=y+53,origin=x+bw*.50,extent=Math.max(4500,Math.abs(factors.east)+factors.radius+500,factors.depth+factors.radius+500,factors.slab?factors.thickness+500:0);
  const scale=gesture&&gesture.lens?gesture.lens.scale:Math.min((bw-35)/(2*extent),(bh-81)/extent);
  lens={x,y,w:bw,h:bh,top,origin,scale};
  if(P[2]>=0)line(c,P,[origin,y],'#89b5b688',1,[4,4]);
  c.fillStyle='#0a1521ed';c.strokeStyle='#50717c';c.lineWidth=1;c.beginPath();c.roundRect(x,y,bw,bh,12);c.fill();c.stroke();
  text(c,'测点地下 · 局部放大剖面',x+13,y+21,'#c8dde6','left',12);
  text(c,'W',x+13,top-10,'#8fa6b8','left',10);text(c,'E',x+bw-12,top-10,'#8fa6b8','right',10);
  c.save();c.beginPath();c.rect(x+8,top,bw-16,bh-69);c.clip();
  c.fillStyle='#13222f';c.fillRect(x+8,top,bw-16,bh-69);
  if(factors.slab){const height=factors.thickness*scale;c.fillStyle='#c8ac8838';c.fillRect(x+8,top,bw-16,height);for(let i=top+6;i<top+height;i+=8)line(c,[x+8,i],[x+bw-8,i],'#c8ac8845');}
  if(factors.water){const wy=top+18,wh=3+Math.abs(factors.waterMM)/5000*17;c.fillStyle=factors.waterMM>=0?'#67b9fc45':'#67b9fc12';c.fillRect(x+8,wy,bw-16,wh);for(let i=0;i<3;i++){c.strokeStyle='#7ebcfa99';c.setLineDash(factors.waterMM<0?[4,5]:[]);c.beginPath();for(let k=0;k<=bw-16;k+=4){const yy=wy+i*wh/3+Math.sin(k/15)*2;k?c.lineTo(x+8+k,yy):c.moveTo(x+8+k,yy)}c.stroke()}c.setLineDash([]);}
  line(c,[origin,top],[origin,y+bh-15],'#60798366',1,[3,5]);
  if(factors.sphere){const bx=origin+factors.east*scale,by=top+factors.depth*scale,br=Math.max(3,factors.radius*scale),color=factors.contrast>=0?'#ff9a7c':'#7ebcfa';const grad=c.createRadialGradient(bx-br*.3,by-br*.3,0,bx,by,br);grad.addColorStop(0,color+'ba');grad.addColorStop(1,color+'35');c.fillStyle=grad;c.strokeStyle=color;c.lineWidth=1.7;c.beginPath();c.arc(bx,by,br,0,Math.PI*2);c.fill();c.stroke();
   hits.push({x:bx,y:by,r:Math.max(16,br),id:'sphere'});
   if(active==='sphere'){line(c,[bx+br,by],[bx+br+20,by],color,1);handle(c,bx+br+20,by,'radius',color,null);hits[hits.length-1].r=9;text(c,'Δρ '+signed(factors.contrast,0),clamp(bx+br+9,x+8,x+bw-98),Math.min(y+bh-25,by+20),color,'left',10)}
   const v=result.terms.find(t=>t.id==='sphere').vector,n=Math.hypot(v.east,v.up);if(n>0)arrow(c,origin,top,v.east/n*27,-v.up/n*27,color,1.5);
  }
  c.restore();line(c,[x+8,top],[x+bw-8,top],'#bfd3d099',1);
  c.fillStyle='#8be6ce';c.beginPath();c.arc(origin,top,3.5,0,Math.PI*2);c.fill();text(c,'P',origin+8,top-7,'#8be6ce','left',10);
  if(factors.slab){const sy=clamp(top+factors.thickness*scale,top+2,y+bh-25);handle(c,x+bw-18,sy,'slab','#c8ac88',null);text(c,'t '+factors.thickness.toFixed(0)+' m',x+bw-29,sy-5,'#c8ac88','right',10)}
  if(factors.water){handle(c,x+19,top+22,'water','#7ebcfa',null);text(c,signed(factors.waterMM,0)+' mm',x+29,top+17,'#7ebcfa','left',10)}
  const bar=Math.min(1000,Math.floor((bw*.25)/scale/100)*100);line(c,[x+14,y+bh-13],[x+14+bar*scale,y+bh-13],'#9db1be',2);text(c,(bar/1000).toFixed(1)+' km',x+20+bar*scale,y+bh-9,'#9db1be','left',10);
  if(!factors.slab&&!factors.sphere&&!factors.water)text(c,'开启岩层 / 异常体 / 地下水，在这里操作',origin,top+45,'#8fa6b8','center',w<400?10:11);
 }
 const canvas=$('globe');
 canvas.addEventListener('pointerdown',e=>{
  const b=canvas.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top,hit=[...hits].reverse().find(t=>Math.hypot(x-t.x,y-t.y)<=t.r);
  if(!hit){if(lens&&x>=lens.x&&x<=lens.x+lens.w&&y>=lens.y&&y<=lens.y+lens.h){e.stopImmediatePropagation();e.preventDefault()}return}
  e.stopImmediatePropagation();e.preventDefault();drag=null;
  const id=hit.id==='radius'?'sphere':hit.id;active=id;choose(id);gesture={id:hit.id,x:e.clientX,y:e.clientY,value:hit.id==='height'?state.h:hit.id==='rotation'?state.spin:hit.id==='water'?factors.waterMM:0,factors:{...factors},lens:{...lens},hit};canvas.setPointerCapture(e.pointerId);
 },true);
 canvas.addEventListener('pointermove',e=>{
  if(!gesture){const b=canvas.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;canvas.style.cursor=hits.some(t=>Math.hypot(x-t.x,y-t.y)<=t.r)?'ns-resize':'grab';return}
  e.stopImmediatePropagation();e.preventDefault();const g=gesture,dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(g.id==='height')commit('h',Math.round(clamp(g.value-dy*100,-1000,100000)));
  if(g.id==='rotation')commit('spin',+clamp(g.value+dx/100,0,2).toFixed(2));
  if(g.id==='water')commit('waterMM',Math.round(clamp(g.value-dy*40,-5000,5000)));
  if(g.id==='slab')commit('thickness',Math.round(clamp(g.factors.thickness+dy/g.lens.scale,0,10000)));
  if(g.id==='sphere')updateFactors({east:Math.round(clamp(g.factors.east+dx/g.lens.scale,-20000,20000)),depth:Math.round(clamp(g.factors.depth+dy/g.lens.scale,factors.radius,20000))});
  if(g.id==='radius')commit('radius',Math.round(clamp(g.factors.radius+dx/g.lens.scale,10,5000)));
 },true);
 const release=e=>{if(!gesture)return;e.stopImmediatePropagation();gesture=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);drawGlobe()};
 canvas.addEventListener('pointerup',release,true);canvas.addEventListener('pointercancel',release,true);
 window.WorldFactors={draw,sync,getHandles:()=>hits.map(t=>({...t})),getLens:()=>({...lens}),select:choose};
 sync();drawGlobe();
})();
