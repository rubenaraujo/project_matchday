import xml.etree.ElementTree as ET
import json

tree = ET.parse('zapping.xml')
root = tree.getroot()

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

with open('zapping.json', 'w', encoding='utf-8') as f:
    json.dump({'items': items}, f, ensure_ascii=False, indent=2)
