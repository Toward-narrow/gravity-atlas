/* Gravity forward kernels. Coordinates: east x, north y, depth z (positive down).
 * UI density: absolute g/cm^3. Kernels use SI, return downward g_z in mGal.
 * Prism formula: Nagy et al., safe log/atan as documented by Choclo.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ForwardPhysics=api;})(typeof self!=='undefined'?self:globalThis,()=>{
'use strict';
const G=6.67430e-11, SCALE=G*1e5, clone=v=>JSON.parse(JSON.stringify(v));
const examplePoints=[[[200,240],[500,240],[500,370],[740,370],[740,760],[200,760]],[[1020,150],[1320,150],[1450,470],[850,470]],[[1590,460],[1860,600],[1670,900],[1400,760]]];
function example(dimension=3){return {version:1,dimension,domain:{width:2000,north:2000,depth:1000},background:2.6,method:'standard',cell:10,resolution:10,nx:41,ny:41,obsHeight:0,noise:0,seed:7,profile:{x1:0,y1:1000,x2:2000,y2:1000,n:101},bodies:examplePoints.map((points,i)=>({id:'body-'+(i+1),name:['低密度阶梯体','高密度梯形体','倾斜异常体'][i],kind:'polygon',rho:[2,3.6,3.3][i],enabled:true,points:clone(points),x:1000,y:1000,z:500,sx:400,sy:[650,850,550][i],sz:400,yaw:0}))};}
function area(p){return p.reduce((a,v,i)=>{const w=p[(i+1)%p.length];return a+v[0]*w[1]-w[0]*v[1];},0)/2;}
function inside(p,x,z){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j],cross=(x-a[0])*(b[1]-a[1])-(z-a[1])*(b[0]-a[0]);if(Math.abs(cross)<1e-7&&x>=Math.min(a[0],b[0])-1e-9&&x<=Math.max(a[0],b[0])+1e-9&&z>=Math.min(a[1],b[1])-1e-9&&z<=Math.max(a[1],b[1])+1e-9)return true;if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function cross(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function validatePolygon(p){if(!Array.isArray(p)||p.length<3||p.length>64)throw Error('多边形需要 3～64 个顶点。');p.forEach(v=>{if(!Array.isArray(v)||v.length!==2||!v.every(Number.isFinite))throw Error('顶点必须为有限的 x、z 数字。');});if(Math.abs(area(p))<1)throw Error('多边形面积过小或顶点退化。');for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if(Math.hypot(a[0]-b[0],a[1]-b[1])<.01)throw Error('相邻顶点不能重合。');for(let j=i+1;j<p.length;j++){if(j===i+1||(i===0&&j===p.length-1))continue;const c=p[j],d=p[(j+1)%p.length],q=[cross(a,b,c),cross(a,b,d),cross(c,d,a),cross(c,d,b)];if(q[0]*q[1]<=0&&q[2]*q[3]<=0&&Math.max(a[0],b[0])>=Math.min(c[0],d[0])&&Math.max(c[0],d[0])>=Math.min(a[0],b[0])&&Math.max(a[1],b[1])>=Math.min(c[1],d[1])&&Math.max(c[1],d[1])>=Math.min(a[1],b[1]))throw Error('多边形边界不能自交或相互接触。');}}}
function bounds(b){if(b.kind==='polygon')return [Math.min(...b.points.map(p=>p[0])),Math.max(...b.points.map(p=>p[0])),Math.min(...b.points.map(p=>p[1])),Math.max(...b.points.map(p=>p[1]))];return [b.x-b.sx/2,b.x+b.sx/2,b.z-b.sz/2,b.z+b.sz/2];}
function outline(b){if(b.kind==='polygon')return b.points;if(b.kind==='box')return [[b.x-b.sx/2,b.z-b.sz/2],[b.x+b.sx/2,b.z-b.sz/2],[b.x+b.sx/2,b.z+b.sz/2],[b.x-b.sx/2,b.z+b.sz/2]];return Array.from({length:64},(_,i)=>[b.x+b.sx/2*Math.cos(i*2*Math.PI/64),b.z+b.sz/2*Math.sin(i*2*Math.PI/64)]);}
function validate(s){
 if(!s||s.version!==1||![2,3].includes(s.dimension))throw Error('不是受支持的正演模型 JSON（version=1）。');
 const finite=(v,lo,hi,name)=>{if(!Number.isFinite(v)||v<lo||v>hi)throw Error(name+'须在 '+lo+'～'+hi+' 之间。');};
 if(!s.domain||!s.profile)throw Error('缺少模型范围或测线参数。');for(const k of ['width','north','depth'])finite(s.domain[k],100,20000,'空间范围');finite(s.background,.01,10,'背景密度');finite(s.obsHeight,0,20000,'观测高度');finite(s.noise,0,50,'噪声百分比');finite(s.seed,0,1e9,'噪声种子');
 if(!['standard','legacy'].includes(s.method))throw Error('未知二维计算方法。');if(![10,20,40].includes(s.cell)||![6,10,16,24].includes(s.resolution))throw Error('不支持的网格精度。');
 for(const k of ['nx','ny']){finite(s[k],11,101,'网格点数');if(!Number.isInteger(s[k]))throw Error('网格点数必须为整数。');}finite(s.profile.n,2,501,'剖面点数');if(!Number.isInteger(s.profile.n))throw Error('剖面点数必须为整数。');
 for(const k of ['x1','x2'])finite(s.profile[k],0,s.domain.width,'测线东坐标');for(const k of ['y1','y2'])finite(s.profile[k],0,s.domain.north,'测线北坐标');if(s.dimension===2&&(Math.abs(s.profile.x2-s.profile.x1)<1||s.profile.y2!==s.profile.y1))throw Error('二维剖面须沿 x 方向且长度至少 1 m。');if(Math.hypot(s.profile.x2-s.profile.x1,s.profile.y2-s.profile.y1)<1)throw Error('测线起终点不能重合。');
 if(!Array.isArray(s.bodies)||s.bodies.length>20)throw Error('最多支持 20 个异常体。');
 for(const b of s.bodies){if(!b||!['polygon','box','sphere','ellipsoid','cylinder'].includes(b.kind))throw Error('不支持的异常体类型。');if(typeof b.name!=='string'||b.name.length>80||typeof b.enabled!=='boolean')throw Error('异常体名称或开关无效。');finite(b.rho,0,10,'绝对密度');for(const k of ['x','y','z'])finite(b[k],-20000,40000,'中心坐标');for(const k of ['sx','sy','sz'])finite(b[k],1,20000,'尺寸');finite(b.yaw,-360,360,'走向角');if(b.kind==='sphere'&&(b.sx!==b.sy||b.sx!==b.sz))throw Error('球体的三个直径必须相等。');if(b.kind==='polygon')validatePolygon(b.points);const [x0,x1,z0,z1]=bounds(b);if(x0<0||x1>s.domain.width||z0<1||z1>s.domain.depth)throw Error('异常体须在模型范围内，顶面埋深至少 1 m。');if(s.dimension===3){const c=(x0+x1)/2,ax=Math.max(c-x0,x1-c),ay=b.sy/2,r=b.yaw*Math.PI/180,ex=Math.abs(Math.cos(r))*ax+Math.abs(Math.sin(r))*ay,ey=Math.abs(Math.sin(r))*ax+Math.abs(Math.cos(r))*ay;if(c-ex<0||c+ex>s.domain.width||b.y-ey<0||b.y+ey>s.domain.north)throw Error('旋转后的三维异常体超出水平模型范围，请缩小尺寸或移动位置。');}}
 return s;
}
// Integral of log(u^2+h^2), with the continuous h=0 limit.
function logPrimitive(u,h){if(h<1e-12)return u===0?0:u*Math.log(u*u)-2*u;return u*Math.log(u*u+h*h)-2*u+2*h*Math.atan(u/h);}
function polygonGz(points,rho,x,z){let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);if(Math.abs(dx)<1e-14)continue;const ax=a[0]-x,az=a[1]-z,t=(ax*dx+az*dz)/L,h=Math.abs(ax*dz-az*dx)/L;sum-=dx*(logPrimitive(t+L,h)-logPrimitive(t,h))/L;}return SCALE*rho*sum*Math.sign(area(points));}
function safeLog(a,b,c,r){if(a>=0)return r+a===0?0:Math.log(r+a);const q=b*b+c*c;return q===0?-Math.log(-2*a):Math.log(q/(r-a));}
function prismGz(box,rho,x,y,z){let sum=0;for(let i=0;i<2;i++)for(let j=0;j<2;j++)for(let k=0;k<2;k++){const a=box[i]-x,b=box[2+j]-y,c=box[4+k]-z,r=Math.hypot(a,b,c),den=c*r,num=a*b,angle=den!==0?Math.atan(num/den):Math.sign(num)*Math.PI/2;const v=a*safeLog(b,a,c,r)+b*safeLog(a,b,c,r)-c*angle;sum+=(i+j+k)%2===0?v:-v;}return SCALE*rho*sum;}
function compile(s){validate(s);if(s.dimension===2&&s.method==='legacy'&&Math.ceil(s.domain.width/s.cell)*Math.ceil(s.domain.depth/s.cell)>250000)throw Error('兼容模式网格过大，请增大单元尺寸或缩小模型范围。');const rho=b=>(b.rho-s.background)*1000,active=s.bodies.map((b,index)=>({...b,index})).filter(b=>b.enabled);let cells=0;
 if(s.dimension===2&&s.method==='legacy'){
 const sources=[],h=s.cell;for(let z=h/2;z<s.domain.depth;z+=h)for(let x=h/2;x<s.domain.width;x+=h){let hit=null;for(const b of active)if(inside(outline(b),x,z))hit=b;if(hit&&rho(hit)!==0)sources.push({x,z,rho:rho(hit),index:hit.index});}cells=sources.length;
 return {cells,at(x,y,z){const by=s.bodies.map(()=>0);for(const c of sources){const d=Math.hypot(c.x-x,c.z-z);by[c.index]+=6.67e-11*1e5*c.rho*(c.z-z)/d**3*h*h;}return by;}};
 }
 if(s.dimension===2)return {cells:active.length,at(x,y,z){const by=s.bodies.map(()=>0);for(const b of active)by[b.index]=polygonGz(outline(b),rho(b),x,z);return by;}};
 const sources=active.map(b=>{const q={b,rho:rho(b),boxes:[],c:Math.cos(b.yaw*Math.PI/180),s:Math.sin(b.yaw*Math.PI/180)};if(b.kind==='sphere'){cells++;return q;}const [x0,x1,z0,z1]=bounds(b);q.cx=(x0+x1)/2;
 if(b.kind==='box'){q.boxes.push([x0,x1,b.y-b.sy/2,b.y+b.sy/2,z0,z1]);}
 else {const n=s.resolution,dx=(x1-x0)/n,dz=(z1-z0)/n,ny=b.kind==='polygon'?1:n,dy=b.sy/ny;for(let k=0;k<n;k++)for(let j=0;j<ny;j++)for(let i=0;i<n;i++){const x=x0+(i+.5)*dx,y=b.y-b.sy/2+(j+.5)*dy,z=z0+(k+.5)*dz;let accept;if(b.kind==='polygon')accept=inside(b.points,x,z);else {const rr=((x-b.x)/(b.sx/2))**2+((y-b.y)/(b.sy/2))**2;accept=b.kind==='cylinder'?rr<=1:rr+((z-b.z)/(b.sz/2))**2<=1;}if(accept)q.boxes.push([x-dx/2,x+dx/2,y-dy/2,y+dy/2,z-dz/2,z+dz/2]);}}
 cells+=q.boxes.length;return q;});
 return {cells,at(x,y,z){const by=s.bodies.map(()=>0);for(const q of sources){const b=q.b;if(b.kind==='sphere'){const d=Math.hypot(x-b.x,y-b.y,z-b.z),r=b.sx/2;by[b.index]=SCALE*q.rho*4*Math.PI/3*r**3*(b.z-z)/Math.max(r,d)**3;}else {const dx=x-q.cx,dy=y-b.y,lx=q.cx+q.c*dx+q.s*dy,ly=b.y-q.s*dx+q.c*dy;let sum=0;for(const box of q.boxes)sum+=prismGz(box,q.rho,lx,ly,z);by[b.index]=sum;}}return by;}};
}
function noise(i,seed){let v=Math.sin((i+1)*127.1+seed*311.7)*43758.5453;return 2*(v-Math.floor(v))-1;}
async function compute(s,progress=()=>{},cancelled=()=>false){const start=Date.now(),model=compile(s),count=s.dimension===3?s.nx*s.ny:0,total=count+s.profile.n;if(model.cells*total>12000000)throw Error('当前模型与观测网格组合超过计算限额，请降低三维离散精度或观测网格点数。');const map=[],profile=[],sum=a=>a.reduce((v,w)=>v+w,0);let done=0;
 for(let j=0;j<(s.dimension===3?s.ny:0);j++){for(let i=0;i<s.nx;i++){const x=i*s.domain.width/(s.nx-1),y=j*s.domain.north/(s.ny-1),by=model.at(x,y,-s.obsHeight),clean=sum(by);map.push({x,y,z:-s.obsHeight,clean,g:clean*(1+s.noise/100*noise(j*s.nx+i,s.seed)),by});done++;}if(j%3===0){if(cancelled())throw Error('已取消旧计算');progress(done/total);await new Promise(r=>setTimeout(r,0));}}
 for(let i=0;i<s.profile.n;i++){const t=i/(s.profile.n-1),p=s.profile,x=p.x1+t*(p.x2-p.x1),y=p.y1+t*(p.y2-p.y1),by=model.at(x,y,-s.obsHeight),clean=sum(by);profile.push({x,y,z:-s.obsHeight,d:t*Math.hypot(p.x2-p.x1,p.y2-p.y1),clean,g:clean*(1+s.noise/100*noise(count+i,s.seed)),by});done++;if(i%25===0){if(cancelled())throw Error('已取消旧计算');progress(done/total);await new Promise(r=>setTimeout(r,0));}}
 progress(1);return {map,profile,cells:model.cells,elapsed:Date.now()-start,settings:clone(s),method:s.dimension===2?(s.method==='legacy'?'MATLAB 兼容 · 单位走向厚度点核':'无限走向二维 · 多边形边界积分'):'有限三维 · 棱柱 / 球体解析核'};
}
return {G,example,clone,area,inside,outline,bounds,validate,validatePolygon,polygonGz,prismGz,compile,compute};
});
