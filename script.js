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

function getTeamLogo(fullName) {
    // "Portugal (S19)" and "Benfica (Feminino)" use the logo of the base team.
    const name = fullName.replace(/\s*\([^)]*\)\s*$/, '');
    const flag = state.nationalTeamFlags[name.toLowerCase()];
    if (flag) {
        return { url: `https://flagcdn.com/w40/${flag}.png`, isBadge: false };
    }
    const badge = state.teamLogos[name];
    // Badges are stored in the repo (badges/*.png); a remote URL is a not yet downloaded one.
    return badge ? { url: /^https?:/.test(badge) ? badge + '/tiny' : badge, isBadge: true } : null;
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

// load({ silent: true }) refreshes in place: the current matches stay on screen and, if
// the refresh fails, they are kept instead of replaced by the error message.
function load({ silent = false } = {}) {
    const keepView = silent && state.matches.length > 0;
    if (!keepView) {
        setView('loading');
    }
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
            return true;
        })
        .catch(error => {
            console.error(error);
            if (!keepView) {
                setView('error');
            }
            return false;
        });
}

const PULL_THRESHOLD_PX = 70;
const PULL_MAX_PX = 110;
const PULL_MIN_SPINNER_MS = 800;
const PULL_RESULT_MS = 1400;

// Pull down from the top of the page to refresh (installed PWAs have no browser gesture for it).
// A pill shows the state ("Puxa…", "Larga…", "A atualizar…", then the result) and the page
// slides down with the finger, so the gesture is visible even when nothing on the page changes.
function initPullToRefresh() {
    const indicator = $('pull-indicator');
    const label = indicator.querySelector('.pull-label');
    const page = document.querySelector('.container');
    let startY = null;
    let distance = 0;
    let refreshing = false;

    function setOffset(px, animate) {
        page.style.transition = animate ? 'transform 0.25s ease' : 'none';
        page.style.transform = px ? `translateY(${px}px)` : '';
    }

    function show(text, offset, state) {
        label.textContent = text;
        indicator.className = `pull-indicator visible ${state}`;
        indicator.style.top = `${Math.max(offset - 44, 8)}px`;
    }

    function hide() {
        indicator.className = 'pull-indicator';
        setOffset(0, true);
    }

    document.addEventListener('touchstart', event => {
        startY = !refreshing && window.scrollY === 0 && event.touches.length === 1 ? event.touches[0].clientY : null;
        distance = 0;
    }, { passive: true });

    document.addEventListener('touchmove', event => {
        if (startY === null) {
            return;
        }
        const dy = event.touches[0].clientY - startY;
        if (dy <= 0 || window.scrollY > 0) {
            startY = null;
            hide();
            return;
        }
        event.preventDefault();
        // Resistance: the further you pull, the less the page follows.
        distance = Math.min(dy * 0.5, PULL_MAX_PX);
        setOffset(distance, false);
        const ready = distance >= PULL_THRESHOLD_PX;
        show(ready ? 'Larga para atualizar' : 'Puxa para atualizar', distance, ready ? 'pulling ready' : 'pulling');
    }, { passive: false });

    function release() {
        if (startY === null) {
            return;
        }
        startY = null;
        if (distance < PULL_THRESHOLD_PX) {
            hide();
            return;
        }
        refreshing = true;
        setOffset(PULL_THRESHOLD_PX * 0.7, true);
        show('A atualizar…', PULL_THRESHOLD_PX * 0.7, 'refreshing');
        Promise.all([load({ silent: true }), new Promise(resolve => setTimeout(resolve, PULL_MIN_SPINNER_MS))])
            .then(([ok]) => {
                setOffset(0, true);
                const time = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                show(ok ? `Atualizado às ${time}` : 'Sem ligação', 0, ok ? 'done' : 'failed');
                return new Promise(resolve => setTimeout(resolve, PULL_RESULT_MS));
            })
            .finally(() => {
                refreshing = false;
                hide();
            });
    }

    document.addEventListener('touchend', release);
    document.addEventListener('touchcancel', () => {
        startY = null;
        hide();
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

    initPullToRefresh();
    load();
}

init();
