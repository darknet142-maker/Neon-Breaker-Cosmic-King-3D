import {
  BrickBlueprint,
  ClashVictoryEntry,
  FixedObstacleBlueprint,
  HallOfFameEntry,
  LevelDefinition,
  RivalCommunityLevel,
  RivalDraftLevel,
  UserProfileData,
} from './types';

/**
 * Strict creation quotas to force tactical creativity and prevent "all 50 HP" brick spam:
 * - Max 16 bricks total on the 24-cell grid
 * - Max 420 global HP budget (a 50 HP brick costs 50, a Metal brick costs 45 tactical points)
 */
export const RIVAL_EDITOR_LIMITS = {
  maxTotalBricks: 34,
  minTotalBricks: 12,
  maxHpBudget: 880,
  metalBrickBudgetCost: 45,
  maxMetalBricks: 4,
  maxLightningBricks: 3,
  maxFixedObstacles: 3,
  maxRandomObstacles: 3,
  minBallSpeed: 9.8,
  maxBallSpeed: 13.5,
  editCooldownDays: 30,
};

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const FIXED_OBSTACLE_PRESETS: FixedObstacleBlueprint[][] = [
  [],
  [{ x: 0, y: -2.05, kind: 'bumper' }],
  [
    { x: -2.2, y: -2.0, kind: 'prism' },
    { x: 2.2, y: -2.0, kind: 'prism' },
  ],
  [
    { x: -2.5, y: -1.95, kind: 'bumper' },
    { x: 0, y: -2.25, kind: 'vortex' },
    { x: 2.5, y: -1.95, kind: 'bumper' },
  ],
];

export const AVATAR_BADGE_OPTIONS = ['👑', '🦊', '🚀', '⚡', '🐉', '💎', '🔥', '🛸'];

export const TITLE_BADGE_OPTIONS = [
  'Architecte Néon',
  'Briseur de Rivaux',
  'Empereur Cosmique',
  'Chasseur de Couronnes',
  'Maître du Vortex',
  'Stratège Quantique',
];

/**
 * Computes the HP budget consumed by a set of mini-bricks (out of RIVAL_EDITOR_LIMITS.maxHpBudget = 880).
 */
export function calculateBricksHpBudget(bricks: BrickBlueprint[]): number {
  return bricks.reduce((acc, b) => {
    if (b.type === 'metal') return acc + RIVAL_EDITOR_LIMITS.metalBrickBudgetCost;
    if (b.type === 'lightning') return acc + 15;
    return acc + b.hp;
  }, 0);
}

/**
 * Automatic Complexity Index Calculator (1 to 100)
 * Evaluates total brick HP, metal obstacles, fixed deflectors, random 10-20s deflectors, and ball speed.
 */
export function calculateLevelComplexity(params: {
  bricks: BrickBlueprint[];
  fixedObstacles: FixedObstacleBlueprint[];
  randomObstacleCount: number;
  ballSpeed: number;
}): number {
  let destructibleHpSum = 0;
  let metalCount = 0;
  let lightningCount = 0;

  params.bricks.forEach((b) => {
    if (b.type === 'metal') {
      metalCount++;
    } else if (b.type === 'lightning') {
      lightningCount++;
      destructibleHpSum += 10;
    } else {
      destructibleHpSum += b.hp;
    }
  });

  const hpScore = Math.min(48, destructibleHpSum / 18.5);
  const metalScore = metalCount * 5.5;
  const fixedObsScore = params.fixedObstacles.length * 6.5;
  const randomObsScore = params.randomObstacleCount * 9.5;
  const speedScore = Math.max(0, (params.ballSpeed - 9.5) * 6.5);
  const helperDiscount = lightningCount * 2.0;

  const raw = hpScore + metalScore + fixedObsScore + randomObsScore + speedScore - helperDiscount;
  return Math.round(Math.max(5, Math.min(100, raw)));
}

