function output = gravity_forward_studio(model, preview, outdir)
% GRAVITY_FORWARD_STUDIO 2-D/3-D gravity model shared with the browser studio.
% x east, y north, z depth positive down, lengths m. Absolute rho g/cm^3.
% Output downward gz mGal. Positive contrast gives positive surface anomaly.
% Usage: R=gravity_forward_studio(); or R=gravity_forward_studio(model,false).
% Import browser JSON: model=jsondecode(fileread('gravity-model.json'));
% Rectangular prism kernel: Nagy (2000), safe log/atan following Choclo.
% No toolboxes needed. R2018b+. Every call saves CSV in outdir (default pwd).
if nargin<1 || isempty(model)
 model=jsondecode(fileread(fullfile(fileparts(mfilename('fullpath')),'reference-model.json')));
end
if nargin<2, preview=true; end
if nargin<3, outdir=pwd; end
assert(model.version==1 && ismember(model.dimension,[2 3]),'Unsupported model.');
G=6.67430e-11; nb=numel(model.bodies); src=cell(nb,1);
for ib=1:nb
 b=model.bodies(ib); q=struct('b',b,'rho',(b.rho-model.background)*1000,'boxes',zeros(0,6),'points',[],'legacy',[]);
 if ~b.enabled, src{ib}=q; continue; end
 p=outline(b); q.points=p; q.cx=(min(p(:,1))+max(p(:,1)))/2;
 if model.dimension==3 && ~strcmp(b.kind,'sphere')
  x0=min(p(:,1));x1=max(p(:,1));z0=min(p(:,2));z1=max(p(:,2));
  if strcmp(b.kind,'box')
   q.boxes=[x0 x1 b.y-b.sy/2 b.y+b.sy/2 z0 z1];
  else
   n=model.resolution;ny=n;if strcmp(b.kind,'polygon'),ny=1;end
   dx=(x1-x0)/n;dz=(z1-z0)/n;dy=b.sy/ny;
   [X,Y,Z]=ndgrid(x0+dx/2:dx:x1,b.y-b.sy/2+dy/2:dy:b.y+b.sy/2,z0+dz/2:dz:z1);
   if strcmp(b.kind,'polygon'),mask=inpolygon(X,Z,p(:,1),p(:,2));
   else
    rr=((X-b.x)/(b.sx/2)).^2+((Y-b.y)/(b.sy/2)).^2;
    if strcmp(b.kind,'cylinder'),mask=rr<=1;else,mask=rr+((Z-b.z)/(b.sz/2)).^2<=1;end
   end
   q.boxes=[X(mask)-dx/2 X(mask)+dx/2 Y(mask)-dy/2 Y(mask)+dy/2 Z(mask)-dz/2 Z(mask)+dz/2];
  end
 end
 src{ib}=q;
end
if model.dimension==2 && strcmp(model.method,'legacy')
 h=model.cell;[X,Z]=meshgrid(h/2:h:model.domain.width,h/2:h:model.domain.depth);owner=zeros(size(X));
 for ib=1:nb
  if model.bodies(ib).enabled,p=src{ib}.points;owner(inpolygon(X,Z,p(:,1),p(:,2)))=ib;end
 end
 for ib=1:nb,src{ib}.legacy=[X(owner==ib) Z(owner==ib)];end
