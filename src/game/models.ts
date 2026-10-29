import * as THREE from 'three';
import {
  BRICK_PALETTE,
  CAPSULE_META,
  getBrickFaceTexture,
  getCapsuleBadgeTexture,
  getRadialGlowTexture,
} from './textures';
import { BrickColor, BrickType, CapsulePowerupType, ObstacleKind } from './types';

function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);

  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  return shape;
}

const extrudedGeoCache = new Map<string, THREE.ExtrudeGeometry>();

function getBeveledBrickGeometry(width: number, height: number): THREE.ExtrudeGeometry {
  const key = `${width.toFixed(2)}_${height.toFixed(2)}`;
  const cached = extrudedGeoCache.get(key);
  if (cached) return cached;

  const bodyW = width - 0.14;
  const bodyH = height - 0.14;
  const shape = createRoundedRectShape(bodyW, bodyH, 0.16);

  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.07,
    bevelOffset: 0,
    bevelSegments: 3,
  });
  geo.center();
  extrudedGeoCache.set(key, geo);
  return geo;
}

export interface BrickMeshBundle {
  group: THREE.Group;
  bodyMat: THREE.MeshPhysicalMaterial;
  rimMat: THREE.MeshStandardMaterial;
  faceMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  glowMat: THREE.MeshBasicMaterial;
  rivalRing: THREE.Mesh;
}

