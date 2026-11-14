import { describe, it, expect } from 'vitest';
import { parseMatchDescription, EXCLUDED_CATEGORIES_REGEX, parseKickoff, getMatchStatus, getDayLabel, dayKey } from './matchParser.js';

describe('parseMatchDescription', () => {
    it('parses a well-formed match description', () => {
        const result = parseMatchDescription('Benfica x Porto - 05/10 20:00 - Sport TV 1');

        expect(result).toEqual({
            game: 'Benfica x Porto',
            date: '05/10 20:00',
            teamNames: ['Benfica', 'Porto'],
            channelNames: ['SportTV1'],
            key: '05/10'
        });
    });

    it('normalizes channel names by removing internal spaces', () => {
        const result = parseMatchDescription('A x B - 06/10 18:00 - Sport TV 6');

        expect(result.channelNames).toEqual(['SportTV6']);
    });

    it('returns null when the description has fewer than 3 columns', () => {
        expect(parseMatchDescription('Benfica x Porto - 05/10 20:00')).toBeNull();
        expect(parseMatchDescription('Just one column')).toBeNull();
    });

    it.each([
        'UPVN (Futsal) x Torreense (Futsal) - 05/10 11:00 - Canal11',
        'UD Leiria (S23) x Santa Clara (S23) - 06/10 11:00 - C11 Stream',
        'Team A (Basket) x Team B (Basket) - 05/10 20:00 - SportTV1',
        'Team A x Team B (Voleibol) - 05/10 20:00 - SportTV1',
        'Team A x Team B (Hóquei) - 05/10 20:00 - SportTV1',
        'Team A x Team B (Andebol) - 05/10 20:00 - SportTV1',
        'Team A (Feminino) x Team B (Feminino) - 05/10 20:00 - SportTV1'
    ])('excludes non top-tier categories: %s', (description) => {
        expect(parseMatchDescription(description)).toBeNull();
    });

    it('does not exclude normal top-tier matches', () => {
        expect(parseMatchDescription('Chipre x Letónia - 05/10 17:00 - SportTV 1')).not.toBeNull();
    });

    it('exposes the regex used to filter excluded categories', () => {
        expect(EXCLUDED_CATEGORIES_REGEX.test('Futsal')).toBe(true);
        expect(EXCLUDED_CATEGORIES_REGEX.test('Liga')).toBe(false);
    });
});

describe('parseKickoff', () => {
    it('parses an RSS pubDate into a local Date', () => {
        const d = parseKickoff('Fri, 13 Nov 2026 11:30:00');
        expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 10, 13, 11, 30]);
    });

    it('returns null for invalid input', () => {
        expect(parseKickoff('')).toBeNull();
        expect(parseKickoff(undefined)).toBeNull();
        expect(parseKickoff('Fri, 13 Xxx 2026 11:30:00')).toBeNull();
    });
});

describe('getMatchStatus', () => {
    const now = new Date(2026, 10, 13, 12, 0);
    const at = (h, m) => new Date(2026, 10, 13, h, m);

    it.each([
        [at(15, 0), 'upcoming'],
        [at(12, 45), 'soon'],
        [at(12, 0), 'live'],
        [at(10, 30), 'live'],
        [at(9, 59), 'finished']
    ])('classifies kickoff %s as %s', (kickoff, status) => {
        expect(getMatchStatus(kickoff, now)).toBe(status);
    });
});

describe('getDayLabel / dayKey', () => {
    const now = new Date(2026, 10, 13, 12, 0);

    it('uses relative labels near today', () => {
        expect(getDayLabel(new Date(2026, 10, 13, 20, 0), now)).toBe('Hoje');
        expect(getDayLabel(new Date(2026, 10, 14, 1, 0), now)).toBe('Amanhã');
        expect(getDayLabel(new Date(2026, 10, 12, 23, 0), now)).toBe('Ontem');
    });

    it('uses weekday and date otherwise', () => {
        expect(getDayLabel(new Date(2026, 10, 15, 20, 0), now)).toBe('Domingo 15/11');
    });

    it('builds a sortable day key', () => {
        expect(dayKey(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05');
    });
});
