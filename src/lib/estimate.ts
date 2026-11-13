export type GrowthStage = 'young' | 'grower' | 'adult';

export const STAGES: GrowthStage[] = ['young', 'grower', 'adult'];

export type Measurements = {
  bodyLength: number; // cm
  chestHeight: number; // cm
  chestWidth: number; // cm
  heartGirth: number; // cm
};

/** Weight the cooperative treats as ready for sale. */
export const SALE_WEIGHT_KG = 30;

/** Ramanujan's ellipse perimeter, with chest height and width as the two diameters. */
export function heartGirth(chestHeight: number, chestWidth: number) {
  const a = chestHeight / 2;
  const b = chestWidth / 2;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

/** Schaeffer's formula, cm in, kg out. */
export function schaeffer(heartGirthCm: number, bodyLengthCm: number) {
  return (heartGirthCm ** 2 * bodyLengthCm) / 10840;
}

// shortcut: the YOLO + Huber pipeline is simulated with plausible per-stage ranges; swap for the model server when it exists.
const RANGES: Record<GrowthStage, { bl: [number, number]; ch: [number, number]; cw: [number, number] }> = {
  young: { bl: [40, 50], ch: [20, 25], cw: [11, 14] },
  grower: { bl: [52, 62], ch: [25, 30], cw: [14, 17] },
  adult: { bl: [62, 72], ch: [29, 34], cw: [17, 21] },
};

const pick = ([min, max]: [number, number]) => min + Math.random() * (max - min);
const round1 = (n: number) => Math.round(n * 10) / 10;

export function simulateEstimate(stage: GrowthStage): Measurements & { weight: number } {
  const r = RANGES[stage];
  const bodyLength = round1(pick(r.bl));
  const chestHeight = round1(pick(r.ch));
  const chestWidth = round1(pick(r.cw));
  const girth = round1(heartGirth(chestHeight, chestWidth));
  return {
    bodyLength,
    chestHeight,
    chestWidth,
    heartGirth: girth,
    weight: round1(schaeffer(girth, bodyLength)),
  };
}

if (__DEV__) {
  // self-check: a circle's perimeter is exact, and the formula's units line up
  console.assert(Math.abs(heartGirth(20, 20) - Math.PI * 20) < 1e-9, 'heartGirth circle');
  console.assert(Math.abs(schaeffer(104.11, 100) - 100) < 0.01, 'schaeffer');
}
