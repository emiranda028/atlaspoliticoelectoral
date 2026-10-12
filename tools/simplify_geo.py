#!/usr/bin/env python3
"""Builds data/geo/world.json, the light world map the atlas loads.

Source: datasets/geo-countries (Natural Earth 10m, ~14 MB). The site only
needs it at world/continent zoom, so each ring is simplified with
Douglas-Peucker, coordinates are rounded and slivers are dropped. Properties
are kept as they are (name + ISO codes), so the matching code is unchanged.

  python3 tools/simplify_geo.py countries.geojson data/geo/world.json [tolerance]
"""
import json, sys, math

def dp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy)
        far, fi = -1, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / L if L else math.hypot(px - ax, py - ay)
            if d > far: far, fi = d, i
        if far > tol:
            keep[fi] = True; stack += [(a, fi), (fi, b)]
    return [p for p, k in zip(pts, keep) if k]

def area(r):
    return abs(sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1))) / 2

def ring(r, tol):
    s = dp(r, tol)
    s = [[round(x, 3), round(y, 3)] for x, y in s]
    if s[0] != s[-1]: s.append(s[0])
    return s if len(s) >= 4 else None

def main():
    src, dst = sys.argv[1], sys.argv[2]
    tol = float(sys.argv[3]) if len(sys.argv) > 3 else 0.04
    g = json.load(open(src))
    out = []
    for f in g['features']:
        geom = f['geometry']
        polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
        biggest = max((area(p[0]) for p in polys), default=0)
        new = []
        for p in polys:
            a = area(p[0])
            # drop specks, but never a country's main landmass (small island states)
            if a < 0.004 and a < biggest: continue
            outer = ring(p[0], tol if a > 1 else tol / 3)
            if not outer: continue
            holes = [h2 for h in p[1:] if area(h) > 0.05 for h2 in [ring(h, tol)] if h2]
            new.append([outer] + holes)
        if not new:
            # microstates (Vatican, Monaco…): keep the original outline, rounded
            new = [[[[round(x, 4), round(y, 4)] for x, y in r] for r in p] for p in polys[:1]]
        out.append({'type': 'Feature', 'properties': f['properties'],
                    'geometry': {'type': 'MultiPolygon', 'coordinates': new} if len(new) > 1 else {'type': 'Polygon', 'coordinates': new[0]}})
    json.dump({'type': 'FeatureCollection', 'features': out}, open(dst, 'w'), separators=(',', ':'), ensure_ascii=False)
    print(len(out), 'features')

if __name__ == '__main__':
    main()
