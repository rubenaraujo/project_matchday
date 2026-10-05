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
