// Pixel-art portrait placeholders, 16×16. k = ink, c = accent (cyan), g = mid tone, . = background.
// Drawn as ink on a light panel, like an ID card.

const ART = {
  hana: [
    '................',
    '.....kkkkkk.....',
    '...kkkkkkkkkk...',
    '..kkkkkkkkkkkk..',
    '..kkkkkkkkkkkk..',
    '..kkk......kkk..',
    '..kk........kk..',
    '..kk.kk..kk.kk..',
    '..kk........kk..',
    '..kk........kk..',
    '..kk...kkk..kk..',
    '..kkk......kkk..',
    '..kk.kkkkkk.kk..',
    '......k..k......',
    '..kkkkc..ckkkk..',
    '.kkkkkkkkkkkkkk.',
  ],
  doyun: [
    '................',
    '...k..k..k..k...',
    '..kkkkkkkkkkkk..',
    '..kkkkkkkkkkkk..',
    '..kcckkkkkkcck..',
    '..kcck....kcck..',
    '..k..........k..',
    '..k.kk....kk.k..',
    '..k..........k..',
    '..k..........k..',
    '..k...kkkk...k..',
    '..k..........k..',
    '...kk......kk...',
    '.....kkkkkk.....',
    '..gggk....kggg..',
    '.gggggggggggggg.',
  ],
  mira: [
    '................',
    '....kk.kk.kk....',
    '..kkkkkkkkkkkk..',
    '.kkkkkkkkkkkkkk.',
    '.kkkk......kkkk.',
    '.kkk........kkk.',
    '.kk..........kk.',
    '.kk.kk....kk.kk.',
    '.kk..........kk.',
    'kkk..........kkk',
    'kkk...k..k...kkk',
    'kkkk...kk...kkkk',
    'kk.kk......kk.kk',
    'kk...kkkkkk...kk',
    '..kkkkk.c.kkkk..',
    '.kkkkkkcccckkkk.',
  ],
  echo: [
    '.......kk.......',
    '.......cc.......',
    '.......kk.......',
    '...kkkkkkkkkk...',
    '..k..........k..',
    '..k.kkkkkkkk.k..',
    'kkk.kcckkcck.kkk',
    'k.k.kcckkcck.k.k',
    'kkk.kkkkkkkk.kkk',
    '..k..........k..',
    '..k..k.k.k...k..',
    '..k..........k..',
    '...kkkkkkkkkk...',
    '.....k.kk.k.....',
    '..ggggkkkkgggg..',
    '.gggggggggggggg.',
  ],
};

const FILL = { k: 'var(--ink)', c: 'var(--cyan-ink)', g: 'var(--mid)' };

export function portraitSvg(p, cls = '') {
  const rows = ART[p];
  let rects = '';
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (FILL[ch]) rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${FILL[ch]}"/>`;
    });
  });
  return `<svg class="portrait ${cls}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

export const PORTRAIT_ROWS = ART;