end
p=model.profile;t=linspace(0,1,p.n)';xp=p.x1+t*(p.x2-p.x1);yp=p.y1+t*(p.y2-p.y1);zp=-model.obsHeight*ones(size(xp));
by=forward(src,model,xp,yp,zp,G);clean=sum(by,2);gz=addnoise(clean,model,0);
output=struct('profile',[xp yp zp t*hypot(p.x2-p.x1,p.y2-p.y1) gz clean by],'model',model,'map',[]);
header={'x_m','y_m','z_m','distance_m','gz_mGal','clean_gz_mGal'};
for ib=1:nb,header{end+1}=sprintf('body%d_mGal',ib);end
% Browser noise indices place the grid before the profile.
if model.dimension==3
 [XX,YY]=meshgrid(linspace(0,model.domain.width,model.nx),linspace(0,model.domain.north,model.ny));
 % Transpose before vectorising: matches the browser's x-fastest row order.
 X=reshape(XX',[],1);Y=reshape(YY',[],1);Z=-model.obsHeight*ones(size(X));
 mapby=forward(src,model,X,Y,Z,G);mapclean=sum(mapby,2);mapgz=addnoise(mapclean,model,0);
 output.map=[X Y Z mapgz mapclean mapby];
 output.profile(:,5)=addnoise(clean,model,numel(X));
 mapheader=[{'x_m','y_m','z_m','gz_mGal','clean_gz_mGal'},header(7:end)];
 writetable(array2table(output.map,'VariableNames',mapheader),fullfile(outdir,'gravity_grid_3d.csv'));
