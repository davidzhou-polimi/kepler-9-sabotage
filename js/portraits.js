// Crew portraits: the group's pixel art, the same faces as on the printed crew cards, redrawn as true pixels
// by tools/portraits.py from the pictures in reference/portraits/ (76 x 95 cells, 6 px per cell, one palette).
// The report signatures show a square cut around the face.
const NAMES = ['hana', 'doyun', 'mira', 'echo'];

export const PORTRAIT_FILES = NAMES.map((n) => `img/crew/${n}.png`);

export function portrait(p, cls = '') {
  return `<img class="portrait ${cls}" src="img/crew/${p}.png" alt="" width="456" height="570" decoding="async">`;
}
