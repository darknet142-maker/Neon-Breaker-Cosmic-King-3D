import React, { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Sparkles, Compass } from 'lucide-react';
import { BoosterStock, ActiveBoostersState } from '../game/types';

interface BoosterDockProps {
  boosters: BoosterStock;
  activeBoosters: ActiveBoostersState;
  currentLevel: number;
  onActivateBooster: (type: 'magnet' | 'rocket' | 'multiball') => void;
  onSelectLevel: (levelId: number, resetScore?: boolean) => void;
  onTriggerDemoBurst: () => void;
}

export const BoosterDock: React.FC<BoosterDockProps> = ({
  boosters,
  activeBoosters,
  currentLevel,
  onActivateBooster,
  onSelectLevel,
  onTriggerDemoBurst,
}) => {
  const [bottomDockOpen, setBottomDockOpen] = useState(false);

  return (
    <>
      {/* Left Flank: The 3 Iconic Booster Bubbles from the Screenshot */}
      <aside
        className="fixed left-3 sm:left-6 bottom-32 sm:bottom-36 z-20 flex flex-col gap-3.5 sm:gap-4 pointer-events-auto"
        aria-label="Boosters Spéciaux"
      >
        {/* 1. L'Aimant (Stock: 2) */}
        <button
          onClick={() => onActivateBooster('magnet')}
          disabled={boosters.magnet <= 0}
          title="Aimant (Touche 1) : Attire les étoiles et colle la bille sur la raquette pour viser"
          className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center transition-transform active:scale-90 cursor-pointer booster-bubble ${
            activeBoosters.magnetTimeLeft > 0
              ? 'border-[#00F0FF] scale-105 ring-2 ring-[#00F0FF]/60'
              : 'border-[#7DD3FC]/75'
          } disabled:opacity-45 disabled:cursor-not-allowed`}
        >
          {/* Magnet 3D-styled SVG */}
          <svg className="w-8 h-8 sm:w-9 sm:h-9 -rotate-30" viewBox="0 0 40 40" fill="none">
            <path
              d="M11 10V21C11 26.5 15 30.5 20 30.5C25 30.5 29 26.5 29 21V10"
              stroke="#FF1668"
              strokeWidth="7.5"
              strokeLinecap="butt"
            />
            <path
              d="M11 15V21C11 26.5 15 30.5 20 30.5"
              stroke="#0088FF"
              strokeWidth="7.5"
              strokeLinecap="butt"
            />
            <rect x="7.2" y="6" width="7.6" height="5" rx="1" fill="#E2E8F0" />
            <rect x="25.2" y="6" width="7.6" height="5" rx="1" fill="#E2E8F0" />
            {/* Electric sparks */}
            <circle cx="15" cy="5" r="1.4" fill="#00F0FF" />
            <circle cx="25" cy="4" r="1.4" fill="#00F0FF" />
            <circle cx="20" cy="2" r="1.6" fill="#FFFFFF" />
          </svg>

          {/* Pink Stock Badge */}
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-b from-[#FF4098] to-[#E00860] border border-white/80 text-white font-display font-extrabold text-xs flex items-center justify-center tabular-nums shadow-[0_0_10px_#FF1668]">
            {boosters.magnet}
          </span>
        </button>

        {/* 2. La Fusée (Stock: 1) */}
        <button
          onClick={() => onActivateBooster('rocket')}
          disabled={boosters.rocket <= 0}
          title="Fusée (Touche 2) : Lance un missile vertical qui détruit toute une colonne de briques"
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#7DD3FC]/75 flex items-center justify-center transition-transform active:scale-90 cursor-pointer booster-bubble disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {/* Rocket 3D-styled SVG */}
          <svg className="w-8 h-8 sm:w-9 sm:h-9 rotate-35" viewBox="0 0 40 40" fill="none">
            {/* Thruster Flame */}
            <path d="M16 30L20 38L24 30H16Z" fill="#FFB800" />
            <path d="M17.5 30L20 35L22.5 30H17.5Z" fill="#FFFFFF" />
            {/* Left & Right Fins */}
            <path d="M14 23L8 29L14 28V23Z" fill="#FF1668" />
            <path d="M26 23L32 29L26 28V23Z" fill="#FF1668" />
            {/* Rocket Body */}
            <path
              d="M20 4C15 10 14 18 14 28H26C26 18 25 10 20 4Z"
              fill="#F8FAFC"
              stroke="#93C5FD"
              strokeWidth="1.2"
            />
            {/* Red Nose Cone */}
            <path d="M20 4C17.5 7 16 10.5 15.3 13H24.7C24 10.5 22.5 7 20 4Z" fill="#FF1668" />
            {/* Cyan Window */}
            <circle cx="20" cy="18.5" r="3.4" fill="#00B4FF" stroke="#1E3A8A" strokeWidth="1.4" />
          </svg>

          {/* Pink Stock Badge */}
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-b from-[#FF4098] to-[#E00860] border border-white/80 text-white font-display font-extrabold text-xs flex items-center justify-center tabular-nums shadow-[0_0_10px_#FF1668]">
            {boosters.rocket}
          </span>
        </button>

        {/* 3. L'Orbe Supplémentaire / Multi-billes (Stock: 3) */}
        <button
          onClick={() => onActivateBooster('multiball')}
          disabled={boosters.multiball <= 0}
          title="Orbe Supplémentaire (Touche 3) : Active le Multi-billes x3"
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#7DD3FC]/75 flex items-center justify-center transition-transform active:scale-90 cursor-pointer booster-bubble disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {/* Glowing Iridescent Orb SVG */}
          <svg className="w-8 h-8 sm:w-9 sm:h-9" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="12.5" fill="url(#orbGrad)" stroke="#FFFFFF" strokeWidth="1.5" />
            <ellipse
              cx="16"
              cy="15"
              rx="4.5"
              ry="2.5"
              transform="rotate(-25 16 15)"
              fill="rgba(255,255,255,0.85)"
            />
            <defs>
              <radialGradient id="orbGrad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(16 14) rotate(50) scale(20)">
                <stop stopColor="#FFFFFF" />
                <stop offset="0.38" stopColor="#00F0FF" />
                <stop offset="0.75" stopColor="#8A2BE2" />
                <stop offset="1" stopColor="#FF1688" />
              </radialGradient>
            </defs>
          </svg>

          {/* Pink Stock Badge */}
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-b from-[#FF4098] to-[#E00860] border border-white/80 text-white font-display font-extrabold text-xs flex items-center justify-center tabular-nums shadow-[0_0_10px_#FF1668]">
            {boosters.multiball}
          </span>
        </button>
      </aside>

      {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion when collapsed) */}
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-auto max-w-[94vw]">
        <button
          onClick={() => setBottomDockOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3.5 py-1 rounded-t-xl border border-b-0 border-[#38BDF8]/40 bg-[#0D0826] hover:bg-[#170F42] text-[11px] font-semibold text-[#BAE6FD] transition-colors cursor-pointer whitespace-nowrap"
        >
          {bottomDockOpen ? (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>Masquer Contrôles</span>
            </>
          ) : (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>Barre Rapide · Niveau {currentLevel}</span>
            </>
          )}
        </button>

        {bottomDockOpen && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-[#38BDF8]/45 bg-[#0D0826] shadow-[0_0_24px_rgba(0,0,0,0.85)]">
            <button
              onClick={() => onSelectLevel(7, false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF1668] hover:bg-[#E00856] text-xs font-bold text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Scène Niveau 7 (Capture)</span>
            </button>

            <button
              onClick={onTriggerDemoBurst}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-xs font-bold text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explosion Éclair ⚡</span>
            </button>

            <button
              onClick={() => onSelectLevel(currentLevel, true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-[#18103C] hover:bg-[#241856] text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser Niveau</span>
            </button>

            <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-white/15">
              {[1, 3, 5, 7, 9, 12].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => onSelectLevel(lvl, lvl !== 7)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold tabular-nums transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentLevel === lvl
                      ? 'bg-[#00F0FF] text-[#07051A]'
                      : 'bg-[#18103C] text-[#CBD5E1] hover:bg-[#251A5A]'
                  }`}
                >
                  Niv.{lvl}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
