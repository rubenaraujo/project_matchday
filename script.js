const STORAGE_KEYS = { favorites: 'matchday.favorites' };
const REFRESH_INTERVAL_MS = 60 * 1000;

const state = {
    matches: [],
    generated: null,
    channelIcons: {},
    teamLogos: {},
    nationalTeamFlags: {},
    favorites: new Set(),
    filters: { query: '', favoritesOnly: false }
};

const $ = id => document.getElementById(id);

function readStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
        console.warn('Storage read failed', error);
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn('Storage unavailable', error);
    }
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Case and accent insensitive form used for searching and favourites.
function normalize(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function pad(n) {
    return n < 10 ? '0' + n : String(n);
}

function isFavorite(name) {
    return state.favorites.has(normalize(name));
}

function getTeamLogo(name) {
    const flag = state.nationalTeamFlags[name.toLowerCase()];
    if (flag) {
        return { url: `https://flagcdn.com/w40/${flag}.png`, isBadge: false };
    }
    const badge = state.teamLogos[name];
    return badge ? { url: badge + '/tiny', isBadge: true } : null;
}

function teamHtml(name, logoAfter) {
    const clean = name.trim();
    const logo = getTeamLogo(clean);
    const img = logo
        ? `<img class="team-logo${logo.isBadge ? ' is-badge' : ''}" src="${escapeHtml(logo.url)}" alt="" loading="lazy">`
        : '';
    const pressed = isFavorite(clean);
    return `<button type="button" class="team" data-team="${escapeHtml(clean)}" aria-pressed="${pressed}" ` +
        `title="${pressed ? 'Remover das favoritas' : 'Marcar como favorita'}">` +
        `${logoAfter ? escapeHtml(clean) + img : img + escapeHtml(clean)}</button>`;
}

// Images that fail to load are retried once, then hidden.
document.addEventListener('error', event => {
    const img = event.target;
    if (!img.classList.contains('team-logo')) {
        return;
    }
    if (img.dataset.retried) {
        img.hidden = true;
        return;
    }
    img.dataset.retried = 'true';
    setTimeout(() => { img.src = `${img.src}?retry=1`; }, 1000);
}, true);

function buildMatches(items) {
    const matches = [];
    items.forEach(item => {
        const parsed = MatchParser.parseMatchDescription(item.description);
        if (!parsed) {
            return;
        }
        matches.push(Object.assign({}, parsed, { kickoff: MatchParser.parseKickoff(item.pubDate) }));
    });
    return matches.sort((a, b) => {
        const ta = a.kickoff ? a.kickoff.getTime() : Infinity;
        const tb = b.kickoff ? b.kickoff.getTime() : Infinity;
        return ta - tb;
    });
}

const STATUS_LABELS = { live: 'Ao vivo', soon: 'Em breve' };

function channelHtml(name) {
    const icon = state.channelIcons[name];
    return icon
        ? `<img src="data:image/png;base64,${icon}" alt="${escapeHtml(name)}" title="${escapeHtml(name)}" class="channel-icon">`
        : `<span class="channel-badge">${escapeHtml(name)}</span>`;
}

function matchHtml(match, status) {
    const { kickoff, teamNames, channelNames } = match;
    const time = kickoff ? `${pad(kickoff.getHours())}:${pad(kickoff.getMinutes())}` : match.date.split(' ')[1] || match.date;
    const hasFav = teamNames.some(isFavorite);
    const badge = STATUS_LABELS[status] ? `<span class="badge">${STATUS_LABELS[status]}</span>` : '';
    const teams = teamNames.length === 2
        ? `${teamHtml(teamNames[0], true)}<span class="vs" aria-label="contra">x</span>${teamHtml(teamNames[1], false)}`
        : `<span>${escapeHtml(match.game)}</span>`;

    return `<li class="match status-${status}${hasFav ? ' has-fav' : ''}">` +
        `<time class="match-time" ${kickoff ? `datetime="${kickoff.toISOString()}"` : ''}>${escapeHtml(time)}${badge}</time>` +
        `<div class="match-teams">${teams}</div>` +
        `<div class="match-channels">${channelNames.map(channelHtml).join('')}</div>` +
        `</li>`;
}

function matchesFilters(match) {
    const { query, favoritesOnly } = state.filters;
    if (favoritesOnly && !match.teamNames.some(isFavorite)) {
        return false;
    }
    return !query || match.teamNames.some(t => normalize(t).includes(query));
}

function renderStatus() {
    const d = state.generated;
    $('status').textContent = d && !isNaN(d)
        ? `Atualizado ${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`
        : '';
}

function render() {
    const now = new Date();
    const groups = [];

    state.matches.forEach(match => {
        const status = match.kickoff ? MatchParser.getMatchStatus(match.kickoff, now) : 'upcoming';
        if (status === 'finished' || !matchesFilters(match)) {
            return;
        }
        const key = match.kickoff ? MatchParser.dayKey(match.kickoff) : 'other';
        let group = groups[groups.length - 1];
        if (!group || group.key !== key) {
            group = {
                key,
                label: match.kickoff ? MatchParser.getDayLabel(match.kickoff, now) : 'Outros',
                html: ''
            };
            groups.push(group);
        }
        group.html += matchHtml(match, status);
    });

    $('matches').innerHTML = groups.length
        ? groups.map(g => `<section><h2 class="day-title">${escapeHtml(g.label)}</h2><ul class="match-list">${g.html}</ul></section>`).join('')
        : '<p class="empty">Sem jogos para os filtros selecionados.</p>';
    renderStatus();
}

function setView(view) {
    $('loader').hidden = view !== 'loading';
    $('error-message').hidden = view !== 'error';
    $('matches').hidden = view !== 'matches';
    $('filters').hidden = view === 'error';
    if (view !== 'matches') {
        $('status').textContent = '';
    }
}

function fetchJson(url, fallback) {
    return fetch(url).then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    }).catch(error => {
        if (fallback !== undefined) {
            console.warn(`${url} unavailable`, error);
            return fallback;
        }
        throw error;
    });
}

