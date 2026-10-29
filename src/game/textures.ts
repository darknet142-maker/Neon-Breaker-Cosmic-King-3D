import * as THREE from 'three';
import { BrickColor, BrickType, CapsulePowerupType } from './types';

export const BRICK_PALETTE: Record<
  BrickColor,
  {
    baseHex: number;
    emissiveHex: number;
    rimHex: number;
    topGrad: string;
    botGrad: string;
    borderStroke: string;
  }
> = {
  pink: {
    baseHex: 0xff006e,
    emissiveHex: 0xc20052,
    rimHex: 0xff70a6,
    topGrad: '#FF2A85',
    botGrad: '#D90057',
    borderStroke: '#FF99C8',
  },
  yellow: {
    baseHex: 0xffd600,
    emissiveHex: 0xb87d00,
    rimHex: 0xfff066,
    topGrad: '#FFEA00',
    botGrad: '#FF9E00',
    borderStroke: '#FFF799',
  },
  green: {
    baseHex: 0x00f566,
    emissiveHex: 0x009938,
    rimHex: 0x70ffaa,
    topGrad: '#24FF7B',
    botGrad: '#00C846',
    borderStroke: '#ADFFCC',
  },
  blue: {
    baseHex: 0x00b4ff,
    emissiveHex: 0x0062cc,
    rimHex: 0x70dfff,
    topGrad: '#00E5FF',
    botGrad: '#0066FF',
    borderStroke: '#A8F0FF',
  },
  purple: {
    baseHex: 0x9d24ff,
    emissiveHex: 0x6200b8,
    rimHex: 0xd288ff,
    topGrad: '#C44DFF',
    botGrad: '#7B00E0',
    borderStroke: '#E8B8FF',
  },
  orange: {
    baseHex: 0xff5e00,
    emissiveHex: 0xb83300,
    rimHex: 0xffa366,
    topGrad: '#FF8811',
    botGrad: '#F03200',
    borderStroke: '#FFCAA3',
  },
  lightning: {
    baseHex: 0x082f49,
    emissiveHex: 0x0284c7,
    rimHex: 0x38bdf8,
    topGrad: '#0E588A',
    botGrad: '#071936',
    borderStroke: '#38BDF8',
  },
  metal: {
    baseHex: 0x94a3b8,
    emissiveHex: 0x334155,
    rimHex: 0xe2e8f0,
    topGrad: '#CBD5E1',
    botGrad: '#475569',
    borderStroke: '#F8FAFC',
  },
};

const textureCache = new Map<string, THREE.CanvasTexture>();
let maxAnisotropy = 8;

