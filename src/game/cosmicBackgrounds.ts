import * as THREE from 'three';
import { getRadialGlowTexture } from './textures';

export interface CosmicBackgroundSystem {
  setLevelBiome: (levelId: number) => void;
  update: (dt: number, elapsed: number, paddleX: number) => void;
}

type CosmicTravelerKind =
  | 'flying_saucer'
  | 'space_rocket'
  | 'shooting_star'
  | 'alien_ufo'
  | 'space_probe'
  | 'ice_comet';

interface CosmicTraveler3D {
  kind: CosmicTravelerKind;
  group: THREE.Group;
  spinPart?: THREE.Object3D;
  pulseMat?: THREE.MeshBasicMaterial;
}

interface BokehCloud {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  baseX: number;
  baseY: number;
  baseZ: number;
  speed: number;
  phase: number;
}

/**
 * Generates a soft ultra-HD radial bokeh texture with depth-of-field falloff.
 */
let cachedBokehTex: THREE.CanvasTexture | null = null;
function getDepthBokehTexture(): THREE.CanvasTexture {
  if (cachedBokehTex) return cachedBokehTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 6, 128, 128, 124);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.28, 'rgba(255, 255, 255, 0.52)');
  grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.14)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  cachedBokehTex = new THREE.CanvasTexture(canvas);
  cachedBokehTex.colorSpace = THREE.SRGBColorSpace;
  return cachedBokehTex;
}

/**
 * Generates a Synthwave striped sun texture for Biome 10.
 */
let cachedSynthSunTex: THREE.CanvasTexture | null = null;
function getSynthwaveSunTexture(): THREE.CanvasTexture {
  if (cachedSynthSunTex) return cachedSynthSunTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 30, 0, 480);
  grad.addColorStop(0, '#FFF078');
  grad.addColorStop(0.35, '#FF7A00');
  grad.addColorStop(0.7, '#FF1668');
  grad.addColorStop(1, '#9333EA');

  ctx.save();
  ctx.beginPath();
  ctx.arc(256, 256, 230, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Horizontal retro-neon cutout stripes in lower half
  ctx.globalCompositeOperation = 'destination-out';
  const stripeY = [290, 328, 362, 392, 418, 442, 464];
  stripeY.forEach((y, idx) => {
    ctx.fillRect(0, y, 512, 6 + idx * 2.4);
  });
  ctx.restore();

  cachedSynthSunTex = new THREE.CanvasTexture(canvas);
  cachedSynthSunTex.colorSpace = THREE.SRGBColorSpace;
  return cachedSynthSunTex;
}

/**
 * Creates a glowing 3D holographic constellation line + star nodes.
 */
