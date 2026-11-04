#!/usr/bin/env python3
"""Calcula dónde va la sigla de cada estado en data/geo/usa-states.json
(lx, ly: centroide del polígono más grande, con ajustes a mano) y, para los
estados chicos del noreste, un rótulo afuera del mapa (ox, oy) con línea guía.

  python3 tools/us_label_points.py
"""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'data', 'geo', 'usa-states.json')
# Ajustes a mano donde el centroide cae mal (formas en U, penínsulas)
FIX = {'FL': (785, 548), 'MI': (690, 210), 'LA': (568, 468), 'KY': (680, 335), 'ID': (215, 150),
       'MN': (520, 150), 'TX': (450, 470), 'OK': (470, 375), 'CA': (95, 300), 'VA': (790, 300),
       'NY': (835, 150), 'HI': (300, 560), 'AK': (125, 525), 'WV': (762, 280), 'NC': (810, 340)}
# Estados chicos: la sigla va afuera, a la derecha, con línea guía
OUT = {'VT': (938, 168), 'NH': (938, 186), 'MA': (938, 204), 'RI': (938, 222), 'CT': (938, 240),
       'NJ': (912, 262), 'DE': (912, 280), 'MD': (912, 298), 'DC': (912, 316)}

def rings(d):
    for part in re.findall(r'M[^M]+', d):
        pts = [tuple(map(float, p.split(','))) for p in re.findall(r'-?\d+\.?\d*,-?\d+\.?\d*', part)]
        if len(pts) > 2: yield pts

def centroid(pts):
    a = cx = cy = 0
    for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
        f = x0 * y1 - x1 * y0; a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f
    a /= 2
    return (abs(a), cx / (6 * a), cy / (6 * a)) if a else (0, pts[0][0], pts[0][1])

g = json.load(open(P))
for l in g['locations']:
    best = max((centroid(r) for r in rings(l['path'])), key=lambda c: c[0])
    x, y = FIX.get(l['id'], best[1:])
    l['lx'], l['ly'] = round(x, 1), round(y, 1)
    if l['id'] in OUT: l['ox'], l['oy'] = OUT[l['id']]
    else: l.pop('ox', None); l.pop('oy', None)
json.dump(g, open(P, 'w'), ensure_ascii=False, separators=(',', ':'))
print({l['id']: (l['lx'], l['ly']) for l in g['locations'] if l['id'] in ('FL', 'TX', 'MA', 'NJ', 'OH')})