function load() {
    setView('loading');
    return Promise.all([
        fetchJson(rssUrl),
        fetchJson(channelIconsUrl),
        fetchJson(teamLogosUrl, {}),
        fetchJson(nationalTeamFlagsUrl, {})
    ])
        .then(([data, icons, logos, flags]) => {
            state.channelIcons = icons;
            state.teamLogos = logos;
            state.nationalTeamFlags = flags;
            state.generated = data.generated ? new Date(data.generated) : null;
            state.matches = buildMatches(data.items);
            setView('matches');
            render();
        })
        .catch(error => {
            console.error(error);
            setView('error');
        });
}

function toggleFavorite(team) {
    const key = normalize(team);
    if (state.favorites.has(key)) {
        state.favorites.delete(key);
    } else {
        state.favorites.add(key);
    }
    writeStorage(STORAGE_KEYS.favorites, [...state.favorites]);
    render();
}

function init() {
    state.favorites = new Set(readStorage(STORAGE_KEYS.favorites, []));

    $('retry').addEventListener('click', load);
    $('search').addEventListener('input', event => {
        state.filters.query = normalize(event.target.value);
        render();
    });
    $('fav-filter').addEventListener('click', event => {
        state.filters.favoritesOnly = !state.filters.favoritesOnly;
        event.currentTarget.setAttribute('aria-pressed', String(state.filters.favoritesOnly));
        render();
    });

    $('matches').addEventListener('click', event => {
        const button = event.target.closest('button.team');
        if (button) {
            toggleFavorite(button.dataset.team);
        }
    });

    // Refresh live/soon labels and drop finished matches without a reload.
    setInterval(() => {
        if (!document.hidden && state.matches.length) {
            render();
        }
    }, REFRESH_INTERVAL_MS);

    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
        navigator.serviceWorker.register('sw.js').catch(error => console.warn('Service worker not registered', error));
    }

    load();
}

init();