function createConstellationGroup(
  points: Array<[number, number, number]>,
  colorHex: number
): THREE.Group {
  const group = new THREE.Group();
  const vecs = points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const lineGeo = new THREE.BufferGeometry().setFromPoints(vecs);
  const lineMat = new THREE.LineBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
  });
  const line = new THREE.Line(lineGeo, lineMat);
  group.add(line);

  const nodeGeo = new THREE.OctahedronGeometry(0.16, 0);
  const nodeMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  const haloGeo = new THREE.PlaneGeometry(0.95, 0.95);
  const haloMat = new THREE.MeshBasicMaterial({
    map: getRadialGlowTexture(),
    color: colorHex,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  vecs.forEach((v) => {
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    node.position.copy(v);
    group.add(node);

    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(v);
    group.add(halo);
  });

  return group;
}

export function createCosmicBackgroundSystem(scene: THREE.Scene): CosmicBackgroundSystem {
  const rootGroup = new THREE.Group();
  rootGroup.position.z = -3.2;
  scene.add(rootGroup);

  // ============================================================================
  // 1. DEPTH-OF-FIELD BOKEH NEBULA CLOUDS (ULTRA-SLOW MULTI-PLANE DEPTH LAYERS)
  // ============================================================================
  const bokehGroup = new THREE.Group();
  rootGroup.add(bokehGroup);
  const bokehClouds: BokehCloud[] = [];
  const bokehColors = [0x00f0ff, 0xff1668, 0x9333ea, 0x38bdf8, 0xffb800, 0x10e84a];

  for (let i = 0; i < 22; i++) {
    const depthLayer = i % 3; // 0 = far, 1 = mid, 2 = near-bg
    const size = depthLayer === 0 ? 7.5 + (i % 3) * 2.2 : depthLayer === 1 ? 5.2 + (i % 3) * 1.6 : 3.6 + (i % 3) * 1.2;
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map: getDepthBokehTexture(),
      color: bokehColors[i % bokehColors.length],
      transparent: true,
      opacity: depthLayer === 0 ? 0.08 : depthLayer === 1 ? 0.12 : 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const bx = ((i % 6) - 2.5) * 4.4 + (Math.random() - 0.5) * 2.4;
    const by = (Math.floor(i / 6) - 1.2) * 4.2 + (Math.random() - 0.5) * 2.0;
    const bz = depthLayer === 0 ? -14.0 - Math.random() * 6.0 : depthLayer === 1 ? -7.5 - Math.random() * 5.0 : -2.8 - Math.random() * 3.5;
    mesh.position.set(bx, by, bz);
    bokehGroup.add(mesh);
    bokehClouds.push({
      mesh,
      baseX: bx,
      baseY: by,
      baseZ: bz,
      // Ultra-slow to slow drift speed depending on depth plane
      speed: depthLayer === 0 ? 0.035 + Math.random() * 0.04 : depthLayer === 1 ? 0.08 + Math.random() * 0.06 : 0.14 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // ============================================================================
  // 2. MULTI-DEPTH 3D PARTICLES (ULTRA-SLOW TO SLOW RANDOM VARIABLE SPEEDS)
  // ============================================================================
  const dustCount = 320;
  const dustGeo = new THREE.OctahedronGeometry(0.06, 0);
  const dustMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });
  const dustInstanced = new THREE.InstancedMesh(dustGeo, dustMat, dustCount);
  dustInstanced.frustumCulled = false;
  rootGroup.add(dustInstanced);

  const dustData: Array<{
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    driftFreq: number;
    driftAmp: number;
    parallaxFactor: number;
    scale: number;
    phase: number;
    isGeyser: boolean;
  }> = [];

  const dummy = new THREE.Object3D();
  const dustPalette = [
    new THREE.Color(0x00f0ff),
    new THREE.Color(0xff40a0),
    new THREE.Color(0xffe066),
    new THREE.Color(0xa855f7),
    new THREE.Color(0xffffff),
    new THREE.Color(0x10e84a),
  ];

  for (let i = 0; i < dustCount; i++) {
    const isGeyser = i < 36; // Gentle edge stardust geysers on far left/right
    const side = i % 2 === 0 ? -1 : 1;

    // Distribute Z depth from Z = -1.2 (near background) down to Z = -21.0 (deep cosmos)
    const depthNorm = Math.pow(Math.random(), 1.15); // 0 = near, 1 = deep far
    const z = isGeyser
      ? -2.0 - Math.random() * 5.0
      : -1.2 - depthNorm * 19.5;

    const x = isGeyser
      ? side * (7.2 + Math.random() * 2.4)
      : (Math.random() - 0.5) * (24 + depthNorm * 16);
    const y = isGeyser
      ? -6.8 + Math.random() * 13.6
      : (Math.random() - 0.5) * (16 + depthNorm * 10);

    // Random variable speed from ULTRA-SLOW (0.018 u/s in deep space) to SLOW (0.24 u/s in near layer)
    const randomAngle = Math.random() * Math.PI * 2;
    const variableSpeed = isGeyser
      ? 0.22 + Math.random() * 0.32
      : THREE.MathUtils.lerp(0.24, 0.018, depthNorm) * (0.55 + Math.random() * 0.9);

    const vx = isGeyser
      ? -side * (0.08 + Math.random() * 0.16)
      : Math.cos(randomAngle) * variableSpeed;
    const vy = isGeyser
      ? variableSpeed
      : Math.sin(randomAngle) * variableSpeed + 0.015;

    // Depth-attenuated scale and parallax factor for realistic 3D depth effect
    const scale = isGeyser
      ? 0.55 + Math.random() * 0.85
      : THREE.MathUtils.lerp(1.25, 0.28, depthNorm) * (0.65 + Math.random() * 0.7);

    const parallaxFactor = THREE.MathUtils.lerp(0.28, 0.02, depthNorm);

    dustData.push({
      x,
      y,
      z,
      vx,
      vy,
      driftFreq: 0.12 + Math.random() * 0.38,
      driftAmp: 0.06 + (1 - depthNorm) * 0.22,
      parallaxFactor,
      scale,
      phase: Math.random() * Math.PI * 2,
      isGeyser,
    });

    dummy.position.set(x, y, z);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    dustInstanced.setMatrixAt(i, dummy.matrix);
    dustInstanced.setColorAt(
      i,
      isGeyser ? new THREE.Color(0xffe066) : dustPalette[i % dustPalette.length]
    );
  }
  dustInstanced.instanceMatrix.needsUpdate = true;
  if (dustInstanced.instanceColor) dustInstanced.instanceColor.needsUpdate = true;

  // ============================================================================
  // 3. SINGLE-SLOT MUTUALLY EXCLUSIVE COSMIC TRAVELERS
  //    (Soucoupe Volante, Fusée, Étoile Filante, OVNI, Sonde, Comète)
  //    STRICT RULE: Never overlap and NEVER visible at the same time!
  // ============================================================================
  const travelers: CosmicTraveler3D[] = [];

  // 3A. Soucoupe Volante (Classic Metallic Flying Saucer with Cyan Glass Dome & Rim Lights)
  {
    const g = new THREE.Group();
    g.visible = false;
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.45, 0.10, 20),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 })
    );
    g.add(disc);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.20, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 })
    );
    dome.position.y = 0.03;
    g.add(dome);

    const rimGroup = new THREE.Group();
    const bulbGeo = new THREE.SphereGeometry(0.038, 8, 8);
    const bulbColors = [0x00f0ff, 0xff1688, 0xffe066, 0x10e84a];
    for (let b = 0; b < 8; b++) {
      const ang = (b / 8) * Math.PI * 2;
      const bulb = new THREE.Mesh(
        bulbGeo,
        new THREE.MeshBasicMaterial({ color: bulbColors[b % bulbColors.length] })
      );
      bulb.position.set(Math.cos(ang) * 0.39, -0.01, Math.sin(ang) * 0.39);
      rimGroup.add(bulb);
    }
    g.add(rimGroup);
    rootGroup.add(g);
    travelers.push({ kind: 'flying_saucer', group: g, spinPart: rimGroup });
  }

  // 3B. Fusée Spatiale (Retro-Futuristic Space Rocket with Fins & Exhaust Plume)
  {
    const g = new THREE.Group();
    g.visible = false;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.13, 0.56, 14),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.5, roughness: 0.3 })
    );
    body.rotation.z = -Math.PI / 2;
    g.add(body);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.24, 14),
      new THREE.MeshStandardMaterial({ color: 0xff1668, emissive: 0x990033, emissiveIntensity: 0.35 })
    );
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 0.40;
    g.add(nose);

    const windowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    windowMesh.position.set(0.10, 0.04, 0.08);
    g.add(windowMesh);

    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0xff9900,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 10), plumeMat);
    plume.rotation.z = Math.PI / 2;
    plume.position.x = -0.46;
    g.add(plume);

    rootGroup.add(g);
    travelers.push({ kind: 'space_rocket', group: g, pulseMat: plumeMat });
  }

  // 3C. Étoile Filante (Subtle Distant Shooting Star Streak)
  {
    const g = new THREE.Group();
    g.visible = false;
    const headMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.032, 0),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.35 })
    );
    g.add(headMesh);

    const tailGeo = new THREE.ConeGeometry(0.022, 1.45, 6);
    tailGeo.rotateZ(Math.PI / 2);
    tailGeo.translate(-0.72, 0, 0);
    const tailMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const tailMesh = new THREE.Mesh(tailGeo, tailMat);
    g.add(tailMesh);

    rootGroup.add(g);
    travelers.push({ kind: 'shooting_star', group: g, pulseMat: tailMat });
  }

  // 3D. OVNI Extraterrestre (Alien Triangular Scout with Violet/Emerald Anti-Gravity Ring)
  {
    const g = new THREE.Group();
    g.visible = false;
    const hull = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.14, 3),
      new THREE.MeshStandardMaterial({
        color: 0x1e1b4b,
        emissive: 0x6d28d9,
        emissiveIntensity: 0.45,
        metalness: 0.85,
        roughness: 0.2,
      })
    );
    g.add(hull);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10e84a,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 8, 24), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.04;
    g.add(ring);

    rootGroup.add(g);
    travelers.push({ kind: 'alien_ufo', group: g, spinPart: hull, pulseMat: ringMat });
  }

  // 3E. Sonde / Satellite Orbital (Golden Hub + Blue Solar Wings)
  {
    const g = new THREE.Group();
    g.visible = false;
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.10, 0.26, 12),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.25 })
    );
    g.add(core);

    const panelGeo = new THREE.BoxGeometry(0.68, 0.14, 0.02);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.4,
      metalness: 0.6,
      roughness: 0.2,
    });
    const panels = new THREE.Mesh(panelGeo, panelMat);
    g.add(panels);

    rootGroup.add(g);
    travelers.push({ kind: 'space_probe', group: g, spinPart: g });
  }

  // 3F. Comète de Glace (Crystalline Ice Nucleus + Soft Cyan Dust Tail)
  {
    const g = new THREE.Group();
    g.visible = false;
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.08, 0),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc })
    );
    g.add(core);

    const tailGeo = new THREE.ConeGeometry(0.065, 1.65, 8);
    tailGeo.rotateZ(Math.PI / 2);
    tailGeo.translate(-0.82, 0, 0);
    const tailMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    g.add(new THREE.Mesh(tailGeo, tailMat));

    rootGroup.add(g);
    travelers.push({ kind: 'ice_comet', group: g, pulseMat: tailMat });
  }

  // Single-Slot State: ONLY ONE traveler can be active at any time
  let activeTraveler: {
    ref: CosmicTraveler3D;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    baseAngle: number;
    life: number;
    maxLife: number;
  } | null = null;
  let nextTravelerCooldown = 5.5 + Math.random() * 6.5;
  let lastTravelerIdx = -1;

  const spawnNextExclusiveTraveler = () => {
    if (activeTraveler !== null) return; // Strict mutual exclusion guard!

    // Ensure all traveler groups are hidden first
    travelers.forEach((t) => {
      t.group.visible = false;
    });

    // Pick a random traveler different from the previous one
    let idx = Math.floor(Math.random() * travelers.length);
    if (idx === lastTravelerIdx) {
      idx = (idx + 1) % travelers.length;
    }
    lastTravelerIdx = idx;
    const chosen = travelers[idx];

    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -13.5 : 13.5;
    const startY = -1.5 + Math.random() * 7.0;
    const zDepth = -12.5 - Math.random() * 4.5;

    const isFastStreak = chosen.kind === 'shooting_star' || chosen.kind === 'ice_comet';
    const speed = isFastStreak ? 10.5 + Math.random() * 3.5 : 2.6 + Math.random() * 1.6;
    const slopeAngle = (Math.random() - 0.5) * 0.32;
    const moveAngle = fromLeft ? slopeAngle : Math.PI - slopeAngle;

    const vx = Math.cos(moveAngle) * speed;
    const vy = Math.sin(moveAngle) * speed;
    const maxLife = 28.0 / speed;

    chosen.group.position.set(startX, startY, zDepth);
    chosen.group.rotation.set(0, 0, 0);
    if (
      chosen.kind === 'space_rocket' ||
      chosen.kind === 'shooting_star' ||
      chosen.kind === 'ice_comet'
    ) {
      chosen.group.rotation.z = moveAngle;
    }
    chosen.group.visible = true;

    activeTraveler = {
      ref: chosen,
      x: startX,
      y: startY,
      z: zDepth,
      vx,
      vy,
      baseAngle: moveAngle,
      life: maxLife,
      maxLife,
    };
  };

  // ============================================================================
  // 4. 12 ULTRA-HD 3D COSMIC BIOMES (20 WONDERS OF THE COSMOS)
  // ============================================================================
  const biomes: THREE.Group[] = [];
  let activeBiomeId = 7;

  // Helper materials
  const darkRockMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    roughness: 0.65,
    metalness: 0.3,
  });

  for (let bId = 1; bId <= 12; bId++) {
    const bGroup = new THREE.Group();
    bGroup.visible = bId === 7;
    rootGroup.add(bGroup);
    biomes.push(bGroup);

    if (bId === 1) {
      // BIOME 1: Récifs de Coraux Cosmiques & Méduses Astrales Bioluminescentes
      for (let side = -1; side <= 1; side += 2) {
        const reefRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), darkRockMat);
        reefRock.position.set(side * 6.4, -2.4, -2.2);
        bGroup.add(reefRock);

        for (let c = 0; c < 5; c++) {
          const coralGeo = new THREE.ConeGeometry(0.24, 1.6 + c * 0.25, 7);
          const coralMat = new THREE.MeshStandardMaterial({
            color: c % 2 === 0 ? 0x00f0ff : 0xff1688,
            emissive: c % 2 === 0 ? 0x00a8cc : 0xcc0066,
            emissiveIntensity: 0.9,
            roughness: 0.2,
          });
          const coral = new THREE.Mesh(coralGeo, coralMat);
          coral.position.set(side * (5.6 - c * 0.35), -1.1 + c * 0.35, -1.8);
          coral.rotation.z = -side * (0.25 + c * 0.12);
          bGroup.add(coral);
        }
      }

      // 2 Translucent Astral Jellyfish (Méduses Astrales)
      for (let j = 0; j < 2; j++) {
        const jelly = new THREE.Group();
        jelly.name = `jelly_${j}`;
        jelly.position.set(j === 0 ? -3.4 : 3.6, j === 0 ? 2.1 : 1.4, -2.6);
        const bellGeo = new THREE.SphereGeometry(0.95, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62);
        const bellMat = new THREE.MeshPhysicalMaterial({
          color: j === 0 ? 0x38bdf8 : 0xf43f5e,
          emissive: j === 0 ? 0x0284c7 : 0xbe123c,
          emissiveIntensity: 0.85,
          transparent: true,
          opacity: 0.72,
          roughness: 0.1,
        });
        jelly.add(new THREE.Mesh(bellGeo, bellMat));

        for (let t = 0; t < 5; t++) {
          const tentGeo = new THREE.CylinderGeometry(0.03, 0.01, 1.8, 6);
          const tent = new THREE.Mesh(tentGeo, bellMat);
          tent.position.set((t - 2) * 0.26, -0.9, 0);
          jelly.add(tent);
        }
        bGroup.add(jelly);
      }
    } else if (bId === 2) {
      // BIOME 2: Pulsar à Rayons Néon & Constellation Holographique de la Couronne
      const pulsarGroup = new THREE.Group();
      pulsarGroup.name = 'pulsar_core';
      pulsarGroup.position.set(0, 1.8, -3.5);

      const starCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      pulsarGroup.add(starCore);

      const beamGeo = new THREE.ConeGeometry(1.35, 16, 16, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const beamLeft = new THREE.Mesh(beamGeo, beamMat);
      beamLeft.rotation.z = Math.PI / 2;
      beamLeft.position.x = -8;
      pulsarGroup.add(beamLeft);

      const beamRight = new THREE.Mesh(beamGeo, beamMat);
      beamRight.rotation.z = -Math.PI / 2;
      beamRight.position.x = 8;
      pulsarGroup.add(beamRight);

      bGroup.add(pulsarGroup);

      // Crown Constellation
      const crownConstellation = createConstellationGroup(
        [
          [-4.8, 3.2, -2.5],
          [-3.8, 1.2, -2.5],
          [-1.9, 2.5, -2.5],
          [0, 4.1, -2.5],
          [1.9, 2.5, -2.5],
          [3.8, 1.2, -2.5],
          [4.8, 3.2, -2.5],
          [-4.8, 3.2, -2.5],
        ],
        0xffd700
      );
      bGroup.add(crownConstellation);
    } else if (bId === 3) {
      // BIOME 3: Lune Fracturée au Cœur de Lave & Énergie
      const moonGroup = new THREE.Group();
      moonGroup.name = 'fractured_moon';
      moonGroup.position.set(0, 1.3, -3.6);

      const lavaCore = new THREE.Mesh(
        new THREE.SphereGeometry(1.35, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xffb800 })
      );
      moonGroup.add(lavaCore);

      const coreGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(6.8, 6.8),
        new THREE.MeshBasicMaterial({
          map: getRadialGlowTexture(),
          color: 0xff1668,
          transparent: true,
          opacity: 0.78,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      moonGroup.add(coreGlow);

      for (let f = 0; f < 10; f++) {
        const shard = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), darkRockMat);
        const ang = (f / 10) * Math.PI * 2;
        shard.position.set(Math.cos(ang) * 2.2, Math.sin(ang) * 1.9, (f % 2 === 0 ? 1 : -1) * 0.5);
        moonGroup.add(shard);
      }
      bGroup.add(moonGroup);
    } else if (bId === 4) {
      // BIOME 4: Trou Noir à Disque d'Accrétion & Fleuve d'Or Liquide
      const bhGroup = new THREE.Group();
      bhGroup.name = 'black_hole';
      bhGroup.position.set(0, 1.4, -3.8);

      const eventHorizon = new THREE.Mesh(
        new THREE.SphereGeometry(1.45, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x020108 })
      );
      bhGroup.add(eventHorizon);

      const diskGeo = new THREE.RingGeometry(1.65, 4.2, 48);
      const diskMat = new THREE.MeshBasicMaterial({
        color: 0xff5500,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const accretionDisk = new THREE.Mesh(diskGeo, diskMat);
      accretionDisk.rotation.x = 1.12;
      accretionDisk.rotation.y = 0.22;
      bhGroup.add(accretionDisk);

      const innerDisk = new THREE.Mesh(
        new THREE.RingGeometry(1.5, 2.3, 48),
        new THREE.MeshBasicMaterial({
          color: 0xfff078,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      innerDisk.rotation.x = 1.12;
      innerDisk.rotation.y = 0.22;
      bhGroup.add(innerDisk);

      bGroup.add(bhGroup);
    } else if (bId === 5) {
      // BIOME 5: Géode Planétaire Ouverte (Améthyste/Quartz) & Satellites de Cristal
      const geodeGroup = new THREE.Group();
      geodeGroup.name = 'crystal_geode';
      geodeGroup.position.set(0, 1.5, -3.6);

      const shellGeo = new THREE.SphereGeometry(2.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58);
      const shell = new THREE.Mesh(shellGeo, darkRockMat);
      shell.rotation.x = Math.PI * 0.35;
      geodeGroup.add(shell);

      const crystalMat = new THREE.MeshPhysicalMaterial({
        color: 0xa855f7,
        emissive: 0x7e22ce,
        emissiveIntensity: 0.85,
        roughness: 0.1,
        metalness: 0.2,
        clearcoat: 1.0,
      });
      for (let c = 0; c < 12; c++) {
        const crys = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), crystalMat);
        const a = (c / 12) * Math.PI * 2;
        crys.position.set(Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0.2);
        crys.scale.set(0.7, 1.6, 0.7);
        geodeGroup.add(crys);
      }
      bGroup.add(geodeGroup);
    } else if (bId === 6) {
      // BIOME 6: Orages Magnétiques, Éclairs Stellaires & Champ de Mines Énergétiques
      const stormGroup = new THREE.Group();
      stormGroup.name = 'magnetic_storm';

      for (let m = 0; m < 4; m++) {
        const mine = new THREE.Group();
        mine.position.set((m - 1.5) * 3.8, (m % 2 === 0 ? 1 : -1) * 1.6 + 1.0, -3.0);
        const sphere = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.55, 0),
          new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            emissive: 0x00f0ff,
            emissiveIntensity: 0.65,
            metalness: 0.85,
          })
        );
        mine.add(sphere);
        stormGroup.add(mine);
      }

      // Jagged Electric Arcs
      const arcPts = [
        new THREE.Vector3(-6, 3.5, -2.5),
        new THREE.Vector3(-3.2, 1.8, -2.5),
        new THREE.Vector3(-1.4, 3.1, -2.5),
        new THREE.Vector3(1.5, 0.9, -2.5),
        new THREE.Vector3(4.2, 2.7, -2.5),
        new THREE.Vector3(6.5, 1.4, -2.5),
      ];
      const arcLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(arcPts),
        new THREE.LineBasicMaterial({ color: 0x00f0ff })
      );
      stormGroup.add(arcLine);
      bGroup.add(stormGroup);
    } else if (bId === 7) {
      // BIOME 7 (Capture Scene): Aurores Boréales Galactiques & Planète à Anneaux Cristallins
      const planetGroup = new THREE.Group();
      planetGroup.name = 'ringed_planet_7';
      planetGroup.position.set(3.8, 2.2, -4.2);

      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(1.55, 28, 28),
        new THREE.MeshStandardMaterial({
          color: 0x4c1d95,
          emissive: 0x7c3aed,
          emissiveIntensity: 0.45,
          roughness: 0.35,
        })
      );
      planetGroup.add(planet);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.0, 3.3, 40),
        new THREE.MeshBasicMaterial({
          color: 0x00f0ff,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      ring.rotation.x = 1.2;
      ring.rotation.y = -0.35;
      planetGroup.add(ring);
      bGroup.add(planetGroup);

      // Galactic Aurora Ribbons
      for (let a = 0; a < 3; a++) {
        const auroraGeo = new THREE.PlaneGeometry(16, 2.6, 24, 1);
        const auroraMat = new THREE.MeshBasicMaterial({
          color: a === 0 ? 0x10e84a : a === 1 ? 0xff1688 : 0x00f0ff,
          transparent: true,
          opacity: 0.16,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const aurora = new THREE.Mesh(auroraGeo, auroraMat);
        aurora.position.set(0, 3.2 - a * 1.3, -4.5 - a * 0.5);
        aurora.rotation.z = (a - 1) * 0.12;
        bGroup.add(aurora);
      }
    } else if (bId === 8) {
      // BIOME 8: Étoiles Binaires en Fusion (Bleu Glacé & Rouge Ardent) & Tornades de Plasma
      const binaryGroup = new THREE.Group();
      binaryGroup.name = 'binary_stars';
      binaryGroup.position.set(0, 1.6, -4.0);

      const blueSun = new THREE.Mesh(
        new THREE.SphereGeometry(1.15, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      blueSun.position.x = -2.2;
      binaryGroup.add(blueSun);

      const redSun = new THREE.Mesh(
        new THREE.SphereGeometry(1.35, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xff2a55 })
      );
      redSun.position.x = 2.2;
      binaryGroup.add(redSun);

      // Plasma Bridge
      const bridge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 4.4, 12),
        new THREE.MeshBasicMaterial({
          color: 0xffb800,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
        })
      );
      bridge.rotation.z = Math.PI / 2;
      binaryGroup.add(bridge);
      bGroup.add(binaryGroup);
    } else if (bId === 9) {
      // BIOME 9: Épaves de Monolithes Extraterrestres à Runes Pulsantes & Anneau Portail Warp
      const warpGroup = new THREE.Group();
      warpGroup.name = 'warp_portal';
      warpGroup.position.set(0, 1.4, -3.8);

      const outerPortal = new THREE.Mesh(
        new THREE.TorusGeometry(2.6, 0.22, 16, 48),
        new THREE.MeshStandardMaterial({
          color: 0x334155,
          emissive: 0x00f0ff,
          emissiveIntensity: 0.75,
          metalness: 0.9,
          roughness: 0.2,
        })
      );
      warpGroup.add(outerPortal);

      const vortexMembrane = new THREE.Mesh(
        new THREE.CircleGeometry(2.45, 32),
        new THREE.MeshBasicMaterial({
          map: getRadialGlowTexture(),
          color: 0x00f0ff,
          transparent: true,
          opacity: 0.36,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      warpGroup.add(vortexMembrane);

      // Left & Right Alien Monoliths
      for (let side = -1; side <= 1; side += 2) {
        const mono = new THREE.Mesh(
          new THREE.ConeGeometry(0.9, 3.4, 4),
          new THREE.MeshStandardMaterial({
            color: 0x090d16,
            emissive: 0xa855f7,
            emissiveIntensity: 0.65,
            roughness: 0.2,
            metalness: 0.85,
          })
        );
        mono.position.set(side * 5.2, 0.8, -0.5);
        warpGroup.add(mono);
      }
      bGroup.add(warpGroup);
    } else if (bId === 10) {
      // BIOME 10: Soleil Synthwave Rétro-Néon & Pluie de Comètes Prismatiques
      const sunMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(7.8, 7.8),
        new THREE.MeshBasicMaterial({
          map: getSynthwaveSunTexture(),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      sunMesh.position.set(0, 1.2, -4.2);
      bGroup.add(sunMesh);
    } else if (bId === 11) {
      // BIOME 11: Arbre-Monde Cristallin & Constellation du Phénix
      const treeGroup = new THREE.Group();
      treeGroup.name = 'crystal_tree';
      treeGroup.position.set(0, -1.2, -3.8);

      const trunkMat = new THREE.MeshPhysicalMaterial({
        color: 0x10e84a,
        emissive: 0x059669,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.75,
        roughness: 0.15,
      });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.85, 4.8, 8), trunkMat);
      treeGroup.add(trunk);

      for (let b = 0; b < 5; b++) {
        const branch = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0), trunkMat);
        const ang = (b / 5) * Math.PI * 2;
        branch.position.set(Math.cos(ang) * 2.1, 2.2 + (b % 2) * 0.8, Math.sin(ang) * 0.6);
        treeGroup.add(branch);
      }
      bGroup.add(treeGroup);

      const phoenix = createConstellationGroup(
        [
          [0, 4.2, -2.6],
          [-2.2, 3.0, -2.6],
          [-4.8, 4.1, -2.6],
          [-1.5, 1.6, -2.6],
          [0, 0.2, -2.6],
          [1.5, 1.6, -2.6],
          [4.8, 4.1, -2.6],
          [2.2, 3.0, -2.6],
          [0, 4.2, -2.6],
        ],
        0xff40a0
      );
      bGroup.add(phoenix);
    } else if (bId === 12) {
      // BIOME 12: Couronne Impériale : Super-Vortex, Pulsar Binaire & Constellation du Dragon
      const impGroup = new THREE.Group();
      impGroup.name = 'imperial_core';
      impGroup.position.set(0, 1.5, -3.8);

      const torus1 = new THREE.Mesh(
        new THREE.TorusGeometry(3.1, 0.14, 16, 48),
        new THREE.MeshBasicMaterial({ color: 0xffd700 })
      );
      impGroup.add(torus1);

      const torus2 = new THREE.Mesh(
        new THREE.TorusGeometry(2.3, 0.12, 16, 48),
        new THREE.MeshBasicMaterial({ color: 0xff1668 })
      );
      torus2.rotation.x = Math.PI / 3;
      impGroup.add(torus2);

      const dragon = createConstellationGroup(
        [
          [-5.2, 3.8, -2.4],
          [-3.4, 2.4, -2.4],
          [-1.6, 3.5, -2.4],
          [0, 2.0, -2.4],
          [1.8, 3.6, -2.4],
          [3.6, 2.2, -2.4],
          [5.2, 3.9, -2.4],
        ],
        0x00f0ff
      );
      bGroup.add(dragon);
      bGroup.add(impGroup);
    }
  }

  return {
    setLevelBiome: (levelId: number) => {
      const normalized = ((Math.max(1, levelId) - 1) % 12) + 1;
      activeBiomeId = normalized;
      biomes.forEach((grp, idx) => {
        grp.visible = idx + 1 === normalized;
      });
    },

    update: (dt: number, elapsed: number, paddleX: number) => {
      // Subtle 3D Parallax on background root from paddle horizontal position
      rootGroup.position.x = THREE.MathUtils.lerp(rootGroup.position.x, -paddleX * 0.14, dt * 4);

      // 1. Animate Depth-of-Field Bokeh Nebula Clouds
      for (let i = 0; i < bokehClouds.length; i++) {
        const bc = bokehClouds[i];
        bc.mesh.position.x = bc.baseX + Math.sin(elapsed * bc.speed + bc.phase) * 0.85;
        bc.mesh.position.y = bc.baseY + Math.cos(elapsed * bc.speed * 0.8 + bc.phase) * 0.55;
      }

      // 2. Animate Multi-Depth Stardust (Ultra-Slow to Slow Random Drift + Depth Parallax)
      for (let i = 0; i < dustCount; i++) {
        const d = dustData[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt;

        if (d.isGeyser) {
          if (d.y > 7.5) {
            const side = i % 2 === 0 ? -1 : 1;
            d.x = side * (7.0 + Math.random() * 2.2);
            d.y = -7.0;
          }
        } else {
          if (d.y > 10.5) d.y = -10.5;
          if (d.y < -10.5) d.y = 10.5;
          if (d.x > 16) d.x = -16;
          if (d.x < -16) d.x = 16;
        }

        const floatOffsetX = Math.sin(elapsed * d.driftFreq + d.phase) * d.driftAmp - paddleX * d.parallaxFactor;
        const floatOffsetY = Math.cos(elapsed * d.driftFreq * 0.85 + d.phase) * (d.driftAmp * 0.7);
        const twinkle = d.scale * (0.72 + Math.sin(elapsed * (0.9 + d.driftFreq * 2.5) + d.phase) * 0.28);

        dummy.position.set(d.x + floatOffsetX, d.y + floatOffsetY, d.z);
        dummy.rotation.set(elapsed * d.driftFreq + d.phase, elapsed * d.driftFreq * 0.7, 0);
        dummy.scale.setScalar(twinkle);
        dummy.updateMatrix();
        dustInstanced.setMatrixAt(i, dummy.matrix);
      }
      dustInstanced.instanceMatrix.needsUpdate = true;

      // 3. Single-Slot Mutually Exclusive Cosmic Traveler Update
      //    (Soucoupe Volante, Fusée, Étoile Filante, OVNI, Sonde, Comète — NEVER 2 at once!)
      if (activeTraveler === null) {
        nextTravelerCooldown -= dt;
        if (nextTravelerCooldown <= 0) {
          spawnNextExclusiveTraveler();
          nextTravelerCooldown = 10.0 + Math.random() * 11.0;
        }
      } else {
        activeTraveler.life -= dt;
        activeTraveler.x += activeTraveler.vx * dt;
        activeTraveler.y += activeTraveler.vy * dt;

        const kind = activeTraveler.ref.kind;
        const grp = activeTraveler.ref.group;

        if (kind === 'flying_saucer' || kind === 'alien_ufo') {
          const bobY = Math.sin(elapsed * 3.2) * 0.28;
          grp.position.set(activeTraveler.x, activeTraveler.y + bobY, activeTraveler.z);
          grp.rotation.z = Math.sin(elapsed * 2.4) * 0.14;
          if (activeTraveler.ref.spinPart) {
            activeTraveler.ref.spinPart.rotation.y += dt * 4.5;
          }
        } else if (kind === 'space_probe') {
          grp.position.set(activeTraveler.x, activeTraveler.y, activeTraveler.z);
          grp.rotation.y += dt * 1.4;
          grp.rotation.z = Math.sin(elapsed * 1.5) * 0.22;
        } else {
          grp.position.set(activeTraveler.x, activeTraveler.y, activeTraveler.z);
        }

        if (activeTraveler.ref.pulseMat) {
          const norm = Math.max(0, activeTraveler.life / activeTraveler.maxLife);
          const maxOp = kind === 'shooting_star' || kind === 'ice_comet' ? 0.24 : 0.65;
          activeTraveler.ref.pulseMat.opacity = Math.sin(norm * Math.PI) * maxOp;
        }

        if (activeTraveler.life <= 0 || Math.abs(activeTraveler.x) > 15.5) {
          grp.visible = false;
          activeTraveler = null;
        }
      }

      // 4. Animate Active 3D Biome Wonders
      const activeGroup = biomes[activeBiomeId - 1];
      if (activeGroup) {
        activeGroup.children.forEach((child) => {
          if (child.name === 'pulsar_core') {
            child.rotation.z = elapsed * 1.85;
          } else if (child.name === 'fractured_moon') {
            child.rotation.z = elapsed * 0.25;
            child.rotation.y = Math.sin(elapsed * 0.5) * 0.35;
          } else if (child.name === 'black_hole') {
            child.rotation.z = -elapsed * 0.45;
          } else if (child.name === 'crystal_geode') {
            child.rotation.y = Math.sin(elapsed * 0.6) * 0.4;
          } else if (child.name === 'binary_stars') {
            child.rotation.z = elapsed * 0.95;
          } else if (child.name === 'warp_portal') {
            child.rotation.z = elapsed * 0.35;
          } else if (child.name === 'imperial_core') {
            child.rotation.z = elapsed * 0.6;
            child.rotation.x = Math.sin(elapsed * 0.8) * 0.25;
          } else if (child.name.startsWith('jelly_')) {
            child.position.y += Math.sin(elapsed * 2.2) * 0.006;
            child.scale.setScalar(1 + Math.sin(elapsed * 3.2) * 0.06);
          }
        });
      }
    },
  };
}
