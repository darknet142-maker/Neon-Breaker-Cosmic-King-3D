import React from 'react';
import {
  Play,
  RotateCcw,
  FastForward,
  Trophy,
  Sparkles,
  X,
  Flame,
  Crown,
  Swords,
  Wrench,
  User,
} from 'lucide-react';
import { CAMPAIGN_LEVELS } from '../game/levels';
import { GameHudSnapshot, GameModeState } from '../game/types';

interface GameModalsProps {
  gameState: GameModeState;
  hud: GameHudSnapshot;
  onStartLevel7Capture: () => void;
  onStartCampaignLevel: (levelId: number, resetScore?: boolean) => void;
  onResume: () => void;
  onOpenLevelSelect: () => void;
  onOpenRivalBrowser: () => void;
  onOpenRivalEditor: () => void;
  onOpenUserProfile: () => void;
  onOpenHallOfFame: () => void;
}

export const GameModals: React.FC<GameModalsProps> = ({
  gameState,
  hud,
  onStartLevel7Capture,
  onStartCampaignLevel,
  onResume,
  onOpenLevelSelect,
  onOpenRivalBrowser,
  onOpenRivalEditor,
  onOpenUserProfile,
  onOpenHallOfFame,
}) => {
  if (
    gameState === 'playing' ||
    gameState === 'rival_browser' ||
    gameState === 'rival_editor' ||
    gameState === 'user_profile' ||
    gameState === 'hall_of_fame'
  ) {
    return null;
  }

  const formattedScore = hud.score
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const formattedHigh = (hud.playMode === 'rival' ? hud.rivalHighScore : hud.highScore)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const progressPercent = Math.round(hud.progress * 100);

  // 1. Title Screen Modal
  if (gameState === 'title') {
    return (
      <div className="fixed inset-0 z-30 flex flex-col items-center justify-between p-5 sm:p-10 bg-[#07051A]/80 pointer-events-auto overflow-hidden">
        <div className="mt-2 flex flex-col items-center text-center max-w-xl">
          <svg
            viewBox="0 0 540 130"
            className="w-full max-w-[440px] h-auto drop-shadow-[0_0_24px_rgba(255,22,104,0.65)]"
            fill="none"
          >
            <defs>
              <linearGradient id="titleNeonPink" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="45%" stopColor="#FF5CA8" />
                <stop offset="100%" stopColor="#FF1668" />
              </linearGradient>
              <linearGradient id="titleNeonCyan" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00F0FF" />
                <stop offset="50%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>
            <text
              x="270"
              y="62"
              textAnchor="middle"
              fill="url(#titleNeonPink)"
              fontFamily="Outfit, sans-serif"
              fontWeight="900"
              fontSize="56"
              letterSpacing="3"
            >
              NEON BREAKER
            </text>
            <text
              x="270"
              y="108"
              textAnchor="middle"
              fill="url(#titleNeonCyan)"
              fontFamily="Outfit, sans-serif"
              fontWeight="800"
              fontSize="26"
              letterSpacing="8"
            >
              CLASSIC & RIVAL 3D
            </text>
          </svg>

          <p className="mt-2 text-xs sm:text-sm text-[#CBD5E1] max-w-md text-balance">
            Modes Classic & Clashs Rival communautaires · QG Profil, Studio auto-sauvegardé & Hall of Fame.
          </p>
        </div>

        <div className="my-auto" />

        <div className="w-full max-w-md flex flex-col items-center gap-2.5 mb-2">
          <button
            onClick={onStartLevel7Capture}
            className="w-full min-h-[50px] py-3 px-6 rounded-2xl bg-gradient-to-r from-[#FF1668] via-[#FF2A85] to-[#9333EA] hover:brightness-110 active:scale-98 text-white font-display font-extrabold text-base sm:text-lg tracking-wide shadow-[0_0_28px_rgba(255,22,104,0.75)] flex items-center justify-center gap-3 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Mode Classic · Niveau 7</span>
          </button>

          <div className="w-full grid grid-cols-3 gap-2">
            <button
              onClick={onOpenRivalBrowser}
              className="min-h-[44px] py-2 px-3 rounded-xl border border-[#00F0FF]/50 bg-[#0E1738] hover:bg-[#162454] text-xs font-bold text-[#7DD3FC] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Swords className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>Mode Rival</span>
            </button>

            <button
              onClick={onOpenUserProfile}
              className="min-h-[44px] py-2 px-3 rounded-xl border border-[#A855F7]/60 bg-[#1F1044] hover:bg-[#2D1760] text-xs font-bold text-[#E9D5FF] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <User className="w-3.5 h-3.5 text-[#C084FC]" />
              <span>Mon QG Profil</span>
            </button>

            <button
              onClick={onOpenHallOfFame}
              className="min-h-[44px] py-2 px-3 rounded-xl border border-[#FFD700]/50 bg-[#261B12] hover:bg-[#382718] text-xs font-bold text-[#FFD700] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-3.5 h-3.5 text-[#FFD700]" />
              <span>Hall of Fame</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Level Select Modal (1 to 12 — Compact 3x4 Grid with ZERO Scrollbar)
  if (gameState === 'level_select') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-4 bg-[#07051A]/92 pointer-events-auto overflow-hidden">
        <div className="w-full max-w-2xl rounded-3xl border-2 border-[#6D28D9] bg-[#110A2E] p-4 sm:p-6 shadow-[0_0_40px_rgba(109,40,217,0.5)]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-display font-black text-lg sm:text-2xl text-white">
                MODE CLASSIC · 12 NIVEAUX UNIQUES
              </h2>
              <p className="text-[11px] text-[#94A3B8]">
                Vitesses distinctes · Obstacles fixes + aléatoires (10–20s) · Score serré & réaliste
              </p>
            </div>
            <button
              onClick={onResume}
              aria-label="Fermer"
              className="min-w-[42px] min-h-[42px] rounded-full bg-[#1E1448] hover:bg-[#2D1F68] flex items-center justify-center text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {CAMPAIGN_LEVELS.map((lvl) => {
              const isCapture7 = lvl.id === 7;
              return (
                <button
                  key={lvl.id}
                  onClick={() =>
                    isCapture7
                      ? onStartLevel7Capture()
                      : onStartCampaignLevel(lvl.id, false)
                  }
                  className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isCapture7
                      ? 'border-[#FF1668] bg-gradient-to-br from-[#3B0A38] to-[#1A0B38] shadow-[0_0_16px_rgba(255,22,104,0.45)]'
                      : 'border-white/15 bg-[#18103E] hover:border-[#00F0FF]/60 hover:bg-[#221754]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-extrabold text-xs sm:text-sm text-white whitespace-nowrap">
                      {lvl.name}
                    </span>
                    <span className="text-[10px] font-semibold text-[#7DD3FC]">
                      {lvl.fixedObstacles.length}F+{lvl.randomObstacleCount}A
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#CBD5E1] truncate">
                    {lvl.subtitle}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-2">
            <button
              onClick={onOpenRivalBrowser}
              className="flex-1 min-h-[42px] rounded-xl border border-[#00F0FF]/50 bg-[#0E193D] hover:bg-[#15265A] text-xs font-bold text-[#7DD3FC] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Swords className="w-4 h-4" />
              <span>Arène Rival</span>
            </button>

            <button
              onClick={onOpenUserProfile}
              className="flex-1 min-h-[42px] rounded-xl border border-[#A855F7]/50 bg-[#231248] hover:bg-[#311964] text-xs font-bold text-[#E9D5FF] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>Mon QG Profil</span>
            </button>

            <button
              onClick={onOpenHallOfFame}
              className="min-h-[42px] px-4 rounded-xl border border-[#FFD700]/50 bg-[#261B12] hover:bg-[#382718] text-xs font-bold text-[#FFD700] flex items-center gap-1.5 cursor-pointer"
            >
              <Trophy className="w-4 h-4" />
              <span>Hall of Fame</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Pause, Victory & Game Over Modal (Supports Classic, Rival Clash Victory, and Draft Test Mode)
  const isVictory = gameState === 'victory';
  const isGameOver = gameState === 'gameover';
  const nextLevelId = hud.level < 12 ? hud.level + 1 : 1;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3.5 bg-[#07051A]/90 pointer-events-auto overflow-hidden">
      <div className="w-full max-w-md rounded-3xl border-2 border-[#7C3AED] bg-[#110A2E] p-5 sm:p-6 text-center shadow-[0_0_40px_rgba(124,58,237,0.55)]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-extrabold text-[#7DD3FC] uppercase mb-1">
          {hud.playMode === 'draft_test'
            ? 'Mode Test Brouillon (Avant Publication)'
            : hud.playMode === 'rival'
            ? 'Clash Mode Rival Communautaire'
            : 'Mode Classic'}
        </div>

        <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight neon-score-glow">
          {isVictory
            ? hud.playMode === 'rival'
              ? 'CLASH REMPORTÉ !'
              : hud.playMode === 'draft_test'
              ? 'BROUILLON VALIDÉ !'
              : 'NIVEAU ACCOMPLI !'
            : isGameOver
            ? '3 VIES PERDUES !'
            : 'PARTIE EN PAUSE'}
        </h2>

        {/* Contextual Banner */}
        {isVictory && hud.playMode === 'rival' && hud.levelAuthor ? (
          <div className="mt-2 px-3 py-2 rounded-2xl bg-[#0D2824] border border-[#10E84A]/70 text-xs text-[#A7F3D0]">
            <div className="font-bold text-[#4ADE80] flex items-center justify-center gap-1.5">
              <Swords className="w-4 h-4" />
              <span>Vous avez battu le niveau de {hud.levelAuthor} !</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#CBD5E1]">
              Ce triomphe a été ajouté à votre Palmarès de Clashs dans votre QG Profil.
            </p>
          </div>
        ) : isGameOver ? (
          <div className="mt-2 px-3 py-2 rounded-2xl bg-[#2A0B2E] border border-[#FF1668]/60 text-xs text-[#FFD1E6]">
            <div className="font-bold text-[#FF4098] flex items-center justify-center gap-1.5">
              <Crown className="w-4 h-4 text-[#FFD700]" />
              <span>
                Niveau complété à {progressPercent}% — Il ne restait que{' '}
                {hud.destructibleRemaining} briques !
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#CBD5E1]">
              {hud.playMode === 'draft_test'
                ? 'Ajustez librement vos blocs dans le Studio ou relancez le test.'
                : 'La Brique Rivale vous nargue ! Relancez avec 3 vies pleines pour prendre votre revanche.'}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-[#CBD5E1]">
            {isVictory
              ? hud.playMode === 'draft_test'
                ? 'Votre niveau est 100% jouable ! Vous pouvez maintenant le publier depuis votre QG.'
                : `Toutes les briques de ${hud.levelName} ont été pulvérisées ! Série : ${hud.winStreak} 🔥`
              : `${hud.levelName} · Vies : ${hud.lives}/3 · Bonus rares : ${hud.activeBoosters.capsulesDroppedInMatch}/${hud.activeBoosters.maxCapsulesInMatch}`}
          </p>
        )}

        <div className="my-4 py-3 px-3.5 rounded-2xl bg-[#191042] border border-white/10 flex items-center justify-around">
          <div>
            <div className="text-[10px] text-[#94A3B8]">Score Partie</div>
            <div className="font-display font-black text-lg sm:text-xl text-white tabular-nums">
              {formattedScore} pts
            </div>
          </div>
          <div className="h-7 w-px bg-white/15" />
          <div>
            <div className="text-[10px] text-[#94A3B8]">
              Record {hud.playMode === 'rival' ? 'Rival' : 'Classic'}
            </div>
            <div className="font-display font-black text-lg sm:text-xl text-[#FFD700] tabular-nums">
              {formattedHigh} pts
            </div>
          </div>
          <div className="h-7 w-px bg-white/15" />
          <div>
            <div className="text-[10px] text-[#94A3B8]">Série Victoires</div>
            <div className="font-display font-black text-lg sm:text-xl text-[#00F0FF] tabular-nums flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-[#00F0FF]" />
              {hud.winStreak}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {gameState === 'paused' && (
            <button
              onClick={onResume}
              className="w-full min-h-[46px] py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#00B4FF] to-[#0088FF] hover:brightness-110 text-white font-display font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Reprendre la Partie</span>
            </button>
          )}

          {hud.playMode === 'draft_test' ? (
            <>
              <button
                onClick={onOpenRivalEditor}
                className="w-full min-h-[46px] py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#FF1668] to-[#9333EA] hover:brightness-110 text-white font-display font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wrench className="w-4 h-4" />
                <span>Retourner au Studio Créateur (Modifier)</span>
              </button>

              <button
                onClick={onOpenUserProfile}
                className="w-full min-h-[44px] py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#10E84A] to-[#059669] hover:brightness-110 text-[#07051A] font-display font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Ouvrir Mon QG pour Publier</span>
              </button>
            </>
          ) : (
            <>
              {isVictory && hud.playMode === 'classic' && (
                <button
                  onClick={() => onStartCampaignLevel(nextLevelId, false)}
                  className="w-full min-h-[46px] py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#10E84A] to-[#059669] hover:brightness-110 text-white font-display font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FastForward className="w-4 h-4 fill-white" />
                  <span>Niveau Suivant (Niveau {nextLevelId})</span>
                </button>
              )}

              <button
                onClick={() =>
                  hud.playMode === 'rival'
                    ? onOpenRivalBrowser()
                    : hud.level === 7 && !isGameOver
                    ? onStartLevel7Capture()
                    : onStartCampaignLevel(hud.level, isGameOver)
                }
                className="w-full min-h-[46px] py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#FF1668] to-[#9333EA] hover:brightness-110 text-white font-display font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,22,104,0.5)]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {hud.playMode === 'rival'
                    ? 'Défier un autre Joueur Rival'
                    : isGameOver
                    ? `Prendre ma Revanche (${hud.levelName} · 3 Vies)`
                    : `Recommencer ${hud.levelName} (3 Vies)`}
                </span>
              </button>
            </>
          )}

          <div className="grid grid-cols-3 gap-2 mt-0.5">
            <button
              onClick={onOpenLevelSelect}
              className="min-h-[42px] px-2 rounded-xl border border-white/20 bg-[#1B1246] hover:bg-[#261A60] text-xs font-bold text-[#CBD5E1] cursor-pointer"
            >
              Classic (1–12)
            </button>

            <button
              onClick={onOpenUserProfile}
              className="min-h-[42px] px-2 rounded-xl border border-[#A855F7]/50 bg-[#231248] hover:bg-[#311964] text-xs font-bold text-[#E9D5FF] flex items-center justify-center gap-1 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Mon QG Profil</span>
            </button>

            <button
              onClick={onOpenHallOfFame}
              className="min-h-[42px] px-2 rounded-xl border border-[#FFD700]/50 bg-[#261B12] hover:bg-[#382718] text-xs font-bold text-[#FFD700] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Hall of Fame</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
