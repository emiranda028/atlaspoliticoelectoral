#!/usr/bin/env python3
"""EE.UU. 2026 — reads the public results files that The New York Times
publishes with Associated Press data and writes a compact summary for the
site: data/especiales/eeuu-2026-resultados.json

  python3 tools/us_resultados.py            # one pass
  python3 tools/us_resultados.py --loop 840 # repeat every 2 min for 840 s

It keeps: party control of the Senate and the House (seats won, flips, seats
needed, AP calls) with the NYT live model, and for every Senate and governor
race the share of the expected vote counted, the top candidates and the
winner once AP calls it.
"""
import json, os, sys, time, urllib.request, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'especiales', 'eeuu-2026-resultados.json')
BASE = os.environ.get('NYT_BASE', 'https://static01.nyt.com/elections-assets/pages/data/2026-11-03')
UA = {'User-Agent': 'Mozilla/5.0 (atlaspoliticoelectoral.com results reader)'}

FOTOS = os.path.join(ROOT, 'data', 'especiales', 'eeuu-2026-fotos.json')
SPECIAL = os.path.join(ROOT, 'data', 'especiales', 'eeuu-2026.json')

def load(path):
    try: return json.load(open(path))
    except Exception: return {}

def get(name):
    req = urllib.request.Request(f'{BASE}/results-{name}.json?t={int(time.time())}', headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode('utf-8'))

def party(meta):
    p = (meta.get('party') or {}).get('nyt_id') or ''
    return 'D' if p == 'DEM' else 'R' if p == 'GOP' else 'I'

def control(office):
    pb = office.get('party_balance') or {}
    model = {m['nyt_party_id']: m for m in (office.get('nyt_model_estimates') or [])}
    out = {'total': office.get('total'), 'called': office.get('num_races_called'), 'toWin': office.get('to_win'),
           'up': office.get('open_seats'), 'parties': {}}
    for pid, key in (('DEM', 'D'), ('GOP', 'R'), ('OTH', 'I')):
        b = pb.get(pid) or {}
        m = model.get(pid) or {}
        out['parties'][key] = {'seats': b.get('seats') or 0, 'notUp': b.get('no_election') or 0, 'flips': b.get('flip_count') or 0,
                               'winner': bool(b.get('winner')), 'model': {'seats': m.get('seats'), 'range': [m['seats_quantile'][1], m['seats_quantile'][3]] if m.get('seats_quantile') else None,
                                                                        'prob': m.get('win_probability')}}
    return out

def race(r, photos, prev):
    t = r.get('top_reporting_unit') or {}
    meta = r.get('candidate_metadata') or {}
    total = sum((c.get('votes') or {}).get('total') or 0 for c in t.get('candidates') or [])
    won = set((r.get('outcome') or {}).get('won') or [])
    cands = []
    for c in t.get('candidates') or []:
        if c['nyt_id'].startswith(('total_', 'write')): continue
        m = meta.get(c['nyt_id'], {})
        v = (c.get('votes') or {}).get('total') or 0
        est = c.get('nyt_model_estimates') or {}
        cands.append({'id': c['nyt_id'], 'name': f"{m.get('first_name', '')} {m.get('last_name', '')}".strip(), 'party': party(m),
                      'img': (photos.get(c['nyt_id']) or {}).get('img'),
                      'votes': v, 'pct': round(100 * v / total, 1) if total else None, 'winner': c['nyt_id'] in won,
                      'incumbent': bool(m.get('incumbent')), 'prob': est.get('win_probability')})
    cands.sort(key=lambda c: (-(c['votes'] or 0), -(c['prob'] or 0)))
    e = t.get('eevp') or 0
    e = round(e) if e >= 1 else round(e, 1)
    return {'status': r.get('race_call_status'), 'eevp': e, 'votes': total,
            'called': bool(won), 'rating': r.get('rating'), 'prev': prev, 'gained': bool((r.get('outcome') or {}).get('gained')),
            'cands': cands[:3]}

def fill_photos(budget=90):
    if load(FOTOS).get('__done__'): return
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import us_fotos
        us_fotos.main(deadline=time.time() + budget)
    except Exception as e:
        print('fotos: error', e, flush=True)

def one_pass():
    fill_photos()
    sen, gov = get('senate'), get('governor')
    photos = load(FOTOS)
    before = {s['id']: s for s in (load(SPECIAL).get('states') or [])}
    pc = gov['partyControlData']['results'][0]['offices']
    out = {'updatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
           'source': 'Associated Press, vía The New York Times',
           'providerUpdatedAt': (gov.get('resultsMeta') or {}).get('resultsUpdatedAt'),
           'senate': control(pc['S']), 'house': control(pc['H']), 'states': {}}
    for kind, data in (('senate', sen), ('governor', gov)):
        for r in data['races']:
            st = (r.get('top_reporting_unit') or {}).get('state_postal')
            prev = ((before.get(st) or {}).get(kind) or {}).get('party')
            if st: out['states'].setdefault(st, {})[kind] = race(r, photos, prev)
    tmp = OUT + '.tmp'
    json.dump(out, open(tmp, 'w'), ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, OUT)
    s, h = out['senate']['parties'], out['house']['parties']
    print(f"ok {out['updatedAt']} · Senado D {s['D']['seats']} R {s['R']['seats']} · Cámara D {h['D']['seats']} R {h['R']['seats']}", flush=True)

if __name__ == '__main__':
    loop = int(sys.argv[sys.argv.index('--loop') + 1]) if '--loop' in sys.argv else 0
    end = time.time() + loop
    while True:
        try: one_pass()
        except Exception as e: print('error:', e, flush=True)
        if time.time() + 120 > end: break
        time.sleep(120)
