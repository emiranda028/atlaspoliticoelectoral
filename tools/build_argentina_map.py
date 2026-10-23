#!/usr/bin/env python3
"""Builds data/geo/argentina.json: a bicontinental SVG map of Argentina for the
"Argentina 2027" special, from the official IGN/georef provinces layer
(https://infra.datos.gob.ar/georef/provincias.geojson).

Main frame: the 23 provinces + CABA, with the Islas Malvinas as part of Tierra
del Fuego. Polar inset: the Antártida Argentina sector (25°W–74°W, south of
60°S) plus the Georgias del Sur and Sandwich del Sur. Inset: CABA enlarged.

  python3 tools/build_argentina_map.py provincias.geojson data/geo/argentina.json
"""
import json, math, sys

ISO = {'02': 'C', '06': 'B', '10': 'K', '22': 'H', '26': 'U', '14': 'X', '18': 'W', '30': 'E', '34': 'P', '38': 'Y',
       '42': 'L', '46': 'F', '50': 'M', '54': 'N', '58': 'Q', '62': 'R', '66': 'A', '70': 'J', '74': 'D', '78': 'Z',
       '82': 'S', '86': 'G', '94': 'V', '90': 'T'}
SHORT = {'94': 'Tierra del Fuego', '02': 'CABA'}
W, H = 640, 800
# main frame (equirectangular, cos 38°)
LON0, LAT0, K = -74.2, -21.4, 22.6
CX = math.cos(math.radians(38))
def main_xy(lon, lat): return ((lon - LON0) * CX * K + 8, (LAT0 - lat) * K + 8)
# polar inset (azimuthal equidistant around the South Pole, -49.5° meridian up)
PX, PY, PK = 505, 772, 7.6
def polar_xy(lon, lat):
    r, a = (90 + lat) * PK, math.radians(lon + 49.5)
    return (PX + r * math.sin(a), PY - r * math.cos(a))
# CABA inset
CB = (440, 24, 180, 150)  # x, y, w, h

def dp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    st = [(0, len(pts) - 1)]
    while st:
        a, b = st.pop(); ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy)
        far, fi = -1, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / L if L else math.hypot(px - ax, py - ay)
            if d > far: far, fi = d, i
        if far > tol: keep[fi] = True; st += [(a, fi), (fi, b)]
    return [p for p, k in zip(pts, keep) if k]

def area(r): return abs(sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1))) / 2

def centroid(rings, proj):
    best, ba = None, 0
    for ring in rings:
        pts = [proj(x, y) for x, y in ring]
        a = area(pts + [pts[0]])
        if a > ba: ba, best = a, pts
    if not best: return None
    A = cx = cy = 0
    for (x0, y0), (x1, y1) in zip(best, best[1:] + best[:1]):
        f = x0 * y1 - x1 * y0; A += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f
    if not A: return None
    return [round(cx / (3 * A), 1), round(cy / (3 * A), 1)]

# manual nudges so labels sit inside oddly shaped provinces
NUDGE = {'B': (8, 10), 'E': (0, 4), 'N': (2, 2), 'Y': (0, 4), 'T': (0, 0), 'U': (-4, 0), 'Z': (-6, 0), 'R': (0, -4), 'K': (-2, 6), 'A': (6, 8)}

