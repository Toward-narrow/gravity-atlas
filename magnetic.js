/* Local, offline-first magnetic time explorer. Existing gravity controls remain intact. */
'use strict';
window.MagneticLab = (() => {
  const P = window.MagneticPhysics, R = Math.PI / 180, $m = id => document.getElementById(id);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let year = 1980, end = 2050, scenario = 'sv', track = 'di', lat = 39.9042, lon = 116.4074, height = 0;
  let playing = false, animation = 0, lastStep = 0, seriesKey = '', series = [], hitPoints = [];
  let visualYear = 1980, transition = null, motionFrame = 0, regionHits = [], regionGeometry = null;
  const section = document.createElement('section');
  section.className = 'magnetic-lab'; section.id = 'magneticLab';
  section.innerHTML = `
    <div class="mag-heading"><div><span class="eyebrow">08 / THE MAGNETIC TIME MACHINE</span><h1>地球的磁场，<em>也有时间线。</em></h1><p>从今天的两道计算，走进两个世纪。拨动年份，看磁矩变化、北极迁移，再把一处地点的磁场画成年代曲线。</p></div><span class="mag-outline">地磁学 · 北极年代观察</span></div>
    <div class="mag-hero">
      <article class="panel mag-scene"><div class="mag-scene-top"><b>北极区域 · 迁移特写</b><span class="mag-arctic-tag">N / 北极俯视</span></div><span class="mag-year-ghost" id="magGhost">1980</span><canvas id="magGlobe" tabindex="0" aria-label="北极区域地图，白色十字表示地理北极，发光点表示当前地磁北极，蓝色带箭头的线表示磁力线方向投影。点击轨迹选年份，左右方向键逐年切换"></canvas><div class="mag-scene-bottom"><span class="mag-live"><i class="mag-status-dot"></i><span id="magGlobeStatus">历元模型</span></span><span>实线：历史 · 虚线：预测</span></div><div class="mag-globe-hint">十字：地理北极 90°N · 发光点：地磁北极 · 点击轨迹选年<br>蓝色箭头：磁力线方向的地表投影示意</div></article>
      <article class="panel mag-readings" aria-label="当前年份计算结果"><span class="eyebrow">LIVE / FIRST-DEGREE DIPOLE</span><div class="mag-year-title"><strong id="magYearTitle">1980.0</strong><span id="magSource" class="mag-source-tag"></span></div><div class="mag-moment" id="magMoment"></div><div class="mag-moment-unit">总磁矩 M / × 10²² A·m²</div><div class="mag-pole-row"><div><span>地磁北极 · 地心纬度</span><strong id="magPoleLat"></strong></div><div><span>地磁北极 · 地理经度</span><strong id="magPoleLon"></strong></div></div><div class="mag-small-result"><span>磁轴倾斜</span><b id="magTilt"></b></div><div class="mag-small-result"><span>相对 1980 年总磁矩</span><b id="magDelta"></b></div><div class="mag-coeffs" id="magCoefficients"></div><p class="mag-context" id="magContext"></p></article>
    </div>
    <article class="panel mag-timeline" aria-label="年份控制"><div class="mag-timeline-top"><div class="mag-player"><button id="magPlay" class="mag-primary" aria-pressed="false">▶ 播放时间</button><button id="magPrev" class="quiet" aria-label="前一年">−1 年</button><button id="magNext" class="quiet" aria-label="后一年">+1 年</button><select id="magSpeed" aria-label="时间播放速度"><option value="450">慢速 · 2 年/秒</option><option value="150" selected>常速 · 7 年/秒</option><option value="50">快速 · 20 年/秒</option></select></div><label class="mag-year-input" for="magYear">跳到年份<input id="magYear" type="number" min="1900" max="2100" step="1" value="1980"></label></div><div class="mag-time-rail"><input id="magYearRange" type="range" min="1900" max="2050" step="1" value="1980" aria-label="探索年份"></div><div class="mag-ticks" id="magTicks"></div><div class="mag-quick-years"><button data-mag-year="1900">1900 · 起点</button><button data-mag-year="1980">1980 · 作业 A</button><button data-mag-year="2010">2010 · 作业 B</button><button data-mag-year="2025">2025 · 新历元</button><button data-mag-year="2030">2030 · 预测界线</button><button data-mag-year="2050">2050 · 未来</button></div><div class="mag-timeline-foot"><label>探索到<select id="magEnd"><option value="2030">2030 年</option><option value="2050" selected>2050 年</option><option value="2100">2100 年</option></select></label><label>2030 年后<select id="magScenario"><option value="sv">保持 2025–2030 世变速率</option><option value="trend">延续 2005–2025 平均趋势</option></select></label><span class="mag-data-note">1900–2025 模型/插值 · 2025–2030 官方预测 · 之后为趋势假设</span></div><p id="magNotice" class="mag-notice" role="status"></p></article>
    <div class="mag-analysis"><article class="panel mag-track"><div class="mag-track-head"><div><span class="eyebrow">TRACE / LEAVE A MARK IN TIME</span><h2 id="magTrackTitle">北极的迁移，有迹可循。</h2></div><div class="mag-tabs" role="group" aria-label="轨迹类型"><button data-mag-track="pole" class="active" aria-pressed="true">北极轨迹</button><button data-mag-track="di" aria-pressed="false">D–I 年代图</button><button data-mag-track="moment" aria-pressed="false">磁矩趋势</button></div></div><p class="mag-track-subtitle" id="magTrackSubtitle"></p><div class="mag-observer" id="magObserver" hidden><label>纬度<input id="magLat" type="number" min="-90" max="90" step="0.0001" value="39.9042"></label><label>经度<input id="magLon" type="number" min="-180" max="180" step="0.0001" value="116.4074"></label><label>高/m<input id="magHeight" type="number" min="-1000" max="100000" step="10" value="0"></label><button id="magUsePoint" class="quiet">取重力测点</button><button id="magLondon" class="quiet">伦敦示例</button></div><div id="magLocalReading" class="mag-local-readout" hidden></div><canvas id="magTrack" tabindex="0" aria-label="地磁轨迹图，悬停查看年份，点击轨迹跳到对应年份，方向键逐年切换"></canvas><div class="mag-chart-bottom"><div class="mag-legend"><span><i></i>历史模型</span><span><i class="pred"></i>预测 / 外推</span></div><label class="check"><input id="magPaper" type="checkbox">教材纸张风格</label></div><div id="magInspect" class="mag-chart-inspect" role="status">沿着轨迹移动鼠标，拾起某一年的磁场。</div><div class="mag-task-actions"><button id="magExportSVG" class="quiet">↓ 保存轨迹 SVG</button><button id="magExportPNG" class="quiet">↓ 保存图片 PNG</button><button id="magExportCSV" class="quiet">↓ 导出逐年 CSV</button></div></article>
      <article class="panel mag-task"><div class="mag-task-title"><span class="eyebrow">TODAY / YOUR ASSIGNMENT</span><span class="mag-source-tag">题目原值</span></div><h2>1980 → 2010，亲手算一次。</h2><p>这里严格使用图片一给出的三项系数。上方时间线使用 IGRF-14，因此 2010 年的数值存在小差别。</p><table class="mag-homework-table"><thead><tr><th>年份</th><th>M / 10²² A·m²</th><th>纬度</th><th>经度</th></tr></thead><tbody id="magHomework"></tbody></table><div class="mag-task-delta" id="magHomeworkDelta"></div><div class="mag-task-actions"><button id="magCopy" class="mag-primary">复制作业推导</button><button id="magTaskDownload" class="quiet">↓ 保存答案</button></div><details><summary>展开公式与代入</summary><div class="mag-formula" id="magTaskFormula"></div></details><p>地磁北极取中心偶极子磁轴在北半球的交点；不同于以磁场竖直定义的磁倾极。本题三个一阶系数可确定前者。</p><p>参考半径 a = 6371.2 km。纬度采用地心纬度，经度东正西负；使用 atan2 正确区分象限。</p></article></div>
    <details class="panel mag-extra"><summary>系数沙盒 · 改动三个数，试试磁轴会怎样转</summary><p>输入任意年份标签和你找到的一阶系数，独立计算磁矩与地磁北极。1900 年之前的历史重建需额外的历史模型；这里不会把现代 IGRF 向过去伪造延伸。</p><div class="mag-custom"><label>年份标签<input id="magCustomYear" type="number" step="1" value="1980"></label><label>g₁⁰ / nT<input id="magG0" type="number" value="-29992"></label><label>g₁¹ / nT<input id="magG1" type="number" value="-1956"></label><label>h₁¹ / nT<input id="magH1" type="number" value="5604"></label><button id="magCalculate" class="mag-primary">计算这组系数</button></div><div class="mag-custom-output" id="magCustomResult" role="status"></div></details>
    <details class="panel mag-extra"><summary>数据来源、预测边界与读图说明</summary><p>IGRF-14 官方系数已随网页保存，可离线使用。1900–2025 每五年一个历元，其他年份在相邻系数间线性插值；2025–2030 使用发布的世变项。2030 年后，两种假设都从 2030 端点连续延伸，虚线代表外推，不能当成已知未来观测。未来上限设置为 2100 年。</p><p>D–I 年代图采用完整 IGRF 球谐展开（最高 13 阶），在所选 WGS-84 大地坐标和椭球高计算当地磁偏角 D、磁倾角 I。弯曲网格是一种展示坐标：D 是角度方向，I 是径向刻度。每个点来自系数计算，没有照抄参考图片中的历史曲线。D 以东偏为正，I 向下为正；当地水平场过弱时，D 不可稳定定义。</p><p>北极轨迹采用北极立体投影，指向符号表示地磁磁轴。磁矩趋势中的量纲为 A·m²。播放到末年自动停止；单步按钮和方向键可逐年探索。参考轮廓沿用 Natural Earth 公共领域数据。上方蓝色磁力线表示一阶偶极子磁场的地表方向投影，箭头指向地磁北极；实际磁场在北极附近还进入地球内部。线条密度不表示磁场强度。</p><div class="mag-source-links"><a href="https://www.ncei.noaa.gov/products/international-geomagnetic-reference-field" target="_blank" rel="noreferrer">NOAA / IAGA 模型 ↗</a><a href="data/igrf14coeffs.txt" target="_blank">本地原始系数 ↗</a><a href="https://www.ncei.noaa.gov/products/wandering-geomagnetic-poles" target="_blank" rel="noreferrer">地磁极定义 ↗</a></div></details>`;
  document.querySelector('main').prepend(section);
  const nav = document.createElement('nav'); nav.className = 'atlas-nav'; nav.setAttribute('aria-label', '实验室切换');
  nav.innerHTML = '<button data-atlas-mode="gravity" aria-pressed="false">重力实验</button><button data-atlas-mode="survey" aria-pressed="false">测线设计</button><button data-atlas-mode="magnetic" aria-pressed="true">磁场时光机</button>';
  document.querySelector('header').insertBefore(nav, $m('theoryBtn'));
  function mode(name, persist = true) {
    document.body.dataset.atlas = name;
    const footerText = document.querySelectorAll('main>footer>span');
    footerText[0].textContent = name === 'magnetic' ? 'IGRF-14 · 磁场与重力实验 · 核心计算离线可用' : 'WGS‑84 + 多因素正演 · 核心计算离线可用';
    footerText[1].textContent = name === 'magnetic' ? '历史模型与趋势假设 · 2030 年后为非官方外推' : '参考场 + 可选近似模型，不等同于真实全球重力场。';
    document.querySelectorAll('[data-atlas-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.atlasMode === name)));
    if (name === 'survey') {
      footerText[0].textContent = '三维密度模型 · 预算约束测线设计 · 离线正演';
      footerText[1].textContent = '合成重力场与采样实验 · 固定 2000 × 2000 × 1000 m';
    }
    if (persist) history.replaceState(null, '', '#' + name);
    if (name === 'magnetic') render(); else {stop(); window.dispatchEvent(new Event('resize'));}
  }
  nav.addEventListener('click', e => {const b = e.target.closest('[data-atlas-mode]'); if (b) mode(b.dataset.atlasMode);});
  const routeMode = () => {
    if (location.hash === '#gravity') return 'gravity';
    if (location.hash === '#survey' || location.hash.startsWith('#sv')) return 'survey';
    return 'magnetic';
  };
  window.addEventListener('hashchange', () => mode(routeMode(), false));
  function coordinate(v, isLat) {return Math.abs(v).toFixed(2) + '°' + (isLat ? (v < 0 ? 'S' : 'N') : (v < 0 ? 'W' : 'E'));}
  function f(v, n = 2) {return v === null ? '未定义' : v.toFixed(n);}
  function ensureSeries() {
    const key = [end, scenario, lat, lon, height].join(',');
    if (key === seriesKey) return;
    series = [];
    for (let y = 1900; y <= end; y++) series.push({...P.pole(y, scenario), field: P.field(y, lat, lon, height, scenario)});
    seriesKey = key;
  }
  function current() {ensureSeries(); return series[year - 1900];}
  function selectYear(y, smooth = true) {
    if (!Number.isFinite(y)) {$m('magNotice').textContent = '请输入 1900–2100 的整数年份。'; return;}
    year = Math.max(1900, Math.min(2100, Math.round(y)));
    if (year > end) {end = year <= 2050 ? 2050 : 2100; $m('magEnd').value = end;}
    if (smooth && !reduced && visualYear !== year) {
      transition = {from: visualYear, to: year, start: performance.now(), duration: playing ? Math.min(180, +$m('magSpeed').value) : 420};
      animateMotion();
    } else {visualYear = year; transition = null;}
    $m('magNotice').textContent = y !== year ? `年份已调整为 ${year}。` : '';
    render();
  }
  function render() {
    if (document.body.dataset.atlas !== 'magnetic') return;
    const p = current(), base = series[80], future = year > 2025;
    $m('magYear').value = year; $m('magYearRange').max = end; $m('magYearRange').value = year;
    const rail = section.querySelector('.mag-time-rail');
    rail.style.setProperty('--history-cut', 125 / (end - 1900) * 100 + '%');
    rail.style.setProperty('--official-cut', Math.min(100, 130 / (end - 1900) * 100) + '%');
    $m('magYearTitle').textContent = year + '.0'; $m('magGhost').textContent = year;
    $m('magSource').textContent = P.provenance(year); $m('magSource').classList.toggle('future', future);
    $m('magGlobeStatus').textContent = P.provenance(year);
    $m('magMoment').textContent = f(p.moment / 1e22, 4);
    $m('magPoleLat').textContent = coordinate(p.lat, true); $m('magPoleLon').textContent = coordinate(p.lon, false);
    $m('magTilt').textContent = f(p.tilt) + '°';
    const delta = (p.moment / base.moment - 1) * 100;
    $m('magDelta').textContent = (delta > 0 ? '+' : '') + f(delta) + '%';
    $m('magCoefficients').innerHTML = `<span>g₁⁰ ${f(p.g0)} nT</span><span>g₁¹ ${f(p.g1)} nT</span><span>h₁¹ ${f(p.h1)} nT</span>`;
    $m('magContext').textContent = year > 2030 ? '已进入趋势外推区。切换趋势假设可观察未来轨迹的差异；年份越远，对趋势保持不变的依赖越强。' : year > 2025 ? '使用 IGRF-14 发布的 2025–2030 世变系数计算。这是模型预测，不是未来实测。' : '由三个一阶系数求中心偶极子磁矩和磁轴方向。地磁北极与地理北极的位置并不重合。';
    $m('magTicks').innerHTML = [1900, Math.round(1900 + (end - 1900) / 3), Math.round(1900 + 2 * (end - 1900) / 3), end].map(v => `<span>${v}</span>`).join('');
    document.querySelectorAll('[data-mag-year]').forEach(b => b.classList.toggle('active', +b.dataset.magYear === year));
    $m('magObserver').hidden = track !== 'di'; $m('magLocalReading').hidden = track !== 'di';
    document.querySelectorAll('[data-mag-track]').forEach(b => {const on = b.dataset.magTrack === track; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));});
    $m('magTrackTitle').textContent = {pole: '北极的迁移，有迹可循。', di: '用 D 和 I，画出磁场的年轮。', moment: '磁矩如何改变，一眼看清。'}[track];
    $m('magTrackSubtitle').textContent = {pole: '北极立体投影 · 经纬网格 · 悬停读年份，点击轨迹回到那一年。', di: '类似参考图二的曲线网格 · 每年一点 · 位置不同，年代曲线也不同。', moment: '总磁矩的逐年变化 · 实线为历史模型，2025 年后为预测或外推。'}[track];
    const q = p.field;
    $m('magLocalReading').textContent = `D ${q.D === null ? '未定义' : f(q.D) + '°'}　 I ${f(q.I)}°　 F ${f(q.F, 0)} nT`;
    drawGlobe(); drawTrack();
  }
  function animateMotion() {
    if (motionFrame || reduced) return;
    motionFrame = requestAnimationFrame(() => {
      motionFrame = 0;
      if (!transition || document.body.dataset.atlas !== 'magnetic') return;
      const t = Math.min(1, (performance.now() - transition.start) / transition.duration);
      const ease = t * t * (3 - 2 * t);
      visualYear = transition.from + (transition.to - transition.from) * ease;
      if (t === 1) {visualYear = transition.to; transition = null;}
      drawGlobe();
      if (transition) animateMotion();
    });
  }
  function setupCanvas(id) {
    const el = $m(id), box = el.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    el.width = Math.round(box.width * dpr); el.height = Math.round(box.height * dpr);
    const c = el.getContext('2d'); c.scale(dpr, dpr);
    return {c, w: box.width, h: box.height};
  }
  function drawGlobe() {
    const {c, w, h} = setupCanvas('magGlobe'); if (!w) return;
    const cx = w * .43, cy = 43, scale = (h - 70) / Math.tan(15 * R / 2);
    const map = p => {
      const radius = Math.tan((90 - p.lat) * R / 2) * scale, angle = (p.lon + 90) * R;
      return [cx + radius * Math.sin(angle), cy + radius * Math.cos(angle)];
    };
    const real=P.pole(visualYear,scenario),q=map(real);
    const ocean = c.createRadialGradient(cx, cy, 0, cx, cy, h * 1.1);
    ocean.addColorStop(0, '#213a47'); ocean.addColorStop(.55, '#132c3c'); ocean.addColorStop(1, '#0b1b2a');
    c.fillStyle = ocean; c.fillRect(0, 0, w, h);
    const path = (points, color, width = 1, dash = []) => {
      c.beginPath(); points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
      c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash); c.stroke(); c.setLineDash([]);
    };
    // Geographic coordinates from the existing public-domain Natural Earth data.
    // Only Arctic coastlines are drawn; the map has a fixed north-polar view.
    for (const ring of window.LAND || []) {
      if (!ring.some(p=>p[1]>74)) continue;
      const points = ring.map(([lon,lat])=>map({lon,lat}));
      c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
      c.fillStyle='#aecacb19';c.fill();c.strokeStyle='#9abcbc62';c.lineWidth=.8;c.stroke();
    }
    for (const lat of [70,75,80,85]) {
      const radius = Math.tan((90-lat)*R/2)*scale;
      c.beginPath();c.arc(cx,cy,radius,0,2*Math.PI);c.strokeStyle='#7fabb43a';c.lineWidth=.8;c.stroke();
      if(cy+radius<h-18){c.fillStyle='#8ba9b1';c.font='10px Consolas';c.fillText(lat+'°N',cx-radius*.53,cy+radius*.85);}
    }
    for(let lon=-180;lon<180;lon+=30)path([[cx,cy],map({lat:55,lon})],'#7fabb42c',.7);
    // Surface-tangent directions of a centered dipole are great-circle
    // meridians about its axis. These are a direction projection, not 3-D
    // field lines confined to the surface. Arrows point toward the northern
    // axis; the actual field also enters the Earth here.
    const phi=real.lat*R,lambda=real.lon*R;
    const axis=[Math.cos(phi)*Math.cos(lambda),Math.cos(phi)*Math.sin(lambda),Math.sin(phi)];
    const east=[-Math.sin(lambda),Math.cos(lambda),0];
    const north=[-Math.sin(phi)*Math.cos(lambda),-Math.sin(phi)*Math.sin(lambda),Math.cos(phi)];
    const fieldLines=[];
    for(let i=0;i<12;i++){
      const beta=i*Math.PI/6,points=[];
      for(let step=0;step<=60;step++){
        const theta=(1.2+step*.55)*R;
        const v=axis.map((n,j)=>Math.cos(theta)*n+Math.sin(theta)*(Math.cos(beta)*north[j]+Math.sin(beta)*east[j]));
        points.push(map({lat:Math.asin(v[2])/R,lon:Math.atan2(v[1],v[0])/R}));
      }
      fieldLines.push(points);path(points,'#83d8ed66',1.25);
      // Static arrowheads convey direction without adding continuous motion.
      for(const k of [13,32,51]){
        const tip=points[k],prev=points[k+1];
        if(tip[0]<12||tip[0]>w-12||tip[1]<12||tip[1]>h-24)continue;
        const angle=Math.atan2(tip[1]-prev[1],tip[0]-prev[0]);
        path([[tip[0]-5*Math.cos(angle-.5),tip[1]-5*Math.sin(angle-.5)],tip,[tip[0]-5*Math.cos(angle+.5),tip[1]-5*Math.sin(angle+.5)]],'#9bddeda3',1.25);
      }
    }
    function textAt(label, point, color = '#8fa9b1', size = 11) {
      const [x,y]=map(point);if(x<15||x>w-65||y<40||y>h-18)return;
      c.fillStyle=color;c.font=`${size}px Microsoft YaHei`;c.fillText(label,x,y);
    }
    textAt('格陵兰',{lat:79.5,lon:-42},'#a4babd');
    textAt('加拿大北极群岛',{lat:77.4,lon:-117},'#a4babd',10);
    textAt('北 冰 洋',{lat:84.2,lon:-35},'#789ba68c',14);
    c.strokeStyle='#dce9ef';c.lineWidth=1.2;
    c.beginPath();c.arc(cx,cy,6,0,2*Math.PI);c.stroke();
    path([[cx-10,cy],[cx+10,cy]],'#dce9ef',1.1);
    path([[cx,cy-10],[cx,cy+10]],'#dce9ef',1.1);
    c.fillStyle='#e3edf1';c.font='12px Microsoft YaHei';c.fillText('地理北极',cx+16,cy-2);
    c.fillStyle='#97afb8';c.font='10px Consolas';c.fillText('90°N',cx+16,cy+15);
    regionHits=[];
    for(let j=0;j<series.length;j++){
      const p=series[j],q=map(p);regionHits.push({year:p.year,x:q[0],y:q[1]});
      if(j){const prior=series[j-1],a=map(prior),past=p.year<=visualYear;
        path([a,q],p.year>2025?(past?'#e7ba7b':'#e7ba7b5c'):(past?'#9aecbd':'#9aecbd50'),past?3:1.5,p.year>2025?[2,3]:[]);
      }
    }
    const placed=[];
    for(const y of [1900,1980,2010,2025,end]){
      const p=series[y-1900];if(!p)continue;const q=map(p);
      if(Math.abs(y-visualYear)<9||placed.some(t=>Math.hypot(q[0]-t[0],q[1]-t[1])<24))continue;
      placed.push(q);c.fillStyle=y>2025?'#e7ba7b':'#a9cdbb';c.beginPath();c.arc(q[0],q[1],2.3,0,2*Math.PI);c.fill();
      c.font='10px Consolas';c.fillText(String(y),q[0]-36,q[1]+4);
    }
    const color=year>2025?'#f2c68b':'#a9f3c6';
    c.fillStyle=color+'13';c.beginPath();c.arc(q[0],q[1],23,0,2*Math.PI);c.fill();
    c.strokeStyle=color+'99';c.lineWidth=1;c.beginPath();c.arc(q[0],q[1],14,0,2*Math.PI);c.stroke();
    c.fillStyle=color;c.shadowColor=color;c.shadowBlur=12;c.beginPath();c.arc(q[0],q[1],6,0,2*Math.PI);c.fill();c.shadowBlur=0;
    const labelX=Math.min(w-120,q[0]+29),labelY=q[1]-3;
    path([[q[0]+15,q[1]],[labelX-5,labelY]],color+'99',.8);
    c.fillStyle=color;c.font='12px Microsoft YaHei';c.fillText('地磁北极 · '+year,labelX,labelY);
    c.fillStyle='#9db5bc';c.font='10px Consolas';c.fillText(coordinate(real.lat,true)+' / '+coordinate(real.lon,false),labelX,labelY+18);
    regionGeometry={north:[cx,cy],current:q,latitude:real.lat,longitude:real.lon,scale,fieldLines};
    c.fillStyle='#8da8b0';c.font='10px Microsoft YaHei';c.fillText('北极俯视 · 真实坐标',12,h-13);
  }
  // Recording these vector commands also makes the exported SVG fully editable.
  let commands = [];
  function drawTrack() {
    const {c, w, h} = setupCanvas('magTrack'); if (!w) return;
    const paper = $m('magPaper').checked, bg = paper ? '#f4f0e6' : '#0c1621';
    const grid = paper ? '#aaa89e' : '#2d454c', text = paper ? '#4b514b' : '#829f9f';
    const historyColor = paper ? '#28664f' : '#9aecbd', futureColor = paper ? '#a26329' : '#e7ba7b';
    commands = []; hitPoints = [];
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    commands.push({type: 'rect', x: 0, y: 0, w, h, color: bg});
    function path(points, color, width = 1, dash = []) {
      const safe = points.filter(q => q.every(Number.isFinite)); if (!safe.length) return;
      c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash); c.beginPath();
      safe.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.setLineDash([]);
      commands.push({type: 'path', points: safe, color, width, dash});
    }
    function label(s, x, y, color = text, align = 'left', size = 10) {
      c.fillStyle = color; c.font = `${size}px Microsoft YaHei`; c.textAlign = align; c.fillText(s, x, y); c.textAlign = 'left';
      commands.push({type: 'text', s, x, y, color, align, size});
    }
    function circle(x, y, radius, color, filled = true) {
      c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fillStyle = color; c.strokeStyle = color; if (filled) c.fill(); else c.stroke();
      commands.push({type: 'circle', x, y, radius, color, filled});
    }
    let mapping;
    if (track === 'pole') {
      const scale = Math.min(w - 56, h - 65) / 2, cx = w / 2, cy = (h + 15) / 2;
      const poleR = lt => Math.tan((90 - lt) * R / 2) / Math.tan(20 * R / 2) * scale;
      mapping = p => {const r = poleR(p.lat), angle = (p.lon + 90) * R; return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];};
      for (const lt of [70, 75, 80, 85]) {
        const rr = poleR(lt); path(Array.from({length: 121}, (_, i) => [cx + rr * Math.cos(i * Math.PI / 60), cy + rr * Math.sin(i * Math.PI / 60)]), grid, .7);
        label(lt + '°N', cx + 5, cy - rr + 11);
      }
      for (let lng = -180; lng < 180; lng += 45) {
        const t = (lng + 90) * R;
        path([[cx, cy], [cx + scale * Math.cos(t), cy + scale * Math.sin(t)]], grid, .7);
        label(Math.abs(lng) + '°' + (lng < 0 ? 'W' : lng > 0 ? 'E' : ''), cx + (scale + 14) * Math.cos(t), cy + (scale + 14) * Math.sin(t) + 3, text, 'center');
      }
      for (const ring of window.LAND || []) {
        let segment = [];
        for (const [lng, lt] of ring) {if (lt < 70) {if (segment.length > 1) path(segment, paper ? '#bbc1b0' : '#405e5744', .65); segment = []; continue;} segment.push(mapping({lon: lng, lat: lt}));}
        if (segment.length > 1) path(segment, paper ? '#bbc1b0' : '#405e5766', .65);
      }
      circle(cx, cy, 3, text, false); label('地理北极', cx + 8, cy + 13);
      label('地磁北极迁移 / 北极立体投影', 13, 19);
    } else if (track === 'di') {
      const valid = series.filter(p => p.field.D !== null);
      if (!valid.length) {label('此处水平磁场过弱，磁偏角 D 未定义。', 18, h / 2); return;}
      // Unwrap D across ±180° so the trajectory does not jump across the plot.
      let previous = valid[0].field.D;
      valid.forEach(p => {let d = p.field.D; while (d - previous > 180) d -= 360; while (d - previous < -180) d += 360; p.plotD = d; previous = d;});
      const ds = valid.map(p => p.plotD), incl = valid.map(p => p.field.I);
      let dlo = Math.floor((Math.min(...ds) - 2) / 2) * 2, dhi = Math.ceil((Math.max(...ds) + 2) / 2) * 2;
      let ilo = Math.max(-90, Math.floor((Math.min(...incl) - 2) / 2) * 2), ihi = Math.min(90, Math.ceil((Math.max(...incl) + 2) / 2) * 2);
      if (dhi - dlo < 12) {const mid = (dhi + dlo) / 2; dlo = mid - 6; dhi = mid + 6;}
      const mid = (dhi + dlo) / 2, raw = (d, i) => [(110 - i) * Math.sin((d - mid) * R), -(110 - i) * Math.cos((d - mid) * R)];
      const edges = []; for (let k = 0; k <= 100; k++) {const d = dlo + (dhi - dlo) * k / 100; edges.push(raw(d, ilo), raw(d, ihi));}
      const xmin = Math.min(...edges.map(p => p[0])), xmax = Math.max(...edges.map(p => p[0])), ymin = Math.min(...edges.map(p => p[1])), ymax = Math.max(...edges.map(p => p[1]));
      const sx = (w - 84) / (xmax - xmin), sy = (h - 74) / (ymax - ymin);
      const map = (d, i) => {const q = raw(d, i); return [42 + (q[0] - xmin) * sx, 38 + (q[1] - ymin) * sy];};
      mapping = p => p.field.D === null ? [NaN, NaN] : map(p.plotD, p.field.I);
      const dstep = Math.max(2, Math.ceil((dhi - dlo) / 10 / 2) * 2), istep = Math.max(2, Math.ceil((ihi - ilo) / 7 / 2) * 2);
      for (let d = dlo; d <= dhi + .001; d += dstep) {
        path([map(d, ilo), map(d, ihi)], grid, .8);
        const q = map(d, ihi); label(f(d, 0) + '°', q[0], q[1] - 7, text, 'center');
      }
      for (let i = ilo; i <= ihi + .001; i += istep) {
        path(Array.from({length: 81}, (_, k) => map(dlo + (dhi - dlo) * k / 80, i)), grid, .8);
        const q = map(dlo, i); label(f(i, 0) + '°', q[0] - 5, q[1] + 4, text, 'right');
      }
      label('磁偏角 D / 东正西负', w / 2, 17, text, 'center');
      label('I / 向下为正', 12, h - 10);
    } else {
      const vals = series.map(p => p.moment / 1e22), lo = Math.floor((Math.min(...vals) - .05) * 10) / 10, hi = Math.ceil((Math.max(...vals) + .05) * 10) / 10;
      mapping = p => [48 + (p.year - 1900) / (end - 1900) * (w - 65), h - 35 - (p.moment / 1e22 - lo) / (hi - lo) * (h - 75)];
      for (let j = 0; j <= 5; j++) {const v = lo + (hi - lo) * j / 5, y = h - 35 - j / 5 * (h - 75); path([[48, y], [w - 17, y]], grid, .7); label(f(v, 2), 41, y + 3, text, 'right');}
      for (const y of [1900, 1950, 2000, 2025, end]) {const x = mapping({year: y, moment: lo * 1e22})[0]; path([[x, 32], [x, h - 35]], grid, .7, y === 2025 ? [3, 3] : []); label(String(y), x, h - 14, text, 'center');}
      label('总磁矩 M / 10²² A·m²', 14, 19);
    }
    for (let j = 0; j < series.length; j++) {
      const p = series[j], xy = mapping(p); if (!xy.every(Number.isFinite)) continue;
      hitPoints.push({x: xy[0], y: xy[1], year: p.year});
      if (j) {
        const prev = mapping(series[j - 1]);
        if (prev.every(Number.isFinite)) path([prev, xy], p.year > 2025 ? futureColor : historyColor, p.year <= year ? 2.4 : 1.6, p.year > 2025 ? [2, 3] : []);
      }
      if (p.year % 20 === 0 || p.year === 2025 || p.year === end) circle(...xy, 2, p.year > 2025 ? futureColor : historyColor);
    }
    // Label selected landmarks only when sufficiently separated.
    const placed = [];
    for (const y of [1900, 1950, 1980, 2010, 2025, end]) {
      const p = series[y - 1900]; if (!p) continue; const q = mapping(p);
      if (!q.every(Number.isFinite) || placed.some(t => Math.hypot(t[0] - q[0], t[1] - q[1]) < 28)) continue;
      placed.push(q); label(String(y), Math.min(w - 35, Math.max(6, q[0] + 7)), Math.min(h - 15, Math.max(31, q[1] - 8)), y > 2025 ? futureColor : historyColor);
    }
    const q = mapping(current());
    if (q.every(Number.isFinite)) {circle(...q, 9, year > 2025 ? futureColor : historyColor, false); circle(...q, 4, year > 2025 ? futureColor : historyColor);}
  }
  function inspect(y) {
    const p = series[y - 1900];
    $m('magInspect').textContent = `${y} · ${P.provenance(y)} · M ${f(p.moment / 1e22, 4)} ×10²² A·m² · ${track === 'di' ? 'D ' + f(p.field.D) + '° / I ' + f(p.field.I) + '°' : coordinate(p.lat, true) + ' / ' + coordinate(p.lon, false)}`;
  }
  function nearest(e) {
    const box = $m('magTrack').getBoundingClientRect(), x = e.clientX - box.left, y = e.clientY - box.top;
    let chosen = null, distance = 28;
    for (const p of hitPoints) {const d = Math.hypot(x - p.x, y - p.y); if (d < distance) {chosen = p; distance = d;}}
    return chosen;
  }
  $m('magTrack').addEventListener('pointermove', e => {const p = nearest(e); if (p) inspect(p.year);});
  $m('magTrack').addEventListener('click', e => {const p = nearest(e); if (p) {stop(); selectYear(p.year); inspect(p.year);}});
  $m('magTrack').addEventListener('keydown', e => {if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {e.preventDefault(); stop(); selectYear(year + (e.key === 'ArrowLeft' ? -1 : 1)); inspect(year);}});
  function stop() {playing=false;cancelAnimationFrame(animation);cancelAnimationFrame(motionFrame);motionFrame=0;transition=null;visualYear=year;$m('magPlay').textContent='▶ 播放时间';$m('magPlay').setAttribute('aria-pressed','false');if(document.body.dataset.atlas==='magnetic')drawGlobe();}
  function tick(t) {
    if (!playing) return;
    if (t - lastStep >= +$m('magSpeed').value) {lastStep = t; selectYear(year + 1); if (year >= end) {stop(); return;}}
    animation = requestAnimationFrame(tick);
  }
    $m('magPlay').onclick = () => {
    if (playing) {stop(); return;}
    stop();
    if (year >= end) selectYear(1900);
    playing = true; lastStep = performance.now(); $m('magPlay').textContent = 'Ⅱ 暂停时间'; $m('magPlay').setAttribute('aria-pressed', 'true'); animation = requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange', () => {if (document.hidden) stop();});
  $m('magPrev').onclick = () => {stop(); selectYear(year - 1);}; $m('magNext').onclick = () => {stop(); selectYear(year + 1);};
  $m('magYearRange').oninput = e => {stop(); selectYear(+e.target.value);};
  $m('magYear').onchange = e => {stop(); selectYear(e.target.value.trim() ? +e.target.value : NaN);};
  document.querySelectorAll('[data-mag-year]').forEach(b => b.onclick = () => {stop(); selectYear(+b.dataset.magYear);});
  $m('magEnd').onchange = e => {stop(); end = +e.target.value; year = Math.min(year, end); visualYear=year; render();};
  $m('magScenario').onchange = e => {scenario = e.target.value; render();};
  $m('magPaper').onchange = drawTrack;
  document.querySelectorAll('[data-mag-track]').forEach(b => b.onclick = () => {
    track = b.dataset.magTrack;
    document.querySelectorAll('[data-mag-track]').forEach(t => {t.classList.toggle('active', t === b); t.setAttribute('aria-pressed', String(t === b));});
    $m('magInspect').textContent = '沿着轨迹移动鼠标，拾起某一年的磁场。'; render();
  });
  function observer() {
    try {
      const values = ['magLat', 'magLon', 'magHeight'].map(id => $m(id).value.trim() === '' ? NaN : +$m(id).value);
      P.field(year, ...values, scenario); [lat, lon, height] = values; $m('magNotice').textContent = ''; render();
    } catch (e) {$m('magNotice').textContent = e.message;}
  }
  ['magLat', 'magLon', 'magHeight'].forEach(id => $m(id).onchange = observer);
  $m('magUsePoint').onclick = () => {$m('magLat').value = state.lat; $m('magLon').value = state.lon; $m('magHeight').value = state.h; observer();};
  $m('magLondon').onclick = () => {$m('magLat').value = 51.5074; $m('magLon').value = -.1278; $m('magHeight').value = 0; observer();};
  const globe=$m('magGlobe');
  function regionNearest(e){const box=globe.getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top;let best=null,distance=20;for(const p of regionHits){const d=Math.hypot(x-p.x,y-p.y);if(d<distance){best=p;distance=d;}}return best;}
  globe.addEventListener('pointermove',e=>{globe.style.cursor=regionNearest(e)?'pointer':'default';});
  globe.addEventListener('click',e=>{const p=regionNearest(e);if(p){stop();selectYear(p.year);}});
  globe.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();stop();selectYear(year+(e.key==='ArrowLeft'?-1:1));}});
  function download(content, filename, type) {
    const url = URL.createObjectURL(new Blob([content], {type})), a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    $m('magNotice').textContent = '已生成 ' + filename;
  }
  const escapeXML = s => String(s).replace(/[&<>"']/g, t => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[t]));
  function svg() {
    drawTrack(); const box = $m('magTrack').getBoundingClientRect();
    const elements = commands.map(q => {
      if (q.type === 'rect') return `<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="${q.color}"/>`;
      if (q.type === 'path') return `<path d="${q.points.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ')}" fill="none" stroke="${q.color}" stroke-width="${q.width}" stroke-dasharray="${q.dash.join(' ')}"/>`;
      if (q.type === 'text') return `<text x="${q.x}" y="${q.y}" fill="${q.color}" font-size="${q.size}" font-family="sans-serif" text-anchor="${{left: 'start', right: 'end', center: 'middle'}[q.align]}">${escapeXML(q.s)}</text>`;
      return `<circle cx="${q.x}" cy="${q.y}" r="${q.radius}" fill="${q.filled ? q.color : 'none'}" stroke="${q.color}"/>`;
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height + 62}" viewBox="0 0 ${box.width} ${box.height + 62}"><title>${escapeXML($m('magTrackTitle').textContent)}</title><desc>IGRF-14, 1900–2025 model/interpolation; 2025–2030 SV forecast; after 2030 scenario extrapolation. Location ${lat}, ${lon}, height ${height} m; scenario ${scenario}.</desc>${elements.join('')}<rect x="0" y="${box.height}" width="${box.width}" height="62" fill="${$m('magPaper').checked ? '#f4f0e6' : '#0c1621'}"/><text x="12" y="${box.height + 18}" fill="${$m('magPaper').checked ? '#4b514b' : '#91a2b3'}" font-family="sans-serif" font-size="10">IGRF-14 · ${1900}–${end} · ${escapeXML(track === 'di' ? `${lat}°, ${lon}°, h=${height}m` : 'Centered dipole')} · ${scenario}</text><text x="12" y="${box.height + 35}" fill="${$m('magPaper').checked ? '#4b514b' : '#91a2b3'}" font-family="sans-serif" font-size="10">Solid: historical model. Dashed: forecast; after 2030: extrapolation.</text><text x="12" y="${box.height + 52}" fill="${$m('magPaper').checked ? '#4b514b' : '#91a2b3'}" font-family="sans-serif" font-size="10">Coefficients: NOAA / IAGA · ngdc.noaa.gov/IAGA/vmod/coeffs/igrf14coeffs.txt</text></svg>`;
  }
  $m('magExportSVG').onclick = () => download(svg(), `磁场轨迹-${track}-1900-${end}.svg`, 'image/svg+xml;charset=utf-8');
  $m('magExportPNG').onclick = async () => {
    try {
      const source = svg(), url = URL.createObjectURL(new Blob([source], {type: 'image/svg+xml'}));
      const img = new Image(); img.src = url;
      try {await img.decode(); const c = document.createElement('canvas'); c.width = img.width * 2; c.height = img.height * 2; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); const blob = await new Promise(resolve => c.toBlob(resolve)); if (!blob) throw Error('图片生成失败。'); download(blob, `磁场轨迹-${track}-1900-${end}.png`, 'image/png');} finally {URL.revokeObjectURL(url);}
    } catch (e) {$m('magNotice').textContent = e.message;}
  };
  $m('magExportCSV').onclick = () => {
    ensureSeries(); const header = 'year,source,scenario,model,g10_nT,g11_nT,h11_nT,moment_Am2,pole_geocentric_lat_deg,pole_lon_deg,observer_geodetic_lat_deg,observer_lon_deg,height_m,D_deg,I_deg,F_nT';
    const lines = series.map(p => [p.year, P.provenance(p.year), p.year > 2030 ? scenario : 'IGRF14', 'IGRF14', p.g0, p.g1, p.h1, p.moment, p.lat, p.lon, lat, lon, height, p.field.D ?? '', p.field.I, p.field.F].join(','));
    download('\uFEFF' + [header, ...lines].join('\r\n'), `逐年地磁-1900-${end}.csv`, 'text/csv;charset=utf-8');
  };
  const homework = Object.entries(P.tasks).map(([y, c]) => ({year: +y, ...P.dipole(...c)}));
  $m('magHomework').innerHTML = homework.map(p => `<tr><td><button data-mag-homework-year="${p.year}" title="查看该年的 IGRF 年代轨迹">${p.year} ↗</button></td><td>${f(p.moment / 1e22, 4)}</td><td>${coordinate(p.lat, true)}</td><td>${coordinate(p.lon, false)}</td></tr>`).join('');
  document.querySelectorAll('[data-mag-homework-year]').forEach(b => b.onclick = () => {stop(); selectYear(+b.dataset.magHomeworkYear); $m('magNotice').textContent = '时间线已定位到对应 IGRF 年份；作业表始终使用题目原系数。';});
  $m('magHomeworkDelta').textContent = `30 年间，磁矩减小 ${f((1 - homework[1].moment / homework[0].moment) * 100)}%；磁轴向地理北极靠近 ${f(homework[1].lat - homework[0].lat)}°。`;
  function answer() {
    return '地球总磁矩与地磁北极估算（题目原系数）\n参考半径 a = 6371.2 km；μ₀ = 4π×10⁻⁷ H/m\nB₀ = √[(g₁⁰)²+(g₁¹)²+(h₁¹)²]\nM = (4π/μ₀)a³B₀×10⁻⁹（系数为 nT）\nφN = asin(−g₁⁰/B₀)\nλN = atan2(−h₁¹,−g₁¹)，经度东正西负\n\n' + homework.map(p => `${p.year} 年：\ng₁⁰ = ${p.g0} nT，g₁¹ = ${p.g1} nT，h₁¹ = ${p.h1} nT\nB₀ = ${f(p.strength, 4)} nT\nM = ${f(p.moment / 1e22, 6)} ×10²² A·m²\n地磁北极：${coordinate(p.lat, true)}，${coordinate(p.lon, false)}；φ = ${f(p.lat, 6)}°，λ = ${f(p.lon, 6)}°\n`).join('\n') + '\n地磁北极为中心偶极子磁轴的北半球交点，纬度是地心纬度。题目原系数与 IGRF-14 的 2010 年系数略有差异。';
  }
  $m('magTaskFormula').innerHTML = 'B₀ = √[(g₁⁰)² + (g₁¹)² + (h₁¹)²]<br>M = (4π/μ₀) a³ B₀ × 10⁻⁹<br>φN = asin(−g₁⁰ / B₀)<br>λN = atan2(−h₁¹, −g₁¹)<br><br>' + homework.map(p => `${p.year}: B₀ = ${f(p.strength, 3)} nT<br>M = ${f(p.moment / 1e22, 6)} ×10²² A·m²<br>φN = ${f(p.lat, 5)}°; λN = ${f(p.lon, 5)}°`).join('<br><br>');
  $m('magCopy').onclick = async () => {try {await navigator.clipboard.writeText(answer()); $m('magNotice').textContent = '已复制两年的完整计算推导。';} catch {download(answer(), '1980与2010-地磁计算.txt', 'text/plain;charset=utf-8'); $m('magNotice').textContent = '浏览器未允许剪贴板访问，已改为保存答案文件。';}};
  $m('magTaskDownload').onclick = () => download(answer(), '1980与2010-地磁计算.txt', 'text/plain;charset=utf-8');
  $m('magCalculate').onclick = () => {
    try {
      const values = ['magCustomYear', 'magG0', 'magG1', 'magH1'].map(id => $m(id).value.trim() === '' ? NaN : +$m(id).value);
      if (!Number.isFinite(values[0]) || !Number.isInteger(values[0])) throw Error('请输入整数年份标签。');
      const p = P.dipole(...values.slice(1));
      $m('magCustomResult').textContent = `${values[0]} · M ${f(p.moment / 1e22, 5)} ×10²² A·m² · ${coordinate(p.lat, true)} / ${coordinate(p.lon, false)} · 磁轴倾斜 ${f(p.tilt)}°`;
    } catch (e) {$m('magCustomResult').textContent = e.message;}
  };
  window.addEventListener('resize', () => {if (document.body.dataset.atlas === 'magnetic') {drawGlobe(); drawTrack();}});
  // A shared URL can opt into the original gravity laboratory.
  mode(routeMode(), false);
  return {selectYear,getState:()=>({year,end,scenario,track,lat,lon,height,playing,visualYear}),getRegion:()=>({geometry:regionGeometry,hits:regionHits.map(p=>({...p}))}),getHits:()=>hitPoints.map(p=>({...p})),answer,svg};
})();
