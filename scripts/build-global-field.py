"""Generate a compact, offline EIGEN-6C4 ellipsoidal gravity-disturbance layer."""
import base64,gzip,hashlib,json,os,pathlib,sys,zipfile
import numpy as np
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
HERE=ROOT/'data/source'
HERE.mkdir(parents=True,exist_ok=True)
os.environ['MPLCONFIGDIR']=str(HERE)
import pyshtools
import boule

def lut(arr,stops,colors):
 out=np.stack([np.interp(arr,stops,np.asarray(colors)[:,i]) for i in range(3)],axis=-1)
 return np.uint8(np.clip(out,0,255))
def png(rgb):
 import io
 b=io.BytesIO();Image.fromarray(rgb).save(b,format='PNG',optimize=True)
 return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def encoded(arr):return base64.b64encode(gzip.compress(arr.tobytes(),compresslevel=6,mtime=0)).decode()

source=HERE/'eigen-6c4.zip'
if not source.exists():
 import urllib.request
 urllib.request.urlretrieve('https://datapub.gfz-potsdam.de/download/10.5880.ICGEM.2015.1/eigen-6c4.zip',source)
coeff=pyshtools.SHGravCoeffs.from_file(str(source),format='icgem',lmax=179,omega=7.292115e-5)
grid=coeff.expand(a=6378137.0,f=1/298.257223563,lmax=179,lmax_calc=179,sampling=2,extend=True,normal_gravity=True,normal_gravity_gm=3.986004418e14)
g=np.roll(grid.total.data[:,:720]*1e5,-360,axis=1)
assert g.shape==(361,720)
g10=np.rint(g*10).astype('<i2')
gv=Image.fromarray(np.float32(g)).resize((1440,720),Image.Resampling.BILINEAR)
gstops=[-320,-160,-80,-20,0,20,80,160,320]
gcolors=[[24,21,72],[48,56,123],[44,124,165],[115,190,184],[218,230,205],[229,185,129],[211,108,92],[157,55,87],[86,27,71]]
rgb=lut(np.asarray(gv),gstops,gcolors)

geoid=coeff.geoid(ellipsoid=boule.WGS84,lmax=179,lmax_calc=179,grid='DH2',extend=True)
n=np.roll(geoid.geoid.data[:,:720],-360,axis=1)
n100=np.rint(n*100).astype('<i2')
nimg=Image.fromarray(np.float32(n)).resize((1440,720),Image.Resampling.BILINEAR)
nstops=[-120,-80,-40,-10,0,10,40,80,120]
ncolors=[[18,25,69],[32,65,125],[37,131,166],[99,192,192],[224,230,192],[238,193,137],[219,121,99],[158,58,85],[91,27,73]]
npot=lut(np.asarray(nimg),nstops,ncolors)

data={'model':'EIGEN-6C4','maxDegree':179,'width':720,'height':361,'west':-180,'north':90,'step':.5,'unit':'disturbance: 0.1 mGal per integer; geoid: 0.01 m per integer','disturbance':encoded(g10),'geoid':encoded(n100),'gravityTexture':png(rgb),'geoidTexture':png(npot),'rangeMgal':[round(float(g.min()),2),round(float(g.max()),2)],'rangeGeoidM':[round(float(n.min()),2),round(float(n.max()),2)],'source':'https://doi.org/10.5880/icgem.2015.1','modelZipSHA256':hashlib.sha256(source.read_bytes()).hexdigest()}
(ROOT/'data/global-field-data.js').write_text('window.GLOBAL_FIELD_DATA='+json.dumps(data,separators=(',',':'))+';',encoding='utf8')
print('disturbance range',data['rangeMgal'],'projected file bytes',(ROOT/'data/global-field-data.js').stat().st_size)
