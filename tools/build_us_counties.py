#!/usr/bin/env python3
"""Arma los mapas por condado de cada estado de EE.UU. (data/geo/eeuu-condados/XX.json)
a partir de us-atlas 3 (counties-albers-10m.json, Census Bureau, dominio público).
La proyección (Albers USA, 975×610) es la misma de data/geo/usa-states.json.

  python3 tools/build_us_counties.py ruta/a/counties-albers-10m.json
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'geo', 'eeuu-condados')
FIPS = {'01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
        '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
        '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
        '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
        '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY'}

def main(path):
    t = json.load(open(path))
    sx, sy = t['transform']['scale']; tx, ty = t['transform']['translate']
    arcs = []
    for a in t['arcs']:
        x = y = 0; pts = []
        for dx, dy in a:
            x += dx; y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    def arc(i):
        return arcs[i] if i >= 0 else arcs[~i][::-1]
    def ring(ids):
        pts = []
        for i in ids:
            p = arc(i)
            pts.extend(p if not pts else p[1:])
        return pts
    states = {}
    for g in t['objects']['counties']['geometries']:
        polys = [g['arcs']] if g['type'] == 'Polygon' else g['arcs'] if g['type'] == 'MultiPolygon' else []
        d, xs, ys = [], [], []
        for poly in polys:
            for r in poly:
                pts = ring(r)
                xs += [p[0] for p in pts]; ys += [p[1] for p in pts]
                d.append('M' + 'L'.join(f'{p[0]:.1f},{p[1]:.1f}' for p in pts) + 'Z')
        st = FIPS.get(g['id'][:2])
        if not st or not d: continue
        states.setdefault(st, []).append({'id': g['id'], 'n': g['properties'].get('name'), 'd': ''.join(d), 'b': [min(xs), min(ys), max(xs), max(ys)]})
    os.makedirs(OUT, exist_ok=True)
    for st, cs in states.items():
        x0 = min(c['b'][0] for c in cs); y0 = min(c['b'][1] for c in cs); x1 = max(c['b'][2] for c in cs); y1 = max(c['b'][3] for c in cs)
        pad = max(x1 - x0, y1 - y0) * 0.03
        vb = [round(x0 - pad, 1), round(y0 - pad, 1), round(x1 - x0 + 2 * pad, 1), round(y1 - y0 + 2 * pad, 1)]
        for c in cs: c.pop('b')
        json.dump({'state': st, 'viewBox': ' '.join(map(str, vb)), 'source': 'us-atlas 3 (U.S. Census Bureau, dominio público)', 'counties': cs},
                  open(os.path.join(OUT, f'{st}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print(len(states), 'estados')

if __name__ == '__main__':
    main(sys.argv[1])
