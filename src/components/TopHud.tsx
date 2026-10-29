import React from 'react';
import { Flame, Shield, Crosshair, Wrench } from 'lucide-react';
import { GameHudSnapshot } from '../game/types';

interface TopHudProps {
  hud: GameHudSnapshot;
  onTogglePause: () => void;
  onOpenRivalEditor: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  hud,
  onTogglePause,
  onOpenRivalEditor,
}) => {
  const formattedScore = hud.score
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const progressPercent = Math.round(Math.max(8, Math.min(100, hud.progress * 100)));
  const isFever = hud.activeBoosters.isFeverMode;
  const hasGun = hud.activeBoosters.machineGunTimeLeft > 0;
  const hasShield = hud.activeBoosters.safetyWallTimeLeft > 0;

  return (
    <header className="fixed top-0 left-0 right-0 z-20 pointer-events-none px-2.5 sm:px-5 pt-1.5 sm:pt-2">
      <div className="max-w-6xl mx-auto flex items-start justify-between gap-2">
        {/* Top-Left: ONLY Pause Button (II) — All Menus live inside Pause! */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={onTogglePause}
            title="Menu Pause & Quartier Général (Échap)"
            aria-label="Ouvrir le Menu Pause"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-2 border-[#7C3AED]/85 bg-[#140B38]/90 hover:bg-[#1E1152] active:scale-95 transition-transform shadow-[0_0_16px_rgba(124,58,237,0.65),inset_0_0_8px_rgba(56,189,248,0.35)] cursor-pointer"
          >
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-4 rounded-full bg-white shadow-[0_0_8px_#00F0FF]" />
              <span className="w-1.5 h-4 rounded-full bg-white shadow-[0_0_8px_#00F0FF]" />
            </div>
          </button>

          {hud.playMode === 'draft_test' && (
            <button
              onClick={onOpenRivalEditor}
              className="min-h-[34px] px-2.5 py-1 rounded-xl bg-[#A855F7] hover:bg-[#9333EA] text-white font-display font-extrabold text-[10px] flex items-center gap-1 cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.6)]"
            >
              <Wrench className="w-3 h-3" />
              <span>Studio</span>
            </button>
          )}
        </div>

        {/* Top-Center: Compact Score Pill + Slim Level Progress Bar */}
        <div className="flex flex-col items-center pointer-events-auto">
          <div
            className={`hud-pill-surface flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full border-2 transition-colors ${
              isFever
                ? 'border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.65)]'
                : 'border-[#6D28D9]/80'
            }`}
          >
            {/* Golden Crown SVG */}
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 drop-shadow-[0_0_6px_rgba(255,215,0,0.75)]"
              viewBox="0 0 36 32"
              fill="none"
            >
              <path
                d="M4 26L2 10L11 16L18 5L25 16L34 10L32 26H4Z"
                fill="url(#crownGold)"
                stroke="#FFF3B0"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <rect x="4" y="26" width="28" height="3.5" rx="1.75" fill="#F59E0B" />
              <circle cx="2" cy="8" r="2" fill="#FFF3B0" />
              <circle cx="18" cy="3.5" r="2.3" fill="#FFF3B0" />
              <circle cx="34" cy="8" r="2" fill="#FFF3B0" />
              <circle cx="18" cy="19" r="2.2" fill="#FF1668" />
              <defs>
                <linearGradient id="crownGold" x1="18" y1="4" x2="18" y2="27" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFE866" />
                  <stop offset="0.55" stopColor="#FFB800" />
                  <stop offset="1" stopColor="#D97706" />
                </linearGradient>
              </defs>
            </svg>

            {/* Score Readout */}
            <span
              className={`font-display font-black text-base sm:text-2xl tracking-tight text-white tabular-nums whitespace-nowrap ${
                isFever ? 'neon-fever-glow' : 'neon-score-glow'
              }`}
            >
              {formattedScore}
            </span>

            {/* Star + Multiplier */}
            <div className="flex items-center gap-0.5">
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 drop-shadow-[0_0_6px_rgba(255,200,0,0.85)]"
                viewBox="0 0 28 28"
                fill="none"
              >
                <path
                  d="M14 2L17.6 9.6L26 10.7L19.8 16.5L21.4 24.8L14 20.8L6.6 24.8L8.2 16.5L2 10.7L10.4 9.6L14 2Z"
                  fill="url(#starGold)"
                  stroke="#FFF7CC"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="starGold" x1="14" y1="2" x2="14" y2="25" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FFF078" />
                    <stop offset="1" stopColor="#FF9900" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="font-display font-extrabold text-xs sm:text-sm text-white tabular-nums">
                x{hud.multiplier}
              </span>
            </div>
          </div>

          {/* Slim Level Title & Progress Bar */}
          <div className="mt-0.5 flex flex-col items-center w-36 sm:w-52">
            <div className="flex items-center gap-1.5 justify-center">
              <span className="font-display font-bold text-[9px] sm:text-[11px] tracking-wider text-white uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] whitespace-nowrap">
                {hud.levelName}
              </span>
              {hud.activeBallsCount > 1 && (
                <span className="text-[9px] font-extrabold text-[#00F0FF] tabular-nums whitespace-nowrap">
                  · {hud.activeBallsCount} Billes
                </span>
              )}
              {hasGun && (
                <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-[#FB7185] whitespace-nowrap">
                  <Crosshair className="w-2.5 h-2.5" /> TIR
                </span>
              )}
              {hasShield && (
                <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-[#22D3EE] whitespace-nowrap">
                  <Shield className="w-2.5 h-2.5" /> MUR
                </span>
              )}
              {isFever && (
                <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-[#FFD700] whitespace-nowrap">
                  <Flame className="w-2.5 h-2.5 fill-[#FFD700]" /> FEVER
                </span>
              )}
            </div>

            <div className="mt-0.5 w-full h-2 rounded-full bg-[#150C36] border border-[#6D28D9]/80 p-0.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  isFever
                    ? 'bg-gradient-to-r from-[#FFB800] via-[#FF1668] to-[#00F0FF] shadow-[0_0_10px_#FFD700]'
                    : 'bg-gradient-to-r from-[#FF1668] via-[#FF3888] to-[#FF75B5] shadow-[0_0_10px_#FF1668]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Mystery Capsule Collected Toast */}
          {hud.lastPowerupLabel && (
            <div className="mt-0.5 px-2.5 py-0.5 rounded-lg bg-[#1A0E42]/95 border border-[#00F0FF]/70 text-[9px] sm:text-[11px] font-display font-extrabold text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.45)] whitespace-nowrap">
              {hud.lastPowerupLabel}
            </div>
          )}
        </div>

        {/* Top-Right: ONLY 3 Hearts Gauge */}
        <div className="flex items-center pointer-events-auto">
          <div
            className="hud-pill-surface flex items-center gap-1 px-2.5 py-1 sm:py-1.5 rounded-full border-2 border-[#9D174D]/80"
            aria-label={`Vies restantes : ${hud.lives} sur ${hud.maxLives}`}
          >
            {Array.from({ length: hud.maxLives }).map((_, idx) => {
              const filled = idx < hud.lives;
              return (
                <svg
                  key={idx}
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150 ${
                    filled
                      ? 'scale-100 drop-shadow-[0_0_6px_rgba(255,42,133,0.9)]'
                      : 'scale-90 opacity-45'
                  }`}
                  viewBox="0 0 28 26"
                  fill="none"
                >
                  <path
                    d="M14 23.8C14 23.8 2.5 16.2 2.5 8.6C2.5 4.7 5.6 1.8 9.3 1.8C11.5 1.8 13.3 2.9 14 4.5C14.7 2.9 16.5 1.8 18.7 1.8C22.4 1.8 25.5 4.7 25.5 8.6C25.5 16.2 14 23.8 14 23.8Z"
                    fill={filled ? 'url(#heartPink)' : 'rgba(20, 10, 45, 0.7)'}
                    stroke={filled ? '#FF94C2' : '#7E22CE'}
                    strokeWidth="1.8"
                  />
                  {filled && (
                    <ellipse
                      cx="8.5"
                      cy="6.8"
                      rx="2.4"
                      ry="1.3"
                      transform="rotate(-25 8.5 6.8)"
                      fill="rgba(255,255,255,0.65)"
                    />
                  )}
                  <defs>
                    <linearGradient id="heartPink" x1="14" y1="2" x2="14" y2="24" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FF66A8" />
                      <stop offset="0.5" stopColor="#FF1668" />
                      <stop offset="1" stopColor="#B80044" />
                    </linearGradient>
                  </defs>
                </svg>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
