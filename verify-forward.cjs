const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('./forward-physics.js');
let checks=0;function near(a,b,t,label){assert.ok(Math.abs(a-b)<=t,`${label}: ${a} vs ${b}`);checks++;}
(async()=>{
const m=P.example(2);m.method='legacy';m.profile.n=41;const r=await P.compute(m),ref=fs.readFileSync(require('node:path').join(__dirname,'data/forward-reference-profile.csv'),'utf8').trim().split(/\r?\n/).slice(1).map(s=>Number(s.split(',')[2]));const err=Math.max(...r.profile.map((p,i)=>Math.abs(p.g-ref[i])));near(err,0,1e-14,'original MATLAB 41-point baseline');
// Published Harmonica example: upward observation 30 -> depth -30.
const prism=[-34,5,-18,14,146,345];for(const [x,value]of [[-40,.06552],[0,.06629],[40,.06174]])near(P.prismGz(prism,2670,x,0,-30),value,5e-6,'published Harmonica prism');
const box=[-100,100,-150,150,200,400],density=500;let numeric=0,n=60,dx=200/n,dy=300/n,dz=200/n;
for(let k=0;k<n;k++)for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=-100+(i+.5)*dx-73,y=-150+(j+.5)*dy+38,z=200+(k+.5)*dz+25;numeric+=P.G*1e5*density*dx*dy*dz*z/Math.hypot(x,y,z)**3;}
near(P.prismGz(box,density,73,-38,-25),numeric,1e-5,'independent 3-D volume quadrature');
near(P.prismGz(box,density,73,38,0),P.prismGz(box,density,-73,-38,0),1e-12,'prism symmetry');
near(P.prismGz(box,density,0,0,0),-P.prismGz(box,-density,0,0,0),1e-12,'density sign');
const rectangle=[[-100,200],[100,200],[100,400],[-100,400]];let integration=0;
for(let j=0;j<200;j++)for(let i=0;i<200;i++){const x=-100+(i+.5),z=200+(j+.5);integration+=2*P.G*1e5*density*z/(x*x+z*z);}
near(P.polygonGz(rectangle,density,0,0),integration,2e-6,'independent infinite-strike 2-D integral');near(P.polygonGz([...rectangle].reverse(),density,0,0),P.polygonGz(rectangle,density,0,0),1e-12,'orientation invariance');
const sphere={...P.example().bodies[0],kind:'sphere',x:1000,y:1000,z:300,sx:200,sy:200,sz:200,rho:3.1};const s=P.example();s.bodies=[sphere];const analytic=P.G*1e5*500*(4*Math.PI/3*100**3)/300**2;near(P.compile(s).at(1000,1000,0)[0],analytic,1e-12,'sphere analytic');s.bodies.push({...sphere,rho:2.1});near(P.compile(s).at(800,1000,0).reduce((a,b)=>a+b),0,1e-12,'linear superposition');
const b={...sphere,kind:'box',sx:240,sy:400,sz:200,yaw:0};s.bodies=[b];const v0=P.compile(s).at(1130,1070,0)[0];b.yaw=90;near(P.compile(s).at(930,1130,0)[0],v0,1e-12,'rotation equivalence');
for(const point of [[-100,-150,0],[100,150,0],[0,0,200],[100,0,200]]){assert.ok(Number.isFinite(P.prismGz(box,500,...point)));checks++;}
assert.throws(()=>P.validatePolygon([[0,0],[100,100],[0,100],[100,0]]));checks++;assert.throws(()=>P.validate({...P.example(),nx:NaN}));checks++;assert.throws(()=>P.validate({...P.example(),bodies:[{...sphere,z:50}]}));checks++;
const nstate=P.example(2);nstate.noise=5;const n1=await P.compute(nstate),n2=await P.compute(nstate);assert.deepEqual(n1.profile,n2.profile);checks++;assert.ok(n1.profile.every(p=>Math.abs(p.g-p.clean)<=Math.abs(p.clean)*.050000001));checks++;
const results={checks,legacy_max_error_mGal:err,prism_independent_error_mGal:Math.abs(P.prismGz(box,density,73,-38,-25)-numeric),sphere_peak_mGal:analytic};console.log(results);
})().catch(e=>{console.error(e);process.exitCode=1;});
