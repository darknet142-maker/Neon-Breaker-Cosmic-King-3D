import React from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Grid,
  Flame,
  Users,
  Swords,
  Trophy,
  Shield,
  Crosshair,
  User,
  Wrench,
} from 'lucide-react';
import { GameHudSnapshot } from '../game/types';

interface TopHudProps {
  hud: GameHudSnapshot;
  isMuted: boolean;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onOpenLevelSelect: () => void;
  onOpenRivalBrowser: () => void;
  onOpenUserProfile: () => void;
  onOpenRivalEditor: () => void;
  onOpenHallOfFame: () => void;
  onTriggerDemoBurst: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  hud,
  isMuted,
  onTogglePause,
  onToggleMute,
  onOpenLevelSelect,
  onOpenRivalBrowser,
  onOpenUserProfile,
  onOpenRivalEditor,
  onOpenHallOfFame,
  onTriggerDemoBurst,
}) => {
  const formattedScore = hud.score
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const formattedRivalScore = hud.socialRival.targetScore
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const progressPercent = Math.round(Math.max(8, Math.min(100, hud.progress * 100)));
  const isFever = hud.activeBoosters.isFeverMode;
  const hasGun = hud.activeBoosters.machineGunTimeLeft > 0;
  const hasShield = hud.activeBoosters.safetyWallTimeLeft > 0;

  return (
    <header className="fixed top-0 left-0 right-0 z-20 pointer-events-none px-2 sm:px-5 pt-2 sm:pt-3.5">
      <div className="max-w-6xl mx-auto flex items-start justify-between gap-1.5 sm:gap-2">
        {/* Top-Left: Pause Button (II) + Classic / Rival / Mon QG / Hall of Fame / Audio Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto">
          <button
            onClick={onTogglePause}
            title="Pause (Échap)"
            aria-label="Mettre en pause"
            className="min-w-[42px] min-h-[42px] sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 border-[#7C3AED]/80 bg-[#140B38] hover:bg-[#1E1152] active:scale-95 transition-transform shadow-[0_0_18px_rgba(124,58,237,0.65),inset_0_0_10px_rgba(56,189,248,0.35)] cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-4.5 sm:w-2 sm:h-5 rounded-full bg-white shadow-[0_0_8px_#00F0FF]" />
              <span className="w-1.5 h-4.5 sm:w-2 sm:h-5 rounded-full bg-white shadow-[0_0_8px_#00F0FF]" />
            </div>
          </button>

          <button
            onClick={onOpenLevelSelect}
            title="Mode Classic (Niveaux 1 à 12)"
            className={`min-h-[40px] flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              hud.playMode === 'classic'
                ? 'border-[#FF1668]/80 bg-[#2A0B2E] text-white'
                : 'border-[#38BDF8]/40 bg-[#10092E] hover:bg-[#191046] text-[#BAE6FD]'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-[#FF4098]" />
            <span className="hidden sm:inline">Classic</span>
          </button>

          <button
            onClick={onOpenRivalBrowser}
            title="Mode Rival (Niveaux Communautaires & Clashs)"
            className={`min-h-[40px] flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              hud.playMode === 'rival'
                ? 'border-[#00F0FF] bg-[#0F244A] text-white shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                : 'border-[#00F0FF]/40 bg-[#10092E] hover:bg-[#191046] text-[#7DD3FC]'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>Rival</span>
          </button>

          <button
            onClick={onOpenUserProfile}
            title="Mon QG Profil (Identité, Atelier Niveau & Palmarès Clashs)"
            className="min-h-[40px] flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#A855F7]/60 bg-[#1F1044] hover:bg-[#2D1760] text-xs font-bold text-[#E9D5FF] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <User className="w-3.5 h-3.5 text-[#C084FC]" />
            <span className="hidden md:inline">Mon QG</span>
          </button>

          <button
            onClick={onOpenHallOfFame}
            title="Hall of Fame (Classements Classic & Rival)"
            className="min-w-[40px] min-h-[40px] px-2 rounded-xl border border-[#FFD700]/50 bg-[#1E130D] hover:bg-[#2E1D12] text-[#FFD700] flex items-center justify-center gap-1 text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <Trophy className="w-3.5 h-3.5 text-[#FFD700]" />
          </button>

          <button
            onClick={onToggleMute}
            title={isMuted ? 'Activer le son' : 'Couper le son'}
            aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
            className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center border border-[#38BDF8]/40 bg-[#10092E] hover:bg-[#191046] text-[#BAE6FD] transition-colors cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-[#FF2A85]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#00F0FF]" />
            )}
          </button>
        </div>

        {/* Top-Center: Score & Multiplier Pill + NIVEAU Progress Bar + Draft Test Banner */}
        <div className="flex flex-col items-center pointer-events-auto">
          <div
            className={`hud-pill-surface flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-1 sm:py-1.5 rounded-full border-2 transition-colors ${
              isFever ? 'border-[#FFD700] shadow-[0_0_24px_rgba(255,215,0,0.65)]' : 'border-[#6D28D9]/80'
            }`}
          >
            {/* Golden Crown SVG */}
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 drop-shadow-[0_0_8px_rgba(255,215,0,0.75)]"
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
              className={`font-display font-black text-lg sm:text-3xl tracking-tight text-white tabular-nums whitespace-nowrap ${
                isFever ? 'neon-fever-glow' : 'neon-score-glow'
              }`}
            >
              {formattedScore}
            </span>

            {/* Star + Multiplier */}
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 drop-shadow-[0_0_8px_rgba(255,200,0,0.85)]"
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
              <span className="font-display font-extrabold text-xs sm:text-lg text-white tabular-nums">
                x{hud.multiplier}
              </span>
            </div>
          </div>

          {/* Level Title & Pink Progress Bar */}
          <div className="mt-1 flex flex-col items-center w-40 sm:w-60">
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span className="font-display font-bold text-[10px] sm:text-xs tracking-wider text-white uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] whitespace-nowrap">
                {hud.levelName}
              </span>
              {(hud.playMode === 'rival' || hud.playMode === 'draft_test') &&
                hud.levelComplexity !== undefined && (
                  <span className="px-1.5 py-0.2 rounded bg-[#00F0FF]/20 text-[10px] font-extrabold text-[#00F0FF] whitespace-nowrap">
                    {hud.levelComplexity}/100
                  </span>
                )}
              {hud.activeBallsCount > 1 && (
                <span className="text-[10px] font-extrabold text-[#00F0FF] tabular-nums whitespace-nowrap">
                  · {hud.activeBallsCount} Billes
                </span>
              )}
              {hasGun && (
                <span className="flex items-center gap-0.5 text-[10px] font-extrabold text-[#FB7185] whitespace-nowrap">
                  <Crosshair className="w-3 h-3" /> MITRAILLEUSE
                </span>
              )}
              {hasShield && (
                <span className="flex items-center gap-0.5 text-[10px] font-extrabold text-[#22D3EE] whitespace-nowrap">
                  <Shield className="w-3 h-3" /> BOUCLIER
                </span>
              )}
              {isFever && (
                <span className="flex items-center gap-0.5 text-[10px] font-extrabold text-[#FFD700] whitespace-nowrap">
                  <Flame className="w-3 h-3 fill-[#FFD700]" /> FEVER
                </span>
              )}
            </div>

            <div className="mt-0.5 w-full h-2.5 rounded-full bg-[#150C36] border border-[#6D28D9]/80 p-0.5 shadow-[inset_0_1px_4px_rgba(0,0,0,0.8)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  isFever
                    ? 'bg-gradient-to-r from-[#FFB800] via-[#FF1668] to-[#00F0FF] shadow-[0_0_12px_#FFD700]'
                    : 'bg-gradient-to-r from-[#FF1668] via-[#FF3888] to-[#FF75B5] shadow-[0_0_12px_#FF1668]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Draft Test Mode Controls OR Social Rival Line */}
            {hud.playMode === 'draft_test' ? (
              <div className="mt-1 flex items-center gap-1.5">
                <button
                  onClick={onOpenRivalEditor}
                  className="px-2.5 py-0.5 rounded-lg bg-[#A855F7] hover:bg-[#9333EA] text-white font-display font-extrabold text-[10px] flex items-center gap-1 cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.6)]"
                >
                  <Wrench className="w-3 h-3" />
                  <span>Retour Éditeur</span>
                </button>
                <button
                  onClick={onOpenUserProfile}
                  className="px-2.5 py-0.5 rounded-lg bg-[#10E84A] hover:brightness-110 text-[#07051A] font-display font-extrabold text-[10px] cursor-pointer"
                >
                  Publier / Mon QG
                </button>
              </div>
            ) : (
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#CBD5E1] whitespace-nowrap">
                <Users className="w-3 h-3 text-[#38BDF8] shrink-0" />
                {hud.socialRival.justOvertaken ? (
                  <span className="font-bold text-[#10E84A]">
                    Rival dépassé ! Cap sur {hud.socialRival.name}
                  </span>
                ) : (
                  <span>
                    Rival #{hud.socialRival.rank} {hud.socialRival.name} ·{' '}
                    <strong className="text-white tabular-nums">{formattedRivalScore} pts</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Mystery Capsule Collected Banner */}
          {hud.lastPowerupLabel && (
            <div className="mt-1 px-3 py-0.5 rounded-lg bg-[#1A0E42] border border-[#00F0FF]/70 text-[10px] sm:text-xs font-display font-extrabold text-[#00F0FF] shadow-[0_0_16px_rgba(0,240,255,0.45)] whitespace-nowrap">
              {hud.lastPowerupLabel}
            </div>
          )}
        </div>

        {/* Top-Right: Lives Gauge (3 Full Hearts on Start!) + Lightning Burst Action */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={onTriggerDemoBurst}
            title="Déclencher l'éclair central ⚡"
            className="hidden lg:flex min-h-[40px] items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#00F0FF]/50 bg-[#0B1938] hover:bg-[#112654] text-xs font-bold text-[#7DD3FC] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>Éclair ⚡</span>
          </button>

          <div
            className="hud-pill-surface flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full border-2 border-[#9D174D]/80"
            aria-label={`Vies restantes : ${hud.lives} sur ${hud.maxLives}`}
          >
            {Array.from({ length: hud.maxLives }).map((_, idx) => {
              const filled = idx < hud.lives;
              return (
                <svg
                  key={idx}
                  className={`w-4.5 h-4.5 sm:w-6 sm:h-6 transition-transform duration-150 ${
                    filled
                      ? 'scale-100 drop-shadow-[0_0_8px_rgba(255,42,133,0.9)]'
                      : 'scale-90 opacity-55'
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
