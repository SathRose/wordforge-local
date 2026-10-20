"""Download public dictionary data and retain exact source rows for this word set."""
import csv
import io
import json
import hashlib
import urllib.request
from pathlib import Path

base = Path(__file__).resolve().parent
sources = base / 'dictionary-sources'
sources.mkdir(exist_ok=True)
lists = json.loads((base / 'lists-recognized.json').read_text(encoding='utf-8'))['lists']
wanted = {w for item in lists for w in item['words']}
found = {}
for filename in ['ecdict.mini.csv', 'ecdict.csv']:
    if wanted <= found.keys():
        break
    url = 'https://raw.githubusercontent.com/skywind3000/ECDICT/master/' + filename
    req = urllib.request.Request(url, headers={'User-Agent': 'WordForge-local-study-import/1.0'})
    print('Reading public source:', filename, flush=True)
    with urllib.request.urlopen(req, timeout=60) as response:
        reader = csv.DictReader(io.TextIOWrapper(response, encoding='utf-8-sig', newline=''))
        for row in reader:
            w = row.get('word', '')
            if w in wanted:
                found[w] = {**row, '_source_url': url}
            if wanted <= found.keys():
                break
    print('Matched', len(found), '/', len(wanted), flush=True)
(sources / 'ecdict-300-full-rows.json').write_text(json.dumps(found, ensure_ascii=False, indent=2), encoding='utf-8')
for filename in ['LICENSE', 'README.md']:
    url = 'https://raw.githubusercontent.com/skywind3000/ECDICT/master/' + filename
    with urllib.request.urlopen(url, timeout=30) as response:
        (sources / ('ECDICT-' + filename)).write_bytes(response.read())
missing = sorted(wanted - found.keys())
print(json.dumps({'matched': len(found), 'missing': missing}, ensure_ascii=False), flush=True)
if missing and missing != ['core']:
    raise SystemExit(1)
if missing == ['core']:
    print('core is supplied separately from Cambridge Dictionary; see reviewed batch source references.', flush=True)
