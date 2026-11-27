#!/usr/bin/env python3
"""Noche electoral de España (generales del 29/11/2026).

Escribe data/especiales/espana-2026-resultados.json con el escrutinio
provisional del Ministerio del Interior. El especial y la tarjeta de portada
lo leen cada minuto.

Formato de salida:
{
  "updatedAt": ISO 8601, "pctCounted": 87.3, "turnout": 68.1,
  "source": {"label": ..., "url": ...},
  "parties":   [{"id": "PP", "name": ..., "votes": n, "pct": 34.1, "seats": 140}, ...],
  "provinces": [{"id": "28", "name": "Madrid", "seats": 37, "pctCounted": 90.1,
                 "turnout": 70.2, "parties": [{"id": "PP", "pct": 40.1, "seats": 16}, ...]}, ...]
}
Los "id" de partido son los de data/especiales/espana-2026.json (lists[].id) y
los de provincia, el código INE de dos dígitos (01 a 52).

Uso:
  python3 tools/es_resultados.py interior   # lee la web oficial (ES_INTERIOR_BASE)
  python3 tools/es_resultados.py manual tools/es_manual.json   # carga a mano

El adaptador "interior" se completa la noche de la elección, cuando la web
oficial (resultados.29neleccionesgenerales.com) publica sus datos. Hasta
entonces la web responde 403/401 y el adaptador no escribe nada.
"""
import json, os, sys, re, unicodedata, urllib.request
from datetime import datetime, timezone

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'data/especiales/espana-2026-resultados.json')
ES = json.load(open(os.path.join(ROOT, 'data/especiales/espana-2026.json')))
SOURCE = {'label': 'resultados.29neleccionesgenerales.com', 'url': 'https://resultados.29neleccionesgenerales.com/'}

def norm(s):
    s = unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode().upper()
    return re.sub(r'[^A-Z0-9]', '', s)

# Siglas de la web oficial -> id del Atlas. Lo que no está acá queda con su sigla.
ALIAS = {
    'PP': 'PP', 'PARTIDOPOPULAR': 'PP',
    'PSOE': 'PSOE', 'PSCPSOE': 'PSOE', 'PSC': 'PSOE', 'PSDEGPSOE': 'PSOE', 'PSEEPSOE': 'PSOE', 'PSNPSOE': 'PSOE',
    'VOX': 'Vox',
    'SUMAR': 'Sumar', 'FRENTEAMPLIO': 'Sumar', 'FA': 'Sumar',
    'PODEMOS': 'Podemos', 'PODEMOSAV': 'Podemos', 'PODEMOSALIANZAVERDE': 'Podemos',
    'ERC': 'ERC', 'JUNTS': 'Junts', 'JXCAT': 'Junts', 'JUNTSPERCATALUNYA': 'Junts',
    'EHBILDU': 'EHBildu', 'BILDU': 'EHBildu', 'EAJPNV': 'PNV', 'PNV': 'PNV',
    'BNG': 'BNG', 'CCA': 'CC', 'CC': 'CC', 'COALICIONCANARIA': 'CC', 'UPN': 'UPN',
    'COMPROMIS': 'Compromis', 'ADELANTEANDALUCIA': 'AA', 'AA': 'AA', 'SALF': 'SALF', 'SEACABOLAFIESTA': 'SALF',
}
def party_id(sigla):
    return ALIAS.get(norm(sigla), str(sigla).strip())


def validate(R):
    tot = sum(p.get('seats') or 0 for p in R['parties'])
    assert tot <= 350, f'escaños nacionales {tot} > 350'
    assert 0 <= R['pctCounted'] <= 100, 'pctCounted fuera de rango'
    assert sum(p.get('pct') or 0 for p in R['parties']) <= 100.5, 'los % nacionales suman más de 100'
    for pr in R.get('provinces', []):
        assert re.fullmatch(r'\d\d', pr['id']), f"id de provincia raro: {pr['id']}"
        s = sum(p.get('seats') or 0 for p in pr['parties'])
        assert not pr.get('seats') or s <= pr['seats'], f"{pr['name']}: {s} escaños > {pr['seats']}"
        assert sum(p.get('pct') or 0 for p in pr['parties']) <= 100.5, f"{pr['name']}: % > 100"

def write(R):
    R.setdefault('updatedAt', datetime.now(timezone.utc).isoformat(timespec='seconds'))
    R.setdefault('source', SOURCE)
    R['parties'] = sorted(R['parties'], key=lambda p: (-(p.get('seats') or 0), -(p.get('pct') or 0)))
    validate(R)
    old = json.load(open(OUT)) if os.path.exists(OUT) else None
    if old and old.get('pctCounted', 0) > R['pctCounted'] + 0.01:
        print('el escrutinio nuevo tiene menos mesas que el publicado; no se pisa'); return False
    json.dump(R, open(OUT, 'w'), ensure_ascii=False, indent=1)
    print(f"escrito: {R['pctCounted']}% escrutado, {sum(p.get('seats') or 0 for p in R['parties'])} escaños, {len(R.get('provinces', []))} provincias")
    return True

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Atlas Politico Electoral)', 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode('utf-8'))

def from_interior():
    """Adaptador de la web oficial. Se completa con la estructura real el
    domingo, cuando la web publique (ver la pestaña de red del navegador)."""
    base = os.environ.get('ES_INTERIOR_BASE', '').rstrip('/')
    if not base:
        print('ES_INTERIOR_BASE sin configurar: todavía no se conoce el formato oficial'); return None
    raise SystemExit('adaptador oficial pendiente de completar con el formato real')

def from_manual(path):
    """Carga a mano (respaldo si la web oficial no es accesible desde los servidores).
    El archivo usa el mismo formato de salida; los partidos pueden venir por sigla."""
    R = json.load(open(path))
    for p in R['parties']: p['id'] = party_id(p.get('id') or p.get('name'))
    for pr in R.get('provinces', []):
        for p in pr['parties']: p['id'] = party_id(p.get('id') or p.get('name'))
    return R

if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'interior'
    R = from_manual(sys.argv[2]) if mode == 'manual' else from_interior()
    if R: write(R)
