import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Flame,
  Lock,
  Play,
  Plus,
  Save,
  ShieldAlert,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  User,
  Wrench,
  X,
} from 'lucide-react';
import {
  AVATAR_BADGE_OPTIONS,
  calculateBricksHpBudget,
  calculateLevelComplexity,
  convertDraftToLevelDefinition,
  convertRivalToLevelDefinition,
  deletePlayerCreatedLevel,
  FIXED_OBSTACLE_PRESETS,
  getClashVictories,
  getComplexityLabel,
  getEditCooldownStatus,
  getHallOfFameRankings,
  getPlayerBeatenMap,
  getPlayerCreatedLevel,
  getPublicRivalLevelsSorted,
  getRivalDraftLevel,
  getUserProfile,
  gridSlotToWorld,
  RIVAL_EDITOR_LIMITS,
  savePlayerCreatedLevel,
  saveRivalDraftLevel,
  saveUserProfile,
  TITLE_BADGE_OPTIONS,
} from '../game/rivalEngine';
import {
  BrickBlueprint,
  BrickColor,
  BrickType,
  GameHudSnapshot,
  GameModeState,
  LevelDefinition,
  RivalCommunityLevel,
  UserProfileData,
} from '../game/types';

interface RivalStudioModalProps {
  gameState: GameModeState;
  hud: GameHudSnapshot;
  onCloseToPlay: () => void;
  onSwitchModal: (nextState: GameModeState) => void;
  onPlayRivalLevel: (def: LevelDefinition) => void;
  onOpenClassicLevels: () => void;
}

type BrushTool =
  | { label: string; type: BrickType; color: BrickColor; hp: number; costLabel: string; badge: string }
  | { label: 'Gomme'; type: 'erase'; color: 'blue'; hp: 0; costLabel: '0 PV'; badge: '✕' };

const BRUSH_PALETTE: BrushTool[] = [
  { label: 'Rose 50', type: 'numbered', color: 'pink', hp: 50, costLabel: '50 PV', badge: '50' },
  { label: 'Violet 40', type: 'numbered', color: 'purple', hp: 40, costLabel: '40 PV', badge: '40' },
  { label: 'Bleu 30', type: 'numbered', color: 'blue', hp: 30, costLabel: '30 PV', badge: '30' },
  { label: 'Vert 20', type: 'numbered', color: 'green', hp: 20, costLabel: '20 PV', badge: '20' },
  { label: 'Kawaii 😊', type: 'kawaii_happy', color: 'yellow', hp: 30, costLabel: '30 PV', badge: '😊' },
  { label: 'Éclair ⚡', type: 'lightning', color: 'lightning', hp: 10, costLabel: '15 PV', badge: '⚡' },
  { label: 'Titane 🛡️', type: 'metal', color: 'metal', hp: 999, costLabel: '45 PV', badge: '🛡️' },
  { label: 'Gomme', type: 'erase', color: 'blue', hp: 0, costLabel: 'Retirer', badge: '✕' },
];