end
writetable(array2table(output.profile,'VariableNames',header),fullfile(outdir,'gravity_profile.csv'));
if ~preview,return;end
fig=figure('Color','w','Name','Potential Field / Gravity Forward Studio','Position',[80 60 1400 900],'ToolBar','figure');
if model.dimension==3
 ax=subplot(2,2,1);hold(ax,'on');
 for ib=1:nb
  b=model.bodies(ib);if ~b.enabled,continue;end
  color=densitycolor(b.rho-model.background);
  if strcmp(b.kind,'sphere') || strcmp(b.kind,'ellipsoid')
   [U,V,W]=sphere(24);[U,V]=rotatexy(b.x+b.sx/2*U,b.y+b.sy/2*V,b.yaw,b.x,b.y);
   surf(ax,U,V,b.z+b.sz/2*W,'FaceColor',color,'EdgeColor','none','FaceAlpha',.65);
  else
   if strcmp(b.kind,'cylinder')
    a=linspace(0,2*pi,49)';px=b.x+b.sx/2*cos(a);py=b.y+b.sy/2*sin(a);
    [px,py]=rotatexy(px,py,b.yaw,b.x,b.y);lo=[px py repmat(b.z-b.sz/2,numel(a),1)];hi=[px py repmat(b.z+b.sz/2,numel(a),1)];
   else
    p=src{ib}.points;cx=src{ib}.cx;lo=[p(:,1) repmat(b.y-b.sy/2,size(p,1),1) p(:,2)];hi=lo;hi(:,2)=b.y+b.sy/2;
    [lo(:,1),lo(:,2)]=rotatexy(lo(:,1),lo(:,2),b.yaw,cx,b.y);[hi(:,1),hi(:,2)]=rotatexy(hi(:,1),hi(:,2),b.yaw,cx,b.y);
   end
   patch(ax,'Vertices',lo,'Faces',1:size(lo,1),'FaceColor',color,'FaceAlpha',.65);patch(ax,'Vertices',hi,'Faces',1:size(hi,1),'FaceColor',color,'FaceAlpha',.65);
   for j=1:size(lo,1),k=mod(j,size(lo,1))+1;v=[lo(j,:);lo(k,:);hi(k,:);hi(j,:)];patch(ax,'Vertices',v,'Faces',1:4,'FaceColor',color,'FaceAlpha',.65,'EdgeColor',[.3 .4 .5]);end
  end
 end
 plot3(ax,xp,yp,zp,'r-','LineWidth',2);set(ax,'ZDir','reverse');axis(ax,'equal');grid(ax,'on');xlabel(ax,'x east / m');ylabel(ax,'y north / m');zlabel(ax,'Depth z / m');view(ax,[-35 25]);title(ax,'3-D density model: rotate with mouse');
 axmap=subplot(2,2,2);imagesc(axmap,linspace(0,model.domain.width,model.nx),linspace(0,model.domain.north,model.ny),reshape(mapgz,model.nx,model.ny)');axis(axmap,'xy');axis(axmap,'equal');axis(axmap,'tight');hold(axmap,'on');plot(axmap,xp,yp,'r--');colorbar(axmap);xlabel(axmap,'x / m');ylabel(axmap,'y / m');title(axmap,'Downward g_z / mGal');colormap(axmap,diverging());
 axcurve=subplot(2,2,3);axmodel=subplot(2,2,4);
else
 axcurve=subplot(2,1,1);axmodel=subplot(2,1,2);
end
if model.dimension==2,curveX=output.profile(:,1);else,curveX=output.profile(:,4);end
hold(axcurve,'on');if nb>0,plot(axcurve,curveX,output.profile(:,7:end),'--','LineWidth',1);end;plot(axcurve,curveX,output.profile(:,5),'r-','LineWidth',2);yline(axcurve,0,'k:');grid(axcurve,'on');xlabel(axcurve,'Distance along profile / m');ylabel(axcurve,'g_z / mGal');title(axcurve,'Forward response: red total, dashed individual bodies');
[Xs,Zs]=meshgrid(linspace(0,model.domain.width,200),linspace(0,model.domain.depth,100));sliceY=model.domain.north/2;
rhos=slicerho(model,Xs,sliceY,Zs);im=imagesc(axmodel,Xs(1,:),Zs(:,1),rhos);set(axmodel,'YDir','reverse');xlabel(axmodel,'x / m');ylabel(axmodel,'Depth z / m');title(axmodel,'Absolute density / g cm^{-3}');colorbar(axmodel);colormap(axmodel,diverging());caxis(axmodel,[model.background-1 model.background+1]);
if model.dimension==3
 uicontrol(fig,'Style','slider','Units','normalized','Position',[.58 .015 .30 .025],'Min',0,'Max',model.domain.north,'Value',sliceY,'Callback',@(h,~)updateslice(h,model,Xs,Zs,im,axmodel));
end
rotate3d(fig,'on');
end
function by=forward(src,m,x,y,z,G)
by=zeros(numel(x),numel(src));
for ib=1:numel(src)
 q=src{ib};b=q.b;if ~b.enabled,continue;end
 if m.dimension==2
  if strcmp(m.method,'legacy')
   for j=1:size(q.legacy,1),dx=q.legacy(j,1)-x;dz=q.legacy(j,2)-z;by(:,ib)=by(:,ib)+6.67e-11*1e5*q.rho*dz./(dx.^2+dz.^2).^1.5*m.cell^2;end
  else
   for j=1:numel(x),by(j,ib)=polygon_gz(q.points,q.rho,x(j),z(j),G);end
  end
 elseif strcmp(b.kind,'sphere')
  r=b.sx/2;dist=sqrt((x-b.x).^2+(y-b.y).^2+(z-b.z).^2);by(:,ib)=G*1e5*q.rho*4*pi/3*r^3*(b.z-z)./max(r,dist).^3;
 else
  [lx,ly]=rotatexy(x,y,-b.yaw,q.cx,b.y);
  for j=1:size(q.boxes,1),by(:,ib)=by(:,ib)+prism_gz(q.boxes(j,:),q.rho,lx,ly,z,G);end
 end
end
end
function gz=prism_gz(box,rho,x,y,z,G)
s=zeros(size(x));
for i=0:1,for j=0:1,for k=0:1
 a=box(1+i)-x;b=box(3+j)-y;c=box(5+k)-z;r=sqrt(a.^2+b.^2+c.^2);den=c.*r;ang=atan((a.*b)./den);mask=den==0;ang(mask)=sign(a(mask).*b(mask))*pi/2;
 term=a.*safelog(b,a,c,r)+b.*safelog(a,b,c,r)-c.*ang;s=s+(-1)^(i+j+k)*term;
end,end,end
gz=G*1e5*rho*s;
end
function v=safelog(a,b,c,r)
v=zeros(size(a));pos=a>=0;v(pos)=log(r(pos)+a(pos));v(pos & (r+a==0))=0;neg=a<0;q=b.^2+c.^2;normal=neg&q~=0;v(normal)=log(q(normal)./(r(normal)-a(normal)));special=neg&q==0;v(special)=-log(-2*a(special));
end
function gz=polygon_gz(p,rho,x,z,G)
s=0;ar=sum(p(:,1).*p([2:end 1],2)-p([2:end 1],1).*p(:,2))/2;
for i=1:size(p,1)
 a=p(i,:)-[x z];b=p(mod(i,size(p,1))+1,:)-[x z];d=b-a;L=hypot(d(1),d(2));if abs(d(1))<1e-14,continue;end
 t=dot(a,d)/L;h=abs(a(1)*d(2)-a(2)*d(1))/L;s=s-d(1)*(primitive(t+L,h)-primitive(t,h))/L;
end
gz=G*1e5*rho*s*sign(ar);
end
function v=primitive(u,h)
if h<1e-12,if u==0,v=0;else,v=u*log(u*u)-2*u;end;else,v=u*log(u*u+h*h)-2*u+2*h*atan(u/h);end
end
function p=outline(b)
if strcmp(b.kind,'polygon'),p=b.points;
elseif strcmp(b.kind,'box'),p=[b.x-b.sx/2 b.z-b.sz/2;b.x+b.sx/2 b.z-b.sz/2;b.x+b.sx/2 b.z+b.sz/2;b.x-b.sx/2 b.z+b.sz/2];
else,a=(0:63)'*2*pi/64;p=[b.x+b.sx/2*cos(a) b.z+b.sz/2*sin(a)];end
end
function [u,v]=rotatexy(x,y,angle,cx,cy)
a=angle*pi/180;u=cx+(x-cx)*cos(a)-(y-cy)*sin(a);v=cy+(x-cx)*sin(a)+(y-cy)*cos(a);
end
function values=addnoise(values,m,offset)
i=(1:numel(values))'+offset;v=sin(i*127.1+m.seed*311.7)*43758.5453;values=values.*(1+m.noise/100*(2*(v-floor(v))-1));
end
function rho=slicerho(m,X,y,Z)
rho=m.background*ones(size(X));
for ib=1:numel(m.bodies)
 b=m.bodies(ib);if ~b.enabled,continue;end
 p=outline(b);cx=(min(p(:,1))+max(p(:,1)))/2;
 if m.dimension==2,hit=inpolygon(X,Z,p(:,1),p(:,2));
 else
 [U,V]=rotatexy(X,y+zeros(size(X)),-b.yaw,cx,b.y);
 if strcmp(b.kind,'polygon'),hit=inpolygon(U,Z,p(:,1),p(:,2)) & abs(V-b.y)<=b.sy/2;
 else
 a=(U-b.x)/(b.sx/2);v=(V-b.y)/(b.sy/2);w=(Z-b.z)/(b.sz/2);
 if strcmp(b.kind,'box'),hit=abs(a)<=1 & abs(v)<=1 & abs(w)<=1;
 elseif strcmp(b.kind,'cylinder'),hit=a.^2+v.^2<=1 & abs(w)<=1;
 else,hit=a.^2+v.^2+w.^2<=1;end
 end
 end
 if m.dimension==2 && strcmp(m.method,'legacy'),rho(hit)=b.rho;else,rho(hit)=rho(hit)+b.rho-m.background;end
end
end
function updateslice(h,m,X,Z,im,ax)
y=get(h,'Value');set(im,'CData',slicerho(m,X,y,Z));title(ax,sprintf('Absolute density: y = %.0f m',y));
end
function c=densitycolor(v)
a=min(1,abs(v));mid=[.945 .949 .918];if v<0,last=[.153 .439 .686];else,last=[.718 .192 .243];end;c=mid+(last-mid)*a;
end
function c=diverging()
c=zeros(256,3);for i=1:256,c(i,:)=densitycolor((i-1)/255*2-1);end
end
