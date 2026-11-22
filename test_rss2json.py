import json

import pytest

from rss2json import parse_items_from_xml

SAMPLE_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
    <channel>
        <title>Zapping</title>
        <item>
            <title>Benfica x Porto - 05/10 20:00 - Sport TV 1</title>
            <link>http://www.zerozero.pt/zapping</link>
            <description>Benfica x Porto - 05/10 20:00 - Sport TV 1</description>
            <pubDate>Mon, 05 Oct 2026 20:00:00</pubDate>
            <guid>abc-123</guid>
        </item>
        <item>
            <title>Sporting x Braga - 05/10 18:00 - Canal11</title>
            <link>http://www.zerozero.pt/zapping</link>
            <description>Sporting x Braga - 05/10 18:00 - Canal11</description>
            <pubDate>Mon, 05 Oct 2026 18:00:00</pubDate>
        </item>
    </channel>
</rss>
"""

EMPTY_CHANNEL_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
    <channel>
        <title>Zapping</title>
    </channel>
</rss>
"""

NO_CHANNEL_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"></rss>
"""


def test_parses_items_with_all_fields():
    items = parse_items_from_xml(SAMPLE_RSS)

    assert len(items) == 2
    assert items[0] == {
        'title': 'Benfica x Porto - 05/10 20:00 - Sport TV 1',
        'link': 'http://www.zerozero.pt/zapping',
        'description': 'Benfica x Porto - 05/10 20:00 - Sport TV 1',
        'pubDate': 'Mon, 05 Oct 2026 20:00:00',
        'guid': 'abc-123'
    }


def test_defaults_guid_to_empty_string_when_missing():
    items = parse_items_from_xml(SAMPLE_RSS)

    assert items[1]['guid'] == ''


def test_returns_empty_list_when_channel_has_no_items():
    assert parse_items_from_xml(EMPTY_CHANNEL_RSS) == []


def test_returns_empty_list_when_no_channel_element(capsys):
    items = parse_items_from_xml(NO_CHANNEL_RSS)

    assert items == []
    assert "Não foram encontrados itens no XML." in capsys.readouterr().out


def test_raises_on_malformed_xml():
    with pytest.raises(Exception):
        parse_items_from_xml("not valid xml <<<")


def test_output_is_json_serializable():
    items = parse_items_from_xml(SAMPLE_RSS)

    # main() wraps items in {'items': items} before dumping to JSON
    json.dumps({'items': items}, ensure_ascii=False)


def test_pick_badge_prefers_soccer_teams_with_a_badge():
    from scripts.update_team_logos import pick_badge

    response = {'teams': [
        {'strSport': 'Handball', 'strBadge': 'https://x/handball.png'},
        {'strSport': 'Soccer', 'strBadge': ''},
        {'strSport': 'Soccer', 'strBadge': 'https://x/soccer.png'},
    ]}
    assert pick_badge(response) == 'https://x/soccer.png'
    assert pick_badge({'teams': None}) is None


def test_ordered_names_puts_the_soonest_kickoff_first_and_skips_other_sports():
    from scripts.update_team_logos import ordered_names

    items = [
        {'description': 'Zebras x Yaks - 23/11 15:00 - Canal'},
        {'description': 'Torreense x Benfica - 22/11 20:45 - RTP1'},
        {'description': 'Benfica (Hóquei) x Alpha (Hóquei) - 22/11 10:00 - BTv'},
        {'description': 'Gil Vicente x Olhanense - 22/11 14:00 - C11'},
    ]
    assert ordered_names(items) == ['Gil Vicente', 'Olhanense', 'Benfica', 'Torreense', 'Yaks', 'Zebras']


def test_local_badge_path_uses_the_image_id():
    from scripts.update_team_logos import local_badge_path

    assert local_badge_path('https://r2.thesportsdb.com/images/media/team/badge/iwio2w1626201723.png') == 'badges/iwio2w1626201723.png'


def test_main_keeps_previous_json_when_feed_is_empty(tmp_path, monkeypatch):
    import rss2json

    monkeypatch.chdir(tmp_path)
    (tmp_path / 'zapping.xml').write_text(EMPTY_CHANNEL_RSS, encoding='utf-8')
    (tmp_path / 'zapping.json').write_text('{"items": ["old"]}', encoding='utf-8')

    with pytest.raises(SystemExit) as exit_info:
        rss2json.main()

    assert exit_info.value.code == 1
    assert (tmp_path / 'zapping.json').read_text(encoding='utf-8') == '{"items": ["old"]}'


def test_logo_script_uses_the_sites_exclusion_rule():
    from scripts.update_team_logos import EXCLUDED, team_names

    assert EXCLUDED.pattern == '''Jun.A|S15|S16|S17|S18|S19|S20|S21|S23|Basket|Americano|Hóquei|Voleibol|Andebol|Feminino|Futsal'''
    items = [
        {'description': 'Alpha (Feminino) x Beta (Feminino) - 22/11 15:00 - C11'},
        {'description': 'Gama (Futsal) x Delta (Futsal) - 22/11 17:00 - C11'},
        {'description': 'Torreense x Benfica - 22/11 20:45 - RTP1'},
    ]
    assert team_names(items) == {'Torreense', 'Benfica'}


def test_missing_logos_separates_not_found_from_pending():
    from scripts.update_team_logos import missing_logos

    logos = {'Benfica': 'badges/a.png', 'Racing Power FC': None}
    assert missing_logos(['Benfica', 'Racing Power FC', 'Torreense', 'portugal'], logos, {'portugal': 'pt'}) == (
        ['Racing Power FC'], ['Torreense'])
