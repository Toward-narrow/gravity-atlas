/* SI units; local z is positive downward. No background mass is double counted. */
(function (root) {
  'use strict';
  const G = 6.67430e-11, SIZE = [2000, 2000, 1000];
  let priceCents=20000,budgetCents=2000000;
  function costs(){return {budget:budgetCents/100,price:priceCents/100,maxPoints:Math.floor(budgetCents/priceCents)};}
  function setCosts(budget,price){
    const cents=v=>{if(!Number.isFinite(v)||v<=0||!Number.isSafeInteger(Math.round(v*100))||Math.abs(v*100-Math.round(v*100))>1e-5)throw Error('经费和单价须为正数，最多保留两位小数。');return Math.round(v*100);};
    const b=cents(budget),p=cents(price);
    if(Math.floor(b/p)<4)throw Error('当前经费不足以布置最小 2 条线 × 每线 2 点的测网，请增加经费或降低单价。');
    budgetCents=b;priceCents=p;return costs();
  }
  function validateBody(b) {
    const keys = ['x','y','z','rx','ry','rz','rho'];
    if (!keys.every(k => Number.isFinite(b[k]))) throw Error('异常体参数必须是有限数字。');
    if (!['sphere','box'].includes(b.kind)) throw Error('未知异常体类型。');
    if (b.rho < -2000 || b.rho > 2000) throw Error('密度差应在 −2000～2000 kg/m³。');
    if (Math.min(b.rx,b.ry,b.rz) < 30) throw Error('半径或半边长至少为 30 m。');
    for (const [i,k,r] of [[0,'x','rx'],[1,'y','ry'],[2,'z','rz']]) {
      if (b[k]-b[r] < (i===2?10:0) || b[k]+b[r] > SIZE[i]) throw Error('异常体须完整位于 2000 × 2000 × 1000 m 内，顶面深度至少 10 m。');
    }
    return b;
  }
  function sources(bodies, subdivisions=8) {
    return bodies.map(b => {
      validateBody(b);
      if (b.kind==='sphere') return {...b, mass:4*Math.PI*b.rx**3*b.rho/3};
      const cells=[], volume=8*b.rx*b.ry*b.rz/subdivisions**3;
      for(let i=0;i<subdivisions;i++) for(let j=0;j<subdivisions;j++) for(let k=0;k<subdivisions;k++)
        cells.push([b.x-b.rx+(i+.5)*2*b.rx/subdivisions,b.y-b.ry+(j+.5)*2*b.ry/subdivisions,b.z-b.rz+(k+.5)*2*b.rz/subdivisions,volume*b.rho]);
      return {...b,cells};
    });
  }
  function gravity(src,x,y) {
    let g=0;
    for(const b of src) {
      if(b.kind==='sphere') g+=G*b.mass*b.z/((x-b.x)**2+(y-b.y)**2+b.z**2)**1.5;
      else for(const [cx,cy,cz,m] of b.cells) g+=G*m*cz/((x-cx)**2+(y-cy)**2+cz**2)**1.5;
    }
    return g*1e5; // m/s² -> mGal, positive downward
  }
  function grid(plan) {
    const {spacing,lineSpacing,length,lines,cx,cy,angle}=plan;
    if (![spacing,lineSpacing,length,lines,cx,cy,angle].every(Number.isFinite) || spacing<50 || lineSpacing<50 || length<100 || length>2000 || !Number.isInteger(lines) || lines<2 || lines>21 || angle<0 || angle>180) throw Error('点距、线距至少 50 m；线长 100～2000 m；测线数为 2～21 的整数；方位角为 0～180°。');
    const perLine=Math.floor(length/spacing+1e-8)+1, actualLength=(perLine-1)*spacing;
    const a=angle*Math.PI/180, ux=Math.sin(a),uy=Math.cos(a),vx=Math.cos(a),vy=-Math.sin(a),points=[];
    let inside=true;
    for(let j=0;j<lines;j++) for(let i=0;i<perLine;i++) {
      const u=(i-(perLine-1)/2)*spacing,v=(j-(lines-1)/2)*lineSpacing;
      const x=cx+u*ux+v*vx,y=cy+u*uy+v*vy;
      if(x<-.001||x>2000.001||y<-.001||y>2000.001) inside=false;
      points.push({x,y,line:j+1,station:i+1});
    }
    return {points,perLine,actualLength,width:(lines-1)*lineSpacing,count:points.length,cost:points.length*priceCents/100,inside,valid:inside&&points.length<=costs().maxPoints,ux,uy,vx,vy};
  }
  function covered(plan,geometry,x,y) {
    const dx=x-plan.cx,dy=y-plan.cy;
    return Math.abs(dx*geometry.ux+dy*geometry.uy)<=geometry.actualLength/2+1e-6 && Math.abs(dx*geometry.vx+dy*geometry.vy)<=geometry.width/2+1e-6;
  }
  const planKeys=['spacing','lineSpacing','length','lines','cx','cy','angle'];
  function planLimit(plan) {
    if(!planKeys.every(k=>Number.isFinite(plan[k]))) return '参数无效';
    if(plan.spacing<50||plan.lineSpacing<50) return '间距最小为 50 m';
    if(plan.length<100||plan.length>2000) return '线长须在 100～2000 m 内';
    if(!Number.isInteger(plan.lines)||plan.lines<2||plan.lines>21) return '至少保留 2 条测线';
    const perLine=Math.floor(plan.length/plan.spacing+1e-8)+1;
    if(perLine<2||(perLine-1)*plan.spacing<100-1e-6) return '每条线至少 2 点，实际线长至少 100 m';
    if(perLine*plan.lines>costs().maxPoints) return '已到 '+costs().maxPoints+' 点 / '+costs().budget+' 元预算边界';
    try {if(!grid(plan).inside) return '已到 2000 × 2000 m 测区边界';}catch(e){return e.message;}
    return '';
  }
  function fitBudget(plan){
    const g=grid(plan),capacity=costs().maxPoints;if(g.count<=capacity)return {...plan};
    let best=null,score=Infinity;
    for(let m=2;m<=plan.lines;m++)for(let n=2;n<=g.perLine;n++){
      if(m*n>capacity)continue;
      const loss=((plan.lines-1)/(m-1))**2+((g.perLine-1)/(n-1))**2;
      if(loss<score-1e-10||(Math.abs(loss-score)<1e-10&&m*n>(best?.count||0))){score=loss;best={m,n,count:m*n};}
    }
    if(!best)throw Error('经费不足以保留有效测网。');
    return {...plan,lines:best.m,length:g.actualLength,spacing:g.actualLength/(best.n-1),lineSpacing:g.width/(best.m-1)};
  }
  // Follow the whole drag path and stop at its FIRST invalid state. This prevents
  // a large pointer jump from crossing an invalid intermediate budget or extent.
  function constrainPlan(previous,target) {
    const reason=planLimit(previous);if(reason)throw Error('起始测网无效：'+reason);
    const next={...previous,...target};
    if(!planKeys.every(k=>Number.isFinite(next[k]))) return {plan:{...previous},blocked:true,reason:'拖动数值无效'};
    const at=t=>{
      const p={...previous};for(const k of planKeys)p[k]=previous[k]+(next[k]-previous[k])*t;
      p.lines=Math.round(p.lines);return p;
    };
    let valid=0,invalid=0,blocked='';
    for(let i=1;i<=48;i++){
      const t=i/48,r=planLimit(at(t));if(r){invalid=t;blocked=r;break;}valid=t;
    }
    if(!blocked)return {plan:at(1),blocked:false,reason:''};
    for(let i=0;i<28;i++) {const t=(valid+invalid)/2;if(planLimit(at(t)))invalid=t;else valid=t;}
    return {plan:at(valid),blocked:true,reason:blocked};
  }
  function noise(x,y,seed=7) {
    const fract=v=>v-Math.floor(v);
    const u=Math.max(1e-9,fract(Math.sin(x*12.9898+y*78.233+seed)*43758.5453));
    const v=fract(Math.sin(x*39.346+y*11.135+seed+1)*24634.6345);
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  }
  function interpolate(points,x,y) {
    let weights=0,value=0;
    for(const p of points) {
      const d2=(x-p.x)**2+(y-p.y)**2;
      if(d2<1e-10) return p.g;
      const w=1/(d2*d2); weights+=w; value+=w*p.g;
    }
    return value/weights;
  }
  function evaluate(plan,src,truth,sigma=0,seed=7,n=51) {
    const geometry=grid(plan),points=geometry.points.map(p=>({...p,trueG:gravity(src,p.x,p.y),g:gravity(src,p.x,p.y)+sigma*noise(p.x,p.y,seed)}));
    const values=[],mask=[];let sum=0,valid=0;
    for(let j=0;j<n;j++) for(let i=0;i<n;i++) {
      const x=i*2000/(n-1),y=j*2000/(n-1),inside=covered(plan,geometry,x,y),v=inside?interpolate(points,x,y):null;
      values.push(v);mask.push(inside);
      if(inside) {sum+=(v-truth[j*n+i])**2;valid++;}
    }
    const targets=src.map(b=>({covered:covered(plan,geometry,b.x,b.y),nearest:Math.min(...points.map(p=>Math.hypot(p.x-b.x,p.y-b.y))),depth:b.z}));
    return {plan,geometry,points,values,mask,rmse:valid?Math.sqrt(sum/valid):null,coverage:geometry.actualLength*geometry.width/4e6,targets};
  }
  const api={G,SIZE,get PRICE(){return priceCents/100;},get BUDGET(){return budgetCents/100;},costs,setCosts,fitBudget,validateBody,sources,gravity,grid,covered,planLimit,constrainPlan,noise,interpolate,evaluate};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.SurveyPhysics=api;
})(typeof window!=='undefined'?window:globalThis);
