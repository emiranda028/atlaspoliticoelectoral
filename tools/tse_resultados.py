#!/usr/bin/env python3
"""Brasil 2026 — reads the TSE public results feed and writes a compact
summary for the site: data/especiales/brasil-2026-resultados.json

  python3 tools/tse_resultados.py            # one pass
  python3 tools/tse_resultados.py --loop 840 # repeat every 2 min for 840 s

Election codes: auto-discovered from the TSE config file; they can be forced
in data/especiales/brasil-2026.json → results.tse.codes
({"federal": "...", "estadual": "...", "round": 1}).
Deputy seats: when the TSE has not yet flagged the elected candidates, the
script projects them with the electoral quotient + D'Hondt (federations count
as one list) and marks the state as "projection".
"""
import json, os, re, sys, time, urllib.request, datetime, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'especiales', 'brasil-2026-resultados.json')
CFG = os.path.join(ROOT, 'data', 'especiales', 'brasil-2026.json')
BASE = os.environ.get('TSE_BASE', 'https://resultados.tse.jus.br/oficial')
UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
SEATS = {'SP':70,'MG':53,'RJ':46,'BA':39,'RS':31,'PR':30,'PE':25,'CE':22,'MA':18,'GO':17,'PA':17,'SC':16,'PB':12,'ES':10,'PI':10,'AL':9,
         'AC':8,'AM':8,'AP':8,'DF':8,'MS':8,'MT':8,'RN':8,'RO':8,'RR':8,'SE':8,'TO':8}
# Party numbers (first two digits of every candidate number)
PARTY = {'10':'Republicanos','11':'PP','12':'PDT','13':'PT','15':'MDB','16':'PSTU','18':'Rede','19':'Podemos','20':'Podemos','21':'PCB','22':'PL',
         '23':'Cidadania','25':'PRD','27':'DC','28':'PRTB','29':'PCO','30':'Novo','33':'Mobiliza','35':'PMB','36':'Agir','40':'PSB',
         '43':'PV','44':'União','45':'PSDB','50':'PSOL','55':'PSD','65':'PCdoB','70':'Avante','77':'Solidariedade','80':'UP','14':'Missão'}
# Federations: one list for seat allocation
FED = {'PT':'FE Brasil', 'PCdoB':'FE Brasil', 'PV':'FE Brasil', 'PSOL':'PSOL-Rede', 'Rede':'PSOL-Rede',
       'PSDB':'PSDB-Cidadania', 'Cidadania':'PSDB-Cidadania', 'União':'União Progressista', 'PP':'União Progressista'}
UA = {'User-Agent': 'Mozilla/5.0 (atlaspoliticoelectoral.com results reader)'}

def get(url, timeout=12):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))

def num(s):
    if s is None or s == '': return None
    return float(str(s).replace('.', '').replace(',', '.')) if ',' in str(s) else float(s)

def party_of(n, cc=''):
    n = str(n or '')
    if n[:2] in PARTY: return PARTY[n[:2]]
    m = re.match(r'\s*([A-Za-zÀ-ÿ ]+?)\s*(-|$)', cc or '')
    return (m.group(1).strip() if m else '') or ('nº ' + n[:2])

def discover():
    try:
        cfg = json.load(open(CFG)).get('results', {}).get('tse', {}).get('codes') or {}
    except Exception:
        cfg = {}
    cfg = {'federal': '6257', 'estadual': '6259', 'round': 1, 'cycle': 'ele2026', **cfg}
    if datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) > datetime.datetime(2026, 10, 25, 11) and not cfg.get('forced'):
        cfg.update({'federal': cfg.get('federal2', '6258'), 'estadual': cfg.get('estadual2', '6260'), 'round': 2})
    if cfg.get('federal') and cfg.get('estadual'):
        return {'federal': str(cfg['federal']), 'estadual': str(cfg['estadual']), 'round': int(cfg.get('round', 1)), 'cycle': cfg.get('cycle', 'ele2026')}
    j = get(BASE + '/comum/config/ele-c.json')
    found = []
    def walk(o, ctx):
        if isinstance(o, dict):
            ci = o.get('ci') or ctx
            if 'cd' in o and isinstance(o.get('cd'), (str, int)) and str(o['cd']).isdigit():
                found.append({**o, '_ci': ci})
            for v in o.values(): walk(v, ci)
        elif isinstance(o, list):
            for v in o: walk(v, ctx)
    walk(j, None)
    def pick(kind, turno):
        for e in found:
            txt = json.dumps(e, ensure_ascii=False).lower()
            if '2026' in txt and kind in txt and str(e.get('t', '1')) == str(turno):
                return e
        return None
    turno = 2 if datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) > datetime.datetime(2026, 10, 25, 11) else 1
    fed, est = pick('federal', turno), pick('estadual', turno)
    if not fed or not est:
        raise RuntimeError('No pude identificar los códigos de elección en ele-c.json: ' + json.dumps(found[:8], ensure_ascii=False)[:800])
    cyc = fed.get('_ci') or 'ele2026'
    if not str(cyc).startswith('ele'): cyc = 'ele2026'
    return {'federal': str(fed['cd']), 'estadual': str(est['cd']), 'round': turno, 'cycle': cyc}

