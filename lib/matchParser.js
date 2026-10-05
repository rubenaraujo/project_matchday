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

    var api = {
        EXCLUDED_CATEGORIES_REGEX: EXCLUDED_CATEGORIES_REGEX,
        parseMatchDescription: parseMatchDescription
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        global.MatchParser = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
