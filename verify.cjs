const assert=require('node:assert/strict');
const {calculate:c,constants:k}=require('./physics.js');
let checks=0,maxError=0;
function near(actual,expected,tol,label){checks++;assert.ok(Math.abs(actual-expected)<tol,`${label}: ${actual} vs ${expected}`)}
// Independent published surface reference: Somigliana formula.
const ge=9.78032533590406,gp=9.8321849378634;
for(let lat=-90;lat<=90;lat+=1){
 const p=lat*Math.PI/180,s=Math.sin(p)**2;
 const reference=ge*(1+(k.b*gp/(k.a*ge)-1)*s)/Math.sqrt(1-k.e2*s);
 const r=c(lat,115,0);maxError=Math.max(maxError,Math.abs(r.g-reference));
 near(r.g,reference,1e-10,'Somigliana surface');near(r.total.north,0,1e-11,'surface normal');
}
near(c(0).cent,k.omega**2*k.a,1e-14,'equatorial centrifugal');
near(c(90).cent,0,1e-14,'polar centrifugal');
// Independent Cartesian finite differences of the closed potential, at height.
const E=Math.sqrt(k.a*k.a-k.b*k.b);
function q(u){return .5*((1+3*u*u/(E*E))*Math.atan(E/u)-3*u/E)}
function potential(rho,z){const d=rho*rho+z*z-E*E,u=Math.sqrt((d+Math.sqrt(d*d+4*E*E*z*z))/2);return k.GM/E*Math.atan(E/u)+.5*k.omega**2*k.a*k.a*q(u)/q(k.b)*(z*z/(u*u)-1/3)}
for(const lat of [-80,-45,0,32,89])for(const h of [100,1000,100000]){
 const r=c(lat,123,h,25),p=lat*Math.PI/180,step=1000;
 // Five-point stencil: large step reduces cancellation in the independent
 // arctan potential, while fourth-order differencing controls truncation.
 const dr=(-potential(r.rho+2*step,r.z)+8*potential(r.rho+step,r.z)-8*potential(r.rho-step,r.z)+potential(r.rho-2*step,r.z))/(12*step);
 const dz=(-potential(r.rho,r.z+2*step)+8*potential(r.rho,r.z+step)-8*potential(r.rho,r.z-step)+potential(r.rho,r.z-2*step))/(12*step);
 near(r.gravity.north,-dr*Math.sin(p)+dz*Math.cos(p),2e-8,'potential north gradient');
 near(r.gravity.up,dr*Math.cos(p)+dz*Math.sin(p),2e-8,'potential up gradient');
 near(r.total.north,r.gravity.north+r.centrifugal.north,1e-12,'vector north sum');
 near(r.total.up,r.gravity.up+r.centrifugal.up,1e-12,'vector up sum');
 near(c(-lat,-123,h).g,r.g,1e-12,'hemisphere symmetry');
 near(c(lat,-10,h).g,r.g,1e-12,'longitude invariance');
 near(r.force,25*r.g,1e-12,'mass scaling');
 assert.ok(r.g<c(lat).g);checks++;
}
near(c(45,0,0,1,2).cent,4*c(45).cent,1e-14,'spin squared');
near(c(45,0,0,1,0).g,c(45).grav,1e-14,'no rotation');
for(const args of [[91],[-91],[0,181],[0,0,-1001],[0,0,100001],[0,0,0,0],[NaN],[0,0,0,1,3]]){assert.throws(()=>c(...args),RangeError);checks++}
console.log(JSON.stringify({passed:checks,maxSurfaceError_ms2:maxError,equator:c(0).g,pole:c(90).g},null,2));
