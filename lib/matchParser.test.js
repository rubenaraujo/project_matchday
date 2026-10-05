import { describe, it, expect } from 'vitest';
import { parseMatchDescription, EXCLUDED_CATEGORIES_REGEX } from './matchParser.js';

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
