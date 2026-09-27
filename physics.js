/* WGS84 exterior normal potential. SI units, geodetic latitude, ellipsoidal height.
   Positive potential convention: acceleration = grad(V).
   The convergent q-series avoids cancellation in the closed arctan expression. */
(function(root){
  'use strict';
  const a=6378137, f=1/298.257223563, b=a*(1-f), GM=3.986004418e14, omega=7.292115e-5;
  const E=Math.sqrt(a*a-b*b), e2=f*(2-f), rad=Math.PI/180;
  function qAndDerivative(u){
    const t=E/u; let q=0,dq=0;
    for(let n=1;n<=12;n++){
      const power=2*n+1, term=((-1)**(n+1))*2*n/((2*n+1)*(2*n+3))*t**power;
      q+=term; dq-=power*term/u;
    }
    return [q,dq];
  }
  const q0=qAndDerivative(b)[0];
  function calculate(lat,lon=0,h=0,mass=1,spin=1){
    if(![lat,lon,h,mass,spin].every(Number.isFinite)||Math.abs(lat)>90||Math.abs(lon)>180||h< -1000||h>100000||mass<=0||mass>1000000||spin<0||spin>2) throw new RangeError('请输入有效数值：纬度 ±90°、经度 ±180°、椭球高 −1000–100000 m、质量 0–1000000 kg（不含 0）、自转倍率 0–2。');
    const p=lat*rad, s=Math.sin(p), c=Math.cos(p), N=a/Math.sqrt(1-e2*s*s);
    const rho=(N+h)*c, z=(N*(1-e2)+h)*s;
    const d=rho*rho+z*z-E*E, u=Math.sqrt((d+Math.sqrt(d*d+4*E*E*z*z))/2);
    const R=Math.sqrt(u*u+E*E), sb=z/u, cb=rho/R, [q,dq]=qAndDerivative(u);
    const Vu=-GM/(u*u+E*E)+0.5*omega*omega*a*a*dq/q0*(sb*sb-1/3);
    const Vb=omega*omega*a*a*q/q0*sb*cb, D=(u*u+E*E*sb*sb)/R;
    const gr=(u*cb*Vu-sb*Vb)/D, gz=(R*sb*Vu+(u/R)*cb*Vb)/D;
    const cr=(omega*spin)**2*rho;
    const local=(r,zv)=>({east:0,north:-r*s+zv*c,up:r*c+zv*s});
    const gravity=local(gr,gz), centrifugal=local(cr,0), total=local(gr+cr,gz);
    const norm=v=>Math.hypot(v.north,v.up);
    return {lat,lon,h,mass,spin,rho,z,radius:Math.hypot(rho,z),gravity,centrifugal,total,
      grav:norm(gravity),cent:norm(centrifugal),g:norm(total),force:mass*norm(total),
      tilt:Math.atan2(total.north,-total.up)/rad,
      ecef:{x:(gr+cr)*Math.cos(lon*rad),y:(gr+cr)*Math.sin(lon*rad),z:gz}};
  }
  const api={calculate,constants:{a,b,f,GM,omega,e2},qAndDerivative};
  if(typeof module!=='undefined')module.exports=api;
  root.GravityPhysics=api;
})(typeof window!=='undefined'?window:globalThis);
