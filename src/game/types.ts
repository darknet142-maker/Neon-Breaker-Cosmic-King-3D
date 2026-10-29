export type BrickColor =
  | 'pink'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'lightning'
  | 'metal';

export type BrickType =
  | 'numbered'
  | 'kawaii_happy'
  | 'kawaii_wink'
  | 'lightning'
  | 'metal';

export type CapsulePowerupType =
  | 'paddle_xl'      // Allonge la barre (+45%)
  | 'paddle_mini'    // Réduit la barre (-35%) mais Points x2
  | 'paddle_sticky'  // Rend la barre collante pour garder et viser la balle
  | 'machine_gun'    // Fusil mitrailleuse sur la barre orienté au curseur
  | 'safety_wall'    // Mur de sécurité sous la barre (temps limité, disparaît dès que la balle touche)
  | 'speed_fast'     // Accélère la balle (+28% vitesse, +50% points)
  | 'speed_slow'     // Ralentit la balle (-25% vitesse)
  | 'multiball_3'    // Multiplie les billes par 3
  | 'multiball_5'    // Multiplie les billes par 5
  | 'multiball_10';  // Multiplie les billes par 10

export type ObstacleKind =
  | 'bumper'         // Bumper rebondissant haute vélocité
  | 'prism'          // Prisme cristallin rotatif qui dévie l'angle
  | 'vortex';        // Vortex de vitesse gravitationnel

export interface FixedObstacleBlueprint {
  x: number;
  y: number;
  kind: ObstacleKind;
}

export interface BrickBlueprint {
  row: number;
  col: number;
  colSpan?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  type: BrickType;
  color: BrickColor;
  hp: number;
}

export interface LevelDefinition {
  id: number;
  name: string;
  subtitle: string;
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé';
  ballSpeed: number;
  fixedObstacles: FixedObstacleBlueprint[];
  randomObstacleCount: number;
  obstacleShiftMinSec: number; // Minimum 10s
  obstacleShiftMaxSec: number; // Maximum 20s
  descendingIntervalSec?: number;
  initialScore?: number;
  initialMultiplier?: number;
  initialLives?: number;
  initialProgressBonus?: number;
  autoTriggerCenterBurst?: boolean;
  bricks: BrickBlueprint[];
  // Optional metadata for community Rival levels & Draft testing
  isRivalLevel?: boolean;
  isDraftTest?: boolean;
  rivalLevelId?: string;
  author?: string;
  complexityScore?: number;
}

export interface RivalCommunityLevel {
  id: string;
  title: string;
  author: string;
  isPlayerOwned: boolean;
  isHidden: boolean;          // Masqué du public mais toujours dans le profil
  createdAt: number;          // Timestamp ms
  lastModifiedAt: number;     // Timestamp ms (règle : 1 modif tous les 30 jours)
  editCount: number;
  complexityScore: number;    // 1..100 calculé automatiquement
  playsCount: number;
  clearsCount: number;
  ballSpeed: number;
  bricks: BrickBlueprint[];
  fixedObstacles: FixedObstacleBlueprint[];
  randomObstacleCount: number;
}

export interface RivalDraftLevel {
  title: string;
  ballSpeed: number;
  fixedObsCount: number;
  randomObsCount: number;
  bricks: BrickBlueprint[];
  lastAutoSavedAt: number;
  testedCount: number;
}

export interface ClashVictoryEntry {
  id: string;
  rivalLevelId: string;
  rivalLevelTitle: string;
  rivalAuthor: string;
  winnerHandle: string;
  complexityScore: number;
  scoreEarned: number;
  defeatedAt: number;
  isPlayerVictory: boolean;
}

export interface UserProfileData {
  handle: string;
  avatarBadge: string;
  titleBadge: string;
  joinedAt: number;
  totalBricksBroken: number;
  totalGamesPlayed: number;
}

export interface HallOfFameEntry {
  rank: number;
  name: string;
  score: number;
  badge: string;
  metricLabel: string;
  isCurrentUser?: boolean;
}

export type PlayMode = 'classic' | 'rival' | 'draft_test';

export type GameModeState =
  | 'title'
  | 'playing'
  | 'paused'
  | 'victory'
  | 'gameover'
  | 'level_select'
  | 'rival_browser'
  | 'rival_editor'
  | 'user_profile'
  | 'hall_of_fame';

export type MascotMood =
  | 'ecstatic'
  | 'happy'
  | 'cheering'
  | 'worried';

export interface BoosterStock {
  magnet: number;
  rocket: number;
  multiball: number;
}

export interface ActiveBoostersState {
  magnetTimeLeft: number;
  stickyTimeLeft: number;
  machineGunTimeLeft: number;
  safetyWallTimeLeft: number;
  speedModMode: 'normal' | 'fast' | 'slow';
  speedModTimeLeft: number;
  paddleScaleMode: 'normal' | 'xl' | 'mini';
  paddleScaleFactor: number;
  paddleScaleTimeLeft: number;
  ballStuckToPaddle: boolean;
  aimAngleRad: number;
  isFeverMode: boolean;
  feverProgress: number;
  nextObstacleShiftSec: number;
  capsulesDroppedInMatch: number;
  maxCapsulesInMatch: number;
}

export interface SocialRivalInfo {
  name: string;
  targetScore: number;
  avatarColor: string;
  justOvertaken: boolean;
  rank: number;
}

export interface GameHudSnapshot {
  playMode: PlayMode;
  score: number;
  highScore: number;
  rivalHighScore: number;
  multiplier: number;
  comboCount: number;
  winStreak: number;
  lives: number;
  maxLives: number;
  level: number;
  levelName: string;
  levelAuthor?: string;
  levelComplexity?: number;
  activeRivalLevelId?: string;
  progress: number;
  boosters: BoosterStock;
  activeBoosters: ActiveBoostersState;
  mascotMood: MascotMood;
  mascotMessage: string;
  activeBallsCount: number;
  destructibleRemaining: number;
  hasRivalBrick: boolean;
  lastPowerupLabel: string | null;
  socialRival: SocialRivalInfo;
}
