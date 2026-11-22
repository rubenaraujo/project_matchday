"""Builds team-logos.json: club badges looked up once on TheSportsDB.

National teams are handled client-side with flags (see national-team-flags.json), so only
other names from zapping.json are looked up. The free API is rate limited, so
each run resolves a bounded number of new names and stops on HTTP 429; the
rest is picked up by the next scheduled run. Names in today's feed are resolved first
(soonest kickoff first), then the clubs of seed-teams.json (every name seen in the feed so far),
so the teams people are about to watch get a badge before the rest.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = 'https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t='
LOGOS_FILE = 'team-logos.json'
FLAGS_FILE = 'national-team-flags.json'
MAX_LOOKUPS_PER_RUN = 40
DELAY_SECONDS = 2.5
RATE_LIMIT_WAIT_SECONDS = 65  # the free tier allows about 30 requests a minute
SEED_FILE = 'seed-teams.json'
BADGES_DIR = 'badges'
MAX_DOWNLOADS_PER_RUN = 80
# Clubs looked up even before they show up in the feed.
SEED_NAMES = {
    'Benfica', 'Sporting', 'FC Porto', 'Braga', 'Vitória SC', 'Famalicão', 'Gil Vicente',
    'Moreirense', 'Estoril', 'Casa Pia', 'Rio Ave', 'Arouca', 'Santa Clara', 'Nacional',
    'Boavista', 'AVS', 'Estrela da Amadora', 'Farense', 'Alverca', 'Tondela',
}
# Feed names that TheSportsDB only finds under another spelling.
ALIASES = {'Al-Ahli Jeddah': 'Al Ahli Saudi', 'FC Porto': 'Porto', 'Nacional': 'Nacional Madeira',
           'Bayern München': 'Bayern Munich', 'PSG': 'Paris Saint Germain', 'Petro de Luanda': 'Atlético Petróleos'}
EXCLUDED = re.compile(r'Basket|Americano|Hóquei|Voleibol|Andebol|Futsal')
QUALIFIER = re.compile(r'\s*\([^)]*\)\s*$')
KICKOFF = re.compile(r'(\d{2})/(\d{2}) (\d{2}:\d{2})')


def pick_badge(api_response):
    """Returns the badge URL of the first soccer team with a badge, or None."""
    for team in (api_response or {}).get('teams') or []:
        if team.get('strSport') == 'Soccer' and team.get('strBadge'):
            return team['strBadge']
    return None


def team_names(items):
    names = set()
    for item in items:
        columns = item.get('description', '').split(' - ')
        if len(columns) < 3 or any(EXCLUDED.search(c) for c in columns):
            continue
        names.update(QUALIFIER.sub('', n).strip() for n in columns[0].split(' x '))
    return names


def ordered_names(items):
    """Feed team names, the ones playing soonest first."""
    first_seen = {}
    for item in items:
        kickoff = KICKOFF.search(item.get('description', ''))
        key = (kickoff.group(2), kickoff.group(1), kickoff.group(3)) if kickoff else ('99', '99', '')
        for name in team_names([item]):
            first_seen[name] = min(key, first_seen.get(name, key))
    return sorted(first_seen, key=lambda n: (first_seen[n], n))


def fetch(query):
    """One search; on a rate limit waits a minute and retries once."""
    for attempt in (1, 2):
        try:
            with urllib.request.urlopen(API + urllib.parse.quote(query), timeout=20) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 2:
                raise
            time.sleep(RATE_LIMIT_WAIT_SECONDS)


def local_badge_path(url):
    """badges/<id>.png, named after the TheSportsDB image id so aliases share one file."""
    return f'{BADGES_DIR}/{url.rstrip("/").rsplit("/", 1)[-1].rsplit(".", 1)[0]}.png'


def download_badge(url):
    """Saves the small (tiny) version of a remote badge and returns its repo path."""
    path = local_badge_path(url)
    if not os.path.exists(path):
        os.makedirs(BADGES_DIR, exist_ok=True)
        with urllib.request.urlopen(url + '/tiny', timeout=20) as response:
            data = response.read()
        with open(path, 'wb') as f:
            f.write(data)
    return path


def localize(logos, limit):
    """Replaces remote badge URLs by downloaded files so the site never depends on TheSportsDB."""
    done = 0
    for name, url in logos.items():
        if done >= limit:
            break
        if isinstance(url, str) and url.startswith('http'):
            try:
                logos[name] = download_badge(url)
            except (urllib.error.URLError, OSError) as error:
                print(f'{name}: {error}', file=sys.stderr)
            done += 1


def lookup(name):
    """Searches the alias, then the name with hyphens as spaces ("Al-Nassr" is "Al Nassr")."""
    badge = None
    for query in dict.fromkeys([ALIASES.get(name, name), name.replace('-', ' ')]):
        badge = pick_badge(fetch(query))
        if badge:
            break
        time.sleep(DELAY_SECONDS)
    return badge


def main():
    max_lookups = int(sys.argv[1]) if len(sys.argv) > 1 else MAX_LOOKUPS_PER_RUN
    with open('zapping.json', encoding='utf-8') as f:
        feed_names = ordered_names(json.load(f)['items'])
    with open(FLAGS_FILE, encoding='utf-8') as f:
        national = json.load(f)
    try:
        with open(SEED_FILE, encoding='utf-8') as f:
            seeds = json.load(f)
    except FileNotFoundError:
        seeds = []
    queue = list(dict.fromkeys(feed_names + sorted(SEED_NAMES) + seeds))
    try:
        with open(LOGOS_FILE, encoding='utf-8') as f:
            logos = json.load(f)
    except FileNotFoundError:
        logos = {}

    pending = [n for n in queue if n.lower() not in national and n not in logos]
    for name in pending[:max_lookups]:
        try:
            logos[name] = lookup(name)
        except urllib.error.HTTPError as error:
            print(f'{name}: HTTP {error.code}, stopping', file=sys.stderr)
            break
        except (urllib.error.URLError, ValueError) as error:
            print(f'{name}: {error}', file=sys.stderr)
            continue
        time.sleep(DELAY_SECONDS)

    localize(logos, MAX_DOWNLOADS_PER_RUN)
    with open(LOGOS_FILE, 'w', encoding='utf-8') as f:
        json.dump(dict(sorted(logos.items())), f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main()
