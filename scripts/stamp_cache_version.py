"""Stamps sw.js with a cache name derived from the app's static files.

Run by the hourly workflow: sw.js only changes (and old caches are only dropped) when
one of these files changed, so nobody has to bump the version by hand.
"""
import hashlib
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
STATIC_FILES = ['index.html', 'style.css', 'script.js', 'constants.js', 'lib/matchParser.js', 'manifest.json']
CACHE_LINE = re.compile(r"const CACHE = '[^']*';")


def cache_name(root=ROOT):
    digest = hashlib.sha256()
    for name in STATIC_FILES:
        with open(os.path.join(root, name), 'rb') as f:
            digest.update(name.encode() + f.read())
    return f'matchday-{digest.hexdigest()[:8]}'


def main():
    path = os.path.join(ROOT, 'sw.js')
    with open(path, encoding='utf-8') as f:
        source = f.read()
    stamped = CACHE_LINE.sub(f"const CACHE = '{cache_name()}';", source, count=1)
    if stamped != source:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(stamped)


if __name__ == '__main__':
    main()
