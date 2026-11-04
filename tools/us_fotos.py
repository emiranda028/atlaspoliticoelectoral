#!/usr/bin/env python3
"""EE.UU. 2026 — busca en Wikipedia (en inglés) la foto de cada candidato al
Senado y a gobernador y escribe data/especiales/eeuu-2026-fotos.json:

  {"warner-m": {"name": "Mark Warner", "wiki": "Mark_Warner",
                "desc": "American politician (born 1954)", "img": "https://upload.wikimedia.org/..."}}

Solo usa imágenes con licencia libre (pageimages con pilicense=free) y acepta
un artículo solo si el título contiene el nombre y el apellido del candidato y
la descripción corresponde a una persona de la política o la vida pública de
EE.UU. Si no hay coincidencia segura, el candidato queda sin foto (el sitio
muestra sus iniciales).

  python3 tools/us_fotos.py           # completa lo que falte
  python3 tools/us_fotos.py --fresh   # vuelve a buscar todo

tools/us_resultados.py la llama sola (con un tope de tiempo por pasada) hasta
que el archivo esté completo.
"""
import json, os, re, sys, time, unicodedata, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'especiales', 'eeuu-2026-fotos.json')
BASE = os.environ.get('NYT_BASE', 'https://static01.nyt.com/elections-assets/pages/data/2026-11-03')
UA = {'User-Agent': 'AtlasPoliticoMundial/1.0 (https://atlaspoliticoelectoral.com; candidate photos for election results)'}
OK_DESC = re.compile(r'politician|senator|governor|congress|representative|lawyer|attorney|business|official|officer|'
                     r'mayor|activist|journalist|educator|navy|army|marine|veteran|physician|executive|strategist|'
                     r'commissioner|treasurer|secretary|judge|legislator|diplomat|farmer|entrepreneur|economist', re.I)
STATES = {s['id']: s['name'] for s in json.load(open(os.path.join(ROOT, 'data', 'especiales', 'eeuu-2026.json')))['states']}
STATES_EN = {'Luisiana': 'Louisiana', 'Nuevo México': 'New Mexico', 'Nueva York': 'New York', 'Nueva Jersey': 'New Jersey',
             'Nuevo Hampshire': 'New Hampshire', 'Carolina del Norte': 'North Carolina', 'Carolina del Sur': 'South Carolina',
             'Dakota del Norte': 'North Dakota', 'Dakota del Sur': 'South Dakota', 'Virginia Occidental': 'West Virginia',
             'Pensilvania': 'Pennsylvania', 'Misuri': 'Missouri', 'Misisipi': 'Mississippi', 'Hawái': 'Hawaii',
             'Kansas': 'Kansas', 'Oregón': 'Oregon', 'Míchigan': 'Michigan', 'Tennesí': 'Tennessee'}

def get_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode('utf-8'))

def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z ]', ' ', s)

def wiki(first, last, state):
    q = f'{first} {last} {state}'
    url = ('https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1'
           '&generator=search&gsrlimit=5&gsrsearch=' + urllib.parse.quote(q) +
           '&prop=pageimages|description&piprop=thumbnail&pithumbsize=200&pilicense=free')
    pages = sorted((get_json(url).get('query') or {}).get('pages') or [], key=lambda p: p.get('index', 99))
    nf, nl = norm(first).split(), norm(last).split()
    for p in pages:
        t = norm(re.sub(r'\(.*?\)', '', p['title']))
        words = t.split()
        if not all(w in words for w in nl): continue
        if not (nf and (nf[0] in words or any(w.startswith(nf[0][:3]) for w in words))): continue
        desc = p.get('description') or ''
        if not OK_DESC.search(desc) or re.search(r'born 1[0-8]\d\d|\(1[0-8]\d\d|died|\d{4}\s*[–-]\s*\d{4}', desc): continue
        img = (p.get('thumbnail') or {}).get('source')
        return {'wiki': p['title'].replace(' ', '_'), 'desc': desc, 'img': img}
    return None

def save(out):
    tmp = OUT + '.tmp'
    json.dump(out, open(tmp, 'w'), ensure_ascii=False, indent=0, sort_keys=True)
    os.replace(tmp, OUT)

def main(deadline=None, fresh=False):
    out = json.load(open(OUT)) if os.path.exists(OUT) and not fresh else {}
    out.pop('__done__', None)
    n = 0
    for name in ('senate', 'governor'):
        data = get_json(f'{BASE}/results-{name}.json?t={int(time.time())}')
        for r in data['races']:
            st = (r.get('top_reporting_unit') or {}).get('state_postal')
            state = STATES_EN.get(STATES.get(st, st), STATES.get(st, st))
            meta = r.get('candidate_metadata') or {}
            # Major candidates only: D, R and the top independents by ballot order
            cands = sorted(meta.values(), key=lambda m: (((m.get('party') or {}).get('nyt_id') not in ('DEM', 'GOP')), m.get('order') or 99))[:3]
            for m in cands:
                cid = m['nyt_id']
                if cid in out: continue
                if deadline and time.time() > deadline:
                    save(out); print('fotos: sigue en la próxima pasada', flush=True); return False
                first = m.get('first_name') or ''; last = m.get('last_name') or ''
                try:
                    w = wiki(first, last, state)
                except Exception as e:
                    print('error', cid, e, flush=True); time.sleep(2); continue
                out[cid] = {'name': f'{first} {last}'.strip(), **(w or {'wiki': None, 'img': None})}
                print(cid, '→', (w or {}).get('wiki'), '|', (w or {}).get('desc'), '| foto' if (w or {}).get('img') else '', flush=True)
                n += 1
                if n % 10 == 0: save(out)
                time.sleep(0.4)
    print(len(out), 'candidatos ·', sum(1 for v in out.values() if v.get('img')), 'con foto')
    out['__done__'] = True
    save(out)
    return True

if __name__ == '__main__':
    main(fresh='--fresh' in sys.argv)
