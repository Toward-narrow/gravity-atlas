/* Interactive survey design laboratory. All model and survey work stays offline. */
'use strict';
window.SurveyLab = (() => {
  const P=window.SurveyPhysics, $=id=>document.getElementById(id), N=51;
  const clone=v=>JSON.parse(JSON.stringify(v)), fmt=(v,d=0)=>v===null?'—':v.toLocaleString('zh-CN',{maximumFractionDigits:d,minimumFractionDigits:d});
  const initialBodies=[{kind:'sphere',x:800,y:1000,z:300,rx:130,ry:130,rz:130,rho:600},{kind:'sphere',x:1400,y:1250,z:520,rx:200,ry:200,rz:200,rho:-450}];
  const initialPlans=[
    {name:'01 · 小范围密测',spacing:75,lineSpacing:75,length:675,lines:10,cx:1000,cy:1000,angle:0},
    {name:'02 · 局部精测',spacing:100,lineSpacing:100,length:900,lines:10,cx:1000,cy:1000,angle:0},
    {name:'03 · 线间疏采',spacing:100,lineSpacing:200,length:900,lines:10,cx:1000,cy:1000,angle:0},
    {name:'04 · 兼顾细节',spacing:125,lineSpacing:150,length:1125,lines:10,cx:1000,cy:1000,angle:0},
    {name:'05 · 目标区均衡',spacing:150,lineSpacing:150,length:1350,lines:10,cx:1000,cy:1000,angle:0},
    {name:'06 · 预留复测',spacing:150,lineSpacing:250,length:1350,lines:8,cx:1000,cy:1000,angle:0},
    {name:'07 · 中尺度覆盖',spacing:175,lineSpacing:175,length:1575,lines:10,cx:1000,cy:1000,angle:0},
    {name:'08 · 广域均衡',spacing:200,lineSpacing:200,length:1800,lines:10,cx:1000,cy:1000,angle:0},
    {name:'09 · 广域预留',spacing:200,lineSpacing:250,length:1800,lines:8,cx:1000,cy:1000,angle:0},
    {name:'10 · 全区普查',spacing:2000/9,lineSpacing:2000/9,length:2000,lines:10,cx:1000,cy:1000,angle:0}
  ];
  let bodies=clone(initialBodies), plans=clone(initialPlans), bodyIndex=0, selected=0, src=[],truth=[],results=[],range=.1,sigma=0,seed=7;
  let view='observed', showDots=true, showBodies=true, yaw=-.65,pitch=.65,zoom=1,drag=null,frame=0;
  const section=document.createElement('section');section.className='survey-lab';section.id='surveyLab';
  section.innerHTML=`
  <div class="sv-heading"><div><span class="eyebrow">09 / DESIGN BEFORE YOU MEASURE</span><h1>把测点，<em>放在值得测的地方。</em></h1><p>同一个地下，有限的预算。搭建密度异常体，比较测线布局，让重力信号从地下来到地表，再判断哪些结构能够被识别。</p></div><div class="sv-budget sv-cost-controls"><div class="sv-cost-fields"><label>总测量经费 / 元<input id="svBudget" type="number" min="0.01" step="100" value="20000"></label><label>单个测点价格 / 元<input id="svStationPrice" type="number" min="0.01" step="10" value="200"></label></div><div class="sv-cost-summary"><strong id="svCapacity">最多 100 点</strong><button id="svResetCosts" class="sv-secondary">恢复默认费用</button></div><small id="svCostsActive">当前生效：¥20000 · ¥200/点</small><p id="svCostsNotice" role="status">修改后离开输入框或按 Enter 生效。</p></div></div>
  <nav class="sv-steps" aria-label="测线设计步骤"><a href="#svModel">01 搭建地下</a><a href="#svDesign">02 设计测线</a><a href="#svCompare">03 比较平面图</a><a href="#svInterpret">04 判断可解译性</a></nav>
  <div class="sv-hero" id="svModel"><article class="panel sv-scene"><div class="sv-top"><h2>地下密度空间</h2><span class="sv-tag">2000 × 2000 × 1000 m</span></div><canvas id="svScene" tabindex="0" aria-label="三维地下密度模型和地表测点。拖动旋转，滚轮缩放，方向键旋转，加减键缩放"></canvas><div class="sv-caption"><span>拖动旋转 · 滚轮缩放 · 方向键也可旋转</span><span>橙：高密度 · 蓝：低密度 · 青：地表测点</span></div><div class="sv-row" style="margin-top:12px"><label class="sv-check"><input id="svShowBodies" type="checkbox" checked>透视异常体</label><button class="sv-secondary" id="svResetView">重置视角</button><span class="subtle" id="svScenePlan"></span></div></article>
  <article class="panel sv-controls"><div class="sv-top"><h2>构建你的地质模型</h2><span class="sv-tag">背景 2670 kg/m³</span></div><div class="sv-body-tabs" id="svBodyTabs"></div><div class="sv-fields">
    <label class="sv-full">异常体形状<select id="svKind"><option value="sphere">均匀球体 · 解析正演</option><option value="box">长方体 · 体元数值正演</option></select></label>
    <label>中心东坐标 x / m<input id="svX" type="number" min="0" max="2000" step="10"></label><label>中心北坐标 y / m<input id="svY" type="number" min="0" max="2000" step="10"></label>
    <label>中心埋深 h / m<input id="svZ" type="number" min="40" max="960" step="10"></label><label>密度差 Δρ / kg/m³<input id="svRho" type="number" min="-2000" max="2000" step="50"></label>
    <label id="svRxLabel">半径 R / m<input id="svRx" type="number" min="30" max="900" step="10"></label><label id="svRyWrap">北向半边长 / m<input id="svRy" type="number" min="30" max="900" step="10"></label><label id="svRzWrap">垂向半边长 / m<input id="svRz" type="number" min="30" max="490" step="10"></label>
  </div><div class="sv-actions"><button id="svApplyBody" class="sv-primary">更新地下模型</button><button id="svAddBody" class="sv-secondary">＋异常体</button><button id="svRemoveBody" class="sv-secondary">移除此体</button><button id="svResetModel" class="sv-secondary">恢复示例</button></div><p id="svBodyNotice" class="sv-notice" role="status"></p><p id="svBodyDensity" class="sv-model-note"></p></article></div>
  <article class="panel sv-design" id="svDesign"></article>
  <section class="sv-comparison" id="svCompare"><div class="sv-top"><div><span class="eyebrow">SAME EARTH / DIFFERENT SAMPLING</span><h2>每一种布点，都有自己的平面重力图。</h2></div><span class="sv-tag">坐标单位 m · 重力异常 mGal</span></div><p>所有图共享坐标范围与以零为中心的色标。灰色为测网之外，未作外推；白色小圆为实际观测点。点击方案卡片联动三维布点与剖面，悬停读取坐标和异常值。</p><div class="sv-switch"><label>方案图显示<select id="svMapMode"><option value="observed">测点 IDW 插值</option><option value="truth">模型真值＋此方案布点</option><option value="error">插值误差（恢复 − 真值）</option></select></label><label><input id="svShowDots" type="checkbox" checked>标注测点</label><label>噪声 σ / mGal<input id="svNoise" style="width:85px" type="number" min="0" max="0.05" step="0.001" value="0"></label><button id="svResample" class="sv-secondary">换一组噪声</button></div><div class="sv-maps" id="svMaps"></div><div class="sv-inspect" id="svInspect" role="status">悬停地图，查看每个位置的模型信号；点击地图选择对应方案。</div></section>
  <div class="sv-analysis" id="svInterpret"><article class="panel"><div class="sv-top"><h2>沿测线，读出异常。</h2><label class="sv-check">测线<select id="svProfileLine" style="width:auto"></select></label></div><canvas id="svProfile" aria-label="当前选中测线的连续模型真值与观测点剖面"></canvas><p id="svProfileNote"></p></article><article class="panel"><span class="eyebrow">INTERPRET / WHAT DID YOU MISS?</span><h2>先看覆盖，再看分辨能力。</h2><div id="svAdvice"></div></article></div>
  <article class="panel sv-design"><div class="sv-top"><h2>把方案放在同一张表里。</h2><span class="subtle">RMSE 仅统计各自测网覆盖内</span></div><div class="sv-table-wrap"><table><thead><tr><th>方案</th><th>点距 / 线距 m</th><th>线长 × 线数</th><th>点数 / 费用</th><th>覆盖率</th><th>RMSE mGal</th><th>未覆盖目标</th></tr></thead><tbody id="svTable"></tbody></table></div><div class="sv-export"><button class="sv-primary" id="svExportPNG">↓ 所有方案平面图 PNG</button><button class="sv-secondary" id="svExportCSV">↓ 所有测点 CSV</button><button class="sv-secondary" id="svExportJSON">↓ 模型与方案 JSON</button></div><p class="subtle" id="svExportNotice" role="status">导出图包含比例尺、坐标、观测点、色标和方案参数；模型真值图始终单独提供。</p></article>
  <details class="panel sv-details"><summary>经验公式、预算口径与计算说明</summary><p>按你提供的照片：Δx≈h/3～h/2。照片中线长公式右侧被截断，本实验暂采用 L≈3h～5h；h 暂定义为所选目标的中心埋深。h 随当前选中的异常体中心埋深联动。这两个经验式约束点距与线长，没有给定线距；线距需要结合异常横向变化与目标走向比较，不能直接当作点距。</p><p>固定空间为 x 东、y 北各 0～2000 m，深度 z 向下 0～1000 m，地表平坦。背景密度 2670 kg/m³，正演只积分密度差，不重复计算背景。球体采用外部引力解析式 Δg=G·(4πR³Δρ/3)·h/[r²+h²]³ᐟ²；长方体使用 8×8×8 等体积单元的中点积分，近浅顶面数值误差会增大。1 mGal=10⁻⁵ m/s²。图为合成垂向重力异常，不是实测布格异常。</p><p>每条线点数 floor(L/Δx)+1，总点数为测线数乘每线点数；布点以测网中心对称，实际线长=(每线点数−1)Δx，可能略短于设计值。方位角自正北顺时针。费用按独立测点×当前单价计取，经费和单价可在页首调整，默认为 20000 元与 200 元。可用点数向下取整；经费不足时保留覆盖范围、中心和方向，均衡减少两方向采样数。经费增加时不自动加点，可继续拖动加密。预留经费用于复测等时，需另行安排；默认费用下第 06、09 组各预留 4000 元，尚未把复测值加入数据。迁站、交通、基点与改正成本未单独计价。</p><p>恢复图用观测点的 IDW（距离四次方倒数）插值，限于矩形测网内。RMSE 在 51×51 公共评估网格落入各自测网的节点上统计，不同覆盖率的 RMSE 不能直接作为全区优劣排名。无观测覆盖的区域保持灰色。所有方案使用同一噪声强度和固定种子，相同坐标得到相同噪声。噪声是高斯合成扰动，未模拟仪器漂移、地形、潮汐或区域场。</p><p>已知模型下的目标覆盖检查仅用于教学。插值恢复的是地表场，不是地下密度反演。实际解译仍需异常分离、约束反演和地质先验，重力具有密度、体积与深度之间的多解性。</p><p>方法参考：<a href="https://www.usgs.gov/software/gravmagsubs-gravitational-and-magnetic-attraction-3-d-vertical-rectangular-prisms" target="_blank" rel="noreferrer">USGS 三维棱柱正演</a> · <a href="https://www.fatiando.org/harmonica/dev/user_guide/forward_modelling/prism.html" target="_blank" rel="noreferrer">Harmonica 正演与单位约定</a>。经验式来源为用户提供的课堂照片，上述 h 与线长解释为本实验假设。</p></details>`;
  document.querySelector('main').insertBefore(section,document.querySelector('main>footer'));
  const bridge=document.createElement('button');bridge.className='quiet sv-bridge';bridge.textContent='进入三维测线设计 → 比较 100 个测点如何分配';bridge.onclick=()=>{location.hash='survey';};
  document.querySelector('.geology-panel').append(bridge);
  function bodyForm() {
    const b=bodies[bodyIndex];
    $('svBodyTabs').innerHTML=bodies.map((_,i)=>`<button data-body="${i}" aria-pressed="${i===bodyIndex}">异常体 ${i+1}</button>`).join('');
    for(const [id,k] of [['svKind','kind'],['svX','x'],['svY','y'],['svZ','z'],['svRx','rx'],['svRy','ry'],['svRz','rz'],['svRho','rho']]) $(id).value=b[k];
    shapeForm();$('svAddBody').disabled=bodies.length>=3;$('svRemoveBody').disabled=bodies.length<=1;
    $('svBodyDensity').textContent=`异常体 ${bodyIndex+1} 实际密度 ${fmt(2670+b.rho)} kg/m³；顶面埋深 ${fmt(b.z-b.rz)} m。正密度差产生正异常，负密度差产生负异常。`;
  }
  function shapeForm(){const sphere=$('svKind').value==='sphere';$('svRyWrap').hidden=sphere;$('svRzWrap').hidden=sphere;$('svRxLabel').firstChild.textContent=sphere?'半径 R / m':'东向半边长 / m';}
  function readNumber(id) {const value=$(id).value.trim();if(value==='') throw Error('请填写所有数值。');const n=Number(value);if(!Number.isFinite(n)) throw Error('请输入有限数字。');return n;}
  function updateBody() {
    try {
      const b={kind:$('svKind').value};for(const [id,k] of [['svX','x'],['svY','y'],['svZ','z'],['svRx','rx'],['svRho','rho']]) b[k]=readNumber(id);
      b.ry=b.kind==='sphere'?b.rx:readNumber('svRy');b.rz=b.kind==='sphere'?b.rx:readNumber('svRz');P.validateBody(b);
      bodies[bodyIndex]=b;bodyForm();$('svBodyNotice').textContent='模型已更新，全部方案重新计算。';recompute();window.SurveyDesigner?.sync();
    } catch(e){$('svBodyNotice').textContent=e.message;}
  }
  function recompute() {
    src=P.sources(bodies);truth=[];
    for(let j=0;j<N;j++)for(let i=0;i<N;i++)truth.push(P.gravity(src,i*2000/(N-1),j*2000/(N-1)));
    range=Math.max(.005,...truth.map(Math.abs))*1.06;
    results=plans.map(p=>P.evaluate(p,src,truth,sigma,seed,N));
    rebuildCards();selectPlan(Math.min(selected,results.length-1));
  }
  function rebuildCards() {
    $('svMaps').innerHTML=`<article class="panel sv-card sv-reference"><div class="sv-card-head"><h3>模型真值 · 全区参考</h3><span class="sv-tag">未采样</span></div><p>连续正演场 · 无观测点 · 仅作为教学参照</p><canvas id="svTruthMap" aria-label="整个 2000 米见方区域的模型真值重力异常图"></canvas><div class="sv-map-metrics"><span>空间<b>2 × 2 km</b></span><span>异常体<b>${bodies.length} 个</b></span><span>最大绝对异常<b>${fmt(range/1.06,3)}</b></span></div></article>`+
      results.map((r,i)=>`<article class="panel sv-card" data-plan="${i}"><div class="sv-card-head"><h3>${r.plan.name}</h3><span class="sv-tag">${r.geometry.count} 点 · ¥${fmt(r.geometry.cost,2)}</span></div><p>点距 ${fmt(r.plan.spacing,1)} m / 线距 ${fmt(r.plan.lineSpacing,1)} m · ${r.plan.lines} 线 × ${r.geometry.perLine} 点 · 方位 ${fmt(r.plan.angle)}°</p><canvas id="svMap${i}" tabindex="0" aria-label="${r.plan.name}平面重力异常图，含观测点与比例尺；回车选择此方案"></canvas><div class="sv-map-metrics"><span>面积覆盖率<b>${fmt(r.coverage*100,1)}%</b></span><span>覆盖内 RMSE / mGal<b>${fmt(r.rmse,4)}</b></span><span>预算余额<b>¥${fmt(P.BUDGET-r.geometry.cost,2)}</b></span></div><div class="sv-actions"><button class="sv-secondary" data-select="${i}">查看此方案</button><button class="sv-secondary" data-png="${i}">↓ PNG</button><button class="sv-secondary" data-remove="${i}" ${results.length<=1?'disabled':''}>移除</button></div></article>`).join('');
    $('svTruthMap').addEventListener('pointermove',e=>inspect(e,null));
    results.forEach((_,i)=>{const c=$('svMap'+i);c.addEventListener('pointermove',e=>inspect(e,i));c.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();selectPlan(i);}});});
    $('svTable').innerHTML=results.map((r,i)=>`<tr${i===selected?' class="sv-best"':''}><td>${r.plan.name}</td><td>${fmt(r.plan.spacing,1)} / ${fmt(r.plan.lineSpacing,1)}</td><td>${fmt(r.geometry.actualLength,1)} m × ${r.plan.lines}</td><td>${r.geometry.count} / ¥${fmt(r.geometry.cost,2)}</td><td>${fmt(100*r.coverage,1)}%</td><td>${fmt(r.rmse,4)}</td><td>${r.targets.filter(t=>!t.covered).length} / ${bodies.length}</td></tr>`).join('');
    drawMaps();
  }
  function selectPlan(i) {
    selected=i;document.querySelectorAll('[data-plan]').forEach(el=>el.classList.toggle('sv-selected',+el.dataset.plan===i));
    document.querySelectorAll('#svTable tr').forEach((el,k)=>el.classList.toggle('sv-best',k===i));
    const r=results[i];$('svScenePlan').textContent=`地表布点：${r.plan.name} · ${r.geometry.count} 点`;
    const old=+$('svProfileLine').value||1;$('svProfileLine').innerHTML=Array.from({length:r.plan.lines},(_,j)=>`<option value="${j+1}">第 ${j+1} 条</option>`).join('');$('svProfileLine').value=Math.min(old,r.plan.lines);
    drawScene();drawProfile();advice();window.SurveyDesigner?.sync();
  }
  function fit(canvas,forcedWidth,forcedHeight) {
    const box=canvas.getBoundingClientRect(),w=forcedWidth||Math.max(300,box.width),h=forcedHeight||Math.max(200,box.height),d=forcedWidth?1:Math.min(2,devicePixelRatio||1);
    canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);const ctx=canvas.getContext('2d');ctx.setTransform(d,0,0,d,0,0);return {ctx,w,h};
  }
  function color(value,limit=range) {
    const t=Math.max(-1,Math.min(1,value/limit)),lo=t<0?[71,144,212]:[239,164,105],mid=[250,250,248],a=Math.abs(t)**.62;
    return mid.map((v,i)=>Math.round(v+(lo[i]-v)*a));
  }
  function drawMap(canvas,result,forcedW,forcedH,forceDots=false) {
    const {ctx:c,w,h}=fit(canvas,forcedW,forcedH),s=Math.min(w-100,h-88),left=(w-s-35)/2,top=25,cell=s/(N-1);
    c.fillStyle='#ffffff';c.fillRect(0,0,w,h);c.fillStyle='#334155';c.font='11px sans-serif';
    const mode=result?view:'truth',values=mode==='truth'?truth:result.values,limit=range;
    c.save();c.beginPath();c.rect(left,top,s,s);c.clip();c.fillStyle='#f1f3f5';c.fillRect(left,top,s,s);
    c.save();
    if(result&&mode!=='truth') {
      const g=result.geometry,p=result.plan;
      const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>[left+(p.cx+u*g.actualLength/2*g.ux+v*g.width/2*g.vx)/2000*s,top+s-(p.cy+u*g.actualLength/2*g.uy+v*g.width/2*g.vy)/2000*s]);
      c.beginPath();corners.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.clip();
    }
    const raster=document.createElement('canvas');raster.width=N;raster.height=N;const rc=raster.getContext('2d'),pixels=rc.createImageData(N,N);
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){
      const k=j*N+i,v=values[k],rgb=v===null?[241,243,245]:color(mode==='error'?v-truth[k]:v,limit),offset=((N-1-j)*N+i)*4;
      pixels.data.set([...rgb,255],offset);
    }
    rc.putImageData(pixels,0,0);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(raster,left-cell/2,top-cell/2,s+cell,s+cell);c.restore();
    // Marching squares contours of the displayed field, clipped to valid interpolation cells.
    for(const level of [-.75,-.5,-.25,.25,.5,.75].map(v=>v*limit)) {
      c.beginPath();for(let j=0;j<N-1;j++)for(let i=0;i<N-1;i++){
        const ids=[j*N+i,j*N+i+1,(j+1)*N+i+1,(j+1)*N+i],v=ids.map(k=>values[k]===null?null:mode==='error'?values[k]-truth[k]:values[k]);if(v.some(x=>x===null))continue;
        const xy=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]],cross=[];
        for(let k=0;k<4;k++){const l=(k+1)%4;if((v[k]<level)!==(v[l]<level)){const a=(level-v[k])/(v[l]-v[k]);cross.push([left+(xy[k][0]+a*(xy[l][0]-xy[k][0]))*cell,top+s-(xy[k][1]+a*(xy[l][1]-xy[k][1]))*cell]);}}
        for(let k=0;k+1<cross.length;k+=2){c.moveTo(...cross[k]);c.lineTo(...cross[k+1]);}
      }c.strokeStyle='#33415540';c.lineWidth=.7;c.stroke();
    }
    if(result) {
      c.lineWidth=.7;c.strokeStyle='#47556966';
      for(let l=1;l<=result.plan.lines;l++){const pts=result.points.filter(p=>p.line===l);c.beginPath();pts.forEach((p,i)=>{const x=left+p.x/2000*s,y=top+s-p.y/2000*s;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();}
      if(showDots||forceDots) for(const p of result.points){const x=left+p.x/2000*s,y=top+s-p.y/2000*s;c.beginPath();c.arc(x,y,Math.max(1.6,s/175),0,Math.PI*2);c.fillStyle='#f4fff8';c.fill();c.strokeStyle='#081521';c.lineWidth=.7;c.stroke();}
    }
    c.restore();c.strokeStyle='#64748b';c.lineWidth=1;c.strokeRect(left,top,s,s);c.fillStyle='#334155';c.font='10px Consolas,monospace';c.textAlign='center';
    for(const t of [0,500,1000,1500,2000]){const x=left+t/2000*s,y=top+s-t/2000*s;c.fillText(String(t),x,top+s+16);c.textAlign='right';c.fillText(String(t),left-7,y+3);c.textAlign='center';}
    c.fillText('东坐标 x / m',left+s/2,top+s+33);c.save();c.translate(left-35,top+s/2);c.rotate(-Math.PI/2);c.fillText('北坐标 y / m',0,0);c.restore();
    // A distance scale stays valid at any browser size; no screen-dependent 1:n claim.
    const sx=left+12,sy=top+s-19,sw=s/4;c.fillStyle='#fffffff0';c.fillRect(sx-6,sy-19,sw+14,33);c.strokeStyle='#1e293b';c.lineWidth=2;c.beginPath();c.moveTo(sx,sy-4);c.lineTo(sx,sy);c.lineTo(sx+sw,sy);c.lineTo(sx+sw,sy-4);c.stroke();c.fillStyle='#1e293b';c.font='10px sans-serif';c.fillText('500 m',sx+sw/2,sy-7);
    c.fillText('N ↑',left+s-22,top+19);
    const bx=left+s+17,bh=s*.7,by=top+s*.15;for(let k=0;k<120;k++){c.fillStyle=`rgb(${color(limit*(1-2*k/119),limit).join(',')})`;c.fillRect(bx,by+k*bh/120,10,bh/120+1);}c.textAlign='left';c.fillStyle='#334155';c.font='9px Consolas,monospace';c.fillText(fmt(limit,3),bx-2,by-9);c.fillText('0',bx+13,by+bh/2+3);c.fillText(fmt(-limit,3),bx-2,by+bh+12);c.save();c.translate(bx+29,by+bh/2);c.rotate(-Math.PI/2);c.textAlign='center';c.fillText('mGal',0,0);c.restore();
    c.fillStyle='#475569';c.font='10px sans-serif';c.textAlign='left';c.fillText(mode==='truth'?'模型真值':mode==='error'?'恢复 − 真值 · 同一色标':'测点 IDW 插值 · 灰色未覆盖',left,13);
    canvas._map={left,top,size:s,w,h};
  }
  function drawMaps(){if(document.body.dataset.atlas!=='survey')return;drawMap($('svTruthMap'),null);results.forEach((r,i)=>drawMap($('svMap'+i),r));window.SurveyDesigner?.drawField();}
  function inspect(e,i) {
    const canvas=e.currentTarget,box=canvas.getBoundingClientRect(),m=canvas._map;if(!m)return;
    const px=(e.clientX-box.left)*m.w/box.width,py=(e.clientY-box.top)*m.h/box.height,x=(px-m.left)/m.size*2000,y=(1-(py-m.top)/m.size)*2000;if(x<0||y<0||x>2000||y>2000)return;
    const exact=P.gravity(src,x,y),r=i===null?null:results[i];let text=`E ${fmt(x)} m / N ${fmt(y)} m · 真值 ${fmt(exact,4)} mGal`;
    if(r){const inside=P.covered(r.plan,r.geometry,x,y);text+=inside?` · 插值 ${fmt(P.interpolate(r.points,x,y),4)} mGal`:' · 测网外，无恢复值';const closest=r.points.reduce((a,b)=>Math.hypot(a.x-x,a.y-y)<Math.hypot(b.x-x,b.y-y)?a:b);if(Math.hypot(closest.x-x,closest.y-y)<25)text+=` · 测线 ${closest.line} / 点 ${closest.station} · 观测 ${fmt(closest.g,4)} mGal`;}
    $('svInspect').textContent=text;
  }
  function project(x,y,z,w,h) {
    const a=x-1000,b=y-1000,c=z-500,xx=a*Math.cos(yaw)-b*Math.sin(yaw),yy=a*Math.sin(yaw)+b*Math.cos(yaw),scale=Math.min(w/3400,h/2600)*zoom;
    return [w/2+xx*scale,h/2+(c*Math.cos(pitch)-yy*Math.sin(pitch))*scale,yy*Math.cos(pitch)+c*Math.sin(pitch)];
  }
  function drawScene(){
    if(document.body.dataset.atlas!=='survey')return;const {ctx:c,w,h}=fit($('svScene'));c.clearRect(0,0,w,h);
    const proj=(...v)=>project(...v,w,h),line=(a,b,col,width=1)=>{c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(...proj(...a).slice(0,2));c.lineTo(...proj(...b).slice(0,2));c.stroke();};
    const corners=[[0,0,0],[2000,0,0],[2000,2000,0],[0,2000,0],[0,0,1000],[2000,0,1000],[2000,2000,1000],[0,2000,1000]];
    c.beginPath();[0,1,2,3].forEach((k,i)=>{const p=proj(...corners[k]);i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]);});c.closePath();c.fillStyle='#8ce6cf08';c.fill();
    for(let v=0;v<=2000;v+=250){line([v,0,0],[v,2000,0],'#83c5b323',.6);line([0,v,0],[2000,v,0],'#83c5b323',.6);}
    for(const [a,b] of [[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])line(corners[a],corners[b],'#6f9da45a',1);
    if(showBodies){
      const faces=[];
      for(let bi=0;bi<bodies.length;bi++){
        const b=bodies[bi],base=b.rho>=0?[238,163,104]:[93,171,239];
        if(b.kind==='sphere'){
          const vertex=(t,p)=>[b.x+b.rx*Math.sin(t)*Math.cos(p),b.y+b.rx*Math.sin(t)*Math.sin(p),b.z+b.rx*Math.cos(t)];
          for(let j=0;j<12;j++)for(let i=0;i<24;i++){
            const coords=[vertex(j*Math.PI/12,i*Math.PI/12),vertex(j*Math.PI/12,(i+1)*Math.PI/12),vertex((j+1)*Math.PI/12,(i+1)*Math.PI/12),vertex((j+1)*Math.PI/12,i*Math.PI/12)].map(v=>proj(...v));
            const shade=.57+.38*Math.max(0,Math.sin(j*Math.PI/12)*Math.cos(i*Math.PI/12-1));faces.push({coords,depth:coords.reduce((v,p)=>v+p[2],0)/4,color:base.map(v=>Math.round(v*shade)),selected:bi===bodyIndex});
          }
        }else{
          const v=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(p=>proj(b.x+p[0]*b.rx,b.y+p[1]*b.ry,b.z+p[2]*b.rz));
          [[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[1,2,6,5],[0,3,7,4]].forEach((ids,i)=>{const coords=ids.map(k=>v[k]);faces.push({coords,depth:coords.reduce((s,p)=>s+p[2],0)/4,color:base.map(v=>Math.round(v*(.58+i*.065))),selected:bi===bodyIndex});});
        }
      }
      faces.sort((a,b)=>a.depth-b.depth);for(const f of faces){c.beginPath();f.coords.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fillStyle=`rgba(${f.color.join(',')},.96)`;c.fill();c.lineWidth=.4;c.strokeStyle=f.selected?'#ffffff30':'#ffffff15';c.stroke();}
      bodies.forEach((b,i)=>{const p=proj(b.x,b.y,b.z);c.font='11px sans-serif';c.fillStyle='#f3f7ee';c.textAlign='center';c.fillText(`${i+1} · ${b.rho>=0?'+':''}${b.rho}`,p[0],p[1]+4);});
    }
    const r=results[selected];if(r){for(let j=1;j<=r.plan.lines;j++){const pts=r.points.filter(p=>p.line===j);line([pts[0].x,pts[0].y,0],[pts.at(-1).x,pts.at(-1).y,0],'#91e5d05c',.8);}for(const p of r.points){const v=proj(p.x,p.y,0);c.beginPath();c.arc(v[0],v[1],2.3,0,Math.PI*2);c.fillStyle='#a3f4d8';c.fill();}}
    for(const [a,b] of [[0,1],[1,2],[2,3],[3,0]])line(corners[a],corners[b],'#a0d7c5',1.1);
    c.font='11px Consolas,monospace';c.textAlign='center';for(const [pos,label] of [[[1000,0,0],'E / 2000 m'],[[2000,1000,0],'N / 2000 m'],[[0,0,600],'深度 1000 m'],[[0,0,0],'地表 z=0']]){const p=proj(...pos);c.fillStyle='#9fbcb7';c.fillText(label,p[0],p[1]+(label.includes('深度')?20:-10));}
  }
  function drawProfile(){
    if(document.body.dataset.atlas!=='survey')return;
    const r=results[selected],line=+$('svProfileLine').value,points=r.points.filter(p=>p.line===line),a=points[0],b=points.at(-1),{ctx:c,w,h}=fit($('svProfile'));
    const vals=Array.from({length:181},(_,i)=>P.gravity(src,a.x+(b.x-a.x)*i/180,a.y+(b.y-a.y)*i/180)),max=Math.max(.005,...vals.map(Math.abs),...points.map(p=>Math.abs(p.g)))*1.15;
    const left=55,right=w-20,top=20,bottom=h-38,X=t=>left+t*(right-left),Y=v=>(top+bottom)/2-v/max*(bottom-top)/2;c.clearRect(0,0,w,h);
    c.font='10px Consolas,monospace';for(const v of [-max,0,max]){c.strokeStyle='#d2e8dd20';c.beginPath();c.moveTo(left,Y(v));c.lineTo(right,Y(v));c.stroke();c.fillStyle='#99abb5';c.textAlign='right';c.fillText(fmt(v,3),left-8,Y(v)+4);}
    c.strokeStyle='#a3ead2';c.lineWidth=2;c.beginPath();vals.forEach((v,i)=>i?c.lineTo(X(i/180),Y(v)):c.moveTo(X(0),Y(v)));c.stroke();
    c.strokeStyle='#f0c593';c.lineWidth=1;c.beginPath();points.forEach((p,i)=>i?c.lineTo(X(i/(points.length-1)),Y(p.g)):c.moveTo(X(0),Y(p.g)));c.stroke();
    points.forEach((p,i)=>{c.beginPath();c.arc(X(i/(points.length-1)),Y(p.g),3,0,Math.PI*2);c.fillStyle='#f0c593';c.fill();});c.fillStyle='#9fb4b6';c.textAlign='center';for(const t of [0,.5,1])c.fillText(fmt(t*r.geometry.actualLength)+' m',X(t),bottom+20);c.textAlign='left';c.fillText('mGal',4,12);
    $('svProfileNote').textContent=`${r.plan.name} · 第 ${line} 条测线 · 青线：连续真值；橙点：实际观测。横轴为沿线距离。每线 ${points.length} 点，间隔 ${fmt(r.plan.spacing,1)} m。`;
  }
  function advice(){
    const r=results[selected],miss=r.targets.filter(t=>!t.covered).length,h=bodies[bodyIndex].z,min=r.targets.map((t,i)=>`体 ${i+1}：最近点 ${fmt(t.nearest)} m${t.covered?'':'，投影在测网外'}`).join('；');
    const compatible=results.filter(q=>q.targets.every(t=>t.covered)),best=compatible.sort((a,b)=>Math.max(...a.targets.map(t=>t.nearest/t.depth))-Math.max(...b.targets.map(t=>t.nearest/t.depth)))[0];
    $('svAdvice').innerHTML=`<p><b style="color:var(--survey)">${r.plan.name}</b> 覆盖全区 ${fmt(r.coverage*100,1)}%，${miss?`${miss} 个已知异常体的中心投影落在测网外，应先扩大或移动覆盖范围。`:'覆盖所有已知异常体的中心投影；仍需检查异常两侧背景是否充分。'}</p><p>${min}。</p><p>以体 ${bodyIndex+1} 的中心埋深 ${fmt(h)} m 为参照，经验点距 ${fmt(h/3)}～${fmt(h/2)} m。当前点距 ${fmt(r.plan.spacing,1)} m，线距 ${fmt(r.plan.lineSpacing,1)} m；沿线加密仍可能漏掉两条线之间的窄异常。</p><p>${best?`在当前已知模型下，${best.plan.name} 对目标中心的相对最近采样距离最小，且覆盖全部中心，可优先检查其平面图与剖面。`:'当前没有覆盖全部目标中心的方案，建议先调整测网位置或增加覆盖。'} 这是基于已知目标的教学提示，不是现场自动最优解。</p><p>覆盖内 RMSE ${fmt(r.rmse,4)} mGal。小范围精测可能误差较低，却没有测到外围目标。解译还需考虑噪声、背景场与密度—体积—埋深多解性。</p>`;
  }
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function mapPNG(i){const canvas=document.createElement('canvas');drawMap(canvas,results[i],1000,900,true);canvas.toBlob(blob=>{if(blob)download(blob,`测线方案${i+1}-${view}.png`);});}
  function exportAll(){
    const w=1100,head=96,mapH=890,cardH=1010,count=results.length+1,rows=Math.ceil(count/2),canvas=document.createElement('canvas');canvas.width=w*2;canvas.height=head+rows*cardH+70;const c=canvas.getContext('2d');c.fillStyle='#ffffff';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#134e4a';c.font='30px sans-serif';c.fillText('地下三维密度空间 · 重力测线设计对比',35,43);c.fillStyle='#475569';c.font='17px sans-serif';c.fillText(`2000 × 2000 × 1000 m | 预算 ¥${fmt(P.BUDGET,2)} | ¥${fmt(P.PRICE,2)}/点 | σ=${sigma} mGal | ${view==='observed'?'测点 IDW 插值':view==='error'?'插值误差':'模型真值叠加布点'} | 白点为观测点`,35,77);
    for(let k=0;k<count;k++){
      const x=(k%2)*w,y=head+Math.floor(k/2)*cardH,r=k===0?null:results[k-1],map=document.createElement('canvas');drawMap(map,r,w,mapH,true);c.drawImage(map,x,y+70);c.fillStyle='#172b36';c.font='23px sans-serif';c.fillText(r?r.plan.name:'模型真值 · 全区参考',x+38,y+30);c.fillStyle='#475569';c.font='15px sans-serif';c.fillText(r?`点距 ${fmt(r.plan.spacing,1)} m / 线距 ${fmt(r.plan.lineSpacing,1)} m | 实际线长 ${fmt(r.geometry.actualLength,1)} m | ${r.geometry.count} 点 | ¥${r.geometry.cost}`:'完整正演场，没有观测点；不代表实测数据',x+38,y+56);if(r)c.fillText(`覆盖 ${fmt(r.coverage*100,1)}% | 覆盖内 RMSE ${fmt(r.rmse,4)} mGal | 方位角 ${r.plan.angle}°`,x+38,y+990);
    }
    c.fillStyle='#475569';c.font='16px sans-serif';c.fillText('比例尺为图上距离尺；统一色标。灰区无观测覆盖，未外推。Δx≈h/3～h/2；L≈3～5h 为截断照片的暂定解释。',35,canvas.height-25);canvas.toBlob(blob=>{if(blob){download(blob,'重力测线-全部方案对比.png');$('svExportNotice').textContent='全部方案图已导出，包含模型真值参照。';}});
  }
  function tenFigure() {
    if(results.length<10)throw Error('请至少保留 10 组测网后再生成两列五行长图。');
    const chosen=results.slice(0,10).sort((a,b)=>a.plan.spacing-b.plan.spacing||a.plan.lineSpacing-b.plan.lineSpacing);
    const w=1100,head=160,mapH=890,cardH=1030,canvas=document.createElement('canvas');canvas.width=2200;canvas.height=head+5*cardH+110;
    const c=canvas.getContext('2d');c.fillStyle='#ffffff';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#134e4a';c.font='32px sans-serif';c.fillText('十组点距 × 线距 · 重力观测系统平面图',40,46);
    c.fillStyle='#475569';c.font='18px sans-serif';c.fillText('两列五行 | 统一图幅 2000 × 2000 m、统一色标、每图 500 m 距离比例尺 | 白点为观测点',40,84);
    c.fillText(`固定地下空间 2000 × 2000 × 1000 m | 每组预算上限 ¥${fmt(P.BUDGET,2)}，¥${fmt(P.PRICE,2)}/点 | 噪声 σ=${sigma} mGal`,40,116);
    c.fillText('按点距、线距由小到大排列；各图来自各自观测点的 IDW 插值；灰色为测网外，不作外推。',40,145);
    const previous=view;view='observed';
    try{chosen.forEach((r,k)=>{
      const x=k%2*w,y=head+Math.floor(k/2)*cardH,map=document.createElement('canvas');drawMap(map,r,w,mapH,true);c.drawImage(map,x,y+85);
      c.fillStyle='#172b36';c.font='25px sans-serif';c.fillText(`${String(k+1).padStart(2,'0')}   点距 ${fmt(r.plan.spacing,2)} m × 线距 ${fmt(r.plan.lineSpacing,2)} m`,x+38,y+34);
      c.fillStyle='#475569';c.font='17px sans-serif';c.fillText(`线长 ${fmt(r.geometry.actualLength,1)} m · ${r.plan.lines} 线 × ${r.geometry.perLine} 点 = ${r.geometry.count} 点 · ¥${fmt(r.geometry.cost,2)}`,x+38,y+66);
      c.fillText(`覆盖 ${fmt(r.coverage*100,1)}% · 覆盖内 RMSE ${fmt(r.rmse,4)} mGal · 未覆盖目标中心 ${r.targets.filter(t=>!t.covered).length}/${bodies.length}`,x+38,y+1002);
    });}finally{view=previous;}
    c.font='17px sans-serif';c.fillStyle='#475569';c.fillText('所有方案均使用同一地下模型。RMSE 统计范围随测网变化，不能脱离覆盖率直接排名；插值恢复不等于密度反演。',40,canvas.height-65);
    c.fillText('500 m 为距离比例尺，统一图幅可直接比较。费用仅按测点计费；预留经费尚未形成复测数据。',40,canvas.height-32);
    return canvas;
  }
  const tenButton=document.createElement('button');tenButton.id='svExportTen';tenButton.className='sv-primary';tenButton.textContent='↓ 十组方案 · 两列五行长图';
  $('svExportPNG').before(tenButton);tenButton.onclick=()=>{try{tenFigure().toBlob(blob=>{if(blob)download(blob,'十组测线-统一比例尺-2列5行.png');});}catch(e){$('svExportNotice').textContent=e.message;}};
  const guideLink=document.createElement('a');guideLink.href='survey-report.html';guideLink.className='sv-secondary';guideLink.style.textDecoration='none';guideLink.textContent='阅读默认示例的对比与布线理由 →';tenButton.after(guideLink);
  function exportCSV(){
    const rows=[['方案','方位角_deg','点距_m','线距_m','实际线长_m','测线','测点','东坐标_m','北坐标_m','深度_m','模型真值_mGal','观测值_mGal','噪声sigma_mGal','种子','单价_元','方案总价_元','预算上限_元','可用点数上限']];
    results.forEach(r=>r.points.forEach(p=>rows.push([r.plan.name,r.plan.angle,r.plan.spacing,r.plan.lineSpacing,r.geometry.actualLength,p.line,p.station,p.x,p.y,0,p.trueG,p.g,sigma,seed,P.PRICE,r.geometry.cost,P.BUDGET,P.costs().maxPoints])));
    download(new Blob(['\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'重力测线-全部测点.csv');
  }
  function state(){return {space_m:P.SIZE,background_density_kg_m3:2670,budget_yuan:P.BUDGET,station_price_yuan:P.PRICE,max_points:P.costs().maxPoints,bodies:clone(bodies),plans:clone(plans),sigma_mGal:sigma,seed,map_mode:view,selected_plan:selected,empirical:{point_spacing:'h/3 to h/2',line_length:'3h to 5h (assumed from cropped photo)',h:'target center depth by default'},model:'sphere analytic; box 8^3 midpoint cells',interpolation:'IDW power 4 within survey rectangle',results:results.map(r=>({name:r.plan.name,count:r.geometry.count,cost:r.geometry.cost,coverage:r.coverage,rmse_mGal:r.rmse,targets:r.targets}))};}
  $('svBodyTabs').onclick=e=>{const b=e.target.closest('[data-body]');if(b){bodyIndex=+b.dataset.body;bodyForm();window.SurveyDesigner?.sync();drawScene();advice();}};
  $('svKind').onchange=shapeForm;$('svApplyBody').onclick=updateBody;
  $('svAddBody').onclick=()=>{if(bodies.length>=3)return;bodies.push({kind:'sphere',x:1100,y:650,z:400,rx:100,ry:100,rz:100,rho:400});bodyIndex=bodies.length-1;bodyForm();recompute();};
  $('svRemoveBody').onclick=()=>{if(bodies.length<=1)return;bodies.splice(bodyIndex,1);bodyIndex=0;bodyForm();recompute();};
  $('svResetModel').onclick=()=>{bodies=clone(initialBodies);bodyIndex=0;bodyForm();$('svBodyNotice').textContent='已恢复两个示例异常体。';recompute();window.SurveyDesigner?.sync();};
  $('svMaps').onclick=e=>{const png=e.target.closest('[data-png]'),remove=e.target.closest('[data-remove]'),card=e.target.closest('[data-plan]');if(png){mapPNG(+png.dataset.png);return;}if(remove){if(results.length>1){plans.splice(+remove.dataset.remove,1);selected=Math.min(selected,plans.length-1);recompute();window.SurveyDesigner?.sync();}return;}if(card)selectPlan(+card.dataset.plan);};
  $('svMapMode').onchange=()=>{view=$('svMapMode').value;drawMaps();};$('svShowDots').onchange=()=>{showDots=$('svShowDots').checked;drawMaps();};
  $('svNoise').onchange=()=>{try{const next=readNumber('svNoise');if(next<0||next>.05)throw Error('噪声应在 0～0.05 mGal。');sigma=next;recompute();$('svInspect').textContent='已按相同噪声条件重算全部方案。';}catch(e){$('svNoise').value=sigma;$('svInspect').textContent=e.message;}};
  $('svResample').onclick=()=>{seed++;recompute();};$('svProfileLine').onchange=drawProfile;
  $('svShowBodies').onchange=()=>{showBodies=$('svShowBodies').checked;drawScene();};$('svResetView').onclick=()=>{yaw=-.65;pitch=.65;zoom=1;drawScene();};
  $('svScene').addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};$('svScene').setPointerCapture(e.pointerId);});
  $('svScene').addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-drag.x)*.008;pitch=Math.max(.08,Math.min(1.45,pitch+(e.clientY-drag.y)*.007));drag={x:e.clientX,y:e.clientY};drawScene();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])$('svScene').addEventListener(event,()=>drag=null);
  $('svScene').addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.65,Math.min(1.5,zoom*Math.exp(-e.deltaY*.001)));drawScene();},{passive:false});
  $('svScene').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')yaw-=.12;if(e.key==='ArrowRight')yaw+=.12;if(e.key==='ArrowUp')pitch=Math.min(1.45,pitch+.1);if(e.key==='ArrowDown')pitch=Math.max(.08,pitch-.1);if(e.key==='+'||e.key==='=')zoom=Math.min(1.5,zoom+.1);if(e.key==='-')zoom=Math.max(.65,zoom-.1);drawScene();});
  $('svExportPNG').onclick=exportAll;$('svExportCSV').onclick=exportCSV;$('svExportJSON').onclick=()=>download(new Blob([JSON.stringify(state(),null,2)],{type:'application/json'}),'地下密度模型-测线方案.json');
  window.addEventListener('resize',()=>{if(document.body.dataset.atlas!=='survey')return;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{drawScene();drawMaps();drawProfile();window.SurveyDesigner?.sync();});});
  bodyForm();recompute();window.SurveyDesigner?.sync();
  function updatePlan(next) {
    if(P.planLimit(next)) return false;
    const p={...next,name:plans[selected].name};plans[selected]=p;results[selected]=P.evaluate(p,src,truth,sigma,seed,N);
    const r=results[selected],card=document.querySelector('[data-plan="'+selected+'"]');
    card.querySelector('.sv-card-head .sv-tag').textContent=r.geometry.count+' 点 · ¥'+fmt(r.geometry.cost,2);
    card.querySelector('p').textContent='点距 '+fmt(p.spacing,1)+' m / 线距 '+fmt(p.lineSpacing,1)+' m · '+p.lines+' 线 × '+r.geometry.perLine+' 点 · 方位 '+fmt(p.angle)+'°';
    const metrics=card.querySelectorAll('.sv-map-metrics b');metrics[0].textContent=fmt(100*r.coverage,1)+'%';metrics[1].textContent=fmt(r.rmse,4);metrics[2].textContent='¥'+fmt(P.BUDGET-r.geometry.cost,2);
    const row=$('svTable').rows[selected],cells=[p.name,fmt(p.spacing,1)+' / '+fmt(p.lineSpacing,1),fmt(r.geometry.actualLength,1)+' m × '+p.lines,r.geometry.count+' / ¥'+fmt(r.geometry.cost,2),fmt(100*r.coverage,1)+'%',fmt(r.rmse,4),r.targets.filter(t=>!t.covered).length+' / '+bodies.length];
    cells.forEach((v,i)=>row.cells[i].textContent=v);
    if(document.body.dataset.atlas==='survey') drawMap($('svMap'+selected),r);
    selectPlan(selected);return true;
  }
  function duplicatePlan() {
    if(plans.length>=16)return false;
    let number=plans.length+1;while(plans.some(p=>p.name==='方案 '+number+' · 拖动设计'))number++;
    plans.push({...plans[selected],name:'方案 '+number+' · 拖动设计'});selected=plans.length-1;recompute();return true;
  }
  function setCosts(budget,price) {
    window.SurveyDesigner?.finishDrag();
    const settings=P.setCosts(budget,price),old=plans;
    $('svBudget').value=settings.budget;$('svStationPrice').value=settings.price;
    plans=plans.map(p=>P.fitBudget(p));
    const changed=plans.filter((p,i)=>p.lines!==old[i].lines||Math.abs(p.spacing-old[i].spacing)>1e-8||Math.abs(p.lineSpacing-old[i].lineSpacing)>1e-8).length;
    recompute();
    $('svCapacity').textContent='最多 '+fmt(settings.maxPoints)+' 点';
    $('svCostsActive').textContent='当前生效：¥'+fmt(settings.budget,2)+' · ¥'+fmt(settings.price,2)+'/点';
    $('svCostsNotice').textContent=changed?'费用已更新；'+changed+' 组超支测网已自动减点，保持覆盖范围、中心和方向。':'费用与拖动上限已更新；已有布置保持不变，可继续拖动加密。';
    return {...settings,adjustedPlans:changed};
  }
  function applyCosts(){
    try {setCosts(readNumber('svBudget'),readNumber('svStationPrice'));}
    catch(e){$('svCostsNotice').textContent=e.message+' 当前有效设置保持不变。';}
  }
  for(const id of ['svBudget','svStationPrice']){$(id).addEventListener('change',applyCosts);$(id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyCosts();}});}
  $('svResetCosts').onclick=()=>{$('svBudget').value=20000;$('svStationPrice').value=200;applyCosts();};
  return {setCosts,getState:state,getResults:()=>clone(results),getCurrent:()=>results[selected],selectPlan,updatePlan,duplicatePlan,tenFigure,drawCurrent:canvas=>drawMap(canvas,results[selected]),getReferenceDepth:()=>bodies[bodyIndex].z,draw:()=>{drawScene();drawMaps();drawProfile();}};
})();
