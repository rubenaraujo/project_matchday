fetch(rssUrl)
    .then(response => response.json())
    .then(data => {
        const items = data.items;
        let html = "";

        items.forEach(item => {
            const data = item.description;
            const columns = data.split(' - ');
            
            // if columns[2] starts with 11Sports then remove spcaces
            if (columns[2].startsWith('11Sports')) {
                columns[2] = columns[2].replace(/\s/g, '');
            }

            const channelNames = columns[2].split(' ');

            let channelIcons = '';
            console.log(channelNames);

            channelNames.forEach(channelName => {
                let icon = '';

                // Try to find the icon for this channel
                Object.keys(channelIconsBase64).forEach(channelIconName => {
                    if (channelName === channelIconName) {
                        icon = channelIconsBase64[channelIconName];
                    }
                });
                
                // If no icon was found, use the channel name instead
                if (!icon) {
                    icon = channelName;
                }

                // Append the icon to the list of icons for this row
                channelIcons += `<img src="data:image/png;base64,${icon}" alt="${channelName}" title="${channelName}" class="channel-icon" />`;
            });

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
                   <td class="channel-icons">${channelIcons}</td>
                 </tr>`;
            } else {
                html += `<tr>
                   <td class="date">${columns[1]}</td>
                   <td class="game">${columns[0]}</td>
                   <td class="channel-icons">${channelIcons}</td>
                 </tr>`;
            }
        });

        document.getElementById("table-body").innerHTML = html;

    })
    .catch(error => {
        console.error(error);
    });
