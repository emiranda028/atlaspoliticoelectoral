"""Merge translated chunks into i18n/en.json and i18n/pt.json.

Usage: python3 i18n/merge.py <folder with *.en.json / *.pt.json> <normalized-keys map json>
The map ({old_key: new_key}) comes from i18n/harvest.js runs that normalise
month/weekday names to {M}/{D}; translations get the same treatment here.
"""
import json, re, sys, glob, os
folder, keymap_path = sys.argv[1], sys.argv[2]
keymap = json.load(open(keymap_path))
HERE = os.path.dirname(os.path.abspath(__file__))
NAMES = {
  'en': {'M': r'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec',
         'D': r'Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday'},
  'pt': {'M': r'janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez',
         'D': r'domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|segunda|terça|quarta|quinta|sexta'},
}
def retoken(tr, need, lang):
    out = tr
    for ty in ('D', 'M'):
        n = need.count('{%s}' % ty)
        if not n: continue
        rx = re.compile(r'(?<![A-Za-zÀ-ÿ])(' + NAMES[lang][ty] + r')\.?(?![A-Za-zÀ-ÿ])', re.I)
        hits = list(rx.finditer(out))
        if len(hits) != n:
            near = [h for h in hits if re.search(r'[\d}]\s*(de\s+|,\s*)?$', out[max(0, h.start()-6):h.start()]) or re.match(r'\.?,?\s*(de\s+)?[\d{\']', out[h.end():h.end()+6])]
            if ty == 'D': near = hits
            if len(near) != n: return None
            hits = near
        for h in reversed(hits):
            out = out[:h.start()] + '{%s}' % ty + out[h.end():]
    return out
for lang in ('en', 'pt'):
    path = os.path.join(HERE, lang + '.json')
    dic = {}
    if os.path.exists(path): dic = json.load(open(path))
    dropped = 0
    for f in sorted(glob.glob(os.path.join(folder, '*.%s.json' % lang))):
        for k, v in json.load(open(f)).items():
            nk = keymap.get(k, k)
            if nk != k:
                v2 = retoken(v, nk, lang)
                if v2 is None: dropped += 1; continue
                v = v2
            dic[nk] = v
    json.dump(dict(sorted(dic.items())), open(path, 'w'), ensure_ascii=False, indent=0)
    print(lang, len(dic), 'entries; dropped', dropped)