export function getComplexityLabel(score: number): {
  tier: string;
  color: string;
} {
  if (score < 30) return { tier: 'Accessible', color: '#10E84A' };
  if (score < 55) return { tier: 'Tactique', color: '#38BDF8' };
  if (score < 78) return { tier: 'Redoutable', color: '#FFB800' };
  return { tier: 'Extrême', color: '#FF1668' };
}

export function gridSlotToWorld(row: number, col: number): { x: number; y: number } {
  const spacingX = 1.28;
  const startX = -((8 - 1) * spacingX) / 2;
  const startY = 5.05;
  const spacingY = 0.76;
  return {
    x: Number((startX + col * spacingX).toFixed(2)),
    y: Number((startY - row * spacingY).toFixed(2)),
  };
}

function makeMiniRivalBricks(
  rows: Array<
    Array<{
      col: number;
      type: BrickBlueprint['type'];
      color: BrickBlueprint['color'];
      hp: number;
    }>
  >
): BrickBlueprint[] {
  const result: BrickBlueprint[] = [];
  rows.forEach((rItems, rowIdx) => {
    rItems.forEach((item) => {
      const pos = gridSlotToWorld(rowIdx, item.col);
      result.push({
        row: rowIdx,
        col: item.col,
        x: pos.x,
        y: pos.y,
        width: 1.16,
        height: 0.64,
        type: item.type,
        color: item.color,
        hp: item.hp,
      });
    });
  });
  return result;
}

// ============================================================================
// 1. USER PROFILE HQ STORAGE ("Se sentir chez soi et tout orchestrer")
// ============================================================================
const USER_PROFILE_KEY = 'neon_breaker_user_profile_v2';

export function getUserProfile(): UserProfileData {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (raw) {
      return JSON.parse(raw) as UserProfileData;
    }
  } catch {
    // ignore
  }
  const initial: UserProfileData = {
    handle: '@RoiCosmique',
    avatarBadge: '👑',
    titleBadge: 'Architecte Néon',
    joinedAt: Date.now() - 86400000 * 5,
    totalBricksBroken: 142,
    totalGamesPlayed: 6,
  };
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(initial));
  return initial;
}

