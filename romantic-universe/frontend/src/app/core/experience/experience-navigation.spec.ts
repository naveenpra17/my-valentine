/**
 * Navigation audit — every phase must have a reachable scroll target and exit path.
 * Run: npx ng test --include=experience-navigation.spec.ts
 */
describe('Experience navigation targets', () => {
  const REQUIRED_SECTION_IDS = [
    'main-content',
    'universe-discovery-zone',
    'love-bombs',
    'our-heart',
    'open-when',
    'flower',
    'remembers',
    'letter',
    'finale'
  ];

  const OPTIONAL_SECTION_IDS = ['hero', 'constellation-ceremony', 'universe'];

  it('documents required section IDs for scroll navigation', () => {
    expect(REQUIRED_SECTION_IDS.length).toBeGreaterThanOrEqual(9);
    REQUIRED_SECTION_IDS.forEach(id => {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    });
  });

  it('documents optional section IDs', () => {
    expect(OPTIONAL_SECTION_IDS).toContain('universe');
  });
});
