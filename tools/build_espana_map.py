#!/usr/bin/env python3
"""Construye data/geo/espana-provincias.json: las 52 circunscripciones como
paths SVG ya proyectados (mismo formato que brasil-uf.json: viewBox +
locations[{id, name, path}]). Canarias va en un recuadro abajo a la izquierda.

Fuente: spain-provinces.geojson (codeforgermany/click_that_hood, IGN/CartoDB),
con el código INE de provincia en cod_prov.

  python3 tools/build_espana_map.py spain-provinces.geojson data/geo/espana-provincias.json
"""
import json, sys, math
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from simplify_geo import dp

src, out = sys.argv[1], sys.argv[2]
g = json.load(open(src))
LAT0 = 40.0; K = math.cos(math.radians(LAT0))
CANARIAS = {'35', '38'}
# Canarias: se corre al recuadro (abajo a la izquierda de la península)
CAN_DX, CAN_DY = 7.4, 6.4
NAMES = {'Santa Cruz De Tenerife': 'Santa Cruz de Tenerife'}

def proj(lon, lat, code):
    if code in CANARIAS: lon, lat = lon + CAN_DX, lat + CAN_DY
    return (lon * K, -lat)

feats = []
for f in g['features']:
    code = f['properties']['cod_prov']; name = NAMES.get(f['properties']['name'], f['properties']['name'])
    geom = f['geometry']; polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    rings = []
    for poly in polys:
        for ring in poly[:1]:  # sin huecos
            pts = [proj(x, y, code) for x, y in ring]
            pts = dp(pts, 0.012)
            if len(pts) >= 4: rings.append(pts)
    feats.append((code, name, rings))
xs = [x for _, _, rs in feats for r in rs for x, _ in r]; ys = [y for _, _, rs in feats for r in rs for _, y in r]
minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
PAD = 14; W = 1000; S = (W - 2 * PAD) / (maxx - minx); H = round((maxy - miny) * S) + 2 * PAD
minx -= PAD / S; miny -= PAD / S
locs = []
for code, name, rings in sorted(feats):
    if code in ('51', '52'):  # Ceuta y Melilla: un círculo visible en lugar del contorno diminuto
        px = [(x - minx) * S for r in rings for x, _ in r]; py = [(y - miny) * S for r in rings for _, y in r]
        ccx, ccy, R = sum(px) / len(px), sum(py) / len(py), 9
        d = f'M{ccx - R:.1f},{ccy:.1f}a{R},{R} 0 1,0 {2 * R},0a{R},{R} 0 1,0 {-2 * R},0Z'
    else:
        d = ''.join('M' + 'L'.join(f'{(x - minx) * S:.1f},{(y - miny) * S:.1f}' for x, y in r) + 'Z' for r in rings)
    locs.append({'id': code, 'name': name, 'path': d})
# marco del recuadro de Canarias
cx = [x for c, _, rs in feats if c in CANARIAS for r in rs for x, _ in r]; cy = [y for c, _, rs in feats if c in CANARIAS for r in rs for _, y in r]
box = [round((min(cx) - minx) * S - 12, 1), round((min(cy) - miny) * S - 12, 1), round((max(cx) - min(cx)) * S + 24, 1), round((max(cy) - min(cy)) * S + 24, 1)]
json.dump({'viewBox': f'0 0 {W} {H}', 'canariasBox': box, 'source': 'IGN vía codeforgermany/click_that_hood (spain-provinces)', 'locations': locs}, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(locs), 'provincias', f'{W}x{H}', 'canarias', box)
