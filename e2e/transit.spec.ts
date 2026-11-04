import { createDate, expect, seedVenues, test } from './fixtures';

test('public-transport plan: transit ranking, station info and route links', async ({ page, consoleErrors }) => {
  void consoleErrors;
  await seedVenues(page);
  await createDate(page, { time: '15:00', hours: 3, transport: 'Transum', transit: 'MRT', start: 'Stasiun Uji Awal', end: 'Rumah Uji' });

  // The café with verified MRT access ranks first.
  await expect(page.locator('.timeline-item .venue-card-name').first()).toHaveText('Kafe Uji');
  await expect(page.locator('.timeline-item').first().locator('.transit-badge')).toContainText('Stasiun Uji Satu');

  const routes = await page.locator('.transition-row a').evaluateAll((as) =>
    as.map((a) => {
      const u = new URL((a as HTMLAnchorElement).href);
      return { path: u.origin + u.pathname, keys: [...u.searchParams.keys()], o: u.searchParams.get('origin'), d: u.searchParams.get('destination'), m: u.searchParams.get('travelmode'), target: (a as HTMLAnchorElement).target };
    }),
  );
  expect(routes).toHaveLength(3); // start → first, first → second, last → destination
  for (const r of routes) {
    expect(r.path).toBe('https://www.google.com/maps/dir/');
    expect(r.keys).toEqual(['api', 'origin', 'destination', 'travelmode']);
    expect(r.m).toBe('transit');
    expect(r.target).toBe('_blank');
  }
  expect(routes[0]).toMatchObject({ o: 'Stasiun Uji Awal', d: 'Kafe Uji, Jl. Uji Coba kafe-uji, Kota Uji' });
  expect(routes[2].d).toBe('Rumah Uji');
  // Fares are not estimated; buffers are labelled as such.
  await expect(page.locator('.transition-row').nth(1)).toContainText('cek rute di Maps');
  await expect(page.locator('.budget-details')).toContainText('Tarif transum nggak dihitung');
});
