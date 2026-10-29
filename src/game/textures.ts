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
    baseHex: 0xff1668,
    emissiveHex: 0x990038,
    rimHex: 0xff66a3,
    topGrad: '#FF4088',
    botGrad: '#E00852',
    borderStroke: '#FF94BE',
  },
  yellow: {
    baseHex: 0xffb300,
    emissiveHex: 0x804d00,
    rimHex: 0xffe066,
    topGrad: '#FFD026',
    botGrad: '#EB9200',
    borderStroke: '#FFF099',
  },
  green: {
    baseHex: 0x08dd38,
    emissiveHex: 0x006618,
    rimHex: 0x66ff8c,
    topGrad: '#2BF056',
    botGrad: '#05B52B',
    borderStroke: '#99FFAE',
  },
  blue: {
    baseHex: 0x0084ff,
    emissiveHex: 0x003b80,
    rimHex: 0x66bdff,
    topGrad: '#2BA2FF',
    botGrad: '#0068E0',
    borderStroke: '#99D3FF',
  },
  purple: {
    baseHex: 0x8824ff,
    emissiveHex: 0x3f0088,
    rimHex: 0xc488ff,
    topGrad: '#A24BFF',
    botGrad: '#6C12E0',
    borderStroke: '#DCAEFF',
  },
  orange: {
    baseHex: 0xff5500,
    emissiveHex: 0x882200,
    rimHex: 0xff9966,
    topGrad: '#FF7724',
    botGrad: '#E03D00',
    borderStroke: '#FFB894',
  },
  lightning: {
    baseHex: 0x0f172a,
    emissiveHex: 0x0c4a6e,
    rimHex: 0x38bdf8,
    topGrad: '#162544',
    botGrad: '#080E1E',
    borderStroke: '#7DD3FC',
  },
  metal: {
    baseHex: 0x64748b,
    emissiveHex: 0x1e293b,
    rimHex: 0xcbd5e1,
    topGrad: '#94A3B8',
    botGrad: '#334155',
    borderStroke: '#E2E8F0',
  },
};

const textureCache = new Map<string, THREE.CanvasTexture>();
let maxAnisotropy = 4;

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
  const key = `${type}_${color}_${clampedHp}_${isRival ? 'rival' : 'std'}`;
  const existing = textureCache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 340;
  const ctx = canvas.getContext('2d')!;
  const pal = BRICK_PALETTE[color];

  // 1. Glossy outer bevel fill
  const outerGrad = ctx.createLinearGradient(0, 0, 0, 340);
  outerGrad.addColorStop(0, isRival ? '#FFD700' : pal.borderStroke);
  outerGrad.addColorStop(0.5, pal.topGrad);
  outerGrad.addColorStop(1, pal.botGrad);
  drawRoundedRect(ctx, 8, 8, 496, 324, 52);
  ctx.fillStyle = outerGrad;
  ctx.fill();

  // 2. Inner candy body
  const innerGrad = ctx.createLinearGradient(0, 24, 0, 316);
  innerGrad.addColorStop(0, pal.topGrad);
  innerGrad.addColorStop(1, pal.botGrad);
  drawRoundedRect(ctx, 22, 22, 468, 296, 40);
  ctx.fillStyle = innerGrad;
  ctx.fill();

  // 3. Top glossy highlight bar
  const glossGrad = ctx.createLinearGradient(0, 26, 0, 110);
  glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  drawRoundedRect(ctx, 36, 28, 440, 82, 30);
  ctx.fillStyle = glossGrad;
  ctx.fill();

  // Optional Rival Revenge Border & Crown Badge
  if (isRival) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 10;
    drawRoundedRect(ctx, 18, 18, 476, 304, 42);
    ctx.stroke();

    ctx.font = '800 38px "Outfit", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'left';
    ctx.fillText('★ REVANCHE', 42, 68);
  }

  // 4. Content by brick type
  if (type === 'lightning') {
    const rad = ctx.createRadialGradient(256, 170, 15, 256, 170, 210);
    rad.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
    rad.addColorStop(0.6, 'rgba(14, 116, 144, 0.25)');
    rad.addColorStop(1, 'rgba(8, 14, 30, 0.95)');
    drawRoundedRect(ctx, 24, 24, 464, 292, 38);
    ctx.fillStyle = rad;
    ctx.fill();

    ctx.strokeStyle = '#7DD3FC';
    ctx.lineWidth = 7;
    drawRoundedRect(ctx, 26, 26, 460, 288, 36);
    ctx.stroke();

    ctx.save();
    ctx.translate(256, 170);
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = 32;

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
    boltGrad.addColorStop(1, '#00B4FF');
    ctx.fillStyle = boltGrad;
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.restore();
  } else if (type === 'kawaii_happy') {
    ctx.save();
    ctx.translate(256, 178);

    ctx.fillStyle = color === 'pink' ? 'rgba(255, 160, 200, 0.55)' : 'rgba(255, 80, 120, 0.48)';
    ctx.beginPath();
    ctx.ellipse(-105, 16, 26, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(105, 16, 26, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1E0B28';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.arc(-68, -10, 32, Math.PI * 1.12, Math.PI * 1.88, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(68, -10, 32, Math.PI * 1.12, Math.PI * 1.88, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 6, 34, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = '#1E0B28';
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#FF4D88';
    ctx.beginPath();
    ctx.arc(0, 38, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (clampedHp > 10) {
      ctx.font = '800 44px "Outfit", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.textAlign = 'right';
      ctx.fillText(String(clampedHp), 205, -96);
    }

    ctx.restore();
  } else if (type === 'kawaii_wink') {
    ctx.save();
    ctx.translate(256, 178);

    ctx.fillStyle = 'rgba(255, 85, 125, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-105, 18, 26, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(105, 18, 26, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1E0B28';
    ctx.beginPath();
    ctx.arc(-68, -14, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-75, -22, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-59, -6, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1E0B28';
    ctx.lineWidth = 17;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(92, -34);
    ctx.lineTo(46, -12);
    ctx.lineTo(92, 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 8, 32, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = '#1E0B28';
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#FF4D88';
    ctx.beginPath();
    ctx.arc(6, 36, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (clampedHp > 10) {
      ctx.font = '800 44px "Outfit", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.textAlign = 'right';
      ctx.fillText(String(clampedHp), 205, -96);
    }

    ctx.restore();
  } else if (type === 'metal') {
    ctx.fillStyle = '#1E293B';
    [
      [60, 60],
      [452, 60],
      [60, 280],
      [452, 280],
    ].forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(rx, ry, 14, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(110, 170);
    ctx.lineTo(402, 170);
    ctx.stroke();
  } else {
    ctx.save();
    ctx.font = '800 142px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = isRival ? '#FFFBEB' : '#FFFFFF';
    ctx.fillText(String(clampedHp), 256, 178);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
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
    announcement: '🔫 FUSIL MITRAILLEUSE ACTIVÉ (VISÉE CURSEUR) !',
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
