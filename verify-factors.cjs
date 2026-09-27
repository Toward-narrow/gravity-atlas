const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
globalThis.Astronomy=require('./vendor/astronomy.js');globalThis.window=globalThis;
vm.runInThisContext(fs.readFileSync(__dirname+'/geoid-data.js','utf8'));
const P=require('./physics.js'),F=require('./factors.js');let checks=0;
function near(a,b,t=1e-11){checks++;assert.ok(Math.abs(a-b)<t,`${a} vs ${b}`)}
const s={lat:40,lon:116,h:1000,mass:70,spin:1};
near(F.evaluate(s).g,P.calculate(40,116,1000,70,1).g);
near(F.evaluate(s,{height:false}).g,P.calculate(40,116,0).g);
near(F.evaluate(s,{rotation:false}).g,P.calculate(40,116,1000,70,0).g);
// Independently known Bouguer gradient: 0.11197 mGal/m for 2670 kg/m3.
near(-F.slab(1000,2670).up*1e5,111.9687560674226,1e-8);
const sphere=F.sphere(100,1000,0,0,1000),excessMass=4/3*Math.PI*100**3*1000;
near(sphere.up,-F.G*excessMass/1000**2);
near(F.sphere(100,2000,0,0,1000).up,sphere.up/4);
near(F.sphere(100,1000,0,0,-1000).up,-sphere.up);
near(F.sphere(200,1000,0,0,1000).up,8*sphere.up);
near(F.sphere(100,1000,500,300,1000).east,-F.sphere(100,1000,-500,300,1000).east);
near(-F.slab(.3,1000).up*1e5,.012580759108,1e-11);
// Tide: exact collinear solution and the linear tidal tensor limit.
const R=3.84e8,r=6.378e6,mu=4.902800066e12;
near(F.tidalAcceleration({x:0,y:0,z:0},{x:R,y:0,z:0},mu).x,0);
near(F.tidalAcceleration({x:r,y:0,z:0},{x:R,y:0,z:0},mu).x,mu*(1/(R-r)**2-1/R**2),1e-19);
near(F.tidalAcceleration({x:0,y:100,z:0},{x:R,y:0,z:0},mu).y,-mu*100/R**3,1e-20);
for(const lat of [-90,-35,0,60,90])for(const spin of [0,1,2]){
 const state={...s,lat,spin};const opts={slab:true,sphere:true,water:true,tide:true,east:1000,north:500,time:'2026-09-26T12:00:00Z'};
 const res=F.evaluate(state,opts),sum=res.terms.reduce((v,t)=>F.add(v,t.vector),res.base.total);
 near(F.norm(sum),res.g);near(res.terms.reduce((v,t)=>v+t.delta,0),res.delta,1e-8);
 near(F.norm(F.add(F.add(res.earthGravity,res.centrifugal),res.tides.total)),res.g);
 near(res.force,state.mass*res.g);
 assert.ok(F.norm(res.tides.total)<3e-6);checks++;
 for(const key of ['slab','sphere','water','tide']){const off=F.evaluate(state,{...opts,[key]:false});assert.ok(F.norm(F.sub(off.total,res.total))>0);checks++}
}
const dawn=F.tide(40,116,0,'2026-09-26T00:00:00Z').total;
assert.ok(F.norm(F.sub(dawn,F.tide(40,-64,0,'2026-09-26T00:00:00Z').total))>1e-8);checks++;
assert.ok(F.norm(F.sub(dawn,F.tide(40,116,0,'2026-09-26T06:00:00Z').total))>1e-8);checks++;
for(const lat of [-90,-30,0,30,90])near(F.geoidHeight(lat,-180),F.geoidHeight(lat,180));
near(F.geoidHeight(-90,0),F.geoidHeight(-90,70));near(F.geoidHeight(90,0),F.geoidHeight(90,70));
for(const bad of [{depth:499,radius:500},{waterMM:NaN},{time:'invalid'},{density:-1},{sphere:'yes'}]){assert.throws(()=>F.evaluate(s,bad));checks++}
console.log(JSON.stringify({factorChecks:checks,beijingGeoid:F.geoidHeight(39.9042,116.4074),tideExampleMgal:-dawn.up*1e5},null,2));
