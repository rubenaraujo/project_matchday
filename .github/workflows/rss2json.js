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
  
  // Criar o JSON como string
  const jsonString = JSON.stringify({ items }, null, 2);
  
  // Escrever usando stream para ter mais controle
  const writeStream = fs.createWriteStream('zapping.json', { 
    encoding: 'utf8',
    flags: 'w'
  });
  
  writeStream.write(jsonString, 'utf8');
  writeStream.end();
  
  writeStream.on('finish', () => {
    console.log('Arquivo JSON criado com sucesso');
  });
  
  writeStream.on('error', (err) => {
    console.error('Erro ao escrever arquivo:', err);
  });
});