export const RivalStudioModal: React.FC<RivalStudioModalProps> = ({
  gameState,
  hud,
  onCloseToPlay,
  onSwitchModal,
  onPlayRivalLevel,
  onOpenClassicLevels,
}) => {
  const [refreshTick, setRefreshTick] = useState(0);
  const [hallTab, setHallTab] = useState<'classic' | 'rival'>('classic');
  const [profileTab, setProfileTab] = useState<'identity' | 'workshop' | 'palmares'>('identity');

  // User Profile HQ State
  const [userProfile, setUserProfile] = useState<UserProfileData>(() => getUserProfile());

  const playerLevel = useMemo(() => getPlayerCreatedLevel(), [refreshTick, gameState]);
  const publicRivalLevels = useMemo(() => getPublicRivalLevelsSorted(), [refreshTick, gameState]);
  const cooldownStatus = useMemo(() => getEditCooldownStatus(playerLevel), [playerLevel]);
  const clashVictories = useMemo(() => getClashVictories(), [refreshTick, gameState]);
  const beatenMap = useMemo(() => getPlayerBeatenMap(), [refreshTick, gameState]);

  // Draft Editor State (Initialized from localStorage Auto-Saved Draft!)
  const initialDraft = useMemo(() => getRivalDraftLevel(), []);
  const [levelTitle, setLevelTitle] = useState<string>(initialDraft.title);
  const [ballSpeed, setBallSpeed] = useState<number>(initialDraft.ballSpeed);
  const [fixedObsCount, setFixedObsCount] = useState<number>(initialDraft.fixedObsCount);
  const [randomObsCount, setRandomObsCount] = useState<number>(initialDraft.randomObsCount);
  const [gridBricks, setGridBricks] = useState<BrickBlueprint[]>(initialDraft.bricks);
  const [testedCount, setTestedCount] = useState<number>(initialDraft.testedCount || 0);
  const [lastSavedTimeStr, setLastSavedTimeStr] = useState<string>(() =>
    new Date(initialDraft.lastAutoSavedAt).toLocaleTimeString('fr-FR')
  );
  const [selectedBrushIdx, setSelectedBrushIdx] = useState<number>(0);
  const [editorStatusMsg, setEditorStatusMsg] = useState<string | null>(null);

  // INSTANT AUTO-SAVE EFFECT: Every change in the editor is saved automatically to localStorage!
  useEffect(() => {
    saveRivalDraftLevel({
      title: levelTitle,
      ballSpeed,
      fixedObsCount,
      randomObsCount,
      bricks: gridBricks,
      lastAutoSavedAt: Date.now(),
      testedCount,
    });
    setLastSavedTimeStr(new Date().toLocaleTimeString('fr-FR'));
  }, [levelTitle, ballSpeed, fixedObsCount, randomObsCount, gridBricks, testedCount]);

  // Save User Profile changes immediately
  const updateProfileField = (patch: Partial<UserProfileData>) => {
    const next: UserProfileData = { ...userProfile, ...patch };
    setUserProfile(next);
    saveUserProfile(next);
    setRefreshTick((t) => t + 1);
  };

  if (
    gameState !== 'rival_browser' &&
    gameState !== 'rival_editor' &&
    gameState !== 'user_profile' &&
    gameState !== 'hall_of_fame'
  ) {
    return null;
  }

  // Computed Draft Metrics
  const hpBudgetUsed = calculateBricksHpBudget(gridBricks);
  const metalCount = gridBricks.filter((b) => b.type === 'metal').length;
  const lightningCount = gridBricks.filter((b) => b.type === 'lightning').length;
  const destructibleCount = gridBricks.filter((b) => b.type !== 'metal').length;
  const currentFixedObstacles =
    FIXED_OBSTACLE_PRESETS[Math.min(fixedObsCount, FIXED_OBSTACLE_PRESETS.length - 1)];

  const liveDraftComplexity = calculateLevelComplexity({
    bricks: gridBricks,
    fixedObstacles: currentFixedObstacles,
    randomObstacleCount: randomObsCount,
    ballSpeed,
  });
  const compMeta = getComplexityLabel(liveDraftComplexity);

  const handleTestDraftNow = () => {
    if (destructibleCount < RIVAL_EDITOR_LIMITS.minTotalBricks) {
      setEditorStatusMsg(
        `Placez au moins ${RIVAL_EDITOR_LIMITS.minTotalBricks} briques destructibles avant de lancer le test.`
      );
      return;
    }
    const nextTested = testedCount + 1;
    setTestedCount(nextTested);
    const draftObj = {
      title: levelTitle,
      ballSpeed,
      fixedObsCount,
      randomObsCount,
      bricks: gridBricks,
      lastAutoSavedAt: Date.now(),
      testedCount: nextTested,
    };
    saveRivalDraftLevel(draftObj);
    onPlayRivalLevel(convertDraftToLevelDefinition(draftObj));
  };

  const handlePublishOfficialLevel = (playImmediately: boolean) => {
    if (playerLevel && !cooldownStatus.canEdit) {
      setEditorStatusMsg(
        `Règle des 30 jours : vous pourrez publier une modification de votre niveau dans ${cooldownStatus.daysRemaining}j (le ${cooldownStatus.nextEditDateStr}). Vous pouvez toutefois continuer à modifier et tester votre brouillon !`
      );
      return;
    }

    if (destructibleCount < RIVAL_EDITOR_LIMITS.minTotalBricks) {
      setEditorStatusMsg(
        `Placez au moins ${RIVAL_EDITOR_LIMITS.minTotalBricks} briques destructibles pour publier.`
      );
      return;
    }

    const now = Date.now();
    const savedLevel: RivalCommunityLevel = {
      id: playerLevel?.id || 'rival-player-1',
      title: (levelTitle.trim() || 'Citadelle Néon').slice(0, 22),
      author: userProfile.handle,
      isPlayerOwned: true,
      isHidden: playerLevel?.isHidden ?? false,
      createdAt: playerLevel?.createdAt ?? now,
      lastModifiedAt: now,
      editCount: playerLevel ? playerLevel.editCount + 1 : 0,
      complexityScore: liveDraftComplexity,
      playsCount: playerLevel?.playsCount ?? 1,
      clearsCount: playerLevel?.clearsCount ?? 0,
      ballSpeed,
      bricks: gridBricks,
      fixedObstacles: currentFixedObstacles,
      randomObstacleCount: randomObsCount,
    };

    savePlayerCreatedLevel(savedLevel);
    setRefreshTick((t) => t + 1);

    if (playImmediately) {
      onPlayRivalLevel(convertRivalToLevelDefinition(savedLevel));
    } else {
      onSwitchModal('user_profile');
      setProfileTab('workshop');
    }
  };

  // ============================================================================
  // 1. QG PROFIL UTILISATEUR ("Se sentir chez soi et tout orchestrer")
  // ============================================================================
  if (gameState === 'user_profile') {
    const playerVictories = clashVictories.filter((c) => c.isPlayerVictory);

    const handleToggleVisibility = () => {
      if (!playerLevel) return;
      savePlayerCreatedLevel({
        ...playerLevel,
        isHidden: !playerLevel.isHidden,
      });
      setRefreshTick((t) => t + 1);
    };

    const handleDeletePublished = () => {
      deletePlayerCreatedLevel();
      setRefreshTick((t) => t + 1);
    };

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-4 bg-[#07051A]/94 pointer-events-auto overflow-hidden">
        <div className="w-full max-w-2xl rounded-3xl border-2 border-[#A855F7] bg-[#10092B] p-3.5 sm:p-6 shadow-[0_0_50px_rgba(168,85,247,0.4)]">
          {/* Top Identity Header */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF1668] via-[#9333EA] to-[#00F0FF] p-0.5 shrink-0">
                <div className="w-full h-full rounded-[14px] bg-[#120A30] flex items-center justify-center text-2xl">
                  {userProfile.avatarBadge}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-black text-lg sm:text-2xl text-white truncate">
                    {userProfile.handle}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#A855F7]/25 border border-[#A855F7]/60 text-[10px] font-extrabold text-[#E9D5FF] whitespace-nowrap">
                    {userProfile.titleBadge}
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8]">
                  Quartier Général Personnel · Gérez votre identité, votre arène Rival et votre palmarès de Clashs
                </p>
              </div>
            </div>

            <button
              onClick={onCloseToPlay}
              aria-label="Fermer"
              className="min-w-[40px] min-h-[40px] rounded-full bg-[#1E1448] hover:bg-[#2D1F68] flex items-center justify-center text-white cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3-Tab Navigation Bar */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#09051A] border border-white/10 mb-3.5">
            <button
              onClick={() => setProfileTab('identity')}
              className={`min-h-[40px] rounded-xl font-display font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                profileTab === 'identity'
                  ? 'bg-gradient-to-r from-[#FF1668] to-[#9333EA] text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Mon Identité & QG</span>
            </button>

            <button
              onClick={() => setProfileTab('workshop')}
              className={`min-h-[40px] rounded-xl font-display font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                profileTab === 'workshop'
                  ? 'bg-gradient-to-r from-[#00B4FF] to-[#6D28D9] text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Mon Niveau & Atelier</span>
            </button>

            <button
              onClick={() => setProfileTab('palmares')}
              className={`min-h-[40px] rounded-xl font-display font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                profileTab === 'palmares'
                  ? 'bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Palmarès ({playerVictories.length})</span>
            </button>
          </div>

          {/* TAB 1: IDENTITY & CAREER OVERVIEW */}
          {profileTab === 'identity' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-[#17103A] border border-white/10">
                  <label className="block text-[10px] font-bold text-[#94A3B8] uppercase mb-1">
                    Pseudo de Joueur (Sauvegarde auto)
                  </label>
                  <input
                    type="text"
                    maxLength={18}
                    value={userProfile.handle}
                    onChange={(e) => {
                      const val = e.target.value.startsWith('@')
                        ? e.target.value
                        : `@${e.target.value.replace(/^@+/, '')}`;
                      updateProfileField({ handle: val });
                    }}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#0B061E] border border-[#38BDF8]/40 text-sm font-display font-bold text-white focus:outline-none focus:border-[#00F0FF]"
                  />

                  <label className="block text-[10px] font-bold text-[#94A3B8] uppercase mt-2.5 mb-1">
                    Titre Honorifique
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {TITLE_BADGE_OPTIONS.map((t) => (
                      <button
                        key={t}
                        onClick={() => updateProfileField({ titleBadge: t })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                          userProfile.titleBadge === t
                            ? 'bg-[#A855F7] text-white'
                            : 'bg-[#0B061E] text-[#CBD5E1] hover:bg-[#241654]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#17103A] border border-white/10 flex flex-col justify-between">
                  <div>
                    <label className="block text-[10px] font-bold text-[#94A3B8] uppercase mb-1.5">
                      Emblème Cosmique
                    </label>
                    <div className="grid grid-cols-8 gap-1.5">
                      {AVATAR_BADGE_OPTIONS.map((emo) => (
                        <button
                          key={emo}
                          onClick={() => updateProfileField({ avatarBadge: emo })}
                          className={`h-9 rounded-xl flex items-center justify-center text-base border transition-transform cursor-pointer ${
                            userProfile.avatarBadge === emo
                              ? 'border-[#00F0FF] bg-[#162858] scale-105'
                              : 'border-white/10 bg-[#0B061E] hover:bg-[#1E1448]'
                          }`}
                        >
                          {emo}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Career Metrics */}
                  <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-white/10 text-center">
                    <div>
                      <div className="text-[10px] text-[#94A3B8]">Classic</div>
                      <div className="font-display font-black text-sm text-[#FFD700] tabular-nums">
                        {hud.highScore} pts
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#94A3B8]">Rival</div>
                      <div className="font-display font-black text-sm text-[#00F0FF] tabular-nums">
                        {hud.rivalHighScore} pts
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#94A3B8]">Clashs Gagnés</div>
                      <div className="font-display font-black text-sm text-[#10E84A] tabular-nums">
                        {playerVictories.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#94A3B8]">Blocs Cassés</div>
                      <div className="font-display font-black text-sm text-white tabular-nums">
                        {userProfile.totalBricksBroken}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MON ATELIER & NIVEAU RIVAL (ORCHESTRATION) */}
          {profileTab === 'workshop' && (
            <div className="space-y-2.5">
              {/* Auto-saved Draft Card */}
              <div className="p-3 rounded-2xl border border-[#00F0FF]/50 bg-[#121D42]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#10E84A]/20 text-[#4ADE80] text-[10px] font-extrabold">
                        ✔ BROUILLON AUTO-SAUVEGARDÉ ({lastSavedTimeStr})
                      </span>
                      <span className="font-display font-extrabold text-sm text-white">
                        {levelTitle || 'Sans titre'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#CBD5E1] mt-1">
                      Budget PV : <strong>{hpBudgetUsed}/{RIVAL_EDITOR_LIMITS.maxHpBudget} PV</strong> · Blocs :{' '}
                      <strong>{gridBricks.length}/{RIVAL_EDITOR_LIMITS.maxTotalBricks}</strong> · Complexité :{' '}
                      <strong style={{ color: compMeta.color }}>
                        {liveDraftComplexity}/100 ({compMeta.tier})
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleTestDraftNow}
                      className="min-h-[38px] px-3 rounded-xl bg-[#00F0FF] hover:brightness-110 text-[#07051A] font-display font-extrabold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Tester mon Brouillon</span>
                    </button>

                    <button
                      onClick={() => onSwitchModal('rival_editor')}
                      className="min-h-[38px] px-3 rounded-xl bg-gradient-to-r from-[#FF1668] to-[#9333EA] hover:brightness-110 text-white font-display font-extrabold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Éditer les Blocs</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Official Published Level Card */}
              <div className="p-3 rounded-2xl border border-white/15 bg-[#17103A]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-[#FFD700]" />
                      <span className="font-display font-extrabold text-sm text-white">
                        Niveau Officiel Publié dans l’Arène Rival
                      </span>
                      {playerLevel && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            playerLevel.isHidden
                              ? 'bg-[#F59E0B]/20 text-[#FBBF24]'
                              : 'bg-[#10E84A]/20 text-[#4ADE80]'
                          }`}
                        >
                          {playerLevel.isHidden ? 'Masqué du public (Profil seul)' : 'En ligne (Public)'}
                        </span>
                      )}
                    </div>

                    {playerLevel ? (
                      <p className="text-[11px] text-[#CBD5E1] mt-1">
                        <strong>{playerLevel.title}</strong> · Complexité{' '}
                        <strong className="text-[#00F0FF]">{playerLevel.complexityScore}/100</strong> ·{' '}
                        {cooldownStatus.canEdit
                          ? '1 mise à jour officielle disponible (puis délai de 30 jours)'
                          : `Verrouillé 30j : prochaine modification officielle dans ${cooldownStatus.daysRemaining}j (${cooldownStatus.nextEditDateStr})`}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#94A3B8] mt-1">
                        Aucun niveau publié pour l’instant. Testez votre brouillon ci-dessus puis publiez-le !
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {playerLevel ? (
                      <>
                        <button
                          onClick={() => onPlayRivalLevel(convertRivalToLevelDefinition(playerLevel))}
                          className="min-h-[38px] px-3 rounded-xl bg-[#10E84A] text-[#07051A] font-display font-extrabold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Jouer</span>
                        </button>

                        <button
                          onClick={() => handlePublishOfficialLevel(false)}
                          disabled={!cooldownStatus.canEdit}
                          className="min-h-[38px] px-2.5 rounded-xl border border-[#38BDF8]/50 bg-[#12204A] disabled:opacity-45 text-xs font-bold text-[#7DD3FC] flex items-center gap-1 cursor-pointer"
                        >
                          {cooldownStatus.canEdit ? (
                            <Save className="w-3.5 h-3.5" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
                          )}
                          <span>
                            {cooldownStatus.canEdit
                              ? 'Publier Brouillon'
                              : `${cooldownStatus.daysRemaining}j`}
                          </span>
                        </button>

                        <button
                          onClick={handleToggleVisibility}
                          className="min-h-[38px] px-2.5 rounded-xl border border-white/20 bg-[#241854] hover:bg-[#312170] text-xs font-semibold text-white flex items-center gap-1 cursor-pointer"
                        >
                          {playerLevel.isHidden ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-[#10E84A]" />
                              <span>Rendre Public</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-[#FBBF24]" />
                              <span>Masquer</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleDeletePublished}
                          title="Supprimer le niveau publié"
                          className="min-h-[38px] px-2.5 rounded-xl border border-[#FF1668]/50 bg-[#3A0D2E] hover:bg-[#521240] text-xs text-[#FF80B5] flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handlePublishOfficialLevel(false)}
                        className="min-h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-[#10E84A] to-[#059669] text-[#07051A] font-display font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Publier mon Brouillon dans Rival</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MON PALMARÈS & CLASHS ("... a battu X utilisateur") */}
          {profileTab === 'palmares' && (
            <div className="space-y-2">
              <div className="text-[11px] text-[#CBD5E1] mb-1">
                Chaque fois que vous triomphez du niveau d’un autre joueur en Mode Rival, votre victoire est gravée dans votre palmarès de Clashs :
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {clashVictories.slice(0, 6).map((cl) => (
                  <div
                    key={cl.id}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 ${
                      cl.isPlayerVictory
                        ? 'border-[#10E84A]/60 bg-[#0D2824]'
                        : 'border-white/10 bg-[#17103A]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-display font-extrabold text-white truncate">
                        <span>{cl.isPlayerVictory ? '🏆' : '⚔️'}</span>
                        <span className="text-[#00F0FF]">{cl.winnerHandle}</span>
                        <span className="text-[#CBD5E1] font-normal">a battu</span>
                        <span className="text-[#FF4098]">{cl.rivalAuthor}</span>
                      </div>
                      <div className="text-[10px] text-[#94A3B8] truncate mt-0.5">
                        Arène « {cl.rivalLevelTitle} » · Complexité {cl.complexityScore}/100
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-display font-black text-xs text-[#FFD700] tabular-nums">
                        {cl.scoreEarned} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Quick Navigation Bar */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              onClick={() => onSwitchModal('rival_browser')}
              className="flex-1 min-h-[42px] rounded-xl border border-[#00F0FF]/50 bg-[#0E193D] hover:bg-[#15265A] text-xs font-bold text-[#7DD3FC] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Swords className="w-4 h-4" />
              <span>Arène Rival (Communauté)</span>
            </button>

            <button
              onClick={() => onSwitchModal('rival_editor')}
              className="flex-1 min-h-[42px] rounded-xl border border-[#A855F7]/50 bg-[#231248] hover:bg-[#311964] text-xs font-bold text-[#E9D5FF] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>Studio Créateur</span>
            </button>

            <button
              onClick={onCloseToPlay}
              className="min-h-[42px] px-4 rounded-xl bg-gradient-to-r from-[#FF1668] to-[#9333EA] text-xs font-display font-extrabold text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Jouer</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. HALL OF FAME MODAL (CLASSEMENT CLASSIC & CLASSEMENT RIVAL RÉALISTE)
  // ============================================================================
  if (gameState === 'hall_of_fame') {
    const rankings = getHallOfFameRankings(hud.highScore, hud.rivalHighScore, hud.winStreak);
    const activeList = hallTab === 'classic' ? rankings.classic : rankings.rival;

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-[#07051A]/92 pointer-events-auto overflow-hidden">
        <div className="w-full max-w-xl rounded-3xl border-2 border-[#FFD700]/75 bg-[#110A2E] p-4 sm:p-6 shadow-[0_0_45px_rgba(255,215,0,0.3)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#FFD700]/15 border border-[#FFD700]/60 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[#FFD700]" />
              </div>
              <div>
                <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                  HALL OF FAME COSMIQUE
                </h2>
                <p className="text-[11px] text-[#CBD5E1]">
                  Barème Réaliste & Compétitif · Classement Classic & Clashs Rival
                </p>
              </div>
            </div>

            <button
              onClick={onCloseToPlay}
              aria-label="Fermer"
              className="min-w-[42px] min-h-[42px] rounded-full bg-[#1E1448] hover:bg-[#2D1F68] flex items-center justify-center text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#0A061E] border border-white/10 mb-3.5">
            <button
              onClick={() => setHallTab('classic')}
              className={`min-h-[42px] rounded-xl font-display font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                hallTab === 'classic'
                  ? 'bg-gradient-to-r from-[#FF1668] to-[#9333EA] text-white shadow-[0_0_15px_rgba(255,22,104,0.45)]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>Classement Classic</span>
            </button>

            <button
              onClick={() => setHallTab('rival')}
              className={`min-h-[42px] rounded-xl font-display font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                hallTab === 'rival'
                  ? 'bg-gradient-to-r from-[#00B4FF] to-[#6D28D9] text-white shadow-[0_0_15px_rgba(0,180,255,0.45)]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>Classement Rival</span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {activeList.map((entry) => (
              <div
                key={entry.name}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl border ${
                  entry.isCurrentUser
                    ? 'border-[#00F0FF] bg-[#16204E]/90 shadow-[0_0_16px_rgba(0,240,255,0.28)]'
                    : entry.rank === 1
                    ? 'border-[#FFD700]/60 bg-[#231742]'
                    : 'border-white/10 bg-[#17103A]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-xl font-display font-black text-xs flex items-center justify-center shrink-0 ${
                      entry.rank === 1
                        ? 'bg-[#FFD700] text-[#07051A]'
                        : entry.rank === 2
                        ? 'bg-[#E2E8F0] text-[#07051A]'
                        : entry.rank === 3
                        ? 'bg-[#F59E0B] text-[#07051A]'
                        : 'bg-[#0D0826] text-[#94A3B8]'
                    }`}
                  >
                    #{entry.rank}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span>{entry.badge}</span>
                      <span className="font-display font-extrabold text-xs sm:text-sm text-white truncate">
                        {entry.name}
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-[#94A3B8] truncate">
                      {entry.metricLabel}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <div className="font-display font-black text-sm sm:text-base text-[#FFD700] tabular-nums">
                    {entry.score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} pts
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              onClick={() => onSwitchModal('user_profile')}
              className="flex-1 min-h-[42px] rounded-xl border border-[#A855F7]/50 bg-[#231248] hover:bg-[#311964] text-xs font-bold text-[#E9D5FF] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>Mon QG Profil</span>
            </button>
            <button
              onClick={() => onSwitchModal('rival_browser')}
              className="flex-1 min-h-[42px] rounded-xl border border-[#00F0FF]/50 bg-[#0E193D] hover:bg-[#15265A] text-xs font-bold text-[#7DD3FC] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Swords className="w-4 h-4" />
              <span>Arène Rival</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. RIVAL BROWSER MODAL (SORTED AUTOMATICALLY BY COMPLEXITY + CLASH BADGES)
  // ============================================================================
  if (gameState === 'rival_browser') {
    const playerVictoriesCount = Object.keys(beatenMap).length;

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-4 bg-[#07051A]/92 pointer-events-auto overflow-hidden">
        <div className="w-full max-w-2xl rounded-3xl border-2 border-[#00F0FF]/75 bg-[#10092B] p-3.5 sm:p-5 shadow-[0_0_45px_rgba(0,240,255,0.3)]">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#00F0FF]/20 border border-[#00F0FF]/60 text-[10px] font-extrabold text-[#00F0FF] uppercase">
                  Clash par Niveaux
                </span>
                <h2 className="font-display font-black text-lg sm:text-2xl text-white">
                  ARÈNE RIVAL (TRI PAR COMPLEXITÉ)
                </h2>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Battez les niveaux des autres joueurs pour les inscrire à votre Palmarès de Clashs !
              </p>
            </div>

            <button
              onClick={onCloseToPlay}
              aria-label="Fermer"
              className="min-w-[40px] min-h-[40px] rounded-full bg-[#1E1448] hover:bg-[#2D1F68] flex items-center justify-center text-white cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Command Banner linking to QG User Profile & Draft Workshop */}
          <div className="mb-3 p-2.5 rounded-2xl border border-[#A855F7]/60 bg-[#1A1040] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#0D0826] border border-[#A855F7] flex items-center justify-center text-lg shrink-0">
                {userProfile.avatarBadge}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-extrabold text-xs sm:text-sm text-white truncate">
                    {userProfile.handle}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#10E84A]/20 text-[#4ADE80] text-[10px] font-bold">
                    {playerVictoriesCount} Utilisateur(s) Battu(s)
                  </span>
                </div>
                <p className="text-[10px] text-[#CBD5E1] truncate">
                  Brouillon auto-sauvegardé : <strong>{levelTitle}</strong> ({liveDraftComplexity}/100)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleTestDraftNow}
                className="min-h-[36px] px-2.5 rounded-xl bg-[#00F0FF] hover:brightness-110 text-[#07051A] font-display font-extrabold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Tester Brouillon</span>
              </button>

              <button
                onClick={() => onSwitchModal('rival_editor')}
                className="min-h-[36px] px-2.5 rounded-xl bg-gradient-to-r from-[#FF1668] to-[#9333EA] text-white font-display font-extrabold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Studio</span>
              </button>

              <button
                onClick={() => onSwitchModal('user_profile')}
                className="min-h-[36px] px-2.5 rounded-xl border border-white/25 bg-[#241854] hover:bg-[#312170] text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[#E9D5FF]" />
                <span>Mon QG</span>
              </button>
            </div>
          </div>

          {/* Community Levels Grid Sorted from Least Complex to Most Complex */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {publicRivalLevels.slice(0, 6).map((lvl, index) => {
              const comp = getComplexityLabel(lvl.complexityScore);
              const beatenEntry = beatenMap[lvl.id];

              return (
                <div
                  key={lvl.id}
                  className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-colors ${
                    beatenEntry
                      ? 'border-[#10E84A]/55 bg-[#112233]'
                      : 'border-white/15 bg-[#17103C] hover:border-[#00F0FF]/60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#090518] text-[#00F0FF] tabular-nums">
                        #{index + 1}
                      </span>
                      <span className="font-display font-extrabold text-xs sm:text-sm text-white truncate">
                        {lvl.title}
                      </span>
                      {beatenEntry && (
                        <span className="px-1.5 py-0.5 rounded bg-[#10E84A]/25 text-[#4ADE80] text-[9px] font-black whitespace-nowrap">
                          ✔ BATTU ({beatenEntry.scoreEarned} pts)
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[#CBD5E1]">
                      <span className="font-bold text-[#FF80B5]">{lvl.author}</span>
                      <span>·</span>
                      <span style={{ color: comp.color }} className="font-extrabold">
                        Complexité {lvl.complexityScore}/100 ({comp.tier})
                      </span>
                    </div>

                    <div className="mt-0.5 text-[10px] text-[#94A3B8]">
                      {lvl.bricks.length} blocs · {lvl.fixedObstacles.length} fixes +{' '}
                      {lvl.randomObstacleCount} aléat. · Vitesse {lvl.ballSpeed.toFixed(1)}
                    </div>
                  </div>

                  <button
                    onClick={() => onPlayRivalLevel(convertRivalToLevelDefinition(lvl))}
                    className="min-h-[40px] px-3 rounded-xl bg-gradient-to-r from-[#00B4FF] to-[#0284C7] hover:brightness-110 text-white font-display font-extrabold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>Défier</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Switchers */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              onClick={onOpenClassicLevels}
              className="min-h-[40px] px-3 rounded-xl border border-white/20 bg-[#1B1246] hover:bg-[#261A60] text-xs font-bold text-[#CBD5E1] cursor-pointer"
            >
              Mode Classic (12 Niveaux)
            </button>

            <button
              onClick={() => {
                onSwitchModal('user_profile');
                setProfileTab('palmares');
              }}
              className="min-h-[40px] px-3 rounded-xl border border-[#10E84A]/50 bg-[#0D2824] hover:bg-[#133B35] text-xs font-bold text-[#4ADE80] flex items-center gap-1.5 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Mon Palmarès Clashs</span>
            </button>

            <button
              onClick={() => onSwitchModal('hall_of_fame')}
              className="min-h-[40px] px-3 rounded-xl border border-[#FFD700]/50 bg-[#261B12] hover:bg-[#382718] text-xs font-bold text-[#FFD700] flex items-center gap-1.5 cursor-pointer"
            >
              <Trophy className="w-4 h-4" />
              <span>Hall of Fame</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. RIVAL LEVEL EDITOR MODAL (INSTANT AUTO-SAVE + 420 PV BUDGET + FREE TEST)
  // ============================================================================
  const handleCellClick = (row: number, col: number) => {
    const brush = BRUSH_PALETTE[selectedBrushIdx];
    const existingIdx = gridBricks.findIndex((b) => b.row === row && b.col === col);

    if (brush.type === 'erase') {
      if (existingIdx !== -1) {
        setGridBricks((prev) => prev.filter((_, idx) => idx !== existingIdx));
        setEditorStatusMsg(null);
      }
      return;
    }

    const withoutTarget = gridBricks.filter((_, idx) => idx !== existingIdx);

    // 1. Check strict total brick count limit (Max 16 bricks!)
    if (withoutTarget.length >= RIVAL_EDITOR_LIMITS.maxTotalBricks) {
      setEditorStatusMsg(
        `Limite de blocs atteinte (${RIVAL_EDITOR_LIMITS.maxTotalBricks} blocs max) ! Soyez tactique dans vos placements.`
      );
      return;
    }

    // 2. Check Global HP Budget (Max 420 PV to prevent spamming 50 HP bricks!)
    const candidateBrick: BrickBlueprint = {
      row,
      col,
      x: gridSlotToWorld(row, col).x,
      y: gridSlotToWorld(row, col).y,
      width: 1.68,
      height: 1.08,
      type: brush.type,
      color: brush.color,
      hp: brush.hp,
    };
    const nextBudget = calculateBricksHpBudget([...withoutTarget, candidateBrick]);
    if (nextBudget > RIVAL_EDITOR_LIMITS.maxHpBudget) {
      setEditorStatusMsg(
        `Budget PV dépassé (${nextBudget}/${RIVAL_EDITOR_LIMITS.maxHpBudget} PV max) ! Utilisez des blocs de 20 ou 30 PV au lieu de ne poser que des blocs de 50.`
      );
      return;
    }

    // 3. Check special brick quotas
    if (
      brush.type === 'metal' &&
      withoutTarget.filter((b) => b.type === 'metal').length >= RIVAL_EDITOR_LIMITS.maxMetalBricks
    ) {
      setEditorStatusMsg(`Maximum ${RIVAL_EDITOR_LIMITS.maxMetalBricks} blocs Titane autorisés.`);
      return;
    }
    if (
      brush.type === 'lightning' &&
      withoutTarget.filter((b) => b.type === 'lightning').length >=
        RIVAL_EDITOR_LIMITS.maxLightningBricks
    ) {
      setEditorStatusMsg(`Maximum ${RIVAL_EDITOR_LIMITS.maxLightningBricks} blocs Éclair ⚡ autorisés.`);
      return;
    }

    setGridBricks([...withoutTarget, candidateBrick]);
    setEditorStatusMsg(null);
  };

  const budgetPercent = Math.min(100, Math.round((hpBudgetUsed / RIVAL_EDITOR_LIMITS.maxHpBudget) * 100));

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-2 sm:p-4 bg-[#07051A]/94 pointer-events-auto overflow-hidden">
      <div className="w-full max-w-2xl rounded-3xl border-2 border-[#A855F7] bg-[#110A2E] p-3 sm:p-5 shadow-[0_0_45px_rgba(168,85,247,0.4)]">
        {/* Top Bar with Instant Auto-Save Indicator */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-[#10E84A]/20 border border-[#10E84A]/60 text-[10px] font-extrabold text-[#4ADE80] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Auto-sauvegardé ({lastSavedTimeStr})</span>
              </span>
              <span
                style={{ color: compMeta.color }}
                className="text-xs font-display font-black"
              >
                Complexité Auto : {liveDraftComplexity}/100 ({compMeta.tier})
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">
              Budget strict de {RIVAL_EDITOR_LIMITS.maxHpBudget} PV & {RIVAL_EDITOR_LIMITS.maxTotalBricks} blocs max pour forcer la créativité · Test libre à tout moment
            </p>
          </div>

          <button
            onClick={() => onSwitchModal('user_profile')}
            className="min-w-[38px] min-h-[38px] rounded-full bg-[#1E1448] hover:bg-[#2D1F68] flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Name & Speed / Obstacles Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
          <div className="col-span-2 sm:col-span-1 bg-[#191042] border border-white/15 rounded-xl px-2.5 py-1">
            <label className="block text-[9px] text-[#94A3B8]">Nom de votre Arène</label>
            <input
              type="text"
              value={levelTitle}
              maxLength={22}
              onChange={(e) => setLevelTitle(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-white focus:outline-none"
              placeholder="Citadelle Néon"
            />
          </div>

          <div className="bg-[#191042] border border-white/15 rounded-xl px-2.5 py-1">
            <div className="flex justify-between text-[9px] text-[#94A3B8]">
              <span>Obstacles Fixes</span>
              <strong className="text-[#FFD700]">
                {fixedObsCount}/{RIVAL_EDITOR_LIMITS.maxFixedObstacles}
              </strong>
            </div>
            <input
              type="range"
              min={0}
              max={RIVAL_EDITOR_LIMITS.maxFixedObstacles}
              step={1}
              value={fixedObsCount}
              onChange={(e) => setFixedObsCount(Number(e.target.value))}
              className="w-full accent-[#FFD700] cursor-pointer"
            />
          </div>

          <div className="bg-[#191042] border border-white/15 rounded-xl px-2.5 py-1">
            <div className="flex justify-between text-[9px] text-[#94A3B8]">
              <span>Obst. Aléat. (10-20s)</span>
              <strong className="text-[#00F0FF]">
                {randomObsCount}/{RIVAL_EDITOR_LIMITS.maxRandomObstacles}
              </strong>
            </div>
            <input
              type="range"
              min={0}
              max={RIVAL_EDITOR_LIMITS.maxRandomObstacles}
              step={1}
              value={randomObsCount}
              onChange={(e) => setRandomObsCount(Number(e.target.value))}
              className="w-full accent-[#00F0FF] cursor-pointer"
            />
          </div>

          <div className="bg-[#191042] border border-white/15 rounded-xl px-2.5 py-1">
            <div className="flex justify-between text-[9px] text-[#94A3B8]">
              <span>Vitesse Bille</span>
              <strong className="text-[#FF4098]">{ballSpeed.toFixed(1)}</strong>
            </div>
            <input
              type="range"
              min={RIVAL_EDITOR_LIMITS.minBallSpeed}
              max={RIVAL_EDITOR_LIMITS.maxBallSpeed}
              step={0.2}
              value={ballSpeed}
              onChange={(e) => setBallSpeed(Number(e.target.value))}
              className="w-full accent-[#FF1668] cursor-pointer"
            />
          </div>
        </div>

        {/* Global HP Budget & Block Count Bars (Prevents spamming 50 HP bricks!) */}
        <div className="bg-[#0B061E] px-3 py-1.5 rounded-xl border border-white/10 mb-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#CBD5E1] mb-1">
            <span>
              Budget PV Global :{' '}
              <strong
                className={
                  hpBudgetUsed >= RIVAL_EDITOR_LIMITS.maxHpBudget - 20
                    ? 'text-[#FF4098]'
                    : 'text-[#00F0FF]'
                }
              >
                {hpBudgetUsed} / {RIVAL_EDITOR_LIMITS.maxHpBudget} PV
              </strong>
            </span>
            <span>
              Blocs posés :{' '}
              <strong className="text-white">
                {gridBricks.length} / {RIVAL_EDITOR_LIMITS.maxTotalBricks} max
              </strong>
            </span>
            <span>
              Titane : <strong>{metalCount}/{RIVAL_EDITOR_LIMITS.maxMetalBricks}</strong> · Éclairs :{' '}
              <strong>{lightningCount}/{RIVAL_EDITOR_LIMITS.maxLightningBricks}</strong>
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#191042] overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                budgetPercent > 90
                  ? 'bg-gradient-to-r from-[#F59E0B] to-[#FF1668]'
                  : 'bg-gradient-to-r from-[#00F0FF] to-[#A855F7]'
              }`}
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
        </div>

        {/* Brush Selector with PV Cost */}
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {BRUSH_PALETTE.map((b, idx) => (
            <button
              key={b.label}
              onClick={() => setSelectedBrushIdx(idx)}
              className={`px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                selectedBrushIdx === idx
                  ? 'border-[#00F0FF] bg-[#1A2A5E] text-white scale-105'
                  : 'border-white/10 bg-[#18103C] text-[#CBD5E1] hover:bg-[#231854]'
              }`}
            >
              <span>{b.badge}</span>
              <span>{b.label}</span>
              <span className="text-[9px] text-[#7DD3FC]">({b.costLabel})</span>
            </button>
          ))}
        </div>

        {/* Interactive 4x6 Arena Matrix */}
        <div className="p-2 rounded-2xl bg-[#08051A] border border-[#6D28D9]/60 mb-2">
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: 24 }).map((_, cellIdx) => {
              const row = Math.floor(cellIdx / 6);
              const col = cellIdx % 6;
              const brick = gridBricks.find((b) => b.row === row && b.col === col);

              let cellBg = 'bg-[#130D32] border-white/10 text-[#475569]';
              let label = '+';
              if (brick) {
                if (brick.type === 'lightning') {
                  cellBg = 'bg-[#0C4A6E] border-[#38BDF8] text-[#00F0FF]';
                  label = '⚡';
                } else if (brick.type === 'metal') {
                  cellBg = 'bg-[#334155] border-[#CBD5E1] text-white';
                  label = '🛡️';
                } else if (brick.type === 'kawaii_happy' || brick.type === 'kawaii_wink') {
                  cellBg = 'bg-[#D97706] border-[#FDE047] text-white';
                  label = `😊${brick.hp}`;
                } else if (brick.color === 'pink') {
                  cellBg = 'bg-[#BE123C] border-[#FB7185] text-white';
                  label = String(brick.hp);
                } else if (brick.color === 'purple') {
                  cellBg = 'bg-[#6D28D9] border-[#C084FC] text-white';
                  label = String(brick.hp);
                } else if (brick.color === 'blue') {
                  cellBg = 'bg-[#0369A1] border-[#38BDF8] text-white';
                  label = String(brick.hp);
                } else {
                  cellBg = 'bg-[#047857] border-[#34D399] text-white';
                  label = String(brick.hp);
                }
              }

              return (
                <button
                  key={`${row}-${col}`}
                  onClick={() => handleCellClick(row, col)}
                  className={`h-9 sm:h-10 rounded-xl border font-display font-black text-xs flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${cellBg}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status or Quota Alert */}
        {editorStatusMsg && (
          <div className="mb-2 px-3 py-1 rounded-xl bg-[#3B0A28] border border-[#FF1668] text-[10px] sm:text-[11px] text-[#FFD1E6] flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#FF1668] shrink-0" />
            <span>{editorStatusMsg}</span>
          </div>
        )}

        {/* Action Buttons: Back to Profile, Free Test Before Publish, and Official Publish */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => onSwitchModal('user_profile')}
            className="min-h-[40px] px-3 rounded-xl border border-white/20 bg-[#1B1246] hover:bg-[#271A66] text-xs font-bold text-[#CBD5E1] cursor-pointer"
          >
            Mon QG Profil
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestDraftNow}
              className="min-h-[40px] px-3.5 rounded-xl bg-[#00F0FF] hover:brightness-110 text-[#07051A] font-display font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-[0_0_16px_rgba(0,240,255,0.4)]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Tester avant de Publier</span>
            </button>

            <button
              onClick={() => handlePublishOfficialLevel(false)}
              className="min-h-[40px] px-3.5 rounded-xl bg-gradient-to-r from-[#10E84A] to-[#059669] hover:brightness-110 text-[#07051A] font-display font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {playerLevel && !cooldownStatus.canEdit
                  ? `Publier (${cooldownStatus.daysRemaining}j)`
                  : 'Publier dans Rival'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
