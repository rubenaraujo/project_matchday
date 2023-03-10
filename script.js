const colorMap = {}; // stores the background color for each unique substring

fetch(rssUrl)
    .then(response => response.json())
    .then(data => {
        const items = data.items;
        let html = "";

        items.forEach(item => {
            const data = item.description;
            const columns = data.split(' - ');
            
            // if columns[2] starts with 11Sports, 11Xt, ABola or contains SportTv MP then remove spcaces
            if (columns[2].startsWith('11Sports') || columns[2].startsWith('11Xt') || columns[2].startsWith('ABola') || columns[2].includes('SportTv MP')) {
                columns[2] = columns[2].replace(/\s/g, '');
            }

            const channelNames = columns[2].split(' ');
            const key = columns[1].substring(0, 5); // get first 5 chars of first column

            let channelIcons = '';

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
                return /Jun.A|S15|S19|S23|Basket|Hóquei|Voleibol|Andebol|Feminino|Futsal/.test(column);
            })) {
                return;
            }

            let teamNames = columns[0].split(' x ');

            // generate a random background color with 0.1 alpha if it doesn't exist in the map
            if (!colorMap[key]) {
                const r = Math.floor(Math.random() * 256);
                const g = Math.floor(Math.random() * 256);
                const b = Math.floor(Math.random() * 256);
                colorMap[key] = `rgba(${r}, ${g}, ${b}, 0.1)`;
                // check if the color is similar to any color in the map if it is, generate a new one
                Object.keys(colorMap).forEach(mapKey => {
                    if (key !== mapKey) {
                        const color = colorMap[mapKey];
                        const rgb = color.substring(color.indexOf('(') + 1, color.lastIndexOf(')')).split(/,\s*/);
                        const r1 = rgb[0];
                        const g1 = rgb[1];
                        const b1 = rgb[2];
                        const distance = Math.sqrt(Math.pow(r - r1, 2) + Math.pow(g - g1, 2) + Math.pow(b - b1, 2));
                        if (distance < 150) {
                            delete colorMap[key];
                        }
                    }
                }
                );
            }

            if (window.innerWidth <= 800) {
                html += `<tr data-key="${key}">
                   <td class="date">${columns[1]}</td>
                   <td class="team-names" data-teams="${columns[0]}"><span>${teamNames[0]}</span>${teamNames[1]}</td>
                   <td class="channel-icons">${channelIcons}</td>
                 </tr>`;
            } else {
                html += `<tr data-key="${key}">
                   <td class="date">${columns[1]}</td>
                   <td class="game">${columns[0]}</td>
                   <td class="channel-icons">${channelIcons}</td>
                 </tr>`;
            }
        });

        document.getElementById("table-body").innerHTML = html;

        // apply background colors to tr elements with the same data-key attribute
        Object.keys(colorMap).forEach(key => {
            const elements = document.querySelectorAll(`[data-key="${key}"]`);
            elements.forEach(element => {
                element.style.backgroundColor = colorMap[key];
            });
        });

    })
    .catch(error => {
        console.error(error);
    });