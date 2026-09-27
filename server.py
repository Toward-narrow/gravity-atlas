"""Optional local elevation proxy. Python standard library only, loopback only."""
import argparse,functools,http.server,json,math,pathlib,threading,time,urllib.parse,urllib.request,webbrowser
ROOT=pathlib.Path(__file__).resolve().parent
cache={}; lock=threading.Lock(); last_request=0
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass
 def do_GET(self):
  parts=urllib.parse.urlsplit(self.path)
  if parts.path!='/api/elevation':return super().do_GET()
  try:
   params=urllib.parse.parse_qs(parts.query); lat=float(params['lat'][0]);lon=float(params['lon'][0])
   if not(math.isfinite(lat) and math.isfinite(lon) and -90<=lat<=90 and -180<=lon<=180):raise ValueError('Invalid coordinates')
   key=(round(lat,6),round(lon,6))
   with lock:
    global last_request
    if key not in cache:
     # Respect the public upstream's one-request-per-second limit.
     delay=1.1-(time.monotonic()-last_request)
     if delay>0:time.sleep(delay)
     query=urllib.parse.urlencode({'locations':f'{lat},{lon}'})
     url='https://api.opentopodata.org/v1/srtm90m,etopo1?'+query
     req=urllib.request.Request(url,headers={'User-Agent':'GravityAtlas-Educational/2.0'})
     try:
      with urllib.request.urlopen(req,timeout=20) as response:doc=json.load(response)
     finally:last_request=time.monotonic()
     if doc.get('status')!='OK':raise RuntimeError('Elevation provider unavailable')
     r=doc['results'][0]
     if not isinstance(r.get('elevation'),(int,float)) or not math.isfinite(r['elevation']):raise RuntimeError('No elevation at this location')
     cache[key]={'lat':lat,'lon':lon,'elevation':r['elevation'],'dataset':r['dataset'],'retrieved':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'source':'Open Topo Data / SRTM90m, ETOPO1'}
    result=cache[key]
   self.send_json(200,result)
  except (KeyError,ValueError):self.send_json(400,{'error':'经纬度无效'})
  except Exception:self.send_json(502,{'error':'高程服务暂不可用，请稍后重试或手动输入；当前参数未改变。'})
 def send_json(self,status,data):
  body=json.dumps(data,ensure_ascii=False).encode('utf-8');self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--no-browser',action='store_true');parser.add_argument('--port',type=int,default=0);args=parser.parse_args()
 server=http.server.ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
 url=f'http://127.0.0.1:{server.server_port}/index.html'
 print(url,flush=True)
 if not args.no_browser:webbrowser.open(url)
 try:server.serve_forever()
 except KeyboardInterrupt:pass
 finally:server.server_close()
