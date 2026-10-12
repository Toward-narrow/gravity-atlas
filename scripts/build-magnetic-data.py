"""Refresh the local IGRF-14 payload from the official NOAA/IAGA text file."""
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://www.ngdc.noaa.gov/IAGA/vmod/coeffs/igrf14coeffs.txt'

def build():
    raw = urlopen(URL, timeout=60).read()
    text = raw.decode('utf-8')
    rows = [line.split() for line in text.splitlines() if line.startswith(('g ', 'h '))]
    data = {'source': URL, 'epochs': list(range(1900, 2026, 5)),
            'rows': [[r[0], int(r[1]), int(r[2]), *map(float, r[3:])] for r in rows]}
    assert len(data['rows']) == 195 and all(len(r) == 30 for r in data['rows']), 'Unexpected coefficient format'
    target = ROOT / 'data'
    (target / 'igrf14coeffs.txt').write_bytes(raw)
    payload = '/* NOAA/IAGA IGRF-14, nT and nT/year. Original: igrf14coeffs.txt */\nwindow.IGRF14_DATA='
    (target / 'igrf14-data.js').write_text(payload + json.dumps(data, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(json.dumps({'rows': len(rows), 'source': URL, 'sha256': hashlib.sha256(raw).hexdigest()}))

if __name__ == '__main__':
    build()
