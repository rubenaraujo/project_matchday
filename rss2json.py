import xml.etree.ElementTree as ET
import json


def parse_items_from_xml(xml_content):
    """Parses RSS XML content (as a string) into a list of item dicts.

    Returns an empty list if the XML doesn't have the expected RSS
    <channel> structure.
    """
    root = ET.fromstring(xml_content)

    items = []
    # Garante que está no formato RSS padrão
    channel = root.find('channel')
    if channel is not None:
        for item_elem in channel.findall('item'):
            item = {
                'title': item_elem.findtext('title', ''),
                'link': item_elem.findtext('link', ''),
                'description': item_elem.findtext('description', ''),
                'pubDate': item_elem.findtext('pubDate', ''),
                'guid': ''
            }
            guid_elem = item_elem.find('guid')
            if guid_elem is not None:
                item['guid'] = guid_elem.text if guid_elem.text is not None else ''
            items.append(item)
    else:
        print("Não foram encontrados itens no XML.")

    return items


def main():
    with open('zapping.xml', 'r', encoding='utf-8') as f:
        xml_content = f.read()

    items = parse_items_from_xml(xml_content)

    with open('zapping.json', 'w', encoding='utf-8') as f:
        json.dump({'items': items}, f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main()