export function saveUserProfile(profile: UserProfileData): void {
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

export function incrementProfileStats(bricksBrokenDelta: number, gamesDelta: number = 0): void {
  const prof = getUserProfile();
  prof.totalBricksBroken += bricksBrokenDelta;
  prof.totalGamesPlayed += gamesDelta;
  saveUserProfile(prof);
}

// ============================================================================
// 2. INSTANT AUTO-SAVED DRAFT STORAGE (Saved even 2 seconds after creation!)
// ============================================================================
const RIVAL_DRAFT_KEY = 'neon_breaker_rival_draft_v3';

export function getDefaultDraftBricks(): BrickBlueprint[] {
  return makeMiniRivalBricks([
    [
      { col: 1, type: 'numbered', color: 'pink', hp: 40 },
      { col: 2, type: 'numbered', color: 'purple', hp: 30 },
      { col: 3, type: 'kawaii_happy', color: 'yellow', hp: 30 },
      { col: 4, type: 'kawaii_wink', color: 'pink', hp: 30 },
      { col: 5, type: 'numbered', color: 'purple', hp: 30 },
      { col: 6, type: 'numbered', color: 'pink', hp: 40 },
    ],
    [
      { col: 0, type: 'numbered', color: 'blue', hp: 20 },
      { col: 1, type: 'numbered', color: 'green', hp: 20 },
      { col: 2, type: 'lightning', color: 'lightning', hp: 10 },
      { col: 5, type: 'lightning', color: 'lightning', hp: 10 },
      { col: 6, type: 'numbered', color: 'green', hp: 20 },
      { col: 7, type: 'numbered', color: 'blue', hp: 20 },
    ],
    [
      { col: 1, type: 'numbered', color: 'yellow', hp: 30 },
      { col: 2, type: 'numbered', color: 'blue', hp: 20 },
      { col: 3, type: 'numbered', color: 'purple', hp: 30 },
      { col: 4, type: 'numbered', color: 'purple', hp: 30 },
      { col: 5, type: 'numbered', color: 'blue', hp: 20 },
      { col: 6, type: 'numbered', color: 'yellow', hp: 30 },
    ],
    [
      { col: 2, type: 'numbered', color: 'green', hp: 20 },
      { col: 3, type: 'numbered', color: 'orange', hp: 20 },
      { col: 4, type: 'numbered', color: 'orange', hp: 20 },
      { col: 5, type: 'numbered', color: 'green', hp: 20 },
    ],
    [
      { col: 1, type: 'numbered', color: 'blue', hp: 20 },
      { col: 3, type: 'kawaii_happy', color: 'pink', hp: 20 },
      { col: 4, type: 'kawaii_wink', color: 'yellow', hp: 20 },
      { col: 6, type: 'numbered', color: 'blue', hp: 20 },
    ],
  ]);
}

export function getRivalDraftLevel(): RivalDraftLevel {
  try {
    const raw = localStorage.getItem(RIVAL_DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RivalDraftLevel;
      if (parsed && Array.isArray(parsed.bricks)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  const published = getPlayerCreatedLevel();
  const initialDraft: RivalDraftLevel = {
    title: published?.title || 'Citadelle Néon',
    ballSpeed: published?.ballSpeed || 11.4,
    fixedObsCount: published?.fixedObstacles.length ?? 1,
    randomObsCount: published?.randomObstacleCount ?? 1,
    bricks: published?.bricks?.slice(0, RIVAL_EDITOR_LIMITS.maxTotalBricks) || getDefaultDraftBricks(),
    lastAutoSavedAt: Date.now(),
    testedCount: 0,
  };
  localStorage.setItem(RIVAL_DRAFT_KEY, JSON.stringify(initialDraft));
  return initialDraft;
}

export function saveRivalDraftLevel(draft: RivalDraftLevel): void {
  const stamped: RivalDraftLevel = {
    ...draft,
    lastAutoSavedAt: Date.now(),
  };
  localStorage.setItem(RIVAL_DRAFT_KEY, JSON.stringify(stamped));
}

export function convertDraftToLevelDefinition(draft: RivalDraftLevel): LevelDefinition {
  const profile = getUserProfile();
  const fixedObstacles =
    FIXED_OBSTACLE_PRESETS[Math.min(draft.fixedObsCount, FIXED_OBSTACLE_PRESETS.length - 1)];
  const complexity = calculateLevelComplexity({
    bricks: draft.bricks,
    fixedObstacles,
    randomObstacleCount: draft.randomObsCount,
    ballSpeed: draft.ballSpeed,
  });

  return {
    id: 99,
    name: `[TEST] ${(draft.title || 'BROUILLON').toUpperCase()}`,
    subtitle: `Mode Test Libre avant publication · Complexité ${complexity}/100`,
    difficulty:
      complexity < 35 ? 'Débutant' : complexity < 70 ? 'Intermédiaire' : 'Avancé',
    ballSpeed: draft.ballSpeed,
    fixedObstacles,
    randomObstacleCount: draft.randomObsCount,
    obstacleShiftMinSec: 10,
    obstacleShiftMaxSec: 18,
    initialLives: 3,
    bricks: draft.bricks,
    isRivalLevel: true,
    isDraftTest: true,
    author: profile.handle,
    complexityScore: complexity,
  };
}

// ============================================================================
// 3. COMMUNITY RIVAL LEVELS & PLAYER PUBLISHED LEVEL (5 TO 6 MINI-BRICK ROWS)
// ============================================================================
const PRE_SEEDED_RIVAL_LEVELS: RivalCommunityLevel[] = [
  {
    id: 'rival-seed-1',
    title: 'Sentier Stellaire',
    author: '@LunaPop',
    isPlayerOwned: false,
    isHidden: false,
    createdAt: Date.now() - 86400000 * 14,
    lastModifiedAt: Date.now() - 86400000 * 14,
    editCount: 0,
    complexityScore: 26,
    playsCount: 418,
    clearsCount: 289,
    ballSpeed: 10.2,
    fixedObstacles: [{ x: 0, y: -2.05, kind: 'bumper' }],
    randomObstacleCount: 0,
    bricks: makeMiniRivalBricks([
      [
        { col: 1, type: 'numbered', color: 'blue', hp: 20 },
        { col: 2, type: 'kawaii_happy', color: 'yellow', hp: 20 },
        { col: 3, type: 'numbered', color: 'green', hp: 20 },
        { col: 4, type: 'numbered', color: 'green', hp: 20 },
        { col: 5, type: 'kawaii_wink', color: 'pink', hp: 20 },
        { col: 6, type: 'numbered', color: 'blue', hp: 20 },
      ],
      [
        { col: 0, type: 'numbered', color: 'purple', hp: 20 },
        { col: 2, type: 'lightning', color: 'lightning', hp: 10 },
        { col: 3, type: 'numbered', color: 'blue', hp: 20 },
        { col: 4, type: 'numbered', color: 'blue', hp: 20 },
        { col: 5, type: 'lightning', color: 'lightning', hp: 10 },
        { col: 7, type: 'numbered', color: 'purple', hp: 20 },
      ],
      [
        { col: 1, type: 'numbered', color: 'green', hp: 20 },
        { col: 2, type: 'numbered', color: 'yellow', hp: 20 },
        { col: 5, type: 'numbered', color: 'yellow', hp: 20 },
        { col: 6, type: 'numbered', color: 'green', hp: 20 },
      ],
      [
        { col: 1, type: 'numbered', color: 'blue', hp: 20 },
        { col: 3, type: 'numbered', color: 'pink', hp: 20 },
        { col: 4, type: 'numbered', color: 'pink', hp: 20 },
        { col: 6, type: 'numbered', color: 'blue', hp: 20 },
      ],
      [
        { col: 2, type: 'numbered', color: 'green', hp: 10 },
        { col: 3, type: 'numbered', color: 'yellow', hp: 10 },
        { col: 4, type: 'numbered', color: 'yellow', hp: 10 },
        { col: 5, type: 'numbered', color: 'green', hp: 10 },
      ],
    ]),
  },
  {
    id: 'rival-seed-2',
    title: 'Croisée des Prismes',
    author: '@AstroMax',
    isPlayerOwned: false,
    isHidden: false,
    createdAt: Date.now() - 86400000 * 11,
    lastModifiedAt: Date.now() - 86400000 * 11,
    editCount: 1,
    complexityScore: 49,
    playsCount: 612,
    clearsCount: 244,
    ballSpeed: 11.2,
    fixedObstacles: [
      { x: -2.2, y: -2.0, kind: 'prism' },
      { x: 2.2, y: -2.0, kind: 'prism' },
    ],
    randomObstacleCount: 1,
    bricks: makeMiniRivalBricks([
      [
        { col: 0, type: 'numbered', color: 'purple', hp: 30 },
        { col: 1, type: 'numbered', color: 'pink', hp: 30 },
        { col: 2, type: 'numbered', color: 'blue', hp: 30 },
        { col: 5, type: 'numbered', color: 'blue', hp: 30 },
        { col: 6, type: 'numbered', color: 'pink', hp: 30 },
        { col: 7, type: 'numbered', color: 'purple', hp: 30 },
      ],
      [
        { col: 1, type: 'kawaii_happy', color: 'yellow', hp: 30 },
        { col: 2, type: 'numbered', color: 'green', hp: 30 },
        { col: 3, type: 'lightning', color: 'lightning', hp: 10 },
        { col: 4, type: 'lightning', color: 'lightning', hp: 10 },
        { col: 5, type: 'numbered', color: 'green', hp: 30 },
        { col: 6, type: 'kawaii_wink', color: 'yellow', hp: 30 },
      ],
      [
        { col: 0, type: 'numbered', color: 'blue', hp: 20 },
        { col: 2, type: 'metal', color: 'metal', hp: 999 },
        { col: 3, type: 'numbered', color: 'pink', hp: 30 },
        { col: 4, type: 'numbered', color: 'pink', hp: 30 },
        { col: 5, type: 'metal', color: 'metal', hp: 999 },
        { col: 7, type: 'numbered', color: 'blue', hp: 20 },
      ],
      [
        { col: 1, type: 'numbered', color: 'purple', hp: 30 },
        { col: 3, type: 'numbered', color: 'orange', hp: 20 },
        { col: 4, type: 'numbered', color: 'orange', hp: 20 },
        { col: 6, type: 'numbered', color: 'purple', hp: 30 },
      ],
      [
        { col: 2, type: 'numbered', color: 'green', hp: 20 },
        { col: 3, type: 'numbered', color: 'blue', hp: 20 },
        { col: 4, type: 'numbered', color: 'blue', hp: 20 },
        { col: 5, type: 'numbered', color: 'green', hp: 20 },
      ],
    ]),
  },
  {
    id: 'rival-seed-3',
    title: 'Piège du Vortex Noir',
    author: '@CyberLeo',
    isPlayerOwned: false,
    isHidden: false,
    createdAt: Date.now() - 86400000 * 8,
    lastModifiedAt: Date.now() - 86400000 * 8,
    editCount: 1,
    complexityScore: 71,
    playsCount: 845,
    clearsCount: 198,
    ballSpeed: 12.1,
    fixedObstacles: [{ x: 0, y: -2.0, kind: 'vortex' }],
    randomObstacleCount: 2,
    bricks: makeMiniRivalBricks([
      [
        { col: 0, type: 'numbered', color: 'pink', hp: 50 },
        { col: 1, type: 'numbered', color: 'purple', hp: 40 },
        { col: 2, type: 'lightning', color: 'lightning', hp: 10 },
        { col: 3, type: 'numbered', color: 'yellow', hp: 30 },
        { col: 4, type: 'numbered', color: 'yellow', hp: 30 },
        { col: 5, type: 'lightning', color: 'lightning', hp: 10 },
        { col: 6, type: 'numbered', color: 'purple', hp: 40 },
        { col: 7, type: 'numbered', color: 'pink', hp: 50 },
      ],
      [
        { col: 0, type: 'metal', color: 'metal', hp: 999 },
        { col: 1, type: 'kawaii_happy', color: 'pink', hp: 30 },
        { col: 2, type: 'numbered', color: 'green', hp: 30 },
        { col: 5, type: 'numbered', color: 'green', hp: 30 },
        { col: 6, type: 'kawaii_wink', color: 'yellow', hp: 30 },
        { col: 7, type: 'metal', color: 'metal', hp: 999 },
      ],
      [
        { col: 1, type: 'numbered', color: 'blue', hp: 30 },
        { col: 2, type: 'numbered', color: 'orange', hp: 30 },
        { col: 3, type: 'numbered', color: 'pink', hp: 40 },
        { col: 4, type: 'numbered', color: 'pink', hp: 40 },
        { col: 5, type: 'numbered', color: 'orange', hp: 30 },
        { col: 6, type: 'numbered', color: 'blue', hp: 30 },
      ],
      [
        { col: 2, type: 'numbered', color: 'purple', hp: 30 },
        { col: 3, type: 'numbered', color: 'green', hp: 20 },
        { col: 4, type: 'numbered', color: 'green', hp: 20 },
        { col: 5, type: 'numbered', color: 'purple', hp: 30 },
      ],
      [
        { col: 1, type: 'numbered', color: 'yellow', hp: 20 },
        { col: 3, type: 'numbered', color: 'blue', hp: 20 },
        { col: 4, type: 'numbered', color: 'blue', hp: 20 },
        { col: 6, type: 'numbered', color: 'yellow', hp: 20 },
      ],
    ]),
  },
  {
    id: 'rival-seed-4',
    title: 'Citadelle Impériale',
    author: '@CosmicEmperor',
    isPlayerOwned: false,
    isHidden: false,
    createdAt: Date.now() - 86400000 * 4,
    lastModifiedAt: Date.now() - 86400000 * 4,
    editCount: 0,
    complexityScore: 92,
    playsCount: 1290,
    clearsCount: 84,
    ballSpeed: 13.1,
    fixedObstacles: [
      { x: -2.6, y: -1.95, kind: 'bumper' },
      { x: 0, y: -2.25, kind: 'prism' },
      { x: 2.6, y: -1.95, kind: 'bumper' },
    ],
    randomObstacleCount: 3,
    bricks: makeMiniRivalBricks([
      [
        { col: 0, type: 'numbered', color: 'pink', hp: 50 },
        { col: 1, type: 'numbered', color: 'purple', hp: 40 },
        { col: 2, type: 'numbered', color: 'yellow', hp: 40 },
        { col: 3, type: 'kawaii_happy', color: 'pink', hp: 40 },
        { col: 4, type: 'kawaii_wink', color: 'yellow', hp: 40 },
        { col: 5, type: 'numbered', color: 'yellow', hp: 40 },
        { col: 6, type: 'numbered', color: 'purple', hp: 40 },
        { col: 7, type: 'numbered', color: 'pink', hp: 50 },
      ],
      [
        { col: 1, type: 'metal', color: 'metal', hp: 999 },
        { col: 2, type: 'numbered', color: 'blue', hp: 40 },
        { col: 3, type: 'lightning', color: 'lightning', hp: 10 },
        { col: 4, type: 'lightning', color: 'lightning', hp: 10 },
        { col: 5, type: 'numbered', color: 'blue', hp: 40 },
        { col: 6, type: 'metal', color: 'metal', hp: 999 },
      ],
      [
        { col: 0, type: 'numbered', color: 'green', hp: 30 },
        { col: 2, type: 'numbered', color: 'pink', hp: 40 },
        { col: 3, type: 'numbered', color: 'purple', hp: 30 },
        { col: 4, type: 'numbered', color: 'purple', hp: 30 },
        { col: 5, type: 'numbered', color: 'pink', hp: 40 },
        { col: 7, type: 'numbered', color: 'green', hp: 30 },
      ],
      [
        { col: 1, type: 'numbered', color: 'orange', hp: 30 },
        { col: 2, type: 'numbered', color: 'yellow', hp: 30 },
        { col: 5, type: 'numbered', color: 'yellow', hp: 30 },
        { col: 6, type: 'numbered', color: 'orange', hp: 30 },
      ],
      [
        { col: 2, type: 'numbered', color: 'blue', hp: 30 },
        { col: 3, type: 'numbered', color: 'green', hp: 30 },
        { col: 4, type: 'numbered', color: 'green', hp: 30 },
        { col: 5, type: 'numbered', color: 'blue', hp: 30 },
      ],
      [
        { col: 1, type: 'numbered', color: 'purple', hp: 20 },
        { col: 3, type: 'numbered', color: 'orange', hp: 20 },
        { col: 4, type: 'numbered', color: 'orange', hp: 20 },
        { col: 6, type: 'numbered', color: 'purple', hp: 20 },
      ],
    ]),
  },
];

const PLAYER_LEVEL_STORAGE_KEY = 'neon_breaker_my_rival_level_v1';

export function getPlayerCreatedLevel(): RivalCommunityLevel | null {
  try {
    const raw = localStorage.getItem(PLAYER_LEVEL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RivalCommunityLevel;
  } catch {
    return null;
  }
}

export function savePlayerCreatedLevel(level: RivalCommunityLevel): void {
  localStorage.setItem(PLAYER_LEVEL_STORAGE_KEY, JSON.stringify(level));
}

export function deletePlayerCreatedLevel(): void {
  localStorage.removeItem(PLAYER_LEVEL_STORAGE_KEY);
}

export function getEditCooldownStatus(level: RivalCommunityLevel | null): {
  canEdit: boolean;
  daysRemaining: number;
  nextEditDateStr: string;
} {
  if (!level) {
    return { canEdit: true, daysRemaining: 0, nextEditDateStr: '' };
  }
  if (level.editCount > 0) {
    const elapsed = Date.now() - level.lastModifiedAt;
    if (elapsed < THIRTY_DAYS_MS) {
      const remainingMs = THIRTY_DAYS_MS - elapsed;
      const daysRemaining = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
      const nextDate = new Date(level.lastModifiedAt + THIRTY_DAYS_MS).toLocaleDateString('fr-FR');
      return { canEdit: false, daysRemaining, nextEditDateStr: nextDate };
    }
  }
  return { canEdit: true, daysRemaining: 0, nextEditDateStr: '' };
}

export function getPublicRivalLevelsSorted(): RivalCommunityLevel[] {
  const playerLvl = getPlayerCreatedLevel();
  const profile = getUserProfile();
  const list = [...PRE_SEEDED_RIVAL_LEVELS];
  if (playerLvl && !playerLvl.isHidden) {
    list.push({
      ...playerLvl,
      author: profile.handle,
    });
  }
  return list.sort((a, b) => a.complexityScore - b.complexityScore);
}

export function convertRivalToLevelDefinition(rival: RivalCommunityLevel): LevelDefinition {
  return {
    id: 100,
    name: rival.title.toUpperCase(),
    subtitle: `Créé par ${rival.author} · Complexité ${rival.complexityScore}/100`,
    difficulty:
      rival.complexityScore < 35
        ? 'Débutant'
        : rival.complexityScore < 70
        ? 'Intermédiaire'
        : 'Avancé',
    ballSpeed: rival.ballSpeed,
    fixedObstacles: rival.fixedObstacles,
    randomObstacleCount: rival.randomObstacleCount,
    obstacleShiftMinSec: 10,
    obstacleShiftMaxSec: 18,
    initialLives: 3,
    bricks: rival.bricks,
    isRivalLevel: true,
    isDraftTest: false,
    rivalLevelId: rival.id,
    author: rival.author,
    complexityScore: rival.complexityScore,
  };
}

// ============================================================================
// 4. CLASH VICTORY PALMARÈS ("... a battu le niveau de X utilisateur")
// ============================================================================
const CLASH_VICTORIES_KEY = 'neon_breaker_clash_victories_v1';

const INITIAL_CLASH_FEED: ClashVictoryEntry[] = [
  {
    id: 'clash-init-1',
    rivalLevelId: 'rival-seed-1',
    rivalLevelTitle: 'Sentier Stellaire',
    rivalAuthor: '@LunaPop',
    winnerHandle: '@RoiCosmique',
    complexityScore: 24,
    scoreEarned: 685,
    defeatedAt: Date.now() - 3600000 * 5,
    isPlayerVictory: true,
  },
  {
    id: 'clash-init-2',
    rivalLevelId: 'rival-seed-3',
    rivalLevelTitle: 'Piège du Vortex Noir',
    rivalAuthor: '@CyberLeo',
    winnerHandle: '@NeonVortex',
    complexityScore: 69,
    scoreEarned: 1420,
    defeatedAt: Date.now() - 3600000 * 2,
    isPlayerVictory: false,
  },
  {
    id: 'clash-init-3',
    rivalLevelId: 'rival-seed-2',
    rivalLevelTitle: 'Croisée des Prismes',
    rivalAuthor: '@AstroMax',
    winnerHandle: '@KawaiiQueen',
    complexityScore: 48,
    scoreEarned: 1110,
    defeatedAt: Date.now() - 3600000 * 1,
    isPlayerVictory: false,
  },
];

export function getClashVictories(): ClashVictoryEntry[] {
  try {
    const raw = localStorage.getItem(CLASH_VICTORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ClashVictoryEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  localStorage.setItem(CLASH_VICTORIES_KEY, JSON.stringify(INITIAL_CLASH_FEED));
  return INITIAL_CLASH_FEED;
}

export function recordClashVictory(params: {
  rivalLevelId: string;
  rivalLevelTitle: string;
  rivalAuthor: string;
  complexityScore: number;
  scoreEarned: number;
}): ClashVictoryEntry {
  const profile = getUserProfile();
  const list = getClashVictories();

  const newEntry: ClashVictoryEntry = {
    id: `clash-${Date.now()}`,
    rivalLevelId: params.rivalLevelId,
    rivalLevelTitle: params.rivalLevelTitle,
    rivalAuthor: params.rivalAuthor,
    winnerHandle: profile.handle,
    complexityScore: params.complexityScore,
    scoreEarned: params.scoreEarned,
    defeatedAt: Date.now(),
    isPlayerVictory: true,
  };

  // Keep player's best or latest victory per rival level at the top
  const filtered = list.filter(
    (c) => !(c.isPlayerVictory && c.rivalLevelId === params.rivalLevelId)
  );
  const updated = [newEntry, ...filtered].slice(0, 20);
  localStorage.setItem(CLASH_VICTORIES_KEY, JSON.stringify(updated));
  return newEntry;
}

export function getPlayerBeatenMap(): Record<string, ClashVictoryEntry> {
  const list = getClashVictories();
  const map: Record<string, ClashVictoryEntry> = {};
  list.forEach((c) => {
    if (c.isPlayerVictory) {
      map[c.rivalLevelId] = c;
    }
  });
  return map;
}

// ============================================================================
// 5. HALL OF FAME WITH REALISTIC TIGHTENED SCORES (500 to 3,000 pts)
// ============================================================================
export function getHallOfFameRankings(
  playerClassicHigh: number,
  playerRivalHigh: number,
  playerStreak: number
): {
  classic: HallOfFameEntry[];
  rival: HallOfFameEntry[];
} {
  const profile = getUserProfile();
  const playerLvl = getPlayerCreatedLevel();
  const playerVictories = getClashVictories().filter((c) => c.isPlayerVictory).length;

  const classicRaw: Omit<HallOfFameEntry, 'rank'>[] = [
    { name: '@CosmicEmperor', score: 2840, badge: '👑', metricLabel: 'Niveau 12 · Série 11' },
    { name: '@NeonVortex', score: 2190, badge: '⚡', metricLabel: 'Niveau 11 · Série 7' },
    { name: '@CyberLeo', score: 1650, badge: '🔥', metricLabel: 'Niveau 9 · Série 5' },
    { name: '@KawaiiQueen', score: 1180, badge: '⭐', metricLabel: 'Niveau 8 · Série 4' },
    { name: '@AstroMax', score: 790, badge: '🚀', metricLabel: 'Niveau 6 · Série 3' },
    {
      name: `${profile.handle} (Vous)`,
      score: Math.max(640, playerClassicHigh),
      badge: profile.avatarBadge,
      metricLabel: `${profile.titleBadge} · Série ${Math.max(2, playerStreak)}`,
      isCurrentUser: true,
    },
  ];

  const rivalRaw: Omit<HallOfFameEntry, 'rank'>[] = [
    { name: '@CosmicEmperor', score: 2620, badge: '🏆', metricLabel: '9 Utilisateurs Battus · Complexité 91/100' },
    { name: '@CyberLeo', score: 1940, badge: '🌀', metricLabel: '6 Utilisateurs Battus · Complexité 69/100' },
    { name: '@AstroMax', score: 1380, badge: '💎', metricLabel: '4 Utilisateurs Battus · Complexité 48/100' },
    { name: '@LunaPop', score: 860, badge: '✨', metricLabel: '2 Utilisateurs Battus · Complexité 24/100' },
    {
      name: `${profile.handle} (Vous)`,
      score: Math.max(685, playerRivalHigh),
      badge: profile.avatarBadge,
      metricLabel: playerLvl
        ? `${playerVictories} Battu(s) · Arène "${playerLvl.title}" (${playerLvl.complexityScore}/100)`
        : `${playerVictories} Utilisateur(s) Battu(s) en Clash`,
      isCurrentUser: true,
    },
  ];

  const classic = classicRaw
    .sort((a, b) => b.score - a.score)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const rival = rivalRaw
    .sort((a, b) => b.score - a.score)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  return { classic, rival };
}
