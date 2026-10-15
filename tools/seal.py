#!/usr/bin/env python3
"""Seal or open the start-card snapshot that widgets.js reads.

The snapshot is JSON of the form {"at": "...", "cards": [...], "list": [...]}.
It is stored in data/start.txt as base64url(12-byte IV || AES-256-GCM ciphertext with tag).
The key is never committed. Pass it through the START_KEY environment variable.

  python3 tools/seal.py --new-key                     print a fresh base64url key
  START_KEY=... python3 tools/seal.py < snapshot.json  seal stdin into data/start.txt
  START_KEY=... python3 tools/seal.py --open           print the current snapshot

Requires the `cryptography` package.
"""
import base64
import json
import os
import sys

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'start.txt')


def b64(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


def unb64(s):
    s = s.strip()
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))


def key():
    k = os.environ.get('START_KEY', '')
    if not k:
        sys.exit('START_KEY is not set')
    raw = unb64(k)
    if len(raw) != 32:
        sys.exit('START_KEY must be 32 bytes')
    return raw


def seal():
    data = json.load(sys.stdin)
    if not isinstance(data.get('cards'), list) or not isinstance(data.get('list'), list):
        sys.exit('snapshot needs "cards" and "list" arrays')
    plain = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()
    iv = os.urandom(12)
    sealed = iv + AESGCM(key()).encrypt(iv, plain, None)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        f.write(b64(sealed) + '\n')
    print('sealed %d cards, %d list rows -> data/start.txt' % (len(data['cards']), len(data['list'])))


def open_():
    with open(OUT) as f:
        buf = unb64(f.read())
    plain = AESGCM(key()).decrypt(buf[:12], buf[12:], None)
    print(json.dumps(json.loads(plain), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    arg = sys.argv[1] if len(sys.argv) > 1 else ''
    if arg == '--new-key':
        print(b64(os.urandom(32)))
    elif arg == '--open':
        open_()
    elif arg == '':
        seal()
    else:
        sys.exit(__doc__)
