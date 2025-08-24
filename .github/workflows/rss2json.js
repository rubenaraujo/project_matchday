const fs = require('fs');
const { DOMParser } = require('xmldom');

const xml = fs.readFileSync('zapping.xml', 'utf8');
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(xml, 'application/xml');

const items = Array.from(xmlDoc.getElementsByTagName('item')).map(item => {
  const getText = tag => {
    const el = item.getElementsByTagName(tag)[0];
    return el ? el.textContent : '';
  };
  return {
    title: getText('title'),
    link: getText('link'),
    description: getText('description'),
    pubDate: getText('pubDate'),
    guid: getText('guid')
  };
});

fs.writeFileSync('zapping.json', JSON.stringify({ items }, null, 2));
