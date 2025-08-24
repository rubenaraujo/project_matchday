const colorMap = {}; // stores the background color for each unique substring

function loader(show) {
    var loader = document.getElementById('loader');
    var table = document.getElementById('table');
    if (show) {
        loader.style.display = 'block';
        table.style.display = 'none';
    } else {
        loader.style.display = 'none';
        table.style.display = 'block';
    }
}

loader(true);

fetch('zapping.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        const items = data.items;
        let html = "";

        items.forEach(item => {
            const data = item.description;
            const columns = data.split(' - ');

            //remove spaces from channels
            columns[2] = columns[2].replace(/ /g, "");

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
                return /Jun.A|S15|S16|S17|S18|S19|S20|S21|S23|Basket|Hóquei|Voleibol|Andebol|Feminino|Futsal/.test(column);
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
                if (Object.values(colorMap).some(color => {
                    return color === `rgba(${r}, ${g}, ${b}, 0.1)` || color === `rgba(26, 26, 26, 0.1)`;
                })) {
                    colorMap[key] = `rgba(${r}, ${g}, ${b}, 0.1)`;
                }
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
        loader(false)
    })
    .catch(error => {
        console.error(error);
    });