/* Local educational forward models. SI internally, east/north/up vectors.
 * All density models are configurable hypotheses, not inferred geology.
 * Negative h is a harmonic continuation of the normal reference potential. */
(function(root){
 'use strict';
 const P=root.GravityPhysics||(typeof require==='function'?require('./physics.js'):null);
 const G=6.67430e-11,AU=149597870700,D2R=Math.PI/180;
 const zero=()=>({east:0,north:0,up:0});
 const add=(a,b)=>({east:a.east+b.east,north:a.north+b.north,up:a.up+b.up});
 const sub=(a,b)=>({east:a.east-b.east,north:a.north-b.north,up:a.up-b.up});
 const norm=v=>Math.hypot(v.east,v.north,v.up);
 let geoid;
 function geoidHeight(lat,lon){
  const d=root.GEOID_DATA;if(!d)throw Error('EGM96 格网未加载');
  if(!geoid){const raw=atob(d.base64),a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);geoid=new DataView(a.buffer)}
  const y=Math.max(0,Math.min(d.rows-1,(lat-d.lat)/d.dy)),x=(((lon-d.lon)/d.dx)%d.cols+d.cols)%d.cols;
  const iy=Math.min(d.rows-2,Math.floor(y)),ix=Math.floor(x),fy=y-iy,fx=x-ix;
  const at=(j,i)=>geoid.getInt16(2*(j*d.cols+i%d.cols),true)/100;
  return (1-fy)*((1-fx)*at(iy,ix)+fx*at(iy,ix+1))+fy*((1-fx)*at(iy+1,ix)+fx*at(iy+1,ix+1));
 }
 function sphere(radius,depth,east,north,contrast){
  const dist=Math.hypot(east,north,depth),mu=G*4*Math.PI/3*radius**3*contrast;
  // Interior expression keeps the mathematical function continuous at R;
  // the interface restricts the sphere to lie below the observation plane.
  const factor=mu/Math.max(dist,radius)**3;
  return {east:factor*east,north:factor*north,up:-factor*depth};
 }
 function slab(thickness,density){return {east:0,north:0,up:-2*Math.PI*G*density*thickness}}
 function tidalAcceleration(point,body,mu){
  const dx=body.x-point.x,dy=body.y-point.y,dz=body.z-point.z;
  const d=Math.hypot(dx,dy,dz),r=Math.hypot(body.x,body.y,body.z);
  return {x:mu*(dx/d**3-body.x/r**3),y:mu*(dy/d**3-body.y/r**3),z:mu*(dz/d**3-body.z/r**3)};
 }
 function toENU(v,lat,lon){const p=lat*D2R,l=lon*D2R,cp=Math.cos(p),sp=Math.sin(p),cl=Math.cos(l),sl=Math.sin(l);return {east:-sl*v.x+cl*v.y,north:-sp*cl*v.x-sp*sl*v.y+cp*v.z,up:cp*cl*v.x+cp*sl*v.y+sp*v.z}}
 let ephemerisCache={};
 function ephemeris(iso){
  if(ephemerisCache.iso===iso)return ephemerisCache;
  const A=root.Astronomy;if(!A)throw Error('星历库未加载');
  const date=new Date(iso);if(!Number.isFinite(+date)||date.getUTCFullYear()<2000||date.getUTCFullYear()>2100)throw Error('潮汐时间须在 2000–2100 年内');
  const rotation=A.Rotation_EQJ_EQD(date),theta=A.SiderealTime(date)*15*D2R;
  function earthFixed(v){const r=A.RotateVector(rotation,v);return {x:AU*(Math.cos(theta)*r.x+Math.sin(theta)*r.y),y:AU*(-Math.sin(theta)*r.x+Math.cos(theta)*r.y),z:AU*r.z}}
  const earth=A.HelioVector('Earth',date);earth.x=-earth.x;earth.y=-earth.y;earth.z=-earth.z;
  ephemerisCache={iso,sun:earthFixed(earth),moon:earthFixed(A.GeoMoon(date))};return ephemerisCache;
 }
 function tide(lat,lon,h,iso){
  const ref=P.calculate(lat,lon,h),l=lon*D2R,point={x:ref.rho*Math.cos(l),y:ref.rho*Math.sin(l),z:ref.z};
  const bodies=ephemeris(iso);
  const sun=toENU(tidalAcceleration(point,bodies.sun,1.32712440018e20),lat,lon);
  const moon=toENU(tidalAcceleration(point,bodies.moon,4.902800066e12),lat,lon);
  return {sun,moon,total:add(sun,moon),bodies};
 }
 const defaults={height:true,rotation:true,slab:false,sphere:false,water:false,tide:false,thickness:1000,density:2670,radius:500,depth:1500,east:0,north:0,contrast:500,waterMM:300,time:'2026-09-26T00:00:00Z'};
 function validate(o){
  const ranges={thickness:[0,10000],density:[0,5000],radius:[10,5000],depth:[10,20000],east:[-20000,20000],north:[-20000,20000],contrast:[-3000,5000],waterMM:[-5000,5000]};
  for(const [key,[lo,hi]]of Object.entries(ranges))if(!Number.isFinite(o[key])||o[key]<lo||o[key]>hi)throw Error('参数超出范围：'+key);
  if(o.depth<o.radius)throw Error('球心深度不能小于半径，异常体须位于测点平面以下');
  for(const key of ['height','rotation','slab','sphere','water','tide'])if(typeof o[key]!=='boolean')throw Error('无效因素开关');
  const t=new Date(o.time);if(!Number.isFinite(+t)||t.getUTCFullYear()<2000||t.getUTCFullYear()>2100)throw Error('请输入 2000–2100 年内的有效 UTC 时间');
 }
 function evaluate(state,options={}){
  const o={...defaults,...options};validate(o);
  const {lat,lon,h,mass,spin}=state;
  const input=P.calculate(lat,lon,h,mass,spin),base=P.calculate(lat,lon,0,mass,1);
  const atHeight=P.calculate(lat,lon,o.height?h:0,mass,1),actual=P.calculate(lat,lon,o.height?h:0,mass,o.rotation?spin:0);
  const tv=o.tide?tide(lat,lon,actual.h,o.time):null;
  const terms=[
   {id:'height',name:'观测高度',on:o.height,vector:sub(atHeight.total,base.total)},
   {id:'rotation',name:'自转变化',on:o.rotation,vector:sub(actual.centrifugal,atHeight.centrifugal)},
   {id:'slab',name:'等效岩层',on:o.slab,vector:o.slab?slab(o.thickness,o.density):zero()},
   {id:'sphere',name:'地下异常体',on:o.sphere,vector:o.sphere?sphere(o.radius,o.depth,o.east,o.north,o.contrast):zero()},
   {id:'water',name:'地下水变化',on:o.water,vector:o.water?slab(o.waterMM/1000,1000):zero()},
   {id:'tide',name:'日月引潮',on:o.tide,vector:tv?tv.total:zero()}
  ];
  let total={...base.total};
  for(const term of terms){const before=norm(total);total=add(total,term.vector);term.delta=(norm(total)-before)*1e5;term.down=-term.vector.up*1e5}
  let earthGravity={...actual.gravity};for(const term of terms.slice(2,5))earthGravity=add(earthGravity,term.vector);
  const p=lat*D2R,l=lon*D2R,radial=total.up*Math.cos(p)-total.north*Math.sin(p);
  const ecef={x:radial*Math.cos(l)-total.east*Math.sin(l),y:radial*Math.sin(l)+total.east*Math.cos(l),z:total.up*Math.sin(p)+total.north*Math.cos(p)};
  return {...input,h:actual.h,inputHeight:h,total,ecef,earthGravity,gravity:add(earthGravity,tv?tv.total:zero()),centrifugal:actual.centrifugal,grav:norm(earthGravity),cent:norm(actual.centrifugal),g:norm(total),force:mass*norm(total),base,terms,tides:tv,delta:(norm(total)-base.g)*1e5,tilt:Math.atan2(Math.hypot(total.east,total.north),-total.up)/D2R,azimuth:((Math.atan2(total.east,total.north)/D2R+360)%360)};
 }
 const api={G,defaults,geoidHeight,sphere,slab,tidalAcceleration,tide,evaluate,validate,add,sub,norm,toENU};
 root.GravityFactors=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
