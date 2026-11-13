/** SmartHerd mark on a 100×100 grid: a goat's head (front view) above a measured dimension line. */
export const MARK = {
  head: 'M50 33 C58.5 33 62.5 40 61.5 50 C60.5 60 55.5 69.5 50 72 C44.5 69.5 39.5 60 38.5 50 C37.5 40 41.5 33 50 33 Z',
  hornL: 'M45.5 35.5 C41 25 34 18.5 24.5 17.5 C31.5 22 36.5 29 40.5 38.5 Z',
  hornR: 'M54.5 35.5 C59 25 66 18.5 75.5 17.5 C68.5 22 63.5 29 59.5 38.5 Z',
  earL: 'M40 44.5 C33 43 27.5 45 23 49.5 C29.5 51 35 50.5 40.2 49 Z',
  earR: 'M60 44.5 C67 43 72.5 45 77 49.5 C70.5 51 65 50.5 59.8 49 Z',
  // dimension line with end ticks, drawn as strokes
  rule: 'M29 81 H71',
  tickL: 'M29 76.5 V85.5',
  tickR: 'M71 76.5 V85.5',
} as const;
