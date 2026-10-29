import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCosmicBackgroundSystem } from '../game/cosmicBackgrounds';
import { getLevelById } from '../game/levels';
import {
  applyCapsuleStyle,
  BrickMeshBundle,
  CapsuleMeshBundle,
  createCompositeBrickMesh,
  createCompositeCapsuleMesh,
  createCompositeObstacleMesh,
  createCompositeOrbAndTrail,
  createCompositePaddleMesh,
  createCompositeRocketMesh,
  createCompositeStarMesh,
  createCurvedSpaceArena,
  createPaddleTrailMesh,
  createPlasmaBulletMesh,
  createSafetyWallMesh,
  ObstacleMeshBundle,
  OrbVisualBundle,
  PADDLE_TRAIL_SEGMENTS,
  styleObstacleByKind,
  TRAIL_SEGMENTS,
  updateOrbTrailGeometry,
  updatePaddleTrailGeometry,
} from '../game/models';
import {
  incrementProfileStats,
  recordClashVictory,
} from '../game/rivalEngine';
import { soundEngine } from '../game/sound';
import {
  BRICK_PALETTE,
  CAPSULE_META,
  getBrickFaceTexture,
  getRadialGlowTexture,
  setTextureMaxAnisotropy,
} from '../game/textures';
import {
  BrickColor,
  BrickType,
  CapsulePowerupType,
  FixedObstacleBlueprint,
  GameHudSnapshot,
  GameModeState,
  LevelDefinition,
  MascotMood,
  ObstacleKind,
  PlayMode,
  SocialRivalInfo,
} from '../game/types';

// Pre-allocated scratch math helpers (Zero GC in render loop)
const _tmpVec3 = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();

const ALL_CAPSULE_TYPES: CapsulePowerupType[] = [
  'paddle_xl',
  'paddle_mini',
  'paddle_sticky',
  'machine_gun',
  'safety_wall',
  'speed_fast',
  'speed_slow',
  'multiball_3',
  'multiball_5',
  'multiball_10',
];

const SOCIAL_RIVALS_LADDER: Array<{ name: string; score: number; color: string; rank: number }> = [
  { name: '@LunaPop', score: 320, color: '#38BDF8', rank: 18 },
  { name: '@AstroMax', score: 580, color: '#10E84A', rank: 14 },
  { name: '@KawaiiQueen', score: 890, color: '#FF2A85', rank: 9 },
  { name: '@CyberLeo', score: 1350, color: '#A855F7', rank: 6 },
  { name: '@NeonVortex', score: 1950, color: '#FFB800', rank: 3 },
  { name: '@CosmicEmperor', score: 2840, color: '#00F0FF', rank: 1 },
];

interface RuntimeBrick {
  id: number;
  row: number;
  col: number;
  canonicalX: number;
  canonicalWidth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: BrickType;
  color: BrickColor;
  hp: number;
  maxHp: number;
  alive: boolean;
  isRival: boolean;
  hitFlashTimer: number;
  squashTimer: number;
  bundle: BrickMeshBundle;
}

interface RuntimeBall {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  stuckToPaddle: boolean;
  stuckOffsetX: number;
  active: boolean;
  visual: OrbVisualBundle;
}

interface RuntimeStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotZ: number;
  active: boolean;
  mesh: THREE.Group;
}

interface RuntimeCapsule {
  x: number;
  y: number;
  vy: number;
  type: CapsulePowerupType;
  active: boolean;
  bundle: CapsuleMeshBundle;
}

interface RuntimeObstacle {
  id: number;
  kind: ObstacleKind;
  isFixed: boolean;
  x: number;
  y: number;
  radius: number;
  active: boolean;
  spawnWarmup: number;
  hitPulse: number;
  cooldown: number;
  bundle: ObstacleMeshBundle;
}

interface RuntimeRocket {
  x: number;
  y: number;
  vy: number;
  active: boolean;
  mesh: THREE.Group;
}

interface RuntimeBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  mesh: THREE.Group;
}

interface CrystalParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export interface GameEngineActions {
  triggerBooster: (type: 'magnet' | 'rocket' | 'multiball') => void;
  launchStuckBalls: () => void;
  startLevel: (levelId: number, resetScore?: boolean) => void;
  startCustomLevel: (def: LevelDefinition) => void;
  triggerDemoLightningBurst: () => void;
}

interface GameCanvas3DProps {
  gameState: GameModeState;
  currentLevelId: number;
  onHudUpdate: (snapshot: GameHudSnapshot) => void;
  onStateChange: (newState: GameModeState) => void;
  engineRef: React.MutableRefObject<GameEngineActions | null>;
}

const CANONICAL_HALF_WIDTH = 5.35;
const ARENA_TOP_Y = 5.65;
const PADDLE_Y = -5.55;
const SAFETY_WALL_Y = PADDLE_Y - 0.56;
const BASE_PADDLE_WIDTH = 2.15;
const PADDLE_HALF_H = 0.22;
const BALL_RADIUS = 0.19;
const MAX_BALLS = 45;
const MAX_CAPSULES = 6;
const MAX_OBSTACLES = 8;
const MAX_BULLETS = 28;
const MAX_CRYSTAL_SHARDS = 120;

