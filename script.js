const rssUrl = "https://api.rss2json.com/v1/api.json?rss_url=https://www.zerozero.pt/rss/zapping.php&api_key=2jryubkslkwfqdrmkk09nh2mpsqix78drrsy8rjs&count=100";

fetch(rssUrl)
    .then(response => response.json())
    .then(data => {
        const items = data.items;
        let html = "";

        items.forEach(item => {
            const data = item.description;
            const columns = data.split(' - ');
            console.log(columns)
            if (columns.some(column => {
                return /Jun.A|S19|S23|Basket|Hóquei|Voleibol|Andebol|Feminino|Futsal/.test(column);
            })) {
                return;
            }

            let teamNames = columns[0].split(' x ');

            if (window.innerWidth <= 800) {
                html += `<tr>
                   <td class="date">${columns[1]}</td>
                   <td class="team-names" data-teams="${columns[0]}"><span>${teamNames[0]}</span>${teamNames[1]}</td>
                   <td class="provider">${columns[2].replace(/<[^>]+>/g, '')}</td>
                 </tr>`;
            } else {
                html += `<tr>
                   <td class="date">${columns[1]}</td>
                   <td class="game">${columns[0]}</td>
                   <td class="provider">${columns[2].replace(/<[^>]+>/g, '')}</td>
                 </tr>`;
            }
        });

        document.getElementById("table-body").innerHTML = html;

    })
    .catch(error => {
        console.error(error);
    });
