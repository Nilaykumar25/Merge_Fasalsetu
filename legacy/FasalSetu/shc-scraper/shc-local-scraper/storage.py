"""
LOCAL VERSION of storage.py
Drop-in replacement for the original GCS-backed storage.py.
Same function names/signatures as the original so scraper.py and
local_card_extractor.py can call it without modification.

Everything lands under ./data/shcs/<state>/<district>/<mandal>/<village>/<file>
"""

import os
import json

DATA_ROOT = os.environ.get('SHC_DATA_ROOT', './data')
HTML_ROOT = os.path.join(DATA_ROOT, 'shcs')
EXTRACTED_ROOT = os.path.join(DATA_ROOT, 'ExtractedCards')

os.makedirs(HTML_ROOT, exist_ok=True)
os.makedirs(EXTRACTED_ROOT, exist_ok=True)


def getFileName(sample_text, srno_text):
    if srno_text:
        return sample_text.replace('/', '-') + '_' + str(srno_text) + ').html'
    else:
        return sample_text.replace('/', '-') + '.html'


def getFilePath(state, district, mandal, village, sample, srno):
    """Returns a path RELATIVE to HTML_ROOT (mirrors original 'shcs/...' prefix)."""
    return os.path.join(
        str(state), str(district), str(mandal), str(village),
        getFileName(sample, srno)
    )


def _abs_html_path(relative_path):
    return os.path.join(HTML_ROOT, relative_path)


def isFileDownloaded(file_path):
    return os.path.exists(_abs_html_path(file_path))


def getContent(file_path):
    with open(_abs_html_path(file_path), 'r', encoding='utf-8') as f:
        return f.read()


def getMetadata(file_path):
    meta_path = _abs_html_path(file_path) + '.meta.json'
    if os.path.exists(meta_path):
        with open(meta_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def uploadFile(file_path, content, metadata):
    """'Upload' = write to local disk. Also writes a sidecar .meta.json."""
    if len(content) < 1000:
        print(f"[storage] Refusing to save suspiciously small report: {file_path}")
        return

    abs_path = _abs_html_path(file_path)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)

    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(content)

    with open(abs_path + '.meta.json', 'w', encoding='utf-8') as f:
        json.dump(metadata, f)

    print(f"[storage] Saved card HTML -> {abs_path}")


def downloadFile(file_path):
    return getContent(file_path)


def uploadParsedCard(file_path, content):
    """content is expected to be a JSON string (or dict) of the parsed card."""
    rel = file_path
    if rel.startswith('shcs' + os.sep) or rel.startswith('shcs/'):
        rel = rel[5:]
    if rel.endswith('.html'):
        rel = rel[:-5] + '.json'

    abs_path = os.path.join(EXTRACTED_ROOT, rel)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)

    with open(abs_path, 'w', encoding='utf-8') as f:
        if isinstance(content, (dict, list)):
            json.dump(content, f, ensure_ascii=False, indent=2)
        else:
            f.write(content)

    print(f"[storage] Saved extracted JSON -> {abs_path}")


def isFileUploaded(file_path):
    rel = file_path
    if rel.startswith('shcs' + os.sep) or rel.startswith('shcs/'):
        rel = rel[5:]
    if rel.endswith('.html'):
        rel = rel[:-5] + '.json'
    return os.path.exists(os.path.join(EXTRACTED_ROOT, rel))


def downloadJsonBlob(file_path):
    rel = file_path
    if rel.startswith('shcs' + os.sep) or rel.startswith('shcs/'):
        rel = rel[5:]
    if rel.endswith('.html'):
        rel = rel[:-5] + '.json'
    abs_path = os.path.join(EXTRACTED_ROOT, rel)
    if not os.path.exists(abs_path):
        return None
    with open(abs_path, 'r', encoding='utf-8') as f:
        return f.read()