export const GameCanvas3D: React.FC<GameCanvas3DProps> = ({
  gameState,
  currentLevelId,
  onHudUpdate,
  onStateChange,
  engineRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameStateRef = useRef<GameModeState>(gameState);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    onHudUpdateRef.current = onHudUpdate;
  }, [onHudUpdate]);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL detection from GPU renderer string
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    setTextureMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

    // 2. Scene, Studio Environment & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07051a);
    scene.fog = new THREE.FogExp2(0x07051a, 0.018);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      46,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );

    let arenaHalfWidth = CANONICAL_HALF_WIDTH;
    let horizontalScale = 1.0;

    // 3. Balanced 3-Point Studio & Neon Rig
    const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x2e0854, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.55);
    keyLight.position.set(4, 8, 10);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    const d = 12;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.1);
    rimLight.position.set(-6, -4, 6);
    scene.add(rimLight);

    const centerBurstLight = new THREE.PointLight(0xffea80, 0, 12, 1.6);
    centerBurstLight.position.set(0.1, 1.45, 2.2);
    scene.add(centerBurstLight);

    // 4. Curved Space Arena, Starfield & 12-Biome 3D Cosmic Background System
    const { starfield, floorGlow } = createCurvedSpaceArena(scene);
    const cosmicBg = createCosmicBackgroundSystem(scene);

    // 5. Central Explosion Flare Sprite
    const burstSpriteGroup = new THREE.Group();
    burstSpriteGroup.position.set(0.1, 1.45, 0.45);
    scene.add(burstSpriteGroup);

    const coreFlareGeo = new THREE.PlaneGeometry(4.6, 4.6);
    const coreFlareMat = new THREE.MeshBasicMaterial({
      map: getRadialGlowTexture(),
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreFlareMesh = new THREE.Mesh(coreFlareGeo, coreFlareMat);
    burstSpriteGroup.add(coreFlareMesh);

    // 6. InstancedMesh Pool for 3D Multicolored Crystal Shards
    const shardGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.35,
    });
    const shardInstanced = new THREE.InstancedMesh(shardGeo, shardMat, MAX_CRYSTAL_SHARDS);
    shardInstanced.frustumCulled = false;
    const crystalPool: CrystalParticle[] = [];
    for (let i = 0; i < MAX_CRYSTAL_SHARDS; i++) {
      crystalPool.push({
        x: 0,
        y: -99,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        scale: 0,
        life: 0,
        maxLife: 1,
        color: new THREE.Color(0xff1668),
      });
      _dummyObj.position.set(0, -99, 0);
      _dummyObj.scale.setScalar(0);
      _dummyObj.updateMatrix();
      shardInstanced.setMatrixAt(i, _dummyObj.matrix);
      shardInstanced.setColorAt(i, new THREE.Color(0xffffff));
    }
    shardInstanced.instanceMatrix.needsUpdate = true;
    if (shardInstanced.instanceColor) shardInstanced.instanceColor.needsUpdate = true;
    scene.add(shardInstanced);

    // 7. Paddle, 4x Colorful Paddle Trail, Wake Stardust & Safety Wall Setup
    const paddleObj = createCompositePaddleMesh(BASE_PADDLE_WIDTH);
    paddleObj.group.position.set(0, PADDLE_Y, 0);
    scene.add(paddleObj.group);

    const paddleTrailObj = createPaddleTrailMesh();
    scene.add(paddleTrailObj.trailMesh);

    // Sparkling Colorful Wake Dust System ("poussière traînée" for both Paddle & Ball)
    const MAX_WAKE_DUST = 240;
    interface WakeDustMote {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      baseR: number;
      baseG: number;
      baseB: number;
    }
    const wakeDustPool: WakeDustMote[] = [];
    const wakeDustPositions = new Float32Array(MAX_WAKE_DUST * 3);
    const wakeDustColors = new Float32Array(MAX_WAKE_DUST * 3);
    for (let i = 0; i < MAX_WAKE_DUST; i++) {
      wakeDustPool.push({
        x: 0,
        y: -99,
        z: 0.12,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        baseR: 0,
        baseG: 0.94,
        baseB: 1,
      });
      wakeDustPositions[i * 3 + 1] = -99;
    }
    const wakeDustGeo = new THREE.BufferGeometry();
    wakeDustGeo.setAttribute('position', new THREE.BufferAttribute(wakeDustPositions, 3));
    wakeDustGeo.setAttribute('color', new THREE.BufferAttribute(wakeDustColors, 3));
    const wakeDustMat = new THREE.PointsMaterial({
      size: 0.28,
      map: getRadialGlowTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wakeDustPoints = new THREE.Points(wakeDustGeo, wakeDustMat);
    wakeDustPoints.frustumCulled = false;
    scene.add(wakeDustPoints);

    const wakeDustPalette = [
      new THREE.Color(0x00f0ff),
      new THREE.Color(0xa855f7),
      new THREE.Color(0xff1688),
      new THREE.Color(0xffd700),
      new THREE.Color(0x24ff7b),
    ];
    let wakeDustCursor = 0;
    const spawnWakeDust = (
      wx: number,
      wy: number,
      vx: number,
      vy: number,
      spread: number = 0.22,
      lifeSec: number = 0.65
    ) => {
      const m = wakeDustPool[wakeDustCursor];
      wakeDustCursor = (wakeDustCursor + 1) % MAX_WAKE_DUST;
      const col = wakeDustPalette[Math.floor(Math.random() * wakeDustPalette.length)];
      m.x = wx + (Math.random() - 0.5) * spread;
      m.y = wy + (Math.random() - 0.5) * spread;
      m.z = 0.13;
      m.vx = vx + (Math.random() - 0.5) * 0.65;
      m.vy = vy + (Math.random() - 0.5) * 0.65;
      m.maxLife = lifeSec * (0.75 + Math.random() * 0.5);
      m.life = m.maxLife;
      m.baseR = col.r;
      m.baseG = col.g;
      m.baseB = col.b;
    };

    const safetyWallObj = createSafetyWallMesh();
    safetyWallObj.group.position.set(0, SAFETY_WALL_Y, 0.1);
    scene.add(safetyWallObj.group);

    // 8. Mutable Game Runtime State
    const bricksGroup = new THREE.Group();
    scene.add(bricksGroup);
    let activeBricks: RuntimeBrick[] = [];

    // Ball Pool
    const ballPool: RuntimeBall[] = [];
    for (let i = 0; i < MAX_BALLS; i++) {
      const visual = createCompositeOrbAndTrail();
      visual.orbGroup.visible = false;
      visual.trailMesh.visible = false;
      scene.add(visual.orbGroup);
      scene.add(visual.trailMesh);
      ballPool.push({
        id: i,
        x: 0,
        y: PADDLE_Y + 0.72,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        stuckToPaddle: false,
        stuckOffsetX: 0,
        active: false,
        visual,
      });
    }

    // Star Pool
    const MAX_STARS = 12;
    const starPool: RuntimeStar[] = [];
    for (let i = 0; i < MAX_STARS; i++) {
      const mesh = createCompositeStarMesh();
      mesh.visible = false;
      scene.add(mesh);
      starPool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: -2.2,
        rotZ: 0,
        active: false,
        mesh,
      });
    }

    // Mystery Power-up Capsule Pool
    const capsulePool: RuntimeCapsule[] = [];
    for (let i = 0; i < MAX_CAPSULES; i++) {
      const bundle = createCompositeCapsuleMesh();
      bundle.group.visible = false;
      scene.add(bundle.group);
      capsulePool.push({
        x: 0,
        y: 0,
        vy: -2.75,
        type: 'multiball_3',
        active: false,
        bundle,
      });
    }

    // Hybrid Deflector Obstacles Pool (Fixed Anchored + Random 10-20s Phasing)
    const obstaclePool: RuntimeObstacle[] = [];
    for (let i = 0; i < MAX_OBSTACLES; i++) {
      const bundle = createCompositeObstacleMesh();
      bundle.group.visible = false;
      scene.add(bundle.group);
      obstaclePool.push({
        id: i,
        kind: 'bumper',
        isFixed: false,
        x: 0,
        y: -2.0,
        radius: 0.38,
        active: false,
        spawnWarmup: 0,
        hitPulse: 0,
        cooldown: 0,
        bundle,
      });
    }

    // Rocket Pool
    const MAX_ROCKETS = 4;
    const rocketPool: RuntimeRocket[] = [];
    for (let i = 0; i < MAX_ROCKETS; i++) {
      const mesh = createCompositeRocketMesh();
      mesh.visible = false;
      scene.add(mesh);
      rocketPool.push({
        x: 0,
        y: 0,
        vy: 16.5,
        active: false,
        mesh,
      });
    }

    // Machine Gun Plasma Bullet Pool
    const bulletPool: RuntimeBullet[] = [];
    for (let i = 0; i < MAX_BULLETS; i++) {
      const mesh = createPlasmaBulletMesh();
      mesh.visible = false;
      scene.add(mesh);
      bulletPool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        active: false,
        mesh,
      });
    }

    // Core Gameplay Counters (Realistic Tightened Score Scale!)
    let playMode: PlayMode = 'classic';
    let score = 640;
    let highScore = Number(localStorage.getItem('neon_breaker_high_score_v2') || '640');
    let rivalHighScore = Number(localStorage.getItem('neon_breaker_rival_high_score_v2') || '685');
    let multiplier = 2;
    let comboCount = 0;
    let winStreak = Number(localStorage.getItem('neon_breaker_streak') || '2');
    let lives = 3;
    const maxLives = 3;
    let levelId = currentLevelId;
    let levelName = 'NIVEAU 7';
    let levelAuthor: string | undefined = undefined;
    let levelComplexity: number | undefined = undefined;
    let activeRivalLevelId: string | undefined = undefined;
    let ballBaseSpeed = 11.75;
    let initialProgressBonus = 0.52;
    let totalMaxHpInLevel = 100;
    let damageDealtInLevel = 0;
    let totalDestructibleBricksInLevel = 48;
    let bricksBrokenInLevel = 0;
    let manualLaunchCooldown = 0;

    let boosterStock = {
      magnet: 2,
      rocket: 1,
      multiball: 3,
    };

    // Strict Bonus Rarity Economy ("Un bonus se mérite en charbonnant !")
    let allowedCapsulesForMatch: CapsulePowerupType[] = ['machine_gun', 'safety_wall', 'multiball_3'];
    let capsulesDroppedInMatch = 0;
    let maxCapsulesInMatch = 3;
    let bricksBrokenSinceLastDrop = 0;
    let paddleBouncesSinceLastDrop = 0;

    // Paddle & Capsule Modifier States
    let magnetTimeLeft = 0;
    let stickyTimeLeft = 0;
    let machineGunTimeLeft = 0;
    let machineGunFireCooldown = 0;
    let muzzleFlashTimer = 0;
    let safetyWallTimeLeft = 0;
    let speedModMode: 'normal' | 'fast' | 'slow' = 'normal';
    let speedModTimeLeft = 0;
    let paddleScaleMode: 'normal' | 'xl' | 'mini' = 'normal';
    let paddleScaleFactor = 1.0;
    let currentSmoothPaddleScale = 1.0;
    let paddleScaleTimeLeft = 0;
    let lastPowerupLabel: string | null = null;
    let lastPowerupTimer = 0;

    // Pointer World Aim Tracking for Machine Gun
    let pointerWorldX = 0;
    let pointerWorldY = 2.5;
    let turretAimAngle = 0;

    // Fever Mode & Revenge Psychology States
    let feverProgress = 0.45;
    let isFeverMode = false;
    let feverTimer = 0;
    let lastOvertakenRivalIdx = -1;
    let socialJustOvertakenTimer = 0;

    // Hybrid Obstacles (Fixed + Random 10-20s Phasing)
    let currentFixedBlueprints: FixedObstacleBlueprint[] = [];
    let targetRandomObstacleCount = 2;
    let obstacleShiftMinSec = 10;
    let obstacleShiftMaxSec = 18;
    let nextObstacleShiftTimer = 14;

    let aimAngleRad = 0.28;
    let mascotMood: MascotMood = 'ecstatic';
    let mascotMessage = 'Clique ou appuie sur Espace pour donner le coup d’envoi !';
    let mascotMoodTimer = 0;

    let targetPaddleX = 0;
    let currentPaddleX = 0;
    let hitstopTimer = 0;
    let cameraShakeIntensity = 0;
    let centralBurstTimer = 0;
    let descendTimer = 0;
    let descendInterval = 0;
    let matchElapsedTime = 0;

    const heldKeys = new Set<string>();

    const getEffectiveTargetBallSpeed = () => {
      // Dynamic, addictive initial pace (+14% faster) that accelerates smoothly with each brick broken (+0.9% per brick + ratio bonus, up to +42%)
      const brickRatio =
        totalDestructibleBricksInLevel > 0
          ? bricksBrokenInLevel / totalDestructibleBricksInLevel
          : 0;
      const progressiveBrickAccel =
        1.0 + Math.min(0.42, bricksBrokenInLevel * 0.009 + brickRatio * 0.16);
      const currentBase = ballBaseSpeed * progressiveBrickAccel;
      if (speedModMode === 'fast') return currentBase * 1.22;
      if (speedModMode === 'slow') return currentBase * 0.76;
      return currentBase;
    };

    // Dynamic 100% Full-Screen Frustum & Brick Layout Resizer
    const updateCameraFraming = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      const aspect = w / h;
      camera.aspect = aspect;

      const targetHeight = 14.5;
      const vFovRad = THREE.MathUtils.degToRad(camera.fov);
      const distForHeight = targetHeight / (2 * Math.tan(vFovRad / 2));
      const minWidth = CANONICAL_HALF_WIDTH * 2;
      const distForMinWidth = minWidth / (2 * Math.tan(vFovRad / 2) * aspect);

      const baseZ = Math.max(distForHeight, distForMinWidth, 16.0);
      camera.userData.baseZ = baseZ;
      camera.position.set(0, -0.35, baseZ);
      camera.lookAt(0, -0.35, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);

      const visibleHalfHeight = Math.tan(vFovRad / 2) * baseZ;
      const visibleHalfWidth = visibleHalfHeight * aspect;

      arenaHalfWidth = visibleHalfWidth;
      horizontalScale = Math.min(1.65, Math.max(1.0, visibleHalfWidth / CANONICAL_HALF_WIDTH));

      activeBricks.forEach((br) => {
        br.x = br.canonicalX * horizontalScale;
        br.width = br.canonicalWidth * horizontalScale;
        br.bundle.group.position.x = br.x;
        br.bundle.group.scale.x = horizontalScale;
      });
    };

    const crystalPaletteHex = [0xff1668, 0xffc400, 0x00a2ff, 0x10e84a, 0x9333ea, 0x00f0ff];

    const spawnCrystalExplosion = (
      cx: number,
      cy: number,
      count: number,
      specificColorHex?: number,
      isBigBurst: boolean = false
    ) => {
      let spawned = 0;
      for (let i = 0; i < crystalPool.length && spawned < count; i++) {
        const p = crystalPool[i];
        if (p.life <= 0) {
          const angle = Math.random() * Math.PI * 2;
          const speed = isBigBurst ? 1.8 + Math.random() * 6.5 : 1.5 + Math.random() * 4.2;
          p.x = cx + (Math.random() - 0.5) * (isBigBurst ? 1.1 : 0.4);
          p.y = cy + (Math.random() - 0.5) * (isBigBurst ? 1.1 : 0.4);
          p.z = 0.25 + (Math.random() - 0.5) * 0.5;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed + (isBigBurst ? 1.2 : 0.6);
          p.vz = (Math.random() - 0.3) * 3.5;
          p.rx = Math.random() * Math.PI;
          p.ry = Math.random() * Math.PI;
          p.rz = Math.random() * Math.PI;
          p.scale = isBigBurst ? 0.65 + Math.random() * 0.95 : 0.45 + Math.random() * 0.6;
          p.maxLife = isBigBurst ? 1.15 + Math.random() * 0.65 : 0.55 + Math.random() * 0.35;
          p.life = p.maxLife;
          const hex =
            specificColorHex ?? crystalPaletteHex[Math.floor(Math.random() * crystalPaletteHex.length)];
          p.color.setHex(hex);
          spawned++;
        }
      }

      if (isBigBurst) {
        burstSpriteGroup.position.set(cx, cy, 0.48);
        centralBurstTimer = 1.35;
        coreFlareMat.opacity = 1.0;
        centerBurstLight.position.set(cx, cy, 2.2);
        centerBurstLight.intensity = 5.5;
      }
    };

    const spawnFallingStar = (sx: number, sy: number, vy: number = -2.35) => {
      for (let i = 0; i < starPool.length; i++) {
        const st = starPool[i];
        if (!st.active) {
          st.active = true;
          st.x = sx;
          st.y = sy;
          st.vx = (Math.random() - 0.5) * 0.8;
          st.vy = vy;
          st.rotZ = Math.random() * 0.5;
          st.mesh.position.set(sx, sy, 0.2);
          st.mesh.visible = true;
          break;
        }
      }
    };

    /**
     * Strict Bonus Rarity Economy:
     * - Max 2 to 3 capsules per match
     * - Drawn ONLY from the 3-type subset picked for this match
     * - Requires effort (`bricksBrokenSinceLastDrop >= 4 && paddleBouncesSinceLastDrop >= 2`)
     */
    const maybeSpawnPowerupCapsule = (bx: number, by: number, isRevengeBrick: boolean = false) => {
      if (capsulesDroppedInMatch >= maxCapsulesInMatch) return;

      bricksBrokenSinceLastDrop++;
      if (!isRevengeBrick) {
        // Must have worked hard since the last drop!
        if (bricksBrokenSinceLastDrop < 7 || paddleBouncesSinceLastDrop < 3) {
          return;
        }
        // Unscripted dynamic probability (higher in clutch 1-heart situations)
        const baseChance = lives === 1 ? 0.34 : 0.19;
        if (Math.random() > baseChance) return;
      }

      for (let i = 0; i < capsulePool.length; i++) {
        const cap = capsulePool[i];
        if (!cap.active) {
          // Pick from the 3-category subset selected for this match
          const chosenType =
            allowedCapsulesForMatch[Math.floor(Math.random() * allowedCapsulesForMatch.length)];

          cap.active = true;
          cap.x = bx;
          cap.y = by;
          cap.vy = -2.95;
          cap.type = chosenType;
          applyCapsuleStyle(cap.bundle, chosenType);
          cap.bundle.group.position.set(bx, by, 0.25);
          cap.bundle.group.visible = true;

          capsulesDroppedInMatch++;
          bricksBrokenSinceLastDrop = 0;
          paddleBouncesSinceLastDrop = 0;
          break;
        }
      }
    };

    /**
     * Hybrid Obstacle Spawner:
     * - Keeps `fixedObstacles` permanently anchored (golden/white outer ring)
     * - Randomizes ONLY `targetRandomObstacleCount` phasing obstacles every 10-20s
     */
    const setupAndCycleObstacles = (fullReset: boolean = false, withWarmup: boolean = true) => {
      const placedPositions: Array<{ x: number; y: number }> = [];

      if (fullReset) {
        obstaclePool.forEach((ob) => {
          ob.active = false;
          ob.isFixed = false;
          ob.bundle.group.visible = false;
        });

        // 1. Place Fixed Obstacles
        currentFixedBlueprints.slice(0, 4).forEach((fp, idx) => {
          const ob = obstaclePool[idx];
          const ox = fp.x * horizontalScale;
          const oy = fp.y;
          placedPositions.push({ x: ox, y: oy });

          ob.active = true;
          ob.isFixed = true;
          ob.kind = fp.kind;
          ob.x = ox;
          ob.y = oy;
          ob.spawnWarmup = 0;
          ob.hitPulse = 0;
          ob.cooldown = 0;
          styleObstacleByKind(ob.bundle, fp.kind, true);
          ob.bundle.group.position.set(ox, oy, 0.18);
          ob.bundle.group.visible = true;
        });
      } else {
        // Keep fixed obstacles, clear only random ones
        obstaclePool.forEach((ob) => {
          if (ob.active && ob.isFixed) {
            placedPositions.push({ x: ob.x, y: ob.y });
          } else {
            ob.active = false;
            ob.isFixed = false;
            ob.bundle.group.visible = false;
          }
        });
      }

      // 2. Place Random Phasing Obstacles (10-20s interval)
      const kinds: ObstacleKind[] = ['bumper', 'prism', 'vortex'];
      let randomSpawned = 0;
      for (
        let i = 0;
        i < obstaclePool.length && randomSpawned < targetRandomObstacleCount;
        i++
      ) {
        const ob = obstaclePool[i];
        if (ob.active) continue; // Skip slots used by fixed obstacles

        const kind = kinds[(randomSpawned + levelId + Math.floor(Math.random() * 3)) % kinds.length];
        let ox = 0;
        let oy = -2.1;
        for (let attempt = 0; attempt < 14; attempt++) {
          ox = (Math.random() - 0.5) * (arenaHalfWidth * 1.45);
          oy = -3.65 + Math.random() * 2.15;
          const tooClose = placedPositions.some((p) => Math.hypot(p.x - ox, p.y - oy) < 1.35);
          if (!tooClose) break;
        }
        placedPositions.push({ x: ox, y: oy });

        ob.active = true;
        ob.isFixed = false;
        ob.kind = kind;
        ob.x = ox;
        ob.y = oy;
        ob.spawnWarmup = withWarmup ? 1.15 : 0;
        ob.hitPulse = 0;
        ob.cooldown = 0;
        styleObstacleByKind(ob.bundle, kind, false);
        ob.bundle.group.position.set(ox, oy, 0.18);
        ob.bundle.group.visible = true;
        randomSpawned++;
      }

      nextObstacleShiftTimer =
        obstacleShiftMinSec + Math.random() * (obstacleShiftMaxSec - obstacleShiftMinSec);
    };

    const designateRivalRevengeBrick = () => {
      const candidates = activeBricks.filter((b) => b.alive && b.type !== 'metal');
      if (candidates.length === 0) return;

      activeBricks.forEach((b) => {
        b.isRival = false;
        b.bundle.rivalRing.visible = false;
      });

      candidates.sort((a, b) => a.y - b.y);
      const chosen = candidates[0];
      chosen.isRival = true;
      chosen.bundle.rivalRing.visible = true;
      chosen.bundle.faceMesh.material.map = getBrickFaceTexture(
        chosen.type,
        chosen.color,
        chosen.hp,
        true
      );
      chosen.bundle.faceMesh.material.needsUpdate = true;
    };

    const getSocialRivalSnapshot = (): SocialRivalInfo => {
      let nextIdx = SOCIAL_RIVALS_LADDER.findIndex((r) => r.score > score);
      if (nextIdx === -1) nextIdx = SOCIAL_RIVALS_LADDER.length - 1;

      if (nextIdx > lastOvertakenRivalIdx && lastOvertakenRivalIdx !== -1) {
        socialJustOvertakenTimer = 3.0;
      }
      lastOvertakenRivalIdx = nextIdx;

      const rival = SOCIAL_RIVALS_LADDER[nextIdx];
      return {
        name: rival.name,
        targetScore: rival.score,
        avatarColor: rival.color,
        justOvertaken: socialJustOvertakenTimer > 0,
        rank: rival.rank,
      };
    };

    const emitHudUpdate = () => {
      const destructibleRemaining = activeBricks.filter(
        (b) => b.alive && b.type !== 'metal'
      ).length;
      const rawRatio =
        totalMaxHpInLevel > 0 ? Math.min(1, damageDealtInLevel / totalMaxHpInLevel) : 0;
      const displayProgress = Math.min(
        1,
        initialProgressBonus + (1 - initialProgressBonus) * rawRatio
      );

      let anyStuck = false;
      let activeBallsCount = 0;
      for (let i = 0; i < ballPool.length; i++) {
        if (ballPool[i].active) {
          activeBallsCount++;
          if (ballPool[i].stuckToPaddle) anyStuck = true;
        }
      }

      if (playMode === 'classic' && score > highScore) {
        highScore = score;
        localStorage.setItem('neon_breaker_high_score_v2', String(highScore));
      } else if (playMode === 'rival' && score > rivalHighScore) {
        rivalHighScore = score;
        localStorage.setItem('neon_breaker_rival_high_score_v2', String(rivalHighScore));
      }

      onHudUpdateRef.current({
        playMode,
        score,
        highScore,
        rivalHighScore,
        multiplier,
        comboCount,
        winStreak,
        lives,
        maxLives,
        level: levelId,
        levelName,
        levelAuthor,
        levelComplexity,
        activeRivalLevelId,
        progress: destructibleRemaining === 0 ? 1 : displayProgress,
        boosters: { ...boosterStock },
        activeBoosters: {
          magnetTimeLeft,
          stickyTimeLeft,
          machineGunTimeLeft,
          safetyWallTimeLeft,
          speedModMode,
          speedModTimeLeft,
          paddleScaleMode,
          paddleScaleFactor,
          paddleScaleTimeLeft,
          ballStuckToPaddle: anyStuck,
          aimAngleRad,
          isFeverMode,
          feverProgress,
          nextObstacleShiftSec: Math.ceil(nextObstacleShiftTimer),
          capsulesDroppedInMatch,
          maxCapsulesInMatch,
        },
        mascotMood,
        mascotMessage,
        activeBallsCount,
        destructibleRemaining,
        hasRivalBrick: activeBricks.some((b) => b.alive && b.isRival),
        lastPowerupLabel,
        socialRival: getSocialRivalSnapshot(),
      });
    };

    const setMascotReaction = (mood: MascotMood, message: string, duration: number = 2.8) => {
      mascotMood = mood;
      mascotMessage = message;
      mascotMoodTimer = duration;
    };

    const activateBall = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      stuck: boolean = false,
      presetArcHistory: boolean = false
    ) => {
      for (let i = 0; i < ballPool.length; i++) {
        const b = ballPool[i];
        if (!b.active) {
          b.active = true;
          b.x = x;
          b.y = y;
          b.vx = vx;
          b.vy = vy;
          b.stuckToPaddle = stuck;
          b.stuckOffsetX = x - currentPaddleX;
          b.visual.orbGroup.position.set(x, y, 0.15);
          b.visual.orbGroup.visible = true;
          b.visual.trailMesh.visible = !stuck;

          const spd = Math.hypot(vx, vy);
          const dirX = spd > 0.001 ? vx / spd : 0;
          const dirY = spd > 0.001 ? vy / spd : 1;
          const stepDist = stuck ? 0 : presetArcHistory ? 0.055 : 0.035;

          for (let j = 0; j < TRAIL_SEGMENTS; j++) {
            b.visual.history[j].set(
              x - dirX * (j * stepDist),
              y - dirY * (j * stepDist),
              0.148
            );
          }
          updateOrbTrailGeometry(b.visual);
          return b;
        }
      }
      return null;
    };

    const multiplyActiveBalls = (factor: number) => {
      const targetSpd = getEffectiveTargetBallSpeed();
      const currentActive = ballPool.filter((b) => b.active);
      if (currentActive.length === 0) {
        activateBall(currentPaddleX, PADDLE_Y + 0.72, 0, targetSpd, false, false);
        return;
      }

      const targetTotal = Math.min(MAX_BALLS, currentActive.length * factor);
      const needed = targetTotal - currentActive.length;

      let spawned = 0;
      for (let i = 0; i < currentActive.length && spawned < needed; i++) {
        const src = currentActive[i];
        const copiesForThisBall = Math.ceil((needed - spawned) / (currentActive.length - i));
        for (let c = 0; c < copiesForThisBall && spawned < needed; c++) {
          const spreadAngle = ((c + 1) * 0.24 * (c % 2 === 0 ? 1 : -1)) + (Math.random() - 0.5) * 0.15;
          const baseAng = Math.atan2(src.vx, Math.max(2.5, Math.abs(src.vy)));
          const newAng = THREE.MathUtils.clamp(baseAng + spreadAngle, -1.15, 1.15);
          const spd = Math.max(targetSpd, Math.hypot(src.vx, src.vy));
          activateBall(
            src.x,
            src.y,
            Math.sin(newAng) * spd,
            Math.cos(newAng) * spd,
            false,
            false
          );
          spawned++;
        }
      }

      const totalNow = ballPool.filter((b) => b.active).length;
      if (totalNow >= 10) {
        isFeverMode = true;
        feverTimer = 10.0;
        feverProgress = 1.0;
      }
    };

    // Load either a Classic Campaign Level, a Community Rival Level, or a Draft Test Level
    const loadLevelDefinition = (def: LevelDefinition, resetScoreAndBoosters: boolean = false) => {
      playMode = def.isDraftTest ? 'draft_test' : def.isRivalLevel ? 'rival' : 'classic';
      levelId = def.id;
      levelName = def.name;
      levelAuthor = def.author;
      levelComplexity = def.complexityScore;
      activeRivalLevelId = def.rivalLevelId;
      // Slightly faster, punchy initial ball speed (~7.2 to 9.3 u/s) that progressively accelerates as bricks are broken
      ballBaseSpeed = def.ballSpeed * 0.73;
      matchElapsedTime = 0;
      bricksBrokenInLevel = 0;
      totalDestructibleBricksInLevel = 0;
      manualLaunchCooldown = 0.2;
      currentFixedBlueprints = def.fixedObstacles ?? [];
      targetRandomObstacleCount = def.randomObstacleCount ?? 1;
      obstacleShiftMinSec = def.obstacleShiftMinSec ?? 10;
      obstacleShiftMaxSec = def.obstacleShiftMaxSec ?? 18;
      descendInterval = def.descendingIntervalSec ?? 0;
      descendTimer = descendInterval;

      incrementProfileStats(0, 1);

      // Pick a strict 3-bonus random subset for this match
      const shuffled = [...ALL_CAPSULE_TYPES].sort(() => Math.random() - 0.5);
      allowedCapsulesForMatch = shuffled.slice(0, 3);
      capsulesDroppedInMatch = 0;
      maxCapsulesInMatch = def.bricks.length >= 14 ? 3 : 2;
      bricksBrokenSinceLastDrop = 0;
      paddleBouncesSinceLastDrop = 0;

      while (bricksGroup.children.length > 0) {
        bricksGroup.remove(bricksGroup.children[0]);
      }
      activeBricks = [];

      ballPool.forEach((b) => {
        b.active = false;
        b.visual.orbGroup.visible = false;
        b.visual.trailMesh.visible = false;
      });
      starPool.forEach((s) => {
        s.active = false;
        s.mesh.visible = false;
      });
      capsulePool.forEach((c) => {
        c.active = false;
        c.bundle.group.visible = false;
      });
      rocketPool.forEach((r) => {
        r.active = false;
        r.mesh.visible = false;
      });
      bulletPool.forEach((bl) => {
        bl.active = false;
        bl.mesh.visible = false;
      });

      totalMaxHpInLevel = 0;
      damageDealtInLevel = 0;

      // Reset Paddle Modifiers & Give All 3 Full Lives!
      lives = 3;
      magnetTimeLeft = 0;
      stickyTimeLeft = 0;
      machineGunTimeLeft = 0;
      safetyWallTimeLeft = 0;
      safetyWallObj.group.visible = false;
      paddleObj.gunTurret.visible = false;
      speedModMode = 'normal';
      speedModTimeLeft = 0;
      paddleScaleMode = 'normal';
      paddleScaleFactor = 1.0;
      currentSmoothPaddleScale = 1.0;
      paddleScaleTimeLeft = 0;
      paddleObj.group.scale.x = 1.0;
      isFeverMode = false;
      feverTimer = 0;
      feverProgress = 0.35;
      lastPowerupLabel = null;

      updateCameraFraming();
      cosmicBg.setLevelBiome(
        def.isRivalLevel ? ((def.complexityScore ?? 7) % 12) + 1 : def.id
      );

      def.bricks.forEach((bp, idx) => {
        const canonicalW = bp.width ?? 1.16;
        const h = bp.height ?? 0.64;
        const canonicalX = bp.x ?? 0;
        const by = bp.y ?? 0;

        const bundle = createCompositeBrickMesh(
          canonicalW,
          h,
          bp.type,
          bp.color,
          bp.hp,
          isSoftwareGl
        );
        const scaledX = canonicalX * horizontalScale;
        bundle.group.position.set(scaledX, by, 0);
        bundle.group.scale.x = horizontalScale;
        bricksGroup.add(bundle.group);

        if (bp.type !== 'metal') {
          totalMaxHpInLevel += bp.hp;
          totalDestructibleBricksInLevel++;
        }

        activeBricks.push({
          id: idx,
          row: bp.row,
          col: bp.col,
          canonicalX,
          canonicalWidth: canonicalW,
          x: scaledX,
          y: by,
          width: canonicalW * horizontalScale,
          height: h,
          type: bp.type,
          color: bp.color,
          hp: bp.hp,
          maxHp: bp.hp,
          alive: true,
          isRival: false,
          hitFlashTimer: 0,
          squashTimer: 0,
          bundle,
        });
      });

      // Spawn Fixed + Random Phasing Obstacles
      setupAndCycleObstacles(true, false);

      // NEVER auto-launch! Every level (including Level 7 on startup) waits on the paddle for manual player kickoff
      if (def.id === 7 && !def.isRivalLevel && !resetScoreAndBoosters) {
        score = def.initialScore ?? 640;
        multiplier = def.initialMultiplier ?? 2;
        initialProgressBonus = 0;
        boosterStock = { magnet: 2, rocket: 1, multiball: 3 };
      } else if (resetScoreAndBoosters || def.isRivalLevel) {
        score = 0;
        multiplier = 1;
        initialProgressBonus = 0;
        boosterStock = { magnet: 2, rocket: 1, multiball: 3 };
      } else {
        initialProgressBonus = 0;
      }

      targetPaddleX = 0;
      currentPaddleX = 0;
      paddleObj.group.position.x = 0;
      for (let i = 0; i < PADDLE_TRAIL_SEGMENTS; i++) {
        paddleTrailObj.history[i].set(0, PADDLE_Y, -0.05);
      }
      updatePaddleTrailGeometry(paddleTrailObj);
      aimAngleRad = 0.24;

      const speed = ballBaseSpeed;
      activateBall(
        0,
        PADDLE_Y + 0.72,
        Math.sin(aimAngleRad) * speed,
        Math.cos(aimAngleRad) * speed,
        true,
        false
      );

      setMascotReaction(
        'happy',
        def.isDraftTest
          ? `Test "${def.name}" · Clique ou Espace pour lancer la balle !`
          : def.isRivalLevel
          ? `Clash "${def.name}" par ${def.author} · Clique pour donner le coup d’envoi !`
          : `${def.name} prêt · Clique ou appuie sur Espace pour lancer la balle !`,
        4.0
      );

      comboCount = 0;
      lastOvertakenRivalIdx = SOCIAL_RIVALS_LADDER.findIndex((r) => r.score > score);
      emitHudUpdate();
    };

    const loadLevel = (targetLevelId: number, resetScoreAndBoosters: boolean = false) => {
      const def = getLevelById(targetLevelId);
      loadLevelDefinition(def, resetScoreAndBoosters);
    };

    const damageBrick = (
      brick: RuntimeBrick,
      damageAmount: number,
      triggeredByExplosion: boolean = false
    ) => {
      if (!brick.alive) return;

      if (brick.type === 'metal') {
        brick.hitFlashTimer = 0.08;
        brick.squashTimer = 0.12;
        soundEngine.playBrickHit(99, comboCount);
        return;
      }

      const effectiveDamage = isFeverMode ? damageAmount * 2 : damageAmount;
      const actualDmg = Math.min(brick.hp, effectiveDamage);
      brick.hp -= actualDmg;
      damageDealtInLevel += actualDmg;
      brick.hitFlashTimer = 0.09;
      brick.squashTimer = 0.16;

      const pal = BRICK_PALETTE[brick.color];
      const miniBonusMult = paddleScaleMode === 'mini' ? 1.5 : 1;
      const speedBonusMult = speedModMode === 'fast' ? 1.35 : 1;
      // Tightened realistic score for 50 mini-brick levels: ~1 pt per 2 HP removed + 15 pts per brick broken
      const dmgPoints = Math.max(
        1,
        Math.round((actualDmg / 10) * 4 * multiplier * miniBonusMult * speedBonusMult)
      );
      score += dmgPoints;

      if (!isFeverMode) {
        feverProgress = Math.min(1, feverProgress + 0.042);
        if (feverProgress >= 1) {
          isFeverMode = true;
          feverTimer = 10.0;
          setMascotReaction('ecstatic', '🔥 MODE FEVER ACTIVÉ ! DÉGÂTS DOUBLÉS ! 🔥', 3.5);
        }
      }

      if (brick.hp <= 0) {
        brick.alive = false;
        brick.bundle.group.visible = false;
        bricksBrokenInLevel++;
        incrementProfileStats(1, 0);

        // Smoothly nudge active balls toward the newly increased brick-break target speed
        const updatedTargetSpd = getEffectiveTargetBallSpeed();
        ballPool.forEach((b) => {
          if (b.active && !b.stuckToPaddle) {
            const cur = Math.hypot(b.vx, b.vy);
            if (cur > 0.01) {
              const nextS = THREE.MathUtils.lerp(cur, updatedTargetSpd, 0.35);
              b.vx = (b.vx / cur) * nextS;
              b.vy = (b.vy / cur) * nextS;
            }
          }
        });

        if (brick.isRival) {
          score += 150 * multiplier;
          spawnCrystalExplosion(brick.x, brick.y, 32, 0xffd700, true);
          maybeSpawnPowerupCapsule(brick.x, brick.y, true);
          setMascotReaction('ecstatic', '👑 VENGEANCE ACCOMPLIE ! +150 PTS & BONUS !', 4.0);
        } else {
          maybeSpawnPowerupCapsule(brick.x, brick.y, false);
        }

        if (brick.type === 'lightning') {
          score += 35 * multiplier;
          soundEngine.playLightningExplosion();
          hitstopTimer = 0.045;
          cameraShakeIntensity = 0.42;
          spawnCrystalExplosion(brick.x, brick.y - 0.35, 48, undefined, true);
          setMascotReaction('ecstatic', '⚡ DÉFLAGRATION COSMIQUE ! ⚡', 3.5);

          const blastRadius = 2.95 * horizontalScale;
          activeBricks.forEach((other) => {
            if (other.alive && other.id !== brick.id && other.type !== 'metal') {
              const dist = Math.hypot(other.x - brick.x, other.y - brick.y);
              if (dist <= blastRadius) {
                damageBrick(other, 30, true);
              }
            }
          });
        } else if (brick.type === 'kawaii_happy' || brick.type === 'kawaii_wink') {
          soundEngine.playBrickDestroy(true);
          spawnCrystalExplosion(brick.x, brick.y, 18, pal.baseHex, false);
          spawnFallingStar(brick.x - 0.3, brick.y, -2.2);
          spawnFallingStar(brick.x + 0.3, brick.y - 0.2, -2.5);
          score += 45 * multiplier;
          if (!brick.isRival) {
            setMascotReaction('ecstatic', 'Kawaii Bonus ! +45 pts & Étoiles ⭐', 3.0);
          }
        } else {
          soundEngine.playBrickDestroy(false);
          spawnCrystalExplosion(brick.x, brick.y, 14, pal.baseHex, false);
          score += 25 * multiplier;
          if (Math.random() < 0.25) {
            spawnFallingStar(brick.x, brick.y, -2.3);
          }
        }

        const remaining = activeBricks.filter((b) => b.alive && b.type !== 'metal').length;
        if (remaining === 0) {
          winStreak++;
          localStorage.setItem('neon_breaker_streak', String(winStreak));
          soundEngine.playVictory();

          // If beating another user's community Rival level, record it in the Palmarès!
          if (playMode === 'rival' && activeRivalLevelId && levelAuthor) {
            recordClashVictory({
              rivalLevelId: activeRivalLevelId,
              rivalLevelTitle: levelName,
              rivalAuthor: levelAuthor,
              complexityScore: levelComplexity ?? 50,
              scoreEarned: score,
            });
            setMascotReaction(
              'ecstatic',
              `🏆 CLASH GAGNÉ ! Vous avez battu le niveau de ${levelAuthor} !`,
              5.0
            );
          } else if (playMode === 'draft_test') {
            setMascotReaction(
              'ecstatic',
              '✔ TEST RÉUSSI ! Votre niveau brouillon est validé et prêt à être publié !',
              5.0
            );
          } else {
            setMascotReaction('ecstatic', `NIVEAU GAGNÉ ! Série de ${winStreak} victoires 🔥`, 5.0);
          }
          emitHudUpdate();
          onStateChangeRef.current('victory');
        }
      } else {
        if (!triggeredByExplosion) {
          soundEngine.playBrickHit(brick.hp, comboCount);
        }
        spawnCrystalExplosion(brick.x, brick.y, 4, pal.baseHex, false);
        brick.bundle.faceMesh.material.map = getBrickFaceTexture(
          brick.type,
          brick.color,
          brick.hp,
          brick.isRival
        );
        brick.bundle.faceMesh.material.needsUpdate = true;
      }
    };

    const rescaleActiveBallsSpeed = (newTargetSpeed: number) => {
      ballPool.forEach((b) => {
        if (b.active && !b.stuckToPaddle) {
          const cur = Math.hypot(b.vx, b.vy);
          if (cur > 0.01) {
            const ratio = newTargetSpeed / cur;
            b.vx *= ratio;
            b.vy *= ratio;
          }
        }
      });
    };

    // Apply Collected Capsule Effect (Including Machine Gun, Safety Wall, Speed Turbo/Slow!)
    const applyCollectedCapsule = (type: CapsulePowerupType) => {
      const meta = CAPSULE_META[type];
      soundEngine.playCapsuleCollect(type);
      lastPowerupLabel = meta.announcement;
      lastPowerupTimer = 3.4;

      if (type === 'paddle_xl') {
        paddleScaleMode = 'xl';
        paddleScaleFactor = Math.min(1.85, paddleScaleFactor + 0.45);
        paddleScaleTimeLeft = 14.0;
        setMascotReaction('ecstatic', '🟢 BARRE XL GÉANTE !', 3.2);
      } else if (type === 'paddle_mini') {
        paddleScaleMode = 'mini';
        paddleScaleFactor = 0.68;
        paddleScaleTimeLeft = 9.0;
        setMascotReaction('worried', '🟠 PIÈGE BARRE MINI ! Mais Points x2 !', 3.2);
      } else if (type === 'paddle_sticky') {
        stickyTimeLeft = 12.0;
        setMascotReaction('cheering', '🧲 BARRE COLLANTE ! Garde et vise tes billes !', 3.2);
      } else if (type === 'machine_gun') {
        machineGunTimeLeft = 5.0; // Strict 5 seconds max duration!
        machineGunFireCooldown = 0.08;
        paddleObj.gunTurret.visible = true;
        setMascotReaction('ecstatic', '🔫 MITRAILLEUSE (5s MAX) ! Vise avec ton curseur !', 3.4);
      } else if (type === 'safety_wall') {
        safetyWallTimeLeft = 18.0;
        safetyWallObj.group.visible = true;
        setMascotReaction('cheering', '🛡️ MUR DE SÉCURITÉ ACTIVÉ (1 Sauvetage) !', 3.5);
      } else if (type === 'speed_fast') {
        speedModMode = 'fast';
        speedModTimeLeft = 11.0;
        rescaleActiveBallsSpeed(getEffectiveTargetBallSpeed());
        setMascotReaction('ecstatic', '⚡ VITESSE TURBO (+25% · Points x1.5) !', 3.2);
      } else if (type === 'speed_slow') {
        speedModMode = 'slow';
        speedModTimeLeft = 11.0;
        rescaleActiveBallsSpeed(getEffectiveTargetBallSpeed());
        setMascotReaction('happy', '❄️ BALLE RALENTIE (-25%) ! Contrôle total !', 3.2);
      } else if (type === 'multiball_3') {
        multiplyActiveBalls(3);
        setMascotReaction('ecstatic', '🔵 MULTI-BILLES x3 ACTIVÉ !', 3.2);
      } else if (type === 'multiball_5') {
        multiplyActiveBalls(5);
        setMascotReaction('ecstatic', '🟣 MEGA MULTI-BILLES x5 !', 3.5);
      } else if (type === 'multiball_10') {
        multiplyActiveBalls(10);
        cameraShakeIntensity = 0.35;
        setMascotReaction('ecstatic', '🔥 JACKPOT x10 BILLES ! SURCHARGE NÉON ! 🔥', 4.0);
      }
      emitHudUpdate();
    };

    const launchStuckBalls = () => {
      let launched = false;
      const spd = getEffectiveTargetBallSpeed();
      const dirX = Math.sin(aimAngleRad);
      const dirY = Math.cos(aimAngleRad);
      for (let i = 0; i < ballPool.length; i++) {
        const b = ballPool[i];
        if (b.active && b.stuckToPaddle) {
          b.stuckToPaddle = false;
          b.vx = dirX * spd;
          b.vy = dirY * spd;
          b.visual.trailMesh.visible = true;
          for (let j = 0; j < TRAIL_SEGMENTS; j++) {
            b.visual.history[j].set(
              b.x - dirX * (j * 0.032),
              b.y - dirY * (j * 0.032),
              0.148
            );
          }
          updateOrbTrailGeometry(b.visual);
          launched = true;
        }
      }
      if (launched) {
        soundEngine.playPaddleBounce(1);
        emitHudUpdate();
      }
    };

    const triggerBooster = (type: 'magnet' | 'rocket' | 'multiball') => {
      if (gameStateRef.current !== 'playing') return;

      if (type === 'magnet' && boosterStock.magnet > 0) {
        boosterStock.magnet--;
        magnetTimeLeft = 12.0;
        stickyTimeLeft = 12.0;
        soundEngine.playBooster('magnet');
        setMascotReaction('cheering', 'Aimant + Colle Activés ! Visée Laser !', 3.0);
        emitHudUpdate();
      } else if (type === 'rocket' && boosterStock.rocket > 0) {
        boosterStock.rocket--;
        soundEngine.playBooster('rocket');
        for (let i = 0; i < rocketPool.length; i++) {
          const r = rocketPool[i];
          if (!r.active) {
            r.active = true;
            r.x = currentPaddleX;
            r.y = PADDLE_Y + 0.6;
            r.mesh.position.set(r.x, r.y, 0.2);
            r.mesh.visible = true;
            break;
          }
        }
        cameraShakeIntensity = 0.22;
        setMascotReaction('cheering', '🚀 Fusée Lancée ! Colonne Pulvérisée !', 3.0);
        emitHudUpdate();
      } else if (type === 'multiball' && boosterStock.multiball > 0) {
        boosterStock.multiball--;
        soundEngine.playBooster('multiball');
        multiplyActiveBalls(3);
        setMascotReaction('ecstatic', '🟣 Multi-Billes x3 ! Pluie Néon !', 3.2);
        emitHudUpdate();
      }
    };

    engineRef.current = {
      triggerBooster,
      launchStuckBalls,
      startLevel: (id: number, resetScore: boolean = false) => {
        loadLevel(id, resetScore);
      },
      startCustomLevel: (def: LevelDefinition) => {
        loadLevelDefinition(def, true);
      },
      triggerDemoLightningBurst: () => {
        const lightningBrick = activeBricks.find((b) => b.alive && b.type === 'lightning');
        if (lightningBrick) {
          damageBrick(lightningBrick, 50);
          emitHudUpdate();
        } else {
          soundEngine.playLightningExplosion();
          cameraShakeIntensity = 0.38;
          spawnCrystalExplosion(0.1, 1.4, 45, undefined, true);
          setMascotReaction('ecstatic', '⚡ Explosion Cristalline ! ⚡', 3.0);
          emitHudUpdate();
        }
      },
    };

    loadLevel(currentLevelId, false);

    // 9. 100% Edge-to-Edge Pointer & Touch Controls + Cursor Aiming for Machine Gun
    const getMaxPaddleCenterOffset = () => {
      const effectiveHalfPaddle = (BASE_PADDLE_WIDTH * currentSmoothPaddleScale) * 0.5;
      return Math.max(0.5, arenaHalfWidth - effectiveHalfPaddle * 0.65);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
      const maxOffset = getMaxPaddleCenterOffset();

      targetPaddleX = THREE.MathUtils.clamp(
        normX * arenaHalfWidth,
        -maxOffset,
        maxOffset
      );
      aimAngleRad = THREE.MathUtils.clamp(normX * 0.68, -0.68, 0.68);

      // Update world coordinates of cursor/finger so the Machine Gun Turret can aim toward it!
      pointerWorldX = normX * arenaHalfWidth;
      pointerWorldY = Math.max(PADDLE_Y + 1.8, normY * 6.8);
    };

    const handlePointerDown = (e: PointerEvent) => {
      handlePointerMove(e);
      if (gameStateRef.current === 'playing' && manualLaunchCooldown <= 0) {
        launchStuckBalls();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      heldKeys.add(e.code);
      if (gameStateRef.current === 'playing') {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
          launchStuckBalls();
        } else if (e.code === 'Digit1' || e.code === 'Numpad1') {
          triggerBooster('magnet');
        } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
          triggerBooster('rocket');
        } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
          triggerBooster('multiball');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      heldKeys.delete(e.code);
    };

    const handleWindowBlur = () => {
      heldKeys.clear();
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointermove', handlePointerMove);
    domElem.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('resize', updateCameraFraming);

    // 10. Main 60FPS Simulation & Render Loop
    const clock = new THREE.Clock();
    let frameId = 0;
    let hudSyncAccumulator = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = clock.getElapsedTime();

      // Ultra-slow rotation for the deep-space starfield
      starfield.rotation.z = Math.sin(elapsed * 0.025) * 0.03;
      cosmicBg.update(dt, elapsed, currentPaddleX);

      if (mascotMoodTimer > 0) {
        mascotMoodTimer -= dt;
        if (mascotMoodTimer <= 0) {
          mascotMood = lives === 1 ? 'worried' : isFeverMode || multiplier >= 3 ? 'ecstatic' : 'happy';
          mascotMessage = isFeverMode
            ? '🔥 SURCHARGE NÉON ACTIVE ! DÉGÂTS x2 !'
            : machineGunTimeLeft > 0
            ? '🔫 Mitrailleuse active · Vise les briques au curseur !'
            : safetyWallTimeLeft > 0
            ? '🛡️ Bouclier de sécurité actif sous la raquette !'
            : activeBricks.some((b) => b.alive && b.isRival)
            ? '👑 Détruis la Brique Rivale pour te venger !'
            : `Bonus rares (${capsulesDroppedInMatch}/${maxCapsulesInMatch}) · Charbonne !`;
        }
      }

      if (lastPowerupTimer > 0) {
        lastPowerupTimer -= dt;
        if (lastPowerupTimer <= 0) lastPowerupLabel = null;
      }

      if (socialJustOvertakenTimer > 0) {
        socialJustOvertakenTimer = Math.max(0, socialJustOvertakenTimer - dt);
      }

      // Smoothly interpolate Paddle Width Scale (XL / MINI / Normal)
      if (paddleScaleTimeLeft > 0 && gameStateRef.current === 'playing') {
        paddleScaleTimeLeft = Math.max(0, paddleScaleTimeLeft - dt);
        if (paddleScaleTimeLeft <= 0) {
          paddleScaleMode = 'normal';
          paddleScaleFactor = 1.0;
        }
      }
      currentSmoothPaddleScale = THREE.MathUtils.damp(
        currentSmoothPaddleScale,
        paddleScaleFactor,
        10,
        dt
      );
      paddleObj.group.scale.x = currentSmoothPaddleScale;
      // Keep gun turret un-stretched horizontally when paddle scales
      paddleObj.gunTurret.scale.x = 1 / Math.max(0.5, currentSmoothPaddleScale);

      // Color paddle sleeve by active power-up mode
      if (machineGunTimeLeft > 0) {
        paddleObj.sleeveMat.color.setHex(0xf43f5e);
      } else if (paddleScaleMode === 'xl') {
        paddleObj.sleeveMat.color.setHex(0x10e84a);
      } else if (paddleScaleMode === 'mini') {
        paddleObj.sleeveMat.color.setHex(0xff5500);
      } else if (stickyTimeLeft > 0) {
        paddleObj.sleeveMat.color.setHex(0xa855f7);
      } else {
        paddleObj.sleeveMat.color.setHex(0x0099ff);
      }

      // Keyboard paddle movement
      const maxOffset = getMaxPaddleCenterOffset();
      const keySpeed = 14.5;
      if (heldKeys.has('ArrowLeft') || heldKeys.has('KeyA')) {
        targetPaddleX = Math.max(-maxOffset, targetPaddleX - keySpeed * dt);
        aimAngleRad = THREE.MathUtils.clamp(aimAngleRad - 1.5 * dt, -0.68, 0.68);
        pointerWorldX = targetPaddleX;
      }
      if (heldKeys.has('ArrowRight') || heldKeys.has('KeyD')) {
        targetPaddleX = Math.min(maxOffset, targetPaddleX + keySpeed * dt);
        aimAngleRad = THREE.MathUtils.clamp(aimAngleRad + 1.5 * dt, -0.68, 0.68);
        pointerWorldX = targetPaddleX;
      }
      targetPaddleX = THREE.MathUtils.clamp(targetPaddleX, -maxOffset, maxOffset);

      const prevPaddleX = currentPaddleX;
      currentPaddleX = THREE.MathUtils.damp(currentPaddleX, targetPaddleX, 22, dt);
      const paddleVx = dt > 0.0001 ? (currentPaddleX - prevPaddleX) / dt : 0;
      paddleObj.group.position.x = currentPaddleX;
      floorGlow.position.x = currentPaddleX * 0.65;

      // Update 4x Longer Colorful Paddle Trail & Emit Sparkling Paddle Stardust
      const pHist = paddleTrailObj.history;
      for (let j = pHist.length - 1; j > 0; j--) {
        pHist[j].lerp(pHist[j - 1], 0.85);
      }
      pHist[0].set(currentPaddleX, PADDLE_Y, -0.05);
      updatePaddleTrailGeometry(paddleTrailObj);

      if (Math.abs(paddleVx) > 0.8) {
        const dustCount = Math.min(3, Math.ceil(Math.abs(paddleVx) * 0.18));
        for (let d = 0; d < dustCount; d++) {
          spawnWakeDust(
            currentPaddleX + (Math.random() - 0.5) * (BASE_PADDLE_WIDTH * currentSmoothPaddleScale * 0.85),
            PADDLE_Y + (Math.random() - 0.5) * 0.24,
            -paddleVx * 0.18,
            0.35 + Math.random() * 0.55,
            0.18,
            0.75
          );
        }
      }

      // Active Power-up Timers
      if (magnetTimeLeft > 0 && gameStateRef.current === 'playing') {
        magnetTimeLeft = Math.max(0, magnetTimeLeft - dt);
      }
      if (stickyTimeLeft > 0 && gameStateRef.current === 'playing') {
        stickyTimeLeft = Math.max(0, stickyTimeLeft - dt);
      }
      if (speedModTimeLeft > 0 && gameStateRef.current === 'playing') {
        speedModTimeLeft = Math.max(0, speedModTimeLeft - dt);
        if (speedModTimeLeft <= 0) {
          speedModMode = 'normal';
          rescaleActiveBallsSpeed(getEffectiveTargetBallSpeed());
        }
      }
      if (safetyWallTimeLeft > 0 && gameStateRef.current === 'playing') {
        safetyWallTimeLeft = Math.max(0, safetyWallTimeLeft - dt);
        safetyWallObj.group.visible = safetyWallTimeLeft > 0;
        safetyWallObj.beamMat.opacity = 0.65 + Math.sin(elapsed * 14) * 0.25;
      } else {
        safetyWallObj.group.visible = false;
      }

      // Machine Gun Turret Aim & Auto-Burst Firing toward Cursor
      if (machineGunTimeLeft > 0 && gameStateRef.current === 'playing') {
        machineGunTimeLeft = Math.max(0, machineGunTimeLeft - dt);
        paddleObj.gunTurret.visible = machineGunTimeLeft > 0;

        // Calculate aim angle from paddle turret to cursor world position
        const dx = pointerWorldX - currentPaddleX;
        const dy = Math.max(1.5, pointerWorldY - PADDLE_Y);
        turretAimAngle = THREE.MathUtils.clamp(Math.atan2(dx, dy), -0.82, 0.82);
        paddleObj.gunTurret.rotation.z = -turretAimAngle;

        machineGunFireCooldown -= dt;
        if (machineGunFireCooldown <= 0) {
          machineGunFireCooldown = 0.19; // Rapid twin-barrel burst!
          muzzleFlashTimer = 0.06;
          soundEngine.playMachineGunShot();

          const bulletSpeed = 19.5;
          const bvx = Math.sin(turretAimAngle) * bulletSpeed;
          const bvy = Math.cos(turretAimAngle) * bulletSpeed;

          // Spawn from alternating or twin barrels
          [-0.14, 0.14].forEach((offsetX) => {
            for (let i = 0; i < bulletPool.length; i++) {
              const bl = bulletPool[i];
              if (!bl.active) {
                bl.active = true;
                bl.x = currentPaddleX + offsetX;
                bl.y = PADDLE_Y + 0.72;
                bl.vx = bvx;
                bl.vy = bvy;
                bl.mesh.position.set(bl.x, bl.y, 0.22);
                bl.mesh.rotation.z = -turretAimAngle;
                bl.mesh.visible = true;
                break;
              }
            }
          });
        }
      } else {
        paddleObj.gunTurret.visible = false;
      }

      if (muzzleFlashTimer > 0) {
        muzzleFlashTimer = Math.max(0, muzzleFlashTimer - dt);
        (paddleObj.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0.95;
      } else {
        (paddleObj.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0;
      }

      if (feverTimer > 0 && gameStateRef.current === 'playing') {
        feverTimer = Math.max(0, feverTimer - dt);
        feverProgress = feverTimer / 10.0;
        if (feverTimer <= 0) {
          isFeverMode = false;
          feverProgress = 0.2;
        }
      }

      if (magnetTimeLeft > 0 || stickyTimeLeft > 0) {
        (paddleObj.magnetAura.material as THREE.MeshBasicMaterial).opacity =
          0.38 + Math.sin(elapsed * 10) * 0.16;
        paddleObj.magnetAura.scale.setScalar(1 + Math.sin(elapsed * 8) * 0.06);
      } else {
        (paddleObj.magnetAura.material as THREE.MeshBasicMaterial).opacity = 0;
      }

      const anyBallStuck = ballPool.some((b) => b.active && b.stuckToPaddle);
      paddleObj.aimLine.visible = anyBallStuck;
      if (anyBallStuck) {
        const stuckBall = ballPool.find((b) => b.active && b.stuckToPaddle)!;
        const posAttr = paddleObj.aimLine.geometry.getAttribute(
          'position'
        ) as THREE.BufferAttribute;
        const startX = (stuckBall.x - currentPaddleX) / currentSmoothPaddleScale;
        posAttr.setXYZ(0, startX, 0.45, 0.1);
        posAttr.setXYZ(
          1,
          startX + Math.sin(aimAngleRad) * 4.2,
          0.45 + Math.cos(aimAngleRad) * 4.2,
          0.1
        );
        posAttr.needsUpdate = true;
        paddleObj.aimLine.computeLineDistances();
      }

      if (centralBurstTimer > 0) {
        centralBurstTimer = Math.max(0, centralBurstTimer - dt);
        const norm = centralBurstTimer / 1.35;
        coreFlareMat.opacity = Math.pow(norm, 1.4);
        coreFlareMesh.scale.setScalar(1.0 + Math.sin(elapsed * 18) * 0.08);
        centerBurstLight.intensity = norm * 5.0;
      } else {
        coreFlareMat.opacity = 0;
        centerBurstLight.intensity = 0;
      }

      const baseZ = camera.userData.baseZ || 18;
      if (cameraShakeIntensity > 0) {
        cameraShakeIntensity = Math.max(0, cameraShakeIntensity - dt * 1.8);
        camera.position.x = (Math.random() - 0.5) * cameraShakeIntensity;
        camera.position.y = -0.35 + (Math.random() - 0.5) * cameraShakeIntensity;
        camera.position.z = baseZ;
      } else {
        camera.position.set(0, -0.35, baseZ);
      }

      // Advance active gameplay simulation
      if (manualLaunchCooldown > 0) {
        manualLaunchCooldown = Math.max(0, manualLaunchCooldown - dt);
      }
      if (gameStateRef.current === 'playing') {
        // Failsafe 1: If returning to 'playing' when the board has 0 destructible bricks left or 0 lives, reload the level cleanly
        const remainingDestructible = activeBricks.filter(
          (b) => b.alive && b.type !== 'metal'
        ).length;
        if (lives <= 0 || remainingDestructible === 0) {
          loadLevel(levelId, false);
        }

        // Failsafe 2: NEVER allow a match in 'playing' state to have 0 balls!
        const hasAnyActiveBall = ballPool.some((b) => b.active);
        if (!hasAnyActiveBall) {
          const fallbackSpd = getEffectiveTargetBallSpeed();
          manualLaunchCooldown = 0.2;
          activateBall(
            currentPaddleX,
            PADDLE_Y + 0.72,
            Math.sin(aimAngleRad) * fallbackSpd,
            Math.cos(aimAngleRad) * fallbackSpd,
            true,
            false
          );
          emitHudUpdate();
        }

        if (!anyBallStuck) {
          matchElapsedTime += dt;
        }
        if (hitstopTimer > 0) {
          hitstopTimer = Math.max(0, hitstopTimer - dt);
        } else {
          // 10s - 20s Random Obstacle Appear/Disappear Cycle (Fixed obstacles stay anchored!)
          if (targetRandomObstacleCount > 0) {
            nextObstacleShiftTimer -= dt;
            if (nextObstacleShiftTimer <= 0) {
              setupAndCycleObstacles(false, true);
              setMascotReaction('cheering', '🌀 Obstacles Aléatoires Téléportés !', 2.4);
            }
          }

          // Animate Obstacles & Warmup Rings
          for (let i = 0; i < obstaclePool.length; i++) {
            const ob = obstaclePool[i];
            if (!ob.active) continue;
            if (ob.cooldown > 0) ob.cooldown = Math.max(0, ob.cooldown - dt);
            if (ob.hitPulse > 0) ob.hitPulse = Math.max(0, ob.hitPulse - dt * 4);

            if (ob.spawnWarmup > 0) {
              ob.spawnWarmup = Math.max(0, ob.spawnWarmup - dt);
              ob.bundle.coreMesh.scale.setScalar(1 - ob.spawnWarmup / 1.15);
              ob.bundle.warningRing.visible = true;
              ob.bundle.warningRing.scale.setScalar(1 + Math.sin(elapsed * 16) * 0.18);
            } else {
              ob.bundle.warningRing.visible = false;
              const pulseScale = 1 + ob.hitPulse * 0.35;
              ob.bundle.coreMesh.scale.setScalar(pulseScale);
              ob.bundle.outerRing.scale.setScalar(pulseScale);
            }

            ob.bundle.coreMesh.rotation.y += dt * (ob.kind === 'prism' ? 3.8 : 2.2);
            ob.bundle.coreMesh.rotation.x += dt * 1.5;
            ob.bundle.outerRing.rotation.z -= dt * (ob.kind === 'vortex' ? 5.5 : 2.0);
          }

          // Optional descending bricks in advanced levels
          if (descendInterval > 0) {
            descendTimer -= dt;
            if (descendTimer <= 0) {
              descendTimer = descendInterval;
              activeBricks.forEach((b) => {
                if (b.alive) {
                  b.y -= 0.38;
                  b.bundle.group.position.y = b.y;
                }
              });
            }
          }

          const effectivePaddleWidth = BASE_PADDLE_WIDTH * currentSmoothPaddleScale;
          const targetSpd = getEffectiveTargetBallSpeed();
          const SUB_STEPS = 3;
          const subDt = dt / SUB_STEPS;

          for (let bIdx = 0; bIdx < ballPool.length; bIdx++) {
            const ball = ballPool[bIdx];
            if (!ball.active) continue;

            // Sanitize any NaN or stalled coordinates so a ball can never vanish
            if (!Number.isFinite(ball.x) || !Number.isFinite(ball.y)) {
              ball.x = currentPaddleX;
              ball.y = PADDLE_Y + 0.72;
              ball.stuckToPaddle = true;
            }

            ball.visual.shellMat.emissive.setHex(
              isFeverMode
                ? 0xffb800
                : speedModMode === 'fast'
                ? 0xff5500
                : speedModMode === 'slow'
                ? 0x60a5fa
                : 0x00f0ff
            );

            if (ball.stuckToPaddle) {
              ball.x = THREE.MathUtils.clamp(
                currentPaddleX + ball.stuckOffsetX,
                -arenaHalfWidth + ball.radius,
                arenaHalfWidth - ball.radius
              );
              ball.y = PADDLE_Y + PADDLE_HALF_H + ball.radius + 0.04;
              ball.visual.trailMesh.visible = false;
              const hist = ball.visual.history;
              for (let j = 0; j < hist.length; j++) {
                hist[j].set(ball.x, ball.y, 0.148);
              }
            } else {
              ball.visual.trailMesh.visible = true;
              const hist = ball.visual.history;

              for (let step = 0; step < SUB_STEPS; step++) {
                ball.x += ball.vx * subDt;
                ball.y += ball.vy * subDt;

                // 100% Edge-to-Edge Left / Right Screen Border Collisions
                if (ball.x - ball.radius < -arenaHalfWidth) {
                  ball.x = -arenaHalfWidth + ball.radius;
                  ball.vx = Math.abs(ball.vx);
                  soundEngine.playPaddleBounce(comboCount);
                } else if (ball.x + ball.radius > arenaHalfWidth) {
                  ball.x = arenaHalfWidth - ball.radius;
                  ball.vx = -Math.abs(ball.vx);
                  soundEngine.playPaddleBounce(comboCount);
                }

                // Top Wall Collision
                if (ball.y + ball.radius > ARENA_TOP_Y) {
                  ball.y = ARENA_TOP_Y - ball.radius;
                  ball.vy = -Math.abs(ball.vy);
                  soundEngine.playPaddleBounce(comboCount);
                }

                // Paddle Collision (Covers 100% of corners when paddle is at screen edge)
                if (
                  ball.vy < 0 &&
                  ball.y - ball.radius <= PADDLE_Y + PADDLE_HALF_H &&
                  ball.y + ball.radius >= PADDLE_Y - PADDLE_HALF_H - 0.15 &&
                  ball.x >= currentPaddleX - effectivePaddleWidth * 0.5 - ball.radius * 0.85 &&
                  ball.x <= currentPaddleX + effectivePaddleWidth * 0.5 + ball.radius * 0.85
                ) {
                  paddleBouncesSinceLastDrop++;

                  const hitOffset = THREE.MathUtils.clamp(
                    (ball.x - currentPaddleX) / (effectivePaddleWidth * 0.5),
                    -1,
                    1
                  );
                  const bounceAngle = hitOffset * (Math.PI * 0.36);

                  if (magnetTimeLeft > 0 || stickyTimeLeft > 0) {
                    ball.stuckToPaddle = true;
                    ball.stuckOffsetX = THREE.MathUtils.clamp(
                      ball.x - currentPaddleX,
                      -effectivePaddleWidth * 0.4,
                      effectivePaddleWidth * 0.4
                    );
                    aimAngleRad = bounceAngle;
                    soundEngine.playBooster('magnet');
                    break;
                  } else {
                    ball.y = PADDLE_Y + PADDLE_HALF_H + ball.radius + 0.02;
                    // Controlled speed on paddle bounce (no runaway acceleration)
                    const edgeMod = 0.98 + Math.abs(hitOffset) * 0.06;
                    const speed = targetSpd * edgeMod;
                    ball.vx = Math.sin(bounceAngle) * speed;
                    ball.vy = Math.cos(bounceAngle) * speed;
                    comboCount = 0;
                    soundEngine.playPaddleBounce(1);
                  }
                }

                // Safety Wall Collision (Saves a missed ball ONCE and immediately disappears!)
                if (
                  safetyWallTimeLeft > 0 &&
                  ball.vy < 0 &&
                  ball.y - ball.radius <= SAFETY_WALL_Y + 0.14 &&
                  ball.y + ball.radius >= SAFETY_WALL_Y - 0.35
                ) {
                  ball.y = SAFETY_WALL_Y + ball.radius + 0.15;
                  ball.vy = Math.abs(ball.vy);
                  safetyWallTimeLeft = 0;
                  safetyWallObj.group.visible = false;
                  soundEngine.playSafetyWallSave();
                  cameraShakeIntensity = 0.2;
                  spawnCrystalExplosion(ball.x, SAFETY_WALL_Y, 22, 0x00f0ff, false);
                  setMascotReaction('ecstatic', '🛡️ SAUVETAGE BOUCLIER ! Le mur a absorbé l’impact !', 3.2);
                  emitHudUpdate();
                }

                // Obstacle Collisions (Fixed & Random Bumpers, Rotating Prisms, Speed Vortex)
                for (let oIdx = 0; oIdx < obstaclePool.length; oIdx++) {
                  const ob = obstaclePool[oIdx];
                  if (!ob.active || ob.spawnWarmup > 0 || ob.cooldown > 0) continue;

                  const dx = ball.x - ob.x;
                  const dy = ball.y - ob.y;
                  const dist = Math.hypot(dx, dy);
                  const minDist = ball.radius + ob.radius;

                  if (dist < minDist && dist > 0.0001) {
                    ob.cooldown = 0.09;
                    ob.hitPulse = 1.0;
                    soundEngine.playObstacleDeflect(ob.kind);
                    score += 10 * multiplier;

                    const nx = dx / dist;
                    const ny = dy / dist;
                    ball.x = ob.x + nx * (minDist + 0.03);
                    ball.y = ob.y + ny * (minDist + 0.03);

                    if (ob.kind === 'bumper') {
                      const bumperSpd = targetSpd * 1.05;
                      ball.vx = nx * bumperSpd;
                      ball.vy = ny * bumperSpd;
                      if (Math.abs(ball.vy) < 2.2) {
                        ball.vy = Math.sign(ball.vy || 1) * 2.8;
                      }
                      spawnCrystalExplosion(ob.x, ob.y, 7, 0xff1688, false);
                    } else if (ob.kind === 'prism') {
                      const curAngle = Math.atan2(ball.vx, ball.vy);
                      const deflect = (Math.random() < 0.5 ? -1 : 1) * (0.65 + Math.random() * 0.35);
                      const nextAngle = curAngle + deflect;
                      ball.vx = Math.sin(nextAngle) * targetSpd;
                      ball.vy = Math.cos(nextAngle) * targetSpd;
                      if (Math.abs(ball.vy) < 2.2) {
                        ball.vy = Math.sign(ball.vy || 1) * 2.8;
                      }
                      spawnCrystalExplosion(ob.x, ob.y, 6, 0xffe066, false);
                    } else {
                      const vortexSpd = targetSpd * 1.08;
                      const upAngle = (Math.random() - 0.5) * 0.85;
                      ball.vx = Math.sin(upAngle) * vortexSpd;
                      ball.vy = Math.abs(Math.cos(upAngle) * vortexSpd);
                      spawnCrystalExplosion(ob.x, ob.y, 8, 0x10e84a, false);
                    }
                    break;
                  }
                }

                // Brick Collisions
                for (let k = 0; k < activeBricks.length; k++) {
                  const br = activeBricks[k];
                  if (!br.alive) continue;

                  const halfW = br.width * 0.5;
                  const halfH = br.height * 0.5;
                  const closestX = THREE.MathUtils.clamp(ball.x, br.x - halfW, br.x + halfW);
                  const closestY = THREE.MathUtils.clamp(ball.y, br.y - halfH, br.y + halfH);
                  const dx = ball.x - closestX;
                  const dy = ball.y - closestY;
                  const distSq = dx * dx + dy * dy;

                  if (distSq <= ball.radius * ball.radius) {
                    const overlapX = halfW + ball.radius - Math.abs(ball.x - br.x);
                    const overlapY = halfH + ball.radius - Math.abs(ball.y - br.y);

                    if (overlapX < overlapY) {
                      ball.vx = ball.x < br.x ? -Math.abs(ball.vx) : Math.abs(ball.vx);
                      ball.x += ball.x < br.x ? -overlapX : overlapX;
                    } else {
                      ball.vy = ball.y < br.y ? -Math.abs(ball.vy) : Math.abs(ball.vy);
                      ball.y += ball.y < br.y ? -overlapY : overlapY;
                    }

                    // Keep ball speed regulated to targetSpd without runaway acceleration
                    const curS = Math.hypot(ball.vx, ball.vy);
                    if (curS > 0.01) {
                      const nextS = THREE.MathUtils.lerp(curS, targetSpd, 0.45);
                      ball.vx = (ball.vx / curS) * nextS;
                      ball.vy = (ball.vy / curS) * nextS;
                    }

                    comboCount++;
                    if (comboCount >= 10 && multiplier < 4) {
                      multiplier = Math.min(4, multiplier + 1);
                    }

                    damageBrick(br, 10, false);
                    emitHudUpdate();
                    break;
                  }
                }
              }

              // Check if ball fell below bottom boundary
              if (ball.y < PADDLE_Y - 1.75) {
                ball.active = false;
                ball.visual.orbGroup.visible = false;
                ball.visual.trailMesh.visible = false;

                const stillActive = ballPool.filter((b) => b.active).length;
                if (stillActive === 0) {
                  lives = Math.max(0, lives - 1);
                  comboCount = 0;
                  soundEngine.playLoseLife();

                  if (lives <= 0) {
                    winStreak = 0;
                    localStorage.setItem('neon_breaker_streak', '0');
                    setMascotReaction('worried', '3 Vies Perdues ! Prends ta revanche !', 5.0);
                    emitHudUpdate();
                    onStateChangeRef.current('gameover');
                  } else {
                    designateRivalRevengeBrick();
                    setMascotReaction(
                      'worried',
                      `Vie perdue (${lives}/3) ! Venge-toi sur la Brique Rivale 👑 !`,
                      4.0
                    );
                    const spd = getEffectiveTargetBallSpeed();
                    activateBall(
                      currentPaddleX,
                      PADDLE_Y + 0.72,
                      Math.sin(0.2) * spd,
                      Math.cos(0.2) * spd,
                      true,
                      false
                    );
                    emitHudUpdate();
                  }
                }
              }
            }

            if (ball.active) {
              ball.visual.orbGroup.position.set(ball.x, ball.y, 0.15);
              ball.visual.orbGroup.rotation.z += dt * 4.5;
              if (!ball.stuckToPaddle) {
                const hist = ball.visual.history;
                for (let j = hist.length - 1; j > 0; j--) {
                  hist[j].lerp(hist[j - 1], 0.88);
                }
                hist[0].set(ball.x, ball.y, 0.148);
                // Emit continuous sparkling colorful stardust along the ball's 4x trail wake
                spawnWakeDust(
                  ball.x - ball.vx * 0.012,
                  ball.y - ball.vy * 0.012,
                  -ball.vx * 0.08,
                  -ball.vy * 0.08,
                  0.16,
                  0.62
                );
              }
              updateOrbTrailGeometry(ball.visual);
            }
          }

          // Update Machine Gun Plasma Bullets
          for (let i = 0; i < bulletPool.length; i++) {
            const bl = bulletPool[i];
            if (!bl.active) continue;

            bl.x += bl.vx * dt;
            bl.y += bl.vy * dt;
            bl.mesh.position.set(bl.x, bl.y, 0.22);

            let hitSomething = false;
            for (let k = 0; k < activeBricks.length; k++) {
              const br = activeBricks[k];
              if (!br.alive) continue;
              if (
                Math.abs(bl.x - br.x) <= br.width * 0.54 &&
                Math.abs(bl.y - br.y) <= br.height * 0.54
              ) {
                damageBrick(br, 10, false);
                hitSomething = true;
                break;
              }
            }

            if (
              hitSomething ||
              bl.y > ARENA_TOP_Y + 0.5 ||
              Math.abs(bl.x) > arenaHalfWidth + 0.5
            ) {
              bl.active = false;
              bl.mesh.visible = false;
            }
          }

          // Update Falling Mystery Power-up Capsules
          for (let i = 0; i < capsulePool.length; i++) {
            const cap = capsulePool[i];
            if (!cap.active) continue;

            if (magnetTimeLeft > 0 && cap.type !== 'paddle_mini') {
              _tmpVec3.set(currentPaddleX - cap.x, PADDLE_Y - cap.y, 0).normalize();
              cap.x += _tmpVec3.x * 6.5 * dt;
            }

            cap.y += cap.vy * dt;
            cap.bundle.group.position.set(cap.x, cap.y, 0.25);
            cap.bundle.group.rotation.z = Math.sin(elapsed * 5 + i) * 0.12;

            if (
              Math.abs(cap.y - PADDLE_Y) < 0.75 &&
              Math.abs(cap.x - currentPaddleX) < effectivePaddleWidth * 0.58
            ) {
              cap.active = false;
              cap.bundle.group.visible = false;
              spawnCrystalExplosion(cap.x, cap.y, 12, CAPSULE_META[cap.type].colorHex, false);
              applyCollectedCapsule(cap.type);
            } else if (cap.y < PADDLE_Y - 2.0) {
              cap.active = false;
              cap.bundle.group.visible = false;
            }
          }

          // Update Falling Golden Stars
          for (let i = 0; i < starPool.length; i++) {
            const st = starPool[i];
            if (!st.active) continue;

            if (magnetTimeLeft > 0) {
              _tmpVec3.set(currentPaddleX - st.x, PADDLE_Y - st.y, 0).normalize();
              st.vx = THREE.MathUtils.lerp(st.vx, _tmpVec3.x * 9.5, dt * 6);
              st.vy = THREE.MathUtils.lerp(st.vy, _tmpVec3.y * 9.5, dt * 6);
            }

            st.x += st.vx * dt;
            st.y += st.vy * dt;
            st.rotZ += dt * 2.8;
            st.mesh.position.set(st.x, st.y, 0.22);
            st.mesh.rotation.y = elapsed * 2.4 + i;
            st.mesh.rotation.z = Math.sin(st.rotZ) * 0.25;

            if (
              Math.abs(st.y - PADDLE_Y) < 0.75 &&
              Math.abs(st.x - currentPaddleX) < effectivePaddleWidth * 0.58
            ) {
              st.active = false;
              st.mesh.visible = false;
              multiplier = Math.min(4, multiplier + 1);
              score += 35 * multiplier;
              soundEngine.playStarCollect(multiplier);
              spawnCrystalExplosion(st.x, st.y, 10, 0xffd700, false);
              setMascotReaction('ecstatic', `Étoile Capturée ! +${35 * multiplier} pts · Multi x${multiplier} ⭐`, 2.5);
              emitHudUpdate();
            } else if (st.y < PADDLE_Y - 2.0) {
              st.active = false;
              st.mesh.visible = false;
            }
          }

          // Update Active Space Rockets
          for (let i = 0; i < rocketPool.length; i++) {
            const rk = rocketPool[i];
            if (!rk.active) continue;

            rk.y += rk.vy * dt;
            rk.mesh.position.set(rk.x, rk.y, 0.25);
            rk.mesh.rotation.y += dt * 8;

            if (Math.random() < 0.65) {
              spawnCrystalExplosion(rk.x, rk.y - 0.55, 2, 0x00f0ff, false);
            }

            activeBricks.forEach((br) => {
              if (
                br.alive &&
                Math.abs(br.x - rk.x) < br.width * 0.62 &&
                Math.abs(br.y - rk.y) < br.height * 0.65
              ) {
                if (br.type === 'metal') {
                  br.alive = false;
                  br.bundle.group.visible = false;
                  spawnCrystalExplosion(br.x, br.y, 16, 0x94a3b8, false);
                } else {
                  damageBrick(br, br.hp, false);
                }
              }
            });

            if (rk.y > ARENA_TOP_Y + 1.5) {
              rk.active = false;
              rk.mesh.visible = false;
              emitHudUpdate();
            }
          }
        }
      }

      // Animate Brick Hit Flashes, Squash-and-Stretch & Rival Ring
      for (let i = 0; i < activeBricks.length; i++) {
        const br = activeBricks[i];
        if (!br.alive) continue;

        if (br.isRival) {
          br.bundle.rivalRing.rotation.z = 0;
          br.bundle.rivalRing.scale.setScalar(1 + Math.sin(elapsed * 8) * 0.04);
          (br.bundle.rivalRing.material as THREE.MeshBasicMaterial).opacity =
            0.7 + Math.sin(elapsed * 10) * 0.25;
        }

        if (br.hitFlashTimer > 0) {
          br.hitFlashTimer = Math.max(0, br.hitFlashTimer - dt);
          br.bundle.bodyMat.emissiveIntensity = 2.2;
        } else {
          br.bundle.bodyMat.emissiveIntensity =
            br.type === 'lightning' ? 0.75 + Math.sin(elapsed * 6) * 0.25 : 0.35;
        }

        if (br.squashTimer > 0) {
          br.squashTimer = Math.max(0, br.squashTimer - dt);
          const s = 1 + Math.sin((br.squashTimer / 0.16) * Math.PI) * 0.14;
          br.bundle.group.scale.set(horizontalScale * s, 1 / Math.sqrt(s), s);
        } else {
          br.bundle.group.scale.set(horizontalScale, 1, 1);
        }
      }

      // Animate 3D Crystal Shards Pool
      for (let i = 0; i < crystalPool.length; i++) {
        const p = crystalPool[i];
        if (p.life > 0) {
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.vy -= 4.8 * dt;
          p.rx += 5.2 * dt;
          p.ry += 6.4 * dt;

          const normLife = Math.max(0, p.life / p.maxLife);
          _dummyObj.position.set(p.x, p.y, p.z);
          _dummyObj.rotation.set(p.rx, p.ry, p.rz);
          _dummyObj.scale.setScalar(p.scale * normLife);
          _dummyObj.updateMatrix();
          shardInstanced.setMatrixAt(i, _dummyObj.matrix);
          shardInstanced.setColorAt(i, p.color);
        } else {
          _dummyObj.position.set(0, -99, 0);
          _dummyObj.scale.setScalar(0);
          _dummyObj.updateMatrix();
          shardInstanced.setMatrixAt(i, _dummyObj.matrix);
        }
      }
      shardInstanced.instanceMatrix.needsUpdate = true;
      if (shardInstanced.instanceColor) shardInstanced.instanceColor.needsUpdate = true;

      // Animate Sparkling Colorful Wake Stardust ("poussière traînée")
      const wPosAttr = wakeDustGeo.getAttribute('position') as THREE.BufferAttribute;
      const wColAttr = wakeDustGeo.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < MAX_WAKE_DUST; i++) {
        const m = wakeDustPool[i];
        if (m.life > 0) {
          m.life -= dt;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          const fade = Math.pow(Math.max(0, m.life / m.maxLife), 1.35);
          wPosAttr.setXYZ(i, m.x, m.y, m.z);
          wColAttr.setXYZ(i, m.baseR * fade, m.baseG * fade, m.baseB * fade);
        } else {
          wPosAttr.setXYZ(i, 0, -99, 0);
          wColAttr.setXYZ(i, 0, 0, 0);
        }
      }
      wPosAttr.needsUpdate = true;
      wColAttr.needsUpdate = true;

      hudSyncAccumulator += dt;
      if (hudSyncAccumulator >= 0.12) {
        hudSyncAccumulator = 0;
        emitHudUpdate();
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      domElem.removeEventListener('pointermove', handlePointerMove);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('resize', updateCameraFraming);
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-screen h-[100dvh] overflow-hidden bg-[#07051A]"
      aria-label="Arène 3D Casse-Briques Néon Spatial"
    />
  );
};