export function setTextureMaxAnisotropy(aniso: number) {
  maxAnisotropy = Math.max(1, aniso);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function getBrickFaceTexture(
  type: BrickType,
  color: BrickColor,
  hp: number,
  isRival: boolean = false
): THREE.CanvasTexture {
  const clampedHp = Math.max(0, Math.ceil(hp));
  const key = `uhd_vec_${type}_${color}_${clampedHp}_${isRival ? 'rival' : 'std'}`;
  const existing = textureCache.get(key);
  if (existing) return existing;

  // Ultra-HD 2x Retina Vector Canvas (1024 x 680)
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 680;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const pal = BRICK_PALETTE[color];

  // 1. Crisp luminous outer vector border
  drawRoundedRect(ctx, 0, 0, 512, 340, 24);
  ctx.fillStyle = isRival ? '#FFD700' : pal.borderStroke;
  ctx.fill();

  // 2. Deep vibrant vector body gradient
  const innerGrad = ctx.createLinearGradient(0, 8, 0, 332);
  innerGrad.addColorStop(0, pal.topGrad);
  innerGrad.addColorStop(0.55, pal.topGrad);
  innerGrad.addColorStop(1, pal.botGrad);
  drawRoundedRect(ctx, 10, 10, 492, 320, 18);
  ctx.fillStyle = innerGrad;
  ctx.fill();

  // 3. Crisp inner vector bevel contour line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 14, 14, 484, 312, 15);
  ctx.stroke();

  // 4. Crisp vector top specular highlight ribbon
  const glossGrad = ctx.createLinearGradient(0, 16, 0, 74);
  glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0.04)');
  drawRoundedRect(ctx, 20, 18, 472, 48, 12);
  ctx.fillStyle = glossGrad;
  ctx.fill();

  // 5. Subtle bottom rim shadow for crisp vector relief
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  drawRoundedRect(ctx, 20, 298, 472, 22, 10);
  ctx.fill();

  // Optional Rival Revenge Border & Crown Badge
  if (isRival) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 10;
    drawRoundedRect(ctx, 12, 12, 488, 316, 18);
    ctx.stroke();

    ctx.font = '800 38px "Outfit", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'left';
    ctx.fillText('★ REVANCHE', 34, 62);
  }

  // 6. Content by brick type
  if (type === 'lightning') {
    const rad = ctx.createRadialGradient(256, 170, 15, 256, 170, 215);
    rad.addColorStop(0, 'rgba(0, 240, 255, 0.78)');
    rad.addColorStop(0.55, 'rgba(2, 132, 199, 0.42)');
    rad.addColorStop(1, 'rgba(7, 25, 54, 0.96)');
    drawRoundedRect(ctx, 20, 20, 472, 300, 20);
    ctx.fillStyle = rad;
    ctx.fill();

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 7;
    drawRoundedRect(ctx, 24, 24, 464, 292, 18);
    ctx.stroke();

    ctx.save();
    ctx.translate(256, 170);
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = 26;

    ctx.beginPath();
    ctx.moveTo(22, -108);
    ctx.lineTo(-56, 10);
    ctx.lineTo(-4, 10);
    ctx.lineTo(-28, 108);
    ctx.lineTo(58, -14);
    ctx.lineTo(6, -14);
    ctx.closePath();

    const boltGrad = ctx.createLinearGradient(-40, -100, 40, 100);
    boltGrad.addColorStop(0, '#FFFFFF');
    boltGrad.addColorStop(0.45, '#7DD3FC');
    boltGrad.addColorStop(1, '#00E5FF');
    ctx.fillStyle = boltGrad;
    ctx.fill();

    ctx.lineWidth = 7;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.restore();
  } else if (type === 'kawaii_happy') {
    ctx.save();
    ctx.translate(256, 178);

    ctx.fillStyle = color === 'pink' ? 'rgba(255, 190, 220, 0.72)' : 'rgba(255, 75, 130, 0.65)';
    ctx.beginPath();
    ctx.ellipse(-105, 16, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(105, 16, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#14051E';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.arc(-68, -10, 32, Math.PI * 1.12, Math.PI * 1.88, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(68, -10, 32, Math.PI * 1.12, Math.PI * 1.88, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 6, 35, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = '#14051E';
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#FF3377';
    ctx.beginPath();
    ctx.arc(0, 38, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (clampedHp > 10) {
      ctx.font = '900 48px "Outfit", sans-serif';
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(15, 5, 30, 0.78)';
      ctx.textAlign = 'right';
      ctx.strokeText(String(clampedHp), 212, -94);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(String(clampedHp), 212, -94);
    }

    ctx.restore();
  } else if (type === 'kawaii_wink') {
    ctx.save();
    ctx.translate(256, 178);

    ctx.fillStyle = 'rgba(255, 75, 130, 0.65)';
    ctx.beginPath();
    ctx.ellipse(-105, 18, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(105, 18, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#14051E';
    ctx.beginPath();
    ctx.arc(-68, -14, 25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-75, -22, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-59, -6, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#14051E';
    ctx.lineWidth = 19;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(92, -34);
    ctx.lineTo(46, -12);
    ctx.lineTo(92, 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 8, 33, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = '#14051E';
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#FF3377';
    ctx.beginPath();
    ctx.arc(6, 36, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (clampedHp > 10) {
      ctx.font = '900 48px "Outfit", sans-serif';
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(15, 5, 30, 0.78)';
      ctx.textAlign = 'right';
      ctx.strokeText(String(clampedHp), 212, -94);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(String(clampedHp), 212, -94);
    }

    ctx.restore();
  } else if (type === 'metal') {
    ctx.fillStyle = '#0F172A';
    [
      [56, 56],
      [456, 56],
      [56, 284],
      [456, 284],
    ].forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(rx, ry, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.arc(rx - 3, ry - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(106, 170);
    ctx.lineTo(406, 170);
    ctx.stroke();
  } else {
    ctx.save();
    ctx.font = '900 152px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 16;
    ctx.strokeStyle = 'rgba(15, 6, 32, 0.72)';
    ctx.strokeText(String(clampedHp), 256, 178);
    ctx.fillStyle = isRival ? '#FFFBEB' : '#FFFFFF';
    ctx.fillText(String(clampedHp), 256, 178);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;

  textureCache.set(key, texture);
  return texture;
}

// Procedural texture for Falling Mystery Power-up Capsules (XL, MINI, GLU, x3, x5, x10)
const capsuleTexCache = new Map<CapsulePowerupType, THREE.CanvasTexture>();

export const CAPSULE_META: Record<
  CapsulePowerupType,
  { label: string; colorHex: number; bgTop: string; bgBot: string; border: string; announcement: string }
> = {
  paddle_xl: {
    label: 'XL ↔',
    colorHex: 0x10e84a,
    bgTop: '#2BF056',
    bgBot: '#059669',
    border: '#A7F3D0',
    announcement: 'BARRE GÉANTE XL (+50%) !',
  },
  paddle_mini: {
    label: 'MINI ><',
    colorHex: 0xff4500,
    bgTop: '#FF6B2B',
    bgBot: '#DC2626',
    border: '#FECACA',
    announcement: 'PIÈGE BARRE MINI · POINTS DOUBLÉS !',
  },
  paddle_sticky: {
    label: 'COLLE',
    colorHex: 0x00f0ff,
    bgTop: '#38BDF8',
    bgBot: '#6D28D9',
    border: '#BAE6FD',
    announcement: 'RAQUETTE COLLANTE ACTIVÉE !',
  },
  machine_gun: {
    label: 'MITRAILLE',
    colorHex: 0xf43f5e,
    bgTop: '#FB7185',
    bgBot: '#BE123C',
    border: '#FFE4E6',
    announcement: '🔫 MITRAILLEUSE ACTIVE (5s MAX · VISÉE CURSEUR) !',
  },
  safety_wall: {
    label: 'BOUCLIER',
    colorHex: 0x06b6d4,
    bgTop: '#22D3EE',
    bgBot: '#0E7490',
    border: '#CFFAFE',
    announcement: '🛡️ MUR DE SÉCURITÉ ACTIVÉ (1 SAUVETAGE) !',
  },
  speed_fast: {
    label: 'TURBO ⚡+',
    colorHex: 0xf59e0b,
    bgTop: '#FBBF24',
    bgBot: '#B45309',
    border: '#FEF3C7',
    announcement: '⚡ VITESSE TURBO (+28% · POINTS x1.5) !',
  },
  speed_slow: {
    label: 'SLOW ❄️-',
    colorHex: 0x3b82f6,
    bgTop: '#60A5FA',
    bgBot: '#1D4ED8',
    border: '#DBEAFE',
    announcement: '❄️ BALLE RALENTIE (-25% VITESSE) !',
  },
  multiball_3: {
    label: 'BILLE x3',
    colorHex: 0x0088ff,
    bgTop: '#38BDF8',
    bgBot: '#0284C7',
    border: '#E0F2FE',
    announcement: 'MULTI-BILLES x3 !',
  },
  multiball_5: {
    label: 'BILLE x5',
    colorHex: 0x9333ea,
    bgTop: '#C084FC',
    bgBot: '#7E22CE',
    border: '#F3E8FF',
    announcement: 'MEGA MULTI-BILLES x5 !',
  },
  multiball_10: {
    label: 'JACKPOT x10',
    colorHex: 0xffd700,
    bgTop: '#FFE866',
    bgBot: '#D97706',
    border: '#FEF9C3',
    announcement: '🔥 JACKPOT SURCHARGE x10 BILLES ! 🔥',
  },
};

export function getCapsuleBadgeTexture(type: CapsulePowerupType): THREE.CanvasTexture {
  const existing = capsuleTexCache.get(type);
  if (existing) return existing;

  const meta = CAPSULE_META[type];
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, meta.bgTop);
  grad.addColorStop(1, meta.bgBot);

  drawRoundedRect(ctx, 8, 8, 240, 112, 56);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = 8;
  ctx.strokeStyle = meta.border;
  ctx.stroke();

  ctx.font = '900 40px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = type === 'multiball_10' || type === 'speed_fast' ? '#1E0B28' : '#FFFFFF';
  ctx.fillText(meta.label, 128, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  capsuleTexCache.set(type, tex);
  return tex;
}

let sharedGlowTexture: THREE.CanvasTexture | null = null;
export function getRadialGlowTexture(): THREE.CanvasTexture {
  if (sharedGlowTexture) return sharedGlowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 4, 128, 128, 124);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.25, 'rgba(255, 240, 180, 0.85)');
  grad.addColorStop(0.55, 'rgba(255, 80, 200, 0.4)');
  grad.addColorStop(1, 'rgba(0, 240, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  sharedGlowTexture = new THREE.CanvasTexture(canvas);
  sharedGlowTexture.colorSpace = THREE.SRGBColorSpace;
  return sharedGlowTexture;
}
