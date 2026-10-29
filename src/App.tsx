import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BoosterDock } from './components/BoosterDock';
import { GameCanvas3D, GameEngineActions } from './components/GameCanvas3D';
import { GameModals } from './components/GameModals';
import { MascotCorner } from './components/MascotCorner';
import { RivalStudioModal } from './components/RivalStudioModal';
import { TopHud } from './components/TopHud';
import { soundEngine } from './game/sound';
import { GameHudSnapshot, GameModeState, LevelDefinition } from './game/types';

const INITIAL_HUD_SNAPSHOT: GameHudSnapshot = {
  playMode: 'classic',
  score: 640,
  highScore: 640,
  rivalHighScore: 685,
  multiplier: 2,
  comboCount: 3,
  winStreak: 2,
  lives: 3,
  maxLives: 3,
  level: 7,
  levelName: 'NIVEAU 7',
  progress: 0.52,
  boosters: {
    magnet: 2,
    rocket: 1,
    multiball: 3,
  },
  activeBoosters: {
    magnetTimeLeft: 0,
    stickyTimeLeft: 0,
    machineGunTimeLeft: 0,
    safetyWallTimeLeft: 0,
    speedModMode: 'normal',
    speedModTimeLeft: 0,
    paddleScaleMode: 'normal',
    paddleScaleFactor: 1.0,
    paddleScaleTimeLeft: 0,
    ballStuckToPaddle: false,
    aimAngleRad: 0.28,
    isFeverMode: false,
    feverProgress: 0.35,
    nextObstacleShiftSec: 14,
    capsulesDroppedInMatch: 0,
    maxCapsulesInMatch: 3,
  },
  mascotMood: 'ecstatic',
  mascotMessage: '3 Vies Pleines · Barème de score réaliste & bonus rares !',
  activeBallsCount: 1,
  destructibleRemaining: 21,
  hasRivalBrick: false,
  lastPowerupLabel: null,
  socialRival: {
    name: '@KawaiiQueen',
    targetScore: 890,
    avatarColor: '#FF2A85',
    justOvertaken: false,
    rank: 9,
  },
};

export default function App() {
  const [gameState, setGameState] = useState<GameModeState>('playing');
  const [currentLevelId, setCurrentLevelId] = useState<number>(7);
  const [hud, setHud] = useState<GameHudSnapshot>(INITIAL_HUD_SNAPSHOT);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const engineRef = useRef<GameEngineActions | null>(null);

  const handleHudUpdate = useCallback((snapshot: GameHudSnapshot) => {
    setHud(snapshot);
  }, []);

  const handleTogglePause = useCallback(() => {
    setGameState((prev) => {
      if (prev === 'playing') return 'paused';
      if (
        prev === 'paused' ||
        prev === 'level_select' ||
        prev === 'rival_browser' ||
        prev === 'rival_editor' ||
        prev === 'user_profile' ||
        prev === 'hall_of_fame'
      ) {
        return 'playing';
      }
      return prev;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleStartLevel7Capture = useCallback(() => {
    setCurrentLevelId(7);
    engineRef.current?.startLevel(7, false);
    setGameState('playing');
  }, []);

  const handleStartCampaignLevel = useCallback((levelId: number, resetScore: boolean = false) => {
    setCurrentLevelId(levelId);
    engineRef.current?.startLevel(levelId, resetScore);
    setGameState('playing');
  }, []);

  const handlePlayRivalLevel = useCallback((def: LevelDefinition) => {
    engineRef.current?.startCustomLevel(def);
    setGameState('playing');
  }, []);

  const handleActivateBooster = useCallback((type: 'magnet' | 'rocket' | 'multiball') => {
    engineRef.current?.triggerBooster(type);
  }, []);

  const handleTriggerDemoBurst = useCallback(() => {
    engineRef.current?.triggerDemoLightningBurst();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        setGameState((prev) => {
          if (prev === 'playing') return 'paused';
          if (
            prev === 'paused' ||
            prev === 'level_select' ||
            prev === 'rival_browser' ||
            prev === 'rival_editor' ||
            prev === 'user_profile' ||
            prev === 'hall_of_fame'
          ) {
            return 'playing';
          }
          return prev;
        });
      } else if (
        (e.code === 'Enter' || e.code === 'Space') &&
        gameState === 'title'
      ) {
        e.preventDefault();
        handleStartLevel7Capture();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, handleStartLevel7Capture]);

  return (
    <main className="relative w-screen h-[100dvh] overflow-hidden bg-[#07051A] select-none">
      {/* Isolated Full-Viewport 60FPS Three.js WebGL Arena */}
      <GameCanvas3D
        gameState={gameState}
        currentLevelId={currentLevelId}
        onHudUpdate={handleHudUpdate}
        onStateChange={setGameState}
        engineRef={engineRef}
      />

      {/* Top HUD: Pause (II), Classic/Rival Switcher, Mon QG Profil, Hall of Fame, Score + Crown, and 3 Full Hearts */}
      <TopHud
        hud={hud}
        isMuted={isMuted}
        onTogglePause={handleTogglePause}
        onToggleMute={handleToggleMute}
        onOpenLevelSelect={() => setGameState('level_select')}
        onOpenRivalBrowser={() => setGameState('rival_browser')}
        onOpenUserProfile={() => setGameState('user_profile')}
        onOpenRivalEditor={() => setGameState('rival_editor')}
        onOpenHallOfFame={() => setGameState('hall_of_fame')}
        onTriggerDemoBurst={handleTriggerDemoBurst}
      />

      {/* Left Flank: 3 Booster Bubbles (Aimant, Fusée, Orbe) + Collapsible Bottom Bar */}
      <BoosterDock
        boosters={hud.boosters}
        activeBoosters={hud.activeBoosters}
        currentLevel={hud.level}
        onActivateBooster={handleActivateBooster}
        onSelectLevel={handleStartCampaignLevel}
        onTriggerDemoBurst={handleTriggerDemoBurst}
      />

      {/* Bottom-Right: Crowned Pink Kawaii Mascot with Real-Time Reactions */}
      <MascotCorner
        mood={hud.mascotMood}
        message={hud.mascotMessage}
        onClickMascot={handleTriggerDemoBurst}
      />

      {/* Classic Game Modals: Title Screen, Level Select (1-12), Pause, Victory, Near-Miss Game Over */}
      <GameModals
        gameState={gameState}
        hud={hud}
        onStartLevel7Capture={handleStartLevel7Capture}
        onStartCampaignLevel={handleStartCampaignLevel}
        onResume={() => setGameState('playing')}
        onOpenLevelSelect={() => setGameState('level_select')}
        onOpenRivalBrowser={() => setGameState('rival_browser')}
        onOpenRivalEditor={() => setGameState('rival_editor')}
        onOpenUserProfile={() => setGameState('user_profile')}
        onOpenHallOfFame={() => setGameState('hall_of_fame')}
      />

      {/* Mode Rival Browser, Studio Créateur (Auto-Save + 420 PV Budget + Free Test), Mon QG Profil & Hall of Fame */}
      <RivalStudioModal
        gameState={gameState}
        hud={hud}
        onCloseToPlay={() => setGameState('playing')}
        onSwitchModal={setGameState}
        onPlayRivalLevel={handlePlayRivalLevel}
        onOpenClassicLevels={() => setGameState('level_select')}
      />
    </main>
  );
}
