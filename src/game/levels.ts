import { BrickBlueprint, BrickColor, BrickType, LevelDefinition } from './types';

export const MINI_BRICK_W = 1.16;
export const MINI_BRICK_H = 0.64;
export const MINI_SPACING_X = 1.28;
export const MINI_SPACING_Y = 0.76;
export const MINI_START_Y = 5.05;

function createGridRow(
  rowIndex: number,
  y: number,
  items: Array<{
    col: number;
    type: BrickType;
    color: BrickColor;
    hp: number;
    width?: number;
  }>,
  totalCols: number = 8
): BrickBlueprint[] {
  const startX = -((totalCols - 1) * MINI_SPACING_X) / 2;
  return items.map((item) => ({
    row: rowIndex,
    col: item.col,
    x: Number((startX + item.col * MINI_SPACING_X).toFixed(2)),
    y: Number(y.toFixed(2)),
    width: item.width ?? MINI_BRICK_W,
    height: MINI_BRICK_H,
    type: item.type,
    color: item.color,
    hp: item.hp,
  }));
}

/**
 * Helper to generate a dense 8-column row from a compact pattern string of 8 tokens.
 * Tokens:
 * - 'B10', 'G20', 'P30', 'Y40', 'K50' (Pink=K, Purple=P, Blue=B, Green=G, Yellow=Y, Orange=O)
 * - 'H30' = Kawaii Happy (Yellow/Pink)
 * - 'W30' = Kawaii Wink (Yellow)
 * - 'L10' = Lightning
 * - 'M99' = Indestructible Metal
 * - '...' = Empty slot
 */
function buildRowFromPattern(rowIndex: number, tokens: string[]): BrickBlueprint[] {
  const y = MINI_START_Y - rowIndex * MINI_SPACING_Y;
  const items: Array<{
    col: number;
    type: BrickType;
    color: BrickColor;
    hp: number;
  }> = [];

  tokens.forEach((tok, col) => {
    const code = tok.trim();
    if (!code || code === '...') return;

    const prefix = code[0].toUpperCase();
    const hpVal = parseInt(code.slice(1), 10) || 20;

    if (prefix === 'L') {
      items.push({ col, type: 'lightning', color: 'lightning', hp: 10 });
    } else if (prefix === 'M') {
      items.push({ col, type: 'metal', color: 'metal', hp: 999 });
    } else if (prefix === 'H') {
      items.push({
        col,
        type: 'kawaii_happy',
        color: col % 2 === 0 ? 'pink' : 'yellow',
        hp: hpVal,
      });
    } else if (prefix === 'W') {
      items.push({
        col,
        type: 'kawaii_wink',
        color: col % 2 === 0 ? 'yellow' : 'pink',
        hp: hpVal,
      });
    } else {
      const colorMap: Record<string, BrickColor> = {
        K: 'pink',
        P: 'purple',
        B: 'blue',
        G: 'green',
        Y: 'yellow',
        O: 'orange',
      };
      items.push({
        col,
        type: 'numbered',
        color: colorMap[prefix] || 'blue',
        hp: hpVal,
      });
    }
  });

  return createGridRow(rowIndex, y, items, 8);
}

/**
 * LEVEL 7 HIGH-DENSITY MINI-BRICK MATRIX (7 rows × 8 columns = 50 mini-bricks)
 * Features an electric central breach with Kawaii bricks, lightning triggers, and 20–50 HP blocks.
 */
export const LEVEL_7_BRICKS: BrickBlueprint[] = [
  ...buildRowFromPattern(0, ['K50', 'Y40', 'G30', 'B30', 'B30', 'G30', 'P50', 'Y40']),
  ...buildRowFromPattern(1, ['B30', 'P20', 'K40', 'L10', 'L10', 'K50', 'P20', 'G30']),
  ...buildRowFromPattern(2, ['G20', 'H30', 'B30', '...', '...', 'P40', 'W30', 'Y30']),
  ...buildRowFromPattern(3, ['P40', 'B30', 'O20', '...', '...', 'O20', 'B30', 'P40']),
  ...buildRowFromPattern(4, ['W30', 'G50', 'K30', 'L10', 'P30', 'K30', 'G50', 'H30']),
  ...buildRowFromPattern(5, ['Y20', 'B20', 'P30', 'G20', 'G20', 'P30', 'B20', 'Y20']),
  ...buildRowFromPattern(6, ['K30', 'O20', '...', 'H20', 'W20', '...', 'O20', 'K30']),
];