export function createCompositeBrickMesh(
  width: number,
  height: number,
  type: BrickType,
  color: BrickColor,
  hp: number,
  isSoftwareGl: boolean
): BrickMeshBundle {
  const group = new THREE.Group();
  const pal = BRICK_PALETTE[color];

  // Part 1: Primary Beveled 3D Hull
  const bodyGeo = getBeveledBrickGeometry(width, height);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: pal.baseHex,
    emissive: pal.emissiveHex,
    emissiveIntensity: type === 'lightning' ? 0.85 : 0.35,
    roughness: type === 'metal' ? 0.25 : 0.16,
    metalness: type === 'metal' ? 0.85 : 0.12,
    clearcoat: isSoftwareGl ? 0 : 1.0,
    clearcoatRoughness: 0.1,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = !isSoftwareGl;
  bodyMesh.receiveShadow = !isSoftwareGl;
  group.add(bodyMesh);

  // Part 2: Raised Bezel Rim
  const rimGeo = new THREE.BoxGeometry(width * 0.94, height * 0.92, 0.28);
  const rimMat = new THREE.MeshStandardMaterial({
    color: pal.rimHex,
    emissive: pal.baseHex,
    emissiveIntensity: 0.25,
    roughness: 0.45,
    metalness: 0.48,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.z = -0.05;
  group.add(rimMesh);

  // Part 3: Front Faceplate Decal
  const faceGeo = new THREE.PlaneGeometry(width * 0.95, height * 0.95);
  const faceTex = getBrickFaceTexture(type, color, hp, false);
  const faceMat = new THREE.MeshBasicMaterial({
    map: faceTex,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.position.z = 0.31;
  group.add(faceMesh);

  // Part 4: Rear Neon Halo Rim Plate
  const glowGeo = new THREE.PlaneGeometry(width * 1.16, height * 1.18);
  const glowMat = new THREE.MeshBasicMaterial({
    color: type === 'lightning' ? 0x00f0ff : pal.rimHex,
    transparent: true,
    opacity: type === 'lightning' ? 0.48 : 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  glowMesh.position.z = -0.26;
  group.add(glowMesh);

  // Part 5: Rival Revenge Halo Ring (Visible when this brick is designated as Revenge Target)
  const rivalGeo = new THREE.RingGeometry(
    Math.max(width, height) * 0.52,
    Math.max(width, height) * 0.66,
    28
  );
  const rivalMat = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const rivalRing = new THREE.Mesh(rivalGeo, rivalMat);
  rivalRing.position.z = 0.34;
  rivalRing.visible = false;
  group.add(rivalRing);

  return { group, bodyMat, rimMat, faceMesh, glowMat, rivalRing };
}

export function createCompositePaddleMesh(width: number = 3.1): {
  group: THREE.Group;
  coreMat: THREE.MeshStandardMaterial;
  sleeveMat: THREE.MeshPhysicalMaterial;
  magnetAura: THREE.Mesh;
  aimLine: THREE.Line;
  gunTurret: THREE.Group;
  muzzleFlash: THREE.Mesh;
} {
  const group = new THREE.Group();
  const radius = 0.34;
  const bodyLength = width - radius * 2;

  // 1. Inner White-Cyan Energy Core
  const coreGeo = new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, bodyLength * 0.92, 24);
  coreGeo.rotateZ(Math.PI / 2);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.35,
    roughness: 0.15,
    metalness: 0.1,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  // 2. Outer Electric Blue Sleeve
  const sleeveGeo = new THREE.CylinderGeometry(radius, radius, bodyLength, 28);
  sleeveGeo.rotateZ(Math.PI / 2);
  const sleeveMat = new THREE.MeshPhysicalMaterial({
    color: 0x0099ff,
    emissive: 0x0044aa,
    emissiveIntensity: 0.55,
    roughness: 0.12,
    metalness: 0.25,
    transparent: true,
    opacity: 0.86,
    clearcoat: 1.0,
  });
  const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
  group.add(sleeveMesh);

  // 3 & 4. Left & Right Metallic Emitter Collars
  const collarGeo = new THREE.CylinderGeometry(radius * 1.04, radius * 1.04, 0.14, 24);
  collarGeo.rotateZ(Math.PI / 2);
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x9333ea,
    emissiveIntensity: 0.4,
    roughness: 0.25,
    metalness: 0.88,
  });

  const leftCollar = new THREE.Mesh(collarGeo, collarMat);
  leftCollar.position.x = -bodyLength / 2;
  group.add(leftCollar);

  const rightCollar = new THREE.Mesh(collarGeo, collarMat);
  rightCollar.position.x = bodyLength / 2;
  group.add(rightCollar);

  // 5 & 6. Left & Right Pink/Magenta End-Caps
  const capGeo = new THREE.SphereGeometry(radius * 1.02, 24, 24);
  const capMat = new THREE.MeshPhysicalMaterial({
    color: 0xff1668,
    emissive: 0xb80048,
    emissiveIntensity: 0.75,
    roughness: 0.18,
    metalness: 0.2,
    clearcoat: 1.0,
  });

  const leftCap = new THREE.Mesh(capGeo, capMat);
  leftCap.scale.set(1.15, 1.0, 1.0);
  leftCap.position.x = -bodyLength / 2 - 0.06;
  group.add(leftCap);

  const rightCap = new THREE.Mesh(capGeo, capMat);
  rightCap.scale.set(1.15, 1.0, 1.0);
  rightCap.position.x = bodyLength / 2 + 0.06;
  group.add(rightCap);

  // 7. UnderGlow
  const underGlowGeo = new THREE.PlaneGeometry(width * 1.5, 1.5);
  const underGlowMat = new THREE.MeshBasicMaterial({
    map: getRadialGlowTexture(),
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const underGlow = new THREE.Mesh(underGlowGeo, underGlowMat);
  underGlow.position.set(0, -0.15, -0.35);
  group.add(underGlow);

  // 8. Magnet / Sticky Active Aura
  const magnetGeo = new THREE.RingGeometry(width * 0.42, width * 0.58, 32, 1, 0, Math.PI);
  const magnetMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const magnetAura = new THREE.Mesh(magnetGeo, magnetMat);
  magnetAura.position.set(0, 0.2, 0.1);
  group.add(magnetAura);

  // 9. Laser Aim Guide Line
  const aimPoints = [new THREE.Vector3(0, 0.35, 0.1), new THREE.Vector3(0, 4.2, 0.1)];
  const aimGeo = new THREE.BufferGeometry().setFromPoints(aimPoints);
  const aimMat = new THREE.LineDashedMaterial({
    color: 0x00f0ff,
    dashSize: 0.28,
    gapSize: 0.16,
    transparent: true,
    opacity: 0.85,
  });
  const aimLine = new THREE.Line(aimGeo, aimMat);
  aimLine.computeLineDistances();
  aimLine.visible = false;
  group.add(aimLine);

  // 10. Twin-Barrel 3D Machine Gun Turret (Deploys out of the paddle and aims toward the cursor!)
  const gunTurret = new THREE.Group();
  gunTurret.position.set(0, 0.28, 0.18);
  gunTurret.visible = false;

  const baseDomeGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const baseDomeMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0xf43f5e,
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.85,
  });
  const baseDome = new THREE.Mesh(baseDomeGeo, baseDomeMat);
  gunTurret.add(baseDome);

  const barrelGeo = new THREE.CylinderGeometry(0.065, 0.08, 0.68, 12);
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xff1668,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.9,
  });
  const leftBarrel = new THREE.Mesh(barrelGeo, barrelMat);
  leftBarrel.position.set(-0.12, 0.38, 0);
  gunTurret.add(leftBarrel);

  const rightBarrel = new THREE.Mesh(barrelGeo, barrelMat);
  rightBarrel.position.set(0.12, 0.38, 0);
  gunTurret.add(rightBarrel);

  const muzzleGeo = new THREE.PlaneGeometry(0.85, 0.85);
  const muzzleMat = new THREE.MeshBasicMaterial({
    map: getRadialGlowTexture(),
    color: 0xffb800,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const muzzleFlash = new THREE.Mesh(muzzleGeo, muzzleMat);
  muzzleFlash.position.set(0, 0.78, 0.05);
  gunTurret.add(muzzleFlash);

  group.add(gunTurret);

  return { group, coreMat, sleeveMat, magnetAura, aimLine, gunTurret, muzzleFlash };
}

export function createPlasmaBulletMesh(): THREE.Group {
  const group = new THREE.Group();
  const coreGeo = new THREE.CapsuleGeometry(0.08, 0.26, 8, 12);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xfff078,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  const haloGeo = new THREE.PlaneGeometry(0.65, 0.65);
  const haloMat = new THREE.MeshBasicMaterial({
    map: getRadialGlowTexture(),
    color: 0xff1668,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  group.add(halo);
  return group;
}

export function createSafetyWallMesh(): {
  group: THREE.Group;
  beamMat: THREE.MeshBasicMaterial;
} {
  const group = new THREE.Group();
  const beamGeo = new THREE.BoxGeometry(24, 0.16, 0.22);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  group.add(beam);

  const glowGeo = new THREE.PlaneGeometry(24, 0.9);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.z = -0.08;
  group.add(glow);

  group.visible = false;
  return { group, beamMat };
}

export const TRAIL_SEGMENTS = 18;

export interface OrbVisualBundle {
  orbGroup: THREE.Group;
  shellMat: THREE.MeshStandardMaterial;
  trailMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  history: THREE.Vector3[];
}

export function createCompositeOrbAndTrail(): OrbVisualBundle {
  const orbGroup = new THREE.Group();
  const radius = 0.34;

  const innerGeo = new THREE.SphereGeometry(radius * 0.76, 20, 20);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  const innerMesh = new THREE.Mesh(innerGeo, innerMat);
  orbGroup.add(innerMesh);

  const shellGeo = new THREE.SphereGeometry(radius, 20, 20);
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x00f0ff,
    emissiveIntensity: 1.2,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.82,
  });
  const shellMesh = new THREE.Mesh(shellGeo, shellMat);
  orbGroup.add(shellMesh);

  const ringGeo = new THREE.TorusGeometry(radius * 1.12, 0.04, 10, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff40a0,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 3;
  orbGroup.add(ringMesh);

  const haloGeo = new THREE.PlaneGeometry(radius * 4.4, radius * 4.4);
  const haloMat = new THREE.MeshBasicMaterial({
    map: getRadialGlowTexture(),
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  haloMesh.position.z = -0.05;
  orbGroup.add(haloMesh);

  const vertexCount = TRAIL_SEGMENTS * 2;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices: number[] = [];

  for (let i = 0; i < TRAIL_SEGMENTS - 1; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }

  const cHead = new THREE.Color(0x80ffff);
  const cMid = new THREE.Color(0x0088ff);
  const cTail = new THREE.Color(0xff1688);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < TRAIL_SEGMENTS; i++) {
    const t = i / (TRAIL_SEGMENTS - 1);
    if (t < 0.45) {
      tmpColor.lerpColors(cHead, cMid, t / 0.45);
    } else {
      tmpColor.lerpColors(cMid, cTail, (t - 0.45) / 0.55);
    }
    const fade = Math.pow(1 - t, 1.35);
    const r = tmpColor.r * fade;
    const g = tmpColor.g * fade;
    const b = tmpColor.b * fade;

    colors[(i * 2) * 3] = r;
    colors[(i * 2) * 3 + 1] = g;
    colors[(i * 2) * 3 + 2] = b;

    colors[(i * 2 + 1) * 3] = r;
    colors[(i * 2 + 1) * 3 + 1] = g;
    colors[(i * 2 + 1) * 3 + 2] = b;
  }

  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  trailGeo.setIndex(indices);

  const trailMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const trailMesh = new THREE.Mesh(trailGeo, trailMat);
  trailMesh.frustumCulled = false;

  const history: THREE.Vector3[] = [];
  for (let i = 0; i < TRAIL_SEGMENTS; i++) {
    history.push(new THREE.Vector3(0, -4.5, 0));
  }

  return { orbGroup, shellMat, trailMesh, history };
}

const _dir = new THREE.Vector3();
const _perp = new THREE.Vector3();

export function updateOrbTrailGeometry(bundle: OrbVisualBundle) {
  const posAttr = bundle.trailMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  const hist = bundle.history;

  for (let i = 0; i < TRAIL_SEGMENTS; i++) {
    const curr = hist[i];
    const next = hist[Math.min(i + 1, TRAIL_SEGMENTS - 1)];
    const prev = hist[Math.max(i - 1, 0)];

    _dir.subVectors(prev, next);
    if (_dir.lengthSq() < 0.00001) {
      _dir.set(0, 1, 0);
    } else {
      _dir.normalize();
    }
    _perp.set(-_dir.y, _dir.x, 0);

    const t = i / (TRAIL_SEGMENTS - 1);
    const halfWidth = 0.32 * Math.pow(1 - t, 0.75);

    const lx = curr.x + _perp.x * halfWidth;
    const ly = curr.y + _perp.y * halfWidth;
    const rx = curr.x - _perp.x * halfWidth;
    const ry = curr.y - _perp.y * halfWidth;

    posAttr.setXYZ(i * 2, lx, ly, -0.04);
    posAttr.setXYZ(i * 2 + 1, rx, ry, -0.04);
  }

  posAttr.needsUpdate = true;
}

/**
 * Builds a 4-part 3D Mystery Power-up Capsule
 * dropped with strict rarity when the player works hard to break bricks.
 */
export interface CapsuleMeshBundle {
  group: THREE.Group;
  bodyMat: THREE.MeshPhysicalMaterial;
  badgeMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  haloMat: THREE.MeshBasicMaterial;
}

export function createCompositeCapsuleMesh(): CapsuleMeshBundle {
  const group = new THREE.Group();

  // 1. 3D Pill Hull
  const bodyGeo = new THREE.CapsuleGeometry(0.28, 0.56, 12, 20);
  bodyGeo.rotateZ(Math.PI / 2);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0088ff,
    emissive: 0x0044aa,
    emissiveIntensity: 0.6,
    roughness: 0.15,
    metalness: 0.35,
    clearcoat: 1.0,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(bodyMesh);

  // 2. Metallic End Rings
  const ringGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 20);
  ringGeo.rotateZ(Math.PI / 2);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.85,
  });
  const leftRing = new THREE.Mesh(ringGeo, ringMat);
  leftRing.position.x = -0.28;
  group.add(leftRing);

  const rightRing = new THREE.Mesh(ringGeo, ringMat);
  rightRing.position.x = 0.28;
  group.add(rightRing);

  // 3. Front Label Badge Plane
  const badgeGeo = new THREE.PlaneGeometry(1.18, 0.58);
  const badgeMat = new THREE.MeshBasicMaterial({
    map: getCapsuleBadgeTexture('multiball_3'),
    transparent: true,
  });
  const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
  badgeMesh.position.z = 0.31;
  group.add(badgeMesh);

  // 4. Glow Halo
  const haloGeo = new THREE.PlaneGeometry(1.8, 1.3);
  const haloMat = new THREE.MeshBasicMaterial({
    map: getRadialGlowTexture(),
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  haloMesh.position.z = -0.15;
  group.add(haloMesh);

  return { group, bodyMat, badgeMesh, haloMat };
}

export function applyCapsuleStyle(bundle: CapsuleMeshBundle, type: CapsulePowerupType) {
  const meta = CAPSULE_META[type];
  bundle.bodyMat.color.setHex(meta.colorHex);
  bundle.bodyMat.emissive.setHex(meta.colorHex);
  bundle.haloMat.color.setHex(meta.colorHex);
  bundle.badgeMesh.material.map = getCapsuleBadgeTexture(type);
  bundle.badgeMesh.material.needsUpdate = true;
}

/**
 * Builds a 4-part 3D Deflector Obstacle (`bumper`, `prism`, or `vortex`)
 * Supports both Fixed Anchored Obstacles and Random 10-20s Phasing Obstacles.
 */
export interface ObstacleMeshBundle {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  outerRing: THREE.Mesh;
  warningRing: THREE.Mesh;
  coreMat: THREE.MeshStandardMaterial;
}

export function createCompositeObstacleMesh(): ObstacleMeshBundle {
  const group = new THREE.Group();

  // 1. Core Deflector Crystal / Sphere
  const coreGeo = new THREE.OctahedronGeometry(0.42, 0);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xff1668,
    emissive: 0x990044,
    emissiveIntensity: 0.9,
    roughness: 0.15,
    metalness: 0.75,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  // 2. Orbiting Bumper Torus Ring
  const outerGeo = new THREE.TorusGeometry(0.56, 0.08, 16, 32);
  const outerMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00b4ff,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.8,
  });
  const outerRing = new THREE.Mesh(outerGeo, outerMat);
  group.add(outerRing);

  // 3. Teleport / Spawn Warning Ring
  const warnGeo = new THREE.RingGeometry(0.68, 0.78, 32);
  const warnMat = new THREE.MeshBasicMaterial({
    color: 0xffe066,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const warningRing = new THREE.Mesh(warnGeo, warnMat);
  warningRing.position.z = -0.05;
  group.add(warningRing);

  // 4. Radial Glow Backdrop
  const glowGeo = new THREE.PlaneGeometry(1.9, 1.9);
  const glowMat = new THREE.MeshBasicMaterial({
    map: getRadialGlowTexture(),
    color: 0xff1688,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.z = -0.15;
  group.add(glow);

  return { group, coreMesh, outerRing, warningRing, coreMat };
}

export function styleObstacleByKind(
  bundle: ObstacleMeshBundle,
  kind: ObstacleKind,
  isFixed: boolean = false
) {
  const outerMat = bundle.outerRing.material as THREE.MeshStandardMaterial;
  if (kind === 'bumper') {
    bundle.coreMat.color.setHex(0xff1668);
    bundle.coreMat.emissive.setHex(0xcc0052);
    outerMat.color.setHex(isFixed ? 0xffd700 : 0x00f0ff);
  } else if (kind === 'prism') {
    bundle.coreMat.color.setHex(0xffe066);
    bundle.coreMat.emissive.setHex(0xd97706);
    outerMat.color.setHex(isFixed ? 0xf8fafc : 0xa855f7);
  } else {
    bundle.coreMat.color.setHex(0x9333ea);
    bundle.coreMat.emissive.setHex(0x6b21a8);
    outerMat.color.setHex(isFixed ? 0xffb800 : 0x10e84a);
  }
}

let sharedStarGeo: THREE.ExtrudeGeometry | null = null;

export function createCompositeStarMesh(): THREE.Group {
  const group = new THREE.Group();

  if (!sharedStarGeo) {
    const shape = new THREE.Shape();
    const points = 5;
    const outerR = 0.38;
    const innerR = 0.18;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points + Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    sharedStarGeo = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    sharedStarGeo.center();
  }

  const starMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xff8c00,
    emissiveIntensity: 0.55,
    roughness: 0.18,
    metalness: 0.55,
  });
  const starMesh = new THREE.Mesh(sharedStarGeo, starMat);
  group.add(starMesh);

  const gemGeo = new THREE.OctahedronGeometry(0.12, 0);
  const gemMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffe066,
    emissiveIntensity: 0.9,
    roughness: 0.1,
    metalness: 0.8,
  });
  const gem = new THREE.Mesh(gemGeo, gemMat);
  gem.position.z = 0.11;
  group.add(gem);

  const haloGeo = new THREE.PlaneGeometry(1.3, 1.3);
  const haloMat = new THREE.MeshBasicMaterial({
    map: getRadialGlowTexture(),
    color: 0xffd700,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.z = -0.08;
  group.add(halo);

  return group;
}

export function createCompositeRocketMesh(): THREE.Group {
  const group = new THREE.Group();

  const bodyGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.85, 20);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.2,
    metalness: 0.35,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  const noseGeo = new THREE.ConeGeometry(0.22, 0.45, 20);
  const noseMat = new THREE.MeshStandardMaterial({
    color: 0xff1668,
    emissive: 0x990038,
    emissiveIntensity: 0.5,
    roughness: 0.25,
    metalness: 0.2,
  });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.y = 0.65;
  group.add(nose);

  const winGeo = new THREE.SphereGeometry(0.11, 16, 16);
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00b4ff,
    emissiveIntensity: 0.9,
    roughness: 0.1,
    metalness: 0.8,
  });
  const win = new THREE.Mesh(winGeo, winMat);
  win.position.set(0, 0.12, 0.18);
  group.add(win);

  const finGeo = new THREE.BoxGeometry(0.12, 0.38, 0.06);
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(finGeo, noseMat);
    const angle = (i * Math.PI * 2) / 3;
    fin.position.set(Math.cos(angle) * 0.26, -0.28, Math.sin(angle) * 0.26);
    fin.rotation.y = -angle;
    group.add(fin);
  }

  const flameGeo = new THREE.ConeGeometry(0.18, 0.65, 16);
  flameGeo.rotateX(Math.PI);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.y = -0.72;
  group.add(flame);

  return group;
}

