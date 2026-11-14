// Pure parsing logic shared between the browser (script.js, loaded as a
// classic <script>) and Node (unit tests). No DOM/browser APIs are used here
// so this module can run in both environments unchanged.
(function (global) {
    "use strict";

    // Non top-tier categories that should not be displayed (youth/lower
    // divisions, other sports that sometimes leak into the football feed).
    var EXCLUDED_CATEGORIES_REGEX = /Jun.A|S15|S16|S17|S18|S19|S20|S21|S23|Basket|Hóquei|Voleibol|Andebol|Feminino|Futsal/;

    // Parses an RSS item description in the format
    // "Team A x Team B - DD/MM HH:mm - Channel Name" into structured match
    // data. Returns null when the entry has an unexpected shape or belongs to
    // an excluded category.
    function parseMatchDescription(description) {
        var columns = description.split(' - ');

        if (columns.length < 3) {
            return null;
        }

        var isExcluded = columns.some(function (column) {
            return EXCLUDED_CATEGORIES_REGEX.test(column);
        });

        if (isExcluded) {
            return null;
        }

        var game = columns[0];
        var date = columns[1];
        // Channel names in the feed may contain spaces for readability
        // (e.g. "Sport TV 1"); removing them matches the icon keys (e.g. "SportTV1").
        var channelNames = columns[2].replace(/ /g, "").split(' ');
        var teamNames = game.split(' x ');
        var key = date.substring(0, 5);

        return {
            game: game,
            date: date,
            teamNames: teamNames,
            channelNames: channelNames,
            key: key
        };
    }

    var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    var WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    var MATCH_DURATION_MS = 2 * 60 * 60 * 1000;
    var SOON_THRESHOLD_MS = 60 * 60 * 1000;

    // Parses an RSS pubDate such as "Fri, 13 Nov 2026 11:30:00" (no timezone,
    // Portuguese local time) into a Date. Returns null if it can't be parsed.
    function parseKickoff(pubDate) {
        var m = /(\d{1,2}) ([A-Za-z]{3}) (\d{4}) (\d{2}):(\d{2})/.exec(pubDate || '');
        if (!m || !(m[2].toLowerCase() in MONTHS)) {
            return null;
        }
        return new Date(+m[3], MONTHS[m[2].toLowerCase()], +m[1], +m[4], +m[5]);
    }

    // "upcoming" | "soon" (starts within the hour) | "live" (assumed to last
    // 2h) | "finished".
    function getMatchStatus(kickoff, now) {
        var diff = kickoff.getTime() - now.getTime();
        if (diff > SOON_THRESHOLD_MS) {
            return 'upcoming';
        }
        if (diff > 0) {
            return 'soon';
        }
        return -diff < MATCH_DURATION_MS ? 'live' : 'finished';
    }

    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }

    function dayKey(date) {
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    }

    // "Hoje", "Amanhã", "Ontem" or "Sábado 15/11".
    function getDayLabel(date, now) {
        var startOfDay = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
        var days = Math.round((startOfDay(date) - startOfDay(now)) / 86400000);
        if (days === 0) { return 'Hoje'; }
        if (days === 1) { return 'Amanhã'; }
        if (days === -1) { return 'Ontem'; }
        return WEEKDAYS[date.getDay()] + ' ' + pad(date.getDate()) + '/' + pad(date.getMonth() + 1);
    }

    var api = {
        EXCLUDED_CATEGORIES_REGEX: EXCLUDED_CATEGORIES_REGEX,
        parseMatchDescription: parseMatchDescription,
        parseKickoff: parseKickoff,
        getMatchStatus: getMatchStatus,
        dayKey: dayKey,
        getDayLabel: getDayLabel
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        global.MatchParser = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