def url(codes, scope, cargo, kind):
    # 2026 layout: /oficial/ele2026/<code>/dados/<uf>/<uf>-c<cargo>-e<code>-u.json
    code = codes['federal'] if kind == 'federal' else codes['estadual']
    return f"{BASE}/{codes['cycle']}/{code}/dados/{scope}/{scope}-c{cargo:04d}-e{int(code):06d}-u.json"

def flat_cands(j):
    # 2022 files: root "cand"; 2026 "-u" files: carg[].agr[].par[].cand[]
    if j.get('cand'): return [(c, None) for c in j['cand']]
    out = []
    for cg in j.get('carg', []) or []:
        for ag in cg.get('agr', []) or []:
            for pa in ag.get('par', []) or []:
                sg = pa.get('sg') or pa.get('sgp') or pa.get('nm')
                for c in pa.get('cand', []) or []: out.append((c, sg))
    return out

def counted(j):
    s = j.get('s')
    if isinstance(s, dict): return num(s.get('pst')) or 0.0
    return num(j.get('pst')) or 0.0

def simple(j, top=None):
    cands = []
    for c, sg in flat_cands(j):
        votes = num(c.get('vap'))
        cands.append({'n': str(c.get('n', '')), 'name': (c.get('nmu') or c.get('nm') or '').strip(), 'party': PARTY.get(str(c.get('n', ''))[:2]) or sg or party_of(c.get('n'), c.get('cc')),
                      'votes': int(votes) if votes is not None else None, 'pct': num(c.get('pvap')),
                      # TSE flags runoff candidates with e='s' too (st '2º turno'): only 'Eleito…' counts as elected
                      'e': (str(c.get('st') or '').lower().startswith('eleit') or (str(c.get('e', '')).lower() == 's' and 'turno' not in str(c.get('st') or '').lower())),
                      'runoff': 'turno' in str(c.get('st') or '').lower(), 'st': c.get('st') or ''})
    cands.sort(key=lambda c: -(c['votes'] or 0))
    e, v = j.get('e') if isinstance(j.get('e'), dict) else {}, j.get('v') if isinstance(j.get('v'), dict) else {}
    turnout = None
    if e.get('pc') or e.get('c'):
        turnout = {'pct': num(e.get('pc')), 'voters': int(num(e.get('c')) or 0), 'electorate': int(num(e.get('te')) or 0),
                   'abstPct': num(e.get('pa')),
                   'blank': int(num(v.get('vb')) or 0), 'null': int(num(v.get('vn')) or 0), 'valid': int(num(v.get('vv')) or 0), 'total': int(num(v.get('tv')) or 0)}
    return {'turnout': turnout, 'pct': counted(j), 'tse': ' '.join(x for x in [j.get('dg'), j.get('hg')] if x),
            'cands': cands[:top] if top else cands}

def majoritarian_status(r, seats):
    if any(c.get('runoff') for c in r['cands']): return 'runoff'
    if any(c['e'] for c in r['cands']): return 'elected'
    if r['pct'] >= 100 and r['cands']:
        # Count finished: majority rule (governors; senators are first-past-the-post)
        if seats > 1 or (r['cands'][0]['pct'] or 0) > 50: return 'elected'
        return 'runoff'
    return 'counting'

