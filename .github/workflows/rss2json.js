const fs = require('fs');
const xml2js = require('xml2js');

const xml = fs.readFileSync('zapping.xml', 'utf8');
const parser = new xml2js.Parser();

parser.parseString(xml, (err, result) => {
  if (err) {
    console.error('Error parsing XML:', err);
    process.exit(1);
  }
  // Find items in RSS structure
  let items = [];
  if (result.rss && result.rss.channel && result.rss.channel[0].item) {
    items = result.rss.channel[0].item.map(item => ({
      title: item.title ? item.title[0] : '',
      link: item.link ? item.link[0] : '',
      description: item.description ? item.description[0] : '',
      pubDate: item.pubDate ? item.pubDate[0] : '',
      guid: item.guid ? item.guid[0]._ || item.guid[0] : ''
    }));
  } else {
    console.error('No items found in XML. Structure:', JSON.stringify(result, null, 2));
  }
  fs.writeFileSync('zapping.json', JSON.stringify({ items }, null, 2));
});