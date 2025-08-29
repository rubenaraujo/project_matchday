const fs = require('fs');
const cheerio = require('cheerio');

// Lê o arquivo XML
const xml = fs.readFileSync('zapping.xml', 'utf8');
// Carrega o XML com cheerio
const $ = cheerio.load(xml, { xmlMode: true });

// Seleciona os itens do RSS
const items = [];
$('rss > channel > item').each(function() {
  const item = $(this);
  items.push({
    title: item.find('title').text() || '',
    link: item.find('link').text() || '',
    description: item.find('description').text() || '',
    pubDate: item.find('pubDate').text() || '',
    guid: item.find('guid').text() || ''
  });
});

// Salva em JSON
fs.writeFileSync('zapping.json', JSON.stringify({ items }, null, 2));