def dhondt_projection(cands, seats):
    # list votes (federations merged); candidates' nominal votes only
    lists = {}
    for c in cands:
        key = FED.get(c['party'], c['party'])
        lists.setdefault(key, {'votes': 0, 'cands': []})
        lists[key]['votes'] += c['votes'] or 0
        lists[key]['cands'].append(c)
    total = sum(l['votes'] for l in lists.values())
    if not total: return {}
    qe = total / seats
    alloc = {k: int(l['votes'] // qe) for k, l in lists.items()}
    eligible = [k for k, l in lists.items() if l['votes'] >= 0.8 * qe] or list(lists)
    while sum(alloc.values()) < seats:
        k = max(eligible, key=lambda k: lists[k]['votes'] / (alloc[k] + 1))
        alloc[k] += 1
    out = {}
    for k, n in alloc.items():
        for c in sorted(lists[k]['cands'], key=lambda c: -(c['votes'] or 0))[:n]:
            out[c['party']] = out.get(c['party'], 0) + 1
    return out

def project_president(got, national):
    """Projection to 100%: in each state, the sections still to count are
    assumed to vote like the ones already counted there; states with nothing
    counted get their electorate × the turnout seen so far, split like the
    national count. Votes from abroad are left out (≈0,6% of the roll)."""
    if not national or not national.get('pct'): return None
    try:
        voters = {s['uf']: s['voters'] for s in json.load(open(CFG))['states']}
    except Exception:
        voters = {}
    proj, names, rep_votes, rep_voters, missing = {}, {}, 0.0, 0, []
    for uf in UFS:
        j = got.get((uf, 'pres'))
        if not j: missing.append(uf); continue
        d = simple(j)
        if not d['pct'] or d['pct'] <= 0: missing.append(uf); continue
        f = 100.0 / d['pct']
        tot = 0.0
        for c in d['cands']:
            v = (c['votes'] or 0) * f
            proj[c['n']] = proj.get(c['n'], 0.0) + v
            names[c['n']] = (c['name'], c['party'])
            tot += v
        rep_votes += tot
        rep_voters += voters.get(uf, 0)
    if not proj: return None
    per_voter = rep_votes / rep_voters if rep_voters else 0
    nat = {c['n']: (c['pct'] or 0) / 100 for c in national['cands']}
    for uf in missing:
        est = voters.get(uf, 0) * per_voter
        for n, sh in nat.items():
            proj[n] = proj.get(n, 0.0) + est * sh
    total = sum(proj.values()) or 1
    cands = sorted(({'n': n, 'name': names.get(n, ('', ''))[0] or next((c['name'] for c in national['cands'] if c['n'] == n), n),
                     'party': names.get(n, ('', ''))[1] or next((c['party'] for c in national['cands'] if c['n'] == n), ''),
                     'pct': round(100 * v / total, 2), 'votes': int(v)} for n, v in proj.items()), key=lambda c: -c['pct'])
    return {'cands': cands, 'statesMissing': missing,
            'method': 'Lo que falta contar en cada estado vota como lo ya contado allí'}

def one_pass():
    codes = discover()
    jobs = {('BR', 'pres'): url(codes, 'br', 1, 'federal')}
    for uf in UFS:
        s = uf.lower()
        jobs[(uf, 'pres')] = url(codes, s, 1, 'federal')
        jobs[(uf, 'gov')] = url(codes, s, 3, 'estadual')
        if codes['round'] == 1:
            jobs[(uf, 'sen')] = url(codes, s, 5, 'estadual')
            jobs[(uf, 'dep')] = url(codes, s, 6, 'estadual')
    got, errors = {}, []
    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        futs = {ex.submit(get, u): k for k, u in jobs.items()}
        for f in cf.as_completed(futs):
            k = futs[f]
            try: got[k] = f.result()
            except Exception as e: errors.append(f'{k}: {e}')
    if ('BR', 'pres') not in got:
        raise RuntimeError('Sin datos nacionales: ' + '; '.join(errors[:3]))
    out = {'updatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'source': 'TSE — resultados.tse.jus.br',
           'round': codes['round'], 'codes': codes, 'president': simple(got[('BR', 'pres')]), 'states': {}, 'errors': len(errors)}
    chamber, senate, rep = {}, {}, 0
    for uf in UFS:
        st = {}
        if (uf, 'pres') in got: st['pres'] = simple(got[(uf, 'pres')], 4)
        if (uf, 'gov') in got:
            g = simple(got[(uf, 'gov')], 4); g['status'] = majoritarian_status(g, 1); st['gov'] = g
        if (uf, 'sen') in got:
            s = simple(got[(uf, 'sen')], 5); s['status'] = majoritarian_status(s, 2); st['sen'] = s
            for c in [] if not s['pct'] else (s['cands'][:2] if not any(c['e'] for c in s['cands']) else [c for c in s['cands'] if c['e']]):
                senate[c['party']] = senate.get(c['party'], 0) + 1
        if (uf, 'dep') in got:
            d = simple(got[(uf, 'dep')])
            elected = [c for c in d['cands'] if c['e'] or c['st'].lower().startswith('eleito')]
            if len(elected) >= SEATS[uf] * 0.9:
                seats, mode = {}, 'elected'
                for c in elected: seats[c['party']] = seats.get(c['party'], 0) + 1
            else:
                seats, mode = dhondt_projection(d['cands'], SEATS[uf]), 'projection'
            st['dep'] = {'pct': d['pct'], 'seats': seats, 'mode': mode}
            if seats: rep += 1
            for p, n in seats.items(): chamber[p] = chamber.get(p, 0) + n
        out['states'][uf] = st
    out['president']['projection'] = project_president(got, out['president'])
    out['chamber'] = {'seats': chamber, 'statesReporting': rep}
    out['senate'] = {'seats': senate}
    tmp = OUT + '.tmp'
    json.dump(out, open(tmp, 'w'), ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, OUT)
    print(f"ok {out['updatedAt']} · pres {out['president']['pct']}% · errores {len(errors)}", flush=True)

if __name__ == '__main__':
    loop = int(sys.argv[sys.argv.index('--loop') + 1]) if '--loop' in sys.argv else 0
    end = time.time() + loop
    while True:
        try: one_pass()
        except Exception as e: print('error:', e, flush=True)
        if time.time() + 120 > end: break
        time.sleep(120)
