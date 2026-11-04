import { describe, expect, it } from 'vitest';
import { buildDirectionsUrl, buildSearchUrl, isGoogleMapsUrl, listingUrl, mapsQuery } from './maps';

const venue = {
  name: 'Kafe & Resto "Senja"',
  address: 'Jl. Contoh No. 12/3, RT 01/RW 02',
  district: 'Kebayoran Baru',
  city: 'Jakarta Selatan',
};

describe('mapsQuery', () => {
  it('joins name, address, district and city', () => {
    expect(mapsQuery(venue)).toBe(
      'Kafe & Resto "Senja", Jl. Contoh No. 12/3, RT 01/RW 02, Kebayoran Baru, Jakarta Selatan',
    );
  });

  it('skips blanks and parts already in the address', () => {
    expect(mapsQuery({ name: 'Taman X', address: 'Jl. Y, Bandung', city: 'bandung', district: ' ' })).toBe(
      'Taman X, Jl. Y, Bandung',
    );
  });
});

describe('Google Maps URLs', () => {
  it('builds a correctly encoded search URL', () => {
    const url = buildSearchUrl(venue);
    expect(url.startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true);
    // Reserved characters must be percent-encoded so they cannot break the query string.
    expect(url).toContain('Kafe%20%26%20Resto%20%22Senja%22');
    expect(url).toContain('No.%2012%2F3');
    const rawQuery = url.split('&query=')[1];
    expect(rawQuery).not.toMatch(/[ "&#?/]/);
    expect(new URL(url).searchParams.get('query')).toBe(mapsQuery(venue));
    expect(new URL(url).searchParams.get('api')).toBe('1');
  });

  it('builds a correctly encoded directions URL', () => {
    const url = buildDirectionsUrl(venue);
    expect(url.startsWith('https://www.google.com/maps/dir/?api=1&destination=')).toBe(true);
    expect(new URL(url).searchParams.get('destination')).toBe(mapsQuery(venue));
    expect([...new URL(url).searchParams.keys()]).toEqual(['api', 'destination']);
  });

  it('encodes non-ASCII and hash characters', () => {
    const url = buildSearchUrl({ name: 'Café #1', address: 'Jl. Ñ', city: 'Yogyakarta' });
    expect(url).toContain('Caf%C3%A9%20%231');
    expect(new URL(url).hash).toBe('');
  });
});

describe('isGoogleMapsUrl', () => {
  it.each([
    'https://maps.app.goo.gl/AbCdEf123',
    'https://www.google.com/maps/place/Some+Place/@-6.2,106.8,17z',
    'https://google.com/maps?cid=123',
    'https://www.google.co.id/maps/place/X',
    'https://maps.google.com/?cid=123',
    'https://goo.gl/maps/abc',
  ])('accepts %s', (u) => expect(isGoogleMapsUrl(u)).toBe(true));

  it.each([
    '',
    'not a url',
    'http://www.google.com/maps/place/X', // not https
    'https://www.google.com/search?q=x',
    'https://www.google.com/mapsfake',
    'https://evil.example/maps/place/X',
    'https://google.com.evil.example/maps',
    'https://maps.app.goo.gl/',
    'javascript:alert(1)',
  ])('rejects %s', (u) => expect(isGoogleMapsUrl(u)).toBe(false));

  it('listingUrl returns null without a valid listing', () => {
    expect(listingUrl({ googleMapsUrl: '' })).toBeNull();
    expect(listingUrl({ googleMapsUrl: ' https://maps.app.goo.gl/x ' })).toBe('https://maps.app.goo.gl/x');
  });
});