export function createCurvedSpaceArena(scene: THREE.Scene): {
  starfield: THREE.InstancedMesh;
  floorGlow: THREE.Mesh;
} {
  const floorGeo = new THREE.CylinderGeometry(24, 24, 26, 48, 12, true, -Math.PI * 0.38, Math.PI * 0.76);
  floorGeo.rotateZ(Math.PI / 2);

  const gridCanvas = document.createElement('canvas');
  gridCanvas.width = 512;
  gridCanvas.height = 512;
  const gCtx = gridCanvas.getContext('2d')!;
  gCtx.fillStyle = '#07051D';
  gCtx.fillRect(0, 0, 512, 512);

  const radGrad = gCtx.createRadialGradient(256, 180, 10, 256, 220, 240);
  radGrad.addColorStop(0, 'rgba(0, 240, 255, 0.52)');
  radGrad.addColorStop(0.45, 'rgba(255, 22, 104, 0.32)');
  radGrad.addColorStop(1, 'rgba(7, 5, 29, 0)');
  gCtx.fillStyle = radGrad;
  gCtx.fillRect(0, 0, 512, 512);

  gCtx.strokeStyle = 'rgba(56, 189, 248, 0.38)';
  gCtx.lineWidth = 3;
  for (let i = 0; i <= 16; i++) {
    const pos = (i / 16) * 512;
    gCtx.beginPath();
    gCtx.moveTo(pos, 0);
    gCtx.lineTo(pos, 512);
    gCtx.stroke();

    gCtx.beginPath();
    gCtx.moveTo(0, pos);
    gCtx.lineTo(512, pos);
    gCtx.stroke();
  }

  const gridTex = new THREE.CanvasTexture(gridCanvas);
  gridTex.colorSpace = THREE.SRGBColorSpace;
  gridTex.wrapS = THREE.RepeatWrapping;
  gridTex.wrapT = THREE.RepeatWrapping;
  gridTex.repeat.set(3, 1);

  const floorMat = new THREE.MeshStandardMaterial({
    map: gridTex,
    roughness: 0.3,
    metalness: 0.5,
    side: THREE.BackSide,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.set(0, -29.0, -2.5);
  floorMesh.rotation.x = 0.25;
  scene.add(floorMesh);

  const rimCurve = new THREE.EllipseCurve(0, -6.5, 16.0, 1.25, 0.1 * Math.PI, 0.9 * Math.PI, false, 0);
  const rimPts = rimCurve.getPoints(64).map((p) => new THREE.Vector3(p.x, p.y, -1.2));
  const rimLineGeo = new THREE.BufferGeometry().setFromPoints(rimPts);
  const rimLineMat = new THREE.LineBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.75,
  });
  const horizonLine = new THREE.Line(rimLineGeo, rimLineMat);
  scene.add(horizonLine);

  const floorGlowGeo = new THREE.PlaneGeometry(8.5, 3.2);
  const floorGlowMat = new THREE.MeshBasicMaterial({
    map: getRadialGlowTexture(),
    color: 0x00d8ff,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const floorGlow = new THREE.Mesh(floorGlowGeo, floorGlowMat);
  floorGlow.position.set(0, -6.8, -1.4);
  scene.add(floorGlow);

  const starCount = 120;
  const diamondGeo = new THREE.OctahedronGeometry(0.08, 0);
  const diamondMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.65,
  });
  const starfield = new THREE.InstancedMesh(diamondGeo, diamondMat, starCount);
  const dummy = new THREE.Object3D();
  const cPalette = [
    new THREE.Color(0x38bdf8),
    new THREE.Color(0xff40a0),
    new THREE.Color(0xa855f7),
    new THREE.Color(0xffe066),
    new THREE.Color(0xffffff),
  ];

  for (let i = 0; i < starCount; i++) {
    dummy.position.set(
      (Math.random() - 0.5) * 24,
      (Math.random() - 0.5) * 18,
      -2.2 - Math.random() * 3.5
    );
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    const s = 0.45 + Math.random() * 1.35;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    starfield.setMatrixAt(i, dummy.matrix);
    starfield.setColorAt(i, cPalette[i % cPalette.length]);
  }
  starfield.instanceMatrix.needsUpdate = true;
  if (starfield.instanceColor) starfield.instanceColor.needsUpdate = true;
  starfield.computeBoundingSphere();
  scene.add(starfield);

  return { starfield, floorGlow };
}