def path(rings, proj, tol, min_area):
    out = []
    for ring in rings:
        pts = dp([proj(x, y) for x, y in ring], tol)
        if len(pts) < 3 or area(pts + [pts[0]]) < min_area: continue
        out.append('M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + 'Z')
    return ''.join(out)

def main():
    g = json.load(open(sys.argv[1]))
    locs = []
    caba = None
    for f in g['features']:
        pid, name = f['properties']['id'], f['properties']['nombre']
        geom = f['geometry']
        polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
        if pid == '02': caba = polys
        if pid != '94':
            d = path([p[0] for p in polys], main_xy, 0.35, 0.6)
            loc = {'id': ISO[pid], 'name': SHORT.get(pid, name), 'path': d, 'group': 'main'}
            c = centroid([p[0] for p in polys], main_xy)
            if c and pid != '02':
                dx, dy = NUDGE.get(ISO[pid], (0, 0)); loc['lx'], loc['ly'] = round(c[0] + dx, 1), round(c[1] + dy, 1)
            locs.append(loc)
            continue
        parts = {'V': [], 'MAL': [], 'GEO': [], 'ANT': []}
        for p in polys:
            ring = p[0]; lon = sum(x for x, _ in ring) / len(ring); lat = sum(y for _, y in ring) / len(ring)
            key = 'ANT' if lat < -60 else 'GEO' if lon > -42 else 'MAL' if -62 < lon < -57 and -53 < lat < -50.5 else 'V'
            parts[key].append(ring)
        c = centroid(parts['V'], main_xy)
        locs.append({'id': 'V', 'name': 'Tierra del Fuego', 'path': path(parts['V'], main_xy, 0.35, 0.6), 'group': 'main', 'lx': c[0] + 26, 'ly': c[1] + 2, 'lanchor': 'start'})
        locs.append({'id': 'V', 'sub': 'MAL', 'name': 'Islas Malvinas', 'path': path(parts['MAL'], main_xy, 0.25, 0.15), 'group': 'main'})
        locs.append({'id': 'V', 'sub': 'GEO', 'name': 'Georgias del Sur y Sandwich del Sur', 'path': path(parts['GEO'], polar_xy, 0.2, 0.05), 'group': 'polar'})
        locs.append({'id': 'V', 'sub': 'ANT', 'name': 'Antártida Argentina', 'path': path(parts['ANT'], polar_xy, 0.45, 0.8), 'group': 'polar'})
    # CABA enlarged
    xs = [x for p in caba for x, _ in p[0]]; ys = [y for p in caba for _, y in p[0]]
    s = min((CB[2] - 20) / ((max(xs) - min(xs)) * CX), (CB[3] - 30) / (max(ys) - min(ys)))
    def caba_xy(lon, lat): return (CB[0] + 10 + (lon - min(xs)) * CX * s, CB[1] + 22 + (max(ys) - lat) * s)
    cc = centroid([p[0] for p in caba], caba_xy)
    locs.append({'id': 'C', 'name': 'CABA', 'path': path([p[0] for p in caba], caba_xy, 0.4, 1), 'group': 'caba', 'lx': cc[0], 'ly': cc[1]})
    # decoration: Antarctic sector edges (74°W, 25°W) and the 60°S arc, frames
    def line(pts): return 'M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    arc = [polar_xy(lon, -60) for lon in [-74 + i * 0.5 for i in range(99)]]
    sector = line([polar_xy(-74, -90), polar_xy(-74, -60)]) + line(arc) + line([polar_xy(-25, -60), polar_xy(-25, -90)])
    lat_lines = ''.join(line([polar_xy(lon, la) for lon in [-74 + i * 0.5 for i in range(99)]]) for la in (-70, -80))
    out = {'label': 'Argentina bicontinental', 'viewBox': f'0 0 {W} {H}', 'locations': locs,
           'decor': {'sector': sector, 'graticule': lat_lines,
                     'frames': [{'x': CB[0], 'y': CB[1], 'w': CB[2], 'h': CB[3], 'label': 'CABA'},
                                {'x': 388, 'y': 470, 'w': 246, 'h': 324, 'label': 'Antártida e islas del Atlántico Sur'}],
                     'caba_dot': [round(v, 1) for v in main_xy(-58.44, -34.61)],
                     'labels': [{'t': 'Islas Malvinas', 'x': round(main_xy(-59.4, -50.6)[0], 1), 'y': round(main_xy(-59.4, -50.6)[1], 1)},
                                {'t': 'Polo Sur', 'a': 'middle', 'x': PX, 'y': PY + 14},
                                {'t': 'Georgias del Sur', 'a': 'end', 'x': round(polar_xy(-36.7, -54.6)[0] - 6, 1), 'y': round(polar_xy(-36.7, -54.6)[1] + 3, 1)},
                                {'t': 'Sandwich del Sur', 'a': 'end', 'x': round(polar_xy(-26.5, -57.5)[0] + 4, 1), 'y': round(polar_xy(-26.5, -57.5)[1] + 16, 1)},
                                {'t': 'Orcadas del Sur', 'a': 'end', 'x': round(polar_xy(-45.5, -60.6)[0] - 4, 1), 'y': round(polar_xy(-45.5, -60.6)[1] + 3, 1)}]},
           'source': 'IGN / georef-ar (datos.gob.ar), simplificado'}
    json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, separators=(',', ':'))
    print(len(locs), 'paths', sum(len(l['path']) for l in locs), 'chars')

if __name__ == '__main__':
    main()
