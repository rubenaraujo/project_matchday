"""Builds team-logos.json: club badges looked up once on TheSportsDB.

National teams are handled client-side with flags (see national-team-flags.json), so only
other names from zapping.json are looked up. The free API is rate limited, so
each run resolves a bounded number of new names and stops on HTTP 429; the
rest is picked up by the next scheduled run.
"""
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = 'https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t='
LOGOS_FILE = 'team-logos.json'
FLAGS_FILE = 'national-team-flags.json'
MAX_LOOKUPS_PER_RUN = 20
DELAY_SECONDS = 3
# Clubs looked up even before they show up in the feed.
SEED_NAMES = {
    'Benfica', 'Sporting', 'FC Porto', 'Braga', 'Vitória SC', 'Famalicão', 'Gil Vicente',
    'Moreirense', 'Estoril', 'Casa Pia', 'Rio Ave', 'Arouca', 'Santa Clara', 'Nacional',
    'Boavista', 'AVS', 'Estrela da Amadora', 'Farense', 'Alverca', 'Tondela',
}
EXCLUDED = re.compile(r'Jun.A|S15|S16|S17|S18|S19|S20|S21|S23|Basket|Hóquei|Voleibol|Andebol|Feminino|Futsal')


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
        names.update(n.strip() for n in columns[0].split(' x '))
    return names


def lookup(name):
    with urllib.request.urlopen(API + urllib.parse.quote(name), timeout=20) as response:
        return json.load(response)


def main():
    with open('zapping.json', encoding='utf-8') as f:
        names = team_names(json.load(f)['items'])
    with open(FLAGS_FILE, encoding='utf-8') as f:
        national = json.load(f)
    names = {n for n in names | SEED_NAMES if n.lower() not in national}
    try:
        with open(LOGOS_FILE, encoding='utf-8') as f:
            logos = json.load(f)
    except FileNotFoundError:
        logos = {}

    for name in sorted(names - set(logos))[:MAX_LOOKUPS_PER_RUN]:
        try:
            logos[name] = pick_badge(lookup(name))
        except urllib.error.HTTPError as error:
            print(f'{name}: HTTP {error.code}, stopping', file=sys.stderr)
            break
        except (urllib.error.URLError, ValueError) as error:
            print(f'{name}: {error}', file=sys.stderr)
            continue
        time.sleep(DELAY_SECONDS)

    with open(LOGOS_FILE, 'w', encoding='utf-8') as f:
        json.dump(dict(sorted(logos.items())), f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main()
