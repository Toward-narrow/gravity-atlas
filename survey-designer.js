/* Direct manipulation editor: never commits a budget or geometry violation. */
'use strict';
window.SurveyDesigner=(()=>{
  const Lab=window.SurveyLab,P=window.SurveyPhysics,$=id=>document.getElementById(id),fmt=(v,n=0)=>v.toLocaleString('zh-CN',{maximumFractionDigits:n});
  const keys=[['svSpacing','spacing'],['svLineSpacing','lineSpacing'],['svLength','length'],['svLines','lines'],['svAngle','angle']];
  let handles=[],layout=null,drag=null,pending=null,raf=0,blocked='',resets=new Map(),revision=0;
  $('svDesign').innerHTML=`<div class="sv-top"><div><span class="eyebrow">DRAG / MEASURE / SEE</span><h2>拖动测网，马上看到重力场。</h2></div><div class="sv-actions"><select id="svActivePlan" aria-label="选择要拖动的测线方案"></select><button id="svAddPlan" class="sv-secondary">保留副本继续试</button><button id="svResetPlan" class="sv-secondary">还原这组测网</button></div></div>
    <p class="sv-drag-intro">拖中心移动，拖边缘改变覆盖，拖圆弧手柄旋转。下方滑条调整测点疏密与测线数量；布点、场图和费用同步变化。</p>
    <div class="sv-live-grid"><div class="sv-live-pane"><div class="sv-live-title"><h3>当前测线系统</h3><span class="sv-tag" id="svLayoutTag"></span></div><canvas id="svLayout" tabindex="0" aria-label="直接拖动测网。中心手柄移动，长边手柄调整线长，侧边手柄调整线距，圆弧手柄旋转。方向键移动，Shift 加方向键旋转"></canvas><div class="sv-drag-legend"><span><i class="sv-handle-move"></i>移动</span><span><i class="sv-handle-length"></i>线长</span><span><i class="sv-handle-width"></i>线距</span><span><i class="sv-handle-turn"></i>旋转</span><span>白点＝实际测点</span></div></div>
    <div class="sv-live-pane"><div class="sv-live-title"><h3 id="svLiveTitle">当前观测系统重力场图</h3><span class="sv-live-indicator">● 实时联动</span></div><canvas id="svLiveField" aria-label="随测网拖动实时更新的重力平面图，含观测点、比例尺和色标"></canvas><div class="sv-drag-inspect" id="svLiveInspect">灰色为测网外，白点为观测点；500 m 距离尺随图保持有效。</div></div></div>
    <div class="sv-direct-sliders">
      <label for="svSpacing"><span>点的疏密 <output id="svSpacingOut"></output></span><input id="svSpacing" type="range" min="50" max="2000" step="1"><small>更密 ← 拖动 → 更疏</small></label>
      <label for="svLineSpacing"><span>线的疏密 <output id="svLineSpacingOut"></output></span><input id="svLineSpacing" type="range" min="50" max="2000" step="1"><small>更密 ← 拖动 → 更疏</small></label>
      <label for="svLength"><span>测线长度 <output id="svLengthOut"></output></span><input id="svLength" type="range" min="100" max="2000" step="1"><small>缩短 ← 拖动 → 加长</small></label>
      <label for="svLines"><span>测线数量 <output id="svLinesOut"></output></span><input id="svLines" type="range" min="2" max="21" step="1"><small>减少 ← 拖动 → 增加</small></label>
      <label for="svAngle"><span>测网方向 <output id="svAngleOut"></output></span><input id="svAngle" type="range" min="0" max="180" step="0.1"><small>正北 0° ← 拖动 → 180°</small></label>
    </div><div class="sv-direct-bottom"><div class="sv-tally" id="svTally" aria-live="polite"></div><div><div id="svPlanNotice" class="sv-drag-limit" role="status"></div><div class="sv-formula" id="svFormula"></div></div></div>`;
  function remember(){const s=Lab.getState(),names=new Set(s.plans.map(p=>p.name));for(const name of resets.keys())if(!names.has(name))resets.delete(name);s.plans.forEach(p=>{if(!resets.has(p.name))resets.set(p.name,{...p});});}
  function sync(){
    remember();const r=Lab.getCurrent(),p=r.plan,g=r.geometry,s=Lab.getState();
    const picker=$('svActivePlan');if(picker.options.length!==s.plans.length||Array.from(picker.options).some((o,i)=>o.text!==s.plans[i].name))picker.innerHTML=s.plans.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('');picker.value=s.selected_plan;
    for(const [id,key]of keys){$(id).value=p[key];$(id).setAttribute('aria-valuetext',key==='lines'?p.lines+' 条':fmt(p[key],1)+(key==='angle'?' 度':' 米'));$(id+'Out').textContent=fmt(p[key],key==='lines'?0:1)+(key==='lines'?' 条':key==='angle'?'°':' m');}
    $('svLayoutTag').textContent=`${p.lines} 条线 × ${g.perLine} 点`;$('svAddPlan').disabled=s.plans.length>=16;
    $('svTally').innerHTML=`<div class="sv-row"><strong>${g.count}<small> / ${fmt(P.costs().maxPoints)} 点</small></strong><b>¥${fmt(g.cost,2)}</b></div><div class="sv-meter"><i style="width:${Math.min(100,g.cost/P.BUDGET*100)}%"></i></div><p>余额 ¥${fmt(P.BUDGET-g.cost,2)} · 覆盖 ${fmt(r.coverage*100,1)}% · 实际线长 ${fmt(g.actualLength,1)} m</p>`;
    $('svPlanNotice').classList.toggle('sv-is-blocked',!!blocked);$('svPlanNotice').textContent=blocked?'已停止 · '+blocked:'可以继续拖动 · 超预算、越界、间距过小或测网退化时会自动停住。';
    $('svLayout').classList.toggle('sv-at-limit',!!blocked);
    const h=Lab.getReferenceDepth();$('svFormula').textContent=`当前目标中心深度 ${fmt(h)} m：经验点距 ${fmt(h/3,1)}～${fmt(h/2,1)} m，经验线长 ${fmt(h*3)}～${fmt(h*5)} m。间距最小 50 m，至少 2 条线且每线至少 2 点；经验式作为提示。`;
    drawLayout();drawField();
  }
  function drawLayout(){
    if(document.body.dataset.atlas!=='survey')return;
    const canvas=$('svLayout'),box=canvas.getBoundingClientRect(),w=Math.max(280,box.width),h=Math.max(280,box.height),d=Math.min(2,devicePixelRatio||1),c=canvas.getContext('2d');canvas.width=w*d;canvas.height=h*d;c.setTransform(d,0,0,d,0,0);
    const s=Math.min(w-92,h-92),left=(w-s)/2,top=(h-s)/2-3,scale=s/2000,X=x=>left+x*scale,Y=y=>top+s-y*scale;
    layout={left,top,size:s,w,h,scale};c.fillStyle='#0c1822';c.fillRect(0,0,w,h);c.fillStyle='#11242c';c.fillRect(left,top,s,s);c.strokeStyle='#719f9d24';c.lineWidth=1;
    for(let n=0;n<=2000;n+=250){c.beginPath();c.moveTo(X(n),Y(0));c.lineTo(X(n),Y(2000));c.moveTo(X(0),Y(n));c.lineTo(X(2000),Y(n));c.stroke();}
    c.strokeStyle='#607f87';c.strokeRect(left,top,s,s);c.font='10px Consolas,monospace';c.fillStyle='#8ca7b1';c.textAlign='center';for(const n of [0,1000,2000]){c.fillText(String(n),X(n),Y(0)+16);c.textAlign='right';c.fillText(String(n),left-7,Y(n)+4);c.textAlign='center';}c.fillText('东 / m',X(1000),Y(0)+33);c.fillText('北 ↑',X(2000)-17,Y(2000)+17);
    const r=Lab.getCurrent(),p=r.plan,g=r.geometry,uv=(u,v)=>[X(p.cx+g.ux*u+g.vx*v),Y(p.cy+g.uy*u+g.vy*v)];
    const corners=[uv(-g.actualLength/2,-g.width/2),uv(g.actualLength/2,-g.width/2),uv(g.actualLength/2,g.width/2),uv(-g.actualLength/2,g.width/2)];
    c.beginPath();corners.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.closePath();c.fillStyle='#89ead00c';c.fill();c.strokeStyle=blocked?'#edb784':'#86d6c2';c.setLineDash([5,4]);c.stroke();c.setLineDash([]);
    for(let j=1;j<=p.lines;j++){const pts=r.points.filter(t=>t.line===j);c.beginPath();c.moveTo(X(pts[0].x),Y(pts[0].y));c.lineTo(X(pts.at(-1).x),Y(pts.at(-1).y));c.strokeStyle='#83d9c57a';c.lineWidth=1;c.stroke();}
    for(const t of r.points){c.beginPath();c.arc(X(t.x),Y(t.y),2.4,0,Math.PI*2);c.fillStyle='#e1fff3';c.fill();}
    // The rotation grip follows the diagonal, staying clear of the two resize grips.
    const centre=uv(0,0),tip=uv(g.actualLength/2,g.width/2),vx=tip[0]-centre[0],vy=tip[1]-centre[1],vl=Math.hypot(vx,vy)||1,rotation=[tip[0]+vx/vl*23,tip[1]+vy/vl*23];
    rotation[0]=Math.max(18,Math.min(w-18,rotation[0]));rotation[1]=Math.max(18,Math.min(h-18,rotation[1]));
    c.beginPath();c.moveTo(...tip);c.lineTo(...rotation);c.strokeStyle='#c8b6f29e';c.stroke();
    handles=[{kind:'move',xy:centre,color:'#96edce',symbol:'✥'},{kind:'length',xy:uv(g.actualLength/2,0),color:'#87caff',symbol:'↕'},{kind:'width',xy:uv(0,g.width/2),color:'#f3c38e',symbol:'↔'},{kind:'rotate',xy:rotation,color:'#c9b3f5',symbol:'↻'}];
    for(const handle of handles){c.beginPath();c.arc(...handle.xy,11,0,Math.PI*2);c.fillStyle='#10232f';c.fill();c.strokeStyle=handle.color;c.lineWidth=2;c.stroke();c.font='16px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=handle.color;c.fillText(handle.symbol,...handle.xy);}
    c.textBaseline='alphabetic';
    const legend=(text,xy,col,dy)=>{c.font='11px sans-serif';c.fillStyle=col;c.textAlign='center';c.fillText(text,xy[0],Math.max(14,Math.min(h-9,xy[1]+dy)));};
    legend('移动',centre,'#a8ddcb',27);legend('线长',uv(g.actualLength/2,0),'#9ecdee',-18);legend('线距',uv(0,g.width/2),'#e4c69d',26);legend('旋转',rotation,'#c9b3f5',-18);
  }
  function drawField(){if(document.body.dataset.atlas!=='survey')return;Lab.drawCurrent($('svLiveField'));const mode=Lab.getState().map_mode;$('svLiveTitle').textContent='当前重力场 · '+({observed:'观测点插值',truth:'模型真值与布点',error:'插值误差'}[mode]);}
  function commit(target){
    const before=Lab.getCurrent().plan,limited=P.constrainPlan(before,target);blocked=limited.blocked?limited.reason:'';
    if(!['spacing','lineSpacing','length','lines','cx','cy','angle'].some(k=>Math.abs(limited.plan[k]-before[k])>1e-8)){sync();return;}
    revision++;Lab.updatePlan(limited.plan);
  }
  function schedule(target){pending=target;if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const value=pending;pending=null;if(value)commit(value);});}
  function flush(){if(raf)cancelAnimationFrame(raf);raf=0;const value=pending;pending=null;if(value)commit(value);}
  function world(e){const b=$('svLayout').getBoundingClientRect(),px=(e.clientX-b.left)*layout.w/b.width,py=(e.clientY-b.top)*layout.h/b.height;return {px,py,x:(px-layout.left)/layout.scale,y:(layout.top+layout.size-py)/layout.scale};}
  $('svLayout').addEventListener('pointerdown',e=>{
    if(!layout)return;flush();const pt=world(e),handle=handles.reduce((a,b)=>Math.hypot(a.xy[0]-pt.px,a.xy[1]-pt.py)<Math.hypot(b.xy[0]-pt.px,b.xy[1]-pt.py)?a:b);
    const r=Lab.getCurrent();if(Math.hypot(handle.xy[0]-pt.px,handle.xy[1]-pt.py)>23&&!P.covered(r.plan,r.geometry,pt.x,pt.y))return;
    const kind=Math.hypot(handle.xy[0]-pt.px,handle.xy[1]-pt.py)<=23?handle.kind:'move';
    drag={kind,start:pt,plan:{...r.plan},geometry:r.geometry};$('svLayout').setPointerCapture(e.pointerId);e.preventDefault();
  });
  $('svLayout').addEventListener('pointermove',e=>{
    if(!layout)return;const pt=world(e);if(!drag){$('svLayout').style.cursor=handles.some(h=>Math.hypot(h.xy[0]-pt.px,h.xy[1]-pt.py)<23)?'grab':'move';return;}
    const p={...drag.plan},g=drag.geometry,dx=pt.x-drag.start.x,dy=pt.y-drag.start.y;
    if(drag.kind==='move'){p.cx+=dx;p.cy+=dy;}
    if(drag.kind==='length')p.length=drag.geometry.actualLength+2*(dx*g.ux+dy*g.uy);
    if(drag.kind==='width')p.lineSpacing=drag.plan.lineSpacing+2*(dx*g.vx+dy*g.vy)/(p.lines-1);
    if(drag.kind==='rotate'){
      const initial=Math.atan2(drag.start.x-p.cx,drag.start.y-p.cy),now=Math.atan2(pt.x-p.cx,pt.y-p.cy),delta=Math.atan2(Math.sin(now-initial),Math.cos(now-initial))*180/Math.PI;
      p.angle+=delta;
    }
    schedule(p);e.preventDefault();
  });
  function endDrag(){flush();drag=null;}
  for(const name of ['pointerup','pointercancel','lostpointercapture'])$('svLayout').addEventListener(name,endDrag);
  $('svLayout').addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const p={...Lab.getCurrent().plan};if(e.shiftKey)p.angle+=e.key==='ArrowRight'||e.key==='ArrowUp'?2:-2;else{if(e.key==='ArrowLeft')p.cx-=25;if(e.key==='ArrowRight')p.cx+=25;if(e.key==='ArrowUp')p.cy+=25;if(e.key==='ArrowDown')p.cy-=25;}commit(p);});
  for(const [id,key]of keys){$(id).addEventListener('input',()=>schedule({...Lab.getCurrent().plan,[key]:+$(id).value}));$(id).addEventListener('change',flush);}
  $('svActivePlan').onchange=()=>{flush();blocked='';Lab.selectPlan(+$('svActivePlan').value);};
  $('svAddPlan').onclick=()=>{flush();blocked='';Lab.duplicatePlan();};
  $('svResetPlan').onclick=()=>{flush();blocked='';const p=Lab.getCurrent().plan,original=resets.get(p.name);if(original)Lab.updatePlan(P.fitBudget({...original}));};
  $('svLiveField').addEventListener('pointermove',e=>{
    const canvas=e.currentTarget,m=canvas._map;if(!m)return;const b=canvas.getBoundingClientRect(),x=((e.clientX-b.left)*m.w/b.width-m.left)/m.size*2000,y=(1-((e.clientY-b.top)*m.h/b.height-m.top)/m.size)*2000;if(x<0||x>2000||y<0||y>2000)return;
    const r=Lab.getCurrent();$('svLiveInspect').textContent=`E ${fmt(x)} m / N ${fmt(y)} m · `+(P.covered(r.plan,r.geometry,x,y)?'观测插值 '+fmt(P.interpolate(r.points,x,y),4)+' mGal':'测网外，无观测恢复值');
  });
  remember();Lab.selectPlan(Math.min(2,Lab.getState().plans.length-1));
  // The owner calls sync after every selected-plan, model, route and noise update.
  requestAnimationFrame(sync);
  return {finishDrag:()=>{endDrag();blocked='';},sync,drawField,getHandles:()=>handles.map(h=>({...h,xy:[...h.xy]})),getRevision:()=>revision};
})();
