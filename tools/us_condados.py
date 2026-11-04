#!/usr/bin/env python3
"""EE.UU. 2026 — votos por condado de cada carrera al Senado y a gobernador
(AP vía The New York Times) para el mapa de la ficha de cada estado.

Escribe data/especiales/eeuu-2026-condados.json:

  {"updatedAt": "...", "races": {"VA": {"senate": {"51107": [eevp, "D", 61.2, "R", 38.1, 23.7], ...}}}}

Cada condado: % del voto esperado contado, los dos primeros (partido y %) y el
margen demócrata − republicano de la elección anterior para ese mismo cargo
(o de la presidencial 2024 si no hay), para la vista "Elección anterior".

  python3 tools/us_condados.py   # una pasada (us_resultados.py la llama en cada pasada)
"""
import json, os, time, datetime, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'especiales', 'eeuu-2026-condados.json')
BASE = os.environ.get('NYT_BASE', 'https://static01.nyt.com/elections-assets/pages/data/2026-11-03')
UA = {'User-Agent': 'Mozilla/5.0 (atlaspoliticoelectoral.com results reader)'}

def get(name):
    req = urllib.request.Request(f'{BASE}/{name}.json?t={int(time.time())}', headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode('utf-8'))

def party(meta):
    p = (meta.get('party') or {}).get('nyt_id') or ''
    return 'D' if p == 'DEM' else 'R' if p == 'GOP' else 'I'

def prev_margin(unit, office):
    hist = unit.get('historical_comparison_race_data') or {}
    keys = sorted(hist, reverse=True)
    for want in (f'-G-{office}-', '-G-P-'):
        for k in keys:
            if want in k and hist[k].get('margin') is not None:
                return round(hist[k]['margin'], 1)
    return None

def race_counties(slug, race_id, office):
    page = get(slug)
    race = next((r for r in page['races'] if r['nyt_id'] == race_id), None)
    if not race: return {}
    meta = race.get('candidate_metadata') or {}
    out = {}
    for u in race.get('reporting_units') or []:
        if u.get('level') not in ('county', 'city') or not u.get('fips_county'): continue
        cs = [c for c in u.get('candidates') or [] if not c['nyt_id'].startswith(('total_', 'write'))]
        tot = sum((c.get('votes') or {}).get('total') or 0 for c in u.get('candidates') or [])
        cs.sort(key=lambda c: -((c.get('votes') or {}).get('total') or 0))
        row = [round(u.get('eevp') or 0)]
        for c in cs[:2]:
            v = (c.get('votes') or {}).get('total') or 0
            row += [party(meta.get(c['nyt_id'], {})), round(100 * v / tot, 1) if tot else None]
        while len(row) < 5: row += [None, None]
        row.append(prev_margin(u, office))
        out[u['fips_state'] + u['fips_county']] = row
    return out

def run(sen=None, gov=None, workers=8):
    sen = sen or get('results-senate'); gov = gov or get('results-governor')
    jobs = []
    for kind, data in (('senate', sen), ('governor', gov)):
        for r in data['races']:
            st = (r.get('top_reporting_unit') or {}).get('state_postal')
            slug = (r.get('url') or '').rsplit('/', 1)[-1].replace('.html', '')
            if st and slug: jobs.append((st, kind, slug, r['nyt_id'], r.get('office_id') or ('S' if kind == 'senate' else 'G')))
    res = {}
    def work(j):
        st, kind, slug, rid, office = j
        try: return j, race_counties(slug, rid, office)
        except Exception as e:
            print('condados: error', slug, e, flush=True); return j, None
    old = {}
    if os.path.exists(OUT):
        try: old = json.load(open(OUT)).get('races') or {}
        except Exception: old = {}
    with ThreadPoolExecutor(workers) as ex:
        for (st, kind, *_), counties in ex.map(work, jobs):
            if counties is None: counties = (old.get(st) or {}).get(kind) or {}
            if counties: res.setdefault(st, {})[kind] = counties
    out = {'updatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
           'source': 'Associated Press, vía The New York Times', 'races': res}
    tmp = OUT + '.tmp'
    json.dump(out, open(tmp, 'w'), ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, OUT)
    print(f"condados: {sum(len(k) for s in res.values() for k in s.values())} en {len(res)} estados", flush=True)

if __name__ == '__main__':
    run()