export const CAMPAIGN_LEVELS: LevelDefinition[] = [
  {
    id: 1,
    name: 'NIVEAU 1',
    subtitle: 'Récifs de Coraux & Méduses Astrales (6 Rangées)',
    difficulty: 'Débutant',
    ballSpeed: 9.8,
    fixedObstacles: [{ x: 0, y: -2.2, kind: 'bumper' }],
    randomObstacleCount: 0,
    obstacleShiftMinSec: 14,
    obstacleShiftMaxSec: 20,
    initialLives: 3,
    bricks: [
      ...buildRowFromPattern(0, ['B20', 'G20', 'H20', 'K20', 'K20', 'W20', 'G20', 'B20']),
      ...buildRowFromPattern(1, ['G20', 'P20', 'Y20', 'B20', 'B20', 'Y20', 'P20', 'G20']),
      ...buildRowFromPattern(2, ['B10', 'K20', 'L10', 'G20', 'G20', 'L10', 'K20', 'B10']),
      ...buildRowFromPattern(3, ['Y10', 'G10', 'P20', 'H20', 'W20', 'P20', 'G10', 'Y10']),
      ...buildRowFromPattern(4, ['B10', 'O10', 'G10', 'B10', 'B10', 'G10', 'O10', 'B10']),
      ...buildRowFromPattern(5, ['...', 'G10', 'B10', 'Y10', 'Y10', 'B10', 'G10', '...']),
    ],
  },
  {
    id: 2,
    name: 'NIVEAU 2',
    subtitle: 'Pulsar à Rayons Néon & Couronne (6 Rangées)',
    difficulty: 'Débutant',
    ballSpeed: 10.25,
    fixedObstacles: [
      { x: -2.3, y: -2.1, kind: 'prism' },
      { x: 2.3, y: -2.1, kind: 'prism' },
    ],
    randomObstacleCount: 0,
    obstacleShiftMinSec: 12,
    obstacleShiftMaxSec: 20,
    initialLives: 3,
    bricks: [
      ...buildRowFromPattern(0, ['K30', 'Y20', 'P20', 'B20', 'B20', 'P20', 'Y20', 'K30']),
      ...buildRowFromPattern(1, ['B20', 'H20', 'G20', 'L10', 'L10', 'G20', 'W20', 'B20']),
      ...buildRowFromPattern(2, ['P20', 'O20', 'K20', 'Y20', 'Y20', 'K20', 'O20', 'P20']),
      ...buildRowFromPattern(3, ['G20', 'B20', 'P20', '...', '...', 'P20', 'B20', 'G20']),
      ...buildRowFromPattern(4, ['Y20', 'G10', 'O20', 'B20', 'B20', 'O20', 'G10', 'Y20']),
      ...buildRowFromPattern(5, ['B10', 'P10', 'G10', 'H20', 'W20', 'G10', 'P10', 'B10']),
    ],
  },
  {
    id: 3,
    name: 'NIVEAU 3',
    subtitle: 'Lune Fracturée au Cœur de Lave (6 Rangées)',
    difficulty: 'Débutant',
    ballSpeed: 10.65,
    fixedObstacles: [{ x: 0, y: -1.95, kind: 'prism' }],
    randomObstacleCount: 1,
    obstacleShiftMinSec: 12,
    obstacleShiftMaxSec: 19,
    initialLives: 3,
    bricks: [
      ...buildRowFromPattern(0, ['P30', 'K30', 'H20', 'Y30', 'Y30', 'W20', 'K30', 'P30']),
      ...buildRowFromPattern(1, ['G20', 'B20', 'P30', 'K30', 'K30', 'P30', 'B20', 'G20']),
      ...buildRowFromPattern(2, ['O20', 'L10', 'G20', 'B20', 'B20', 'G20', 'L10', 'O20']),
      ...buildRowFromPattern(3, ['B20', 'Y20', 'O20', 'P20', 'P20', 'O20', 'Y20', 'B20']),
      ...buildRowFromPattern(4, ['G20', 'K20', 'B20', 'G20', 'G20', 'B20', 'K20', 'G20']),
      ...buildRowFromPattern(5, ['...', 'B20', 'H20', 'O20', 'O20', 'W20', 'B20', '...']),
    ],
  },
  {
    id: 4,
    name: 'NIVEAU 4',
    subtitle: 'Trou Noir à Disque d’Accrétion (6 Rangées)',
    difficulty: 'Débutant',
    ballSpeed: 10.95,
    fixedObstacles: [{ x: 0, y: -2.25, kind: 'vortex' }],
    randomObstacleCount: 1,
    obstacleShiftMinSec: 11,
    obstacleShiftMaxSec: 18,
    initialLives: 3,
    bricks: [
      ...buildRowFromPattern(0, ['P30', 'B30', 'K30', 'L10', 'L10', 'K30', 'B30', 'P30']),
      ...buildRowFromPattern(1, ['G20', 'K30', 'P30', 'Y20', 'Y20', 'P30', 'K30', 'G20']),
      ...buildRowFromPattern(2, ['H20', 'O20', 'B20', '...', '...', 'B20', 'O20', 'W20']),
      ...buildRowFromPattern(3, ['B20', 'P30', 'G20', '...', '...', 'G20', 'P30', 'B20']),
      ...buildRowFromPattern(4, ['Y20', 'G20', 'K20', 'O20', 'O20', 'K20', 'G20', 'Y20']),
      ...buildRowFromPattern(5, ['P20', 'B20', 'Y20', 'G20', 'G20', 'Y20', 'B20', 'P20']),
    ],
  },
  {
    id: 5,
    name: 'NIVEAU 5',
    subtitle: 'Géode d’Améthyste & Satellites (7 Rangées)',
    difficulty: 'Débutant',
    ballSpeed: 11.2,
    fixedObstacles: [
      { x: -2.6, y: -1.95, kind: 'bumper' },
      { x: 2.6, y: -2.35, kind: 'prism' },
    ],
    randomObstacleCount: 1,
    obstacleShiftMinSec: 10,
    obstacleShiftMaxSec: 18,
    initialLives: 3,
    bricks: [
      ...buildRowFromPattern(0, ['K40', 'Y30', 'G30', 'P30', 'P30', 'G30', 'Y30', 'K40']),
      ...buildRowFromPattern(1, ['P30', 'H30', 'L10', 'B30', 'B30', 'L10', 'W30', 'P30']),
      ...buildRowFromPattern(2, ['B20', 'O20', 'K30', 'Y30', 'Y30', 'K30', 'O20', 'B20']),
      ...buildRowFromPattern(3, ['G20', 'P30', 'B20', 'G20', 'G20', 'B20', 'P30', 'G20']),
      ...buildRowFromPattern(4, ['Y20', 'B20', 'O20', 'K20', 'K20', 'O20', 'B20', 'Y20']),
      ...buildRowFromPattern(5, ['P20', 'G20', 'H20', 'B20', 'B20', 'W20', 'G20', 'P20']),
      ...buildRowFromPattern(6, ['...', 'Y20', 'P20', 'G20', 'G20', 'P20', 'Y20', '...']),
    ],
  },
  {
    id: 6,
    name: 'NIVEAU 6',
    subtitle: 'Orage Magnétique & Mines Stellaires (7 Rangées)',
    difficulty: 'Intermédiaire',
    ballSpeed: 11.45,
    fixedObstacles: [{ x: 0, y: -2.0, kind: 'bumper' }],
    randomObstacleCount: 2,
    obstacleShiftMinSec: 10,
    obstacleShiftMaxSec: 18,
    initialLives: 3,
    bricks: [
      ...buildRowFromPattern(0, ['P40', 'K40', 'Y30', 'B30', 'B30', 'Y30', 'K40', 'P40']),
      ...buildRowFromPattern(1, ['B30', 'L10', 'H30', 'P30', 'P30', 'W30', 'L10', 'B30']),
      ...buildRowFromPattern(2, ['G30', 'P40', 'K30', 'O30', 'O30', 'K30', 'P40', 'G30']),
      ...buildRowFromPattern(3, ['Y20', 'G30', 'O30', '...', '...', 'O30', 'G30', 'Y20']),
      ...buildRowFromPattern(4, ['P30', 'B30', 'Y20', 'G20', 'G20', 'Y20', 'B30', 'P30']),
      ...buildRowFromPattern(5, ['K30', 'O20', 'B20', 'P20', 'P20', 'B20', 'O20', 'K30']),
      ...buildRowFromPattern(6, ['...', 'G20', 'Y20', 'H20', 'W20', 'Y20', 'G20', '...']),
    ],
  },
  {
    id: 7,
    name: 'NIVEAU 7',
    subtitle: 'Aurores Galactiques & Anneaux (7 Rangées)',
    difficulty: 'Intermédiaire',
    ballSpeed: 11.65,
    fixedObstacles: [{ x: -2.4, y: -2.05, kind: 'bumper' }],
    randomObstacleCount: 2,
    obstacleShiftMinSec: 10,
    obstacleShiftMaxSec: 18,
    initialScore: 640,
    initialMultiplier: 2,
    initialLives: 3,
    initialProgressBonus: 0.52,
    autoTriggerCenterBurst: true,
    bricks: LEVEL_7_BRICKS,
  },
  {
    id: 8,
    name: 'NIVEAU 8',
    subtitle: 'Étoiles Binaires en Fusion (7 Rangées)',
    difficulty: 'Intermédiaire',
    ballSpeed: 11.95,
    fixedObstacles: [
      { x: -1.9, y: -2.0, kind: 'prism' },
      { x: 1.9, y: -2.0, kind: 'vortex' },
    ],
    randomObstacleCount: 2,
    obstacleShiftMinSec: 10,
    obstacleShiftMaxSec: 17,
    initialLives: 3,
    bricks: [
      ...buildRowFromPattern(0, ['K50', 'P40', 'L10', 'B40', 'B40', 'L10', 'P40', 'K50']),
      ...buildRowFromPattern(1, ['H30', 'B40', 'Y40', 'K40', 'K40', 'Y40', 'B40', 'W30']),
      ...buildRowFromPattern(2, ['G40', 'K50', 'O30', 'P30', 'P30', 'O30', 'K50', 'G40']),
      ...buildRowFromPattern(3, ['P40', 'G30', 'B30', 'Y30', 'Y30', 'B30', 'G30', 'P40']),
      ...buildRowFromPattern(4, ['Y30', 'O30', 'K30', 'G30', 'G30', 'K30', 'O30', 'Y30']),
      ...buildRowFromPattern(5, ['B30', 'P30', 'H30', 'B20', 'B20', 'W30', 'P30', 'B30']),
      ...buildRowFromPattern(6, ['G20', 'Y20', 'O20', 'K30', 'K30', 'O20', 'Y20', 'G20']),
    ],
  },
  {
    id: 9,
    name: 'NIVEAU 9',
    subtitle: 'Monolithes & Portail Warp (7 Rangées)',
    difficulty: 'Avancé',
    ballSpeed: 12.25,
    fixedObstacles: [{ x: 0, y: -2.0, kind: 'vortex' }],
    randomObstacleCount: 3,
    obstacleShiftMinSec: 10,
    obstacleShiftMaxSec: 16,
    descendingIntervalSec: 16,
    initialLives: 3,
    bricks: [
      ...buildRowFromPattern(0, ['K50', 'Y50', 'H40', 'P40', 'P40', 'W40', 'Y50', 'K50']),
      ...buildRowFromPattern(1, ['P40', 'L10', 'B50', 'K40', 'K40', 'B50', 'L10', 'P40']),
      ...buildRowFromPattern(2, ['G40', 'M99', 'O40', 'Y30', 'Y30', 'O40', 'M99', 'G40']),
      ...buildRowFromPattern(3, ['B30', 'K40', 'P30', 'G30', 'G30', 'P30', 'K40', 'B30']),
      ...buildRowFromPattern(4, ['Y30', 'O30', 'B30', 'L10', 'L10', 'B30', 'O30', 'Y30']),
      ...buildRowFromPattern(5, ['P30', 'G30', 'K30', 'B30', 'B30', 'K30', 'G30', 'P30']),
      ...buildRowFromPattern(6, ['H30', 'B20', 'Y20', 'O20', 'O20', 'Y20', 'B20', 'W30']),
    ],
  },
  {
    id: 10,
    name: 'NIVEAU 10',
    subtitle: 'Soleil Synthwave & Comètes (8 Rangées)',
    difficulty: 'Avancé',
    ballSpeed: 12.6,
    fixedObstacles: [
      { x: -2.7, y: -2.05, kind: 'bumper' },
      { x: 2.7, y: -2.05, kind: 'bumper' },
    ],
    randomObstacleCount: 3,
    obstacleShiftMinSec: 10,
    obstacleShiftMaxSec: 16,
    descendingIntervalSec: 15,
    initialLives: 3,
    bricks: [
      ...buildRowFromPattern(0, ['K50', 'P50', 'L10', 'Y40', 'Y40', 'L10', 'P50', 'K50']),
      ...buildRowFromPattern(1, ['H40', 'B50', 'M99', 'K40', 'K40', 'M99', 'B50', 'W40']),
      ...buildRowFromPattern(2, ['O40', 'G50', 'P40', 'B30', 'B30', 'P40', 'G50', 'O40']),
      ...buildRowFromPattern(3, ['Y30', 'K40', 'B30', 'G30', 'G30', 'B30', 'K40', 'Y30']),
      ...buildRowFromPattern(4, ['P30', 'B30', 'O30', 'L10', 'L10', 'O30', 'B30', 'P30']),
      ...buildRowFromPattern(5, ['G30', 'Y30', 'K30', 'P30', 'P30', 'K30', 'Y30', 'G30']),
      ...buildRowFromPattern(6, ['B20', 'H30', 'G20', 'O20', 'O20', 'G20', 'W30', 'B20']),
      ...buildRowFromPattern(7, ['...', 'K30', 'B20', 'Y20', 'Y20', 'B20', 'K30', '...']),
    ],
  },
  {
    id: 11,
    name: 'NIVEAU 11',
    subtitle: 'Arbre-Monde Cristallin & Phénix (8 Rangées)',
    difficulty: 'Avancé',
    ballSpeed: 12.95,
    fixedObstacles: [
      { x: -2.2, y: -2.1, kind: 'prism' },
      { x: 2.2, y: -2.1, kind: 'prism' },
    ],
    randomObstacleCount: 3,
    obstacleShiftMinSec: 10,
    obstacleShiftMaxSec: 15,
    descendingIntervalSec: 14,
    initialLives: 3,
    bricks: [
      ...buildRowFromPattern(0, ['L10', 'K50', 'Y50', 'P50', 'P50', 'Y50', 'K50', 'L10']),
      ...buildRowFromPattern(1, ['P50', 'M99', 'H50', 'B40', 'B40', 'W50', 'M99', 'P50']),
      ...buildRowFromPattern(2, ['G50', 'B50', 'O40', 'K40', 'K40', 'O40', 'B50', 'G50']),
      ...buildRowFromPattern(3, ['K40', 'P40', 'Y30', 'G30', 'G30', 'Y30', 'P40', 'K40']),
      ...buildRowFromPattern(4, ['B30', 'G30', 'L10', 'O30', 'O30', 'L10', 'G30', 'B30']),
      ...buildRowFromPattern(5, ['Y30', 'O30', 'P30', 'B30', 'B30', 'P30', 'O30', 'Y30']),
      ...buildRowFromPattern(6, ['G20', 'K30', 'H30', 'Y20', 'Y20', 'W30', 'K30', 'G20']),
      ...buildRowFromPattern(7, ['B20', 'P20', 'G20', 'O20', 'O20', 'G20', 'P20', 'B20']),
    ],
  },
  {
    id: 12,
    name: 'NIVEAU 12',
    subtitle: 'Sanctuaire du Roi Cosmique (8 Rangées)',
    difficulty: 'Avancé',
    ballSpeed: 13.35,
    fixedObstacles: [
      { x: -2.8, y: -1.95, kind: 'bumper' },
      { x: 0, y: -2.3, kind: 'vortex' },
      { x: 2.8, y: -1.95, kind: 'bumper' },
    ],
    randomObstacleCount: 3,
    obstacleShiftMinSec: 10,
    obstacleShiftMaxSec: 15,
    descendingIntervalSec: 13,
    initialLives: 3,
    bricks: [
      ...buildRowFromPattern(0, ['K50', 'H50', 'L10', 'P50', 'P50', 'L10', 'W50', 'K50']),
      ...buildRowFromPattern(1, ['P50', 'B50', 'K50', 'Y50', 'Y50', 'K50', 'B50', 'P50']),
      ...buildRowFromPattern(2, ['M99', 'G50', 'O50', 'B40', 'B40', 'O50', 'G50', 'M99']),
      ...buildRowFromPattern(3, ['Y50', 'K50', 'P40', 'G40', 'G40', 'P40', 'K50', 'Y50']),
      ...buildRowFromPattern(4, ['B40', 'O40', 'L10', 'H40', 'W40', 'L10', 'O40', 'B40']),
      ...buildRowFromPattern(5, ['G40', 'P40', 'Y30', 'K40', 'K40', 'Y30', 'P40', 'G40']),
      ...buildRowFromPattern(6, ['K30', 'B30', 'G30', 'O30', 'O30', 'G30', 'B30', 'K30']),
      ...buildRowFromPattern(7, ['Y30', 'P30', 'B30', 'G30', 'G30', 'B30', 'P30', 'Y30']),
    ],
  },
];

export function getLevelById(id: number): LevelDefinition {
  return CAMPAIGN_LEVELS.find((lvl) => lvl.id === id) || CAMPAIGN_LEVELS[6];
}
