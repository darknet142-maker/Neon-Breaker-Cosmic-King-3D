# Neon Breaker: Cosmic King 3D — Garantie Permanente de Balle & Voyageurs Cosmiques Exclusifs (OVNI, Soucoupe, Fusée, Étoile Filante)

Cette mise à jour garantit qu'un joueur ne puisse jamais se retrouver en partie sans balle, et introduit en arrière-plan des apparitions aléatoires variées (soucoupe volante, fusée spatiale, étoile filante, OVNI, sonde orbitale, comète) régies par un verrou d'exclusion mutuelle strict afin qu'aucun de ces éléments ne se superpose ni n'apparaisse en même temps qu'un autre.

### Revue Utilisateur & Décisions Clés

> [!IMPORTANT]
> Voici les deux systèmes prêts à être déployés dès votre validation :

- **Garde-fou absolu « Zéro Partie Sans Balle »** :
  - Vérification automatique à chaque reprise de partie (sortie du menu Pause, Studio, Profil, Niveaux) et à chaque image (`tick`) : si l'état est `playing` et qu'aucune balle n'est active sur le terrain, une balle est **immédiatement replacée sur la raquette** prête au coup d'envoi manuel.
  - Si le joueur revient au jeu alors que le niveau précédent était terminé (`0` brique restante ou `0` vie), le niveau est automatiquement réinitialisé proprement avec ses 3 vies et sa balle sur la raquette.
  - Protection anti-sortie de cadre (`NaN` ou rebond hors plafond) pour empêcher toute disparition physique d'une balle.
- **Voyageurs Cosmiques Aléatoires en Exclusion Mutuelle Stricte (1 seul à la fois)** :
  - Remplacement du pool d'étoiles filantes par un **Orchestrateur de Voyageur Cosmique à Slot Unique** (`activeTraveler`).
  - Tant qu'un élément traverse l'arrière-plan, **aucun autre ne peut apparaître**. Ce n'est qu'une fois sa traversée totalement terminée qu'un délai aléatoire (`11 à 22 secondes`) prépare le prochain passage choisi au hasard parmi **6 modèles 3D** :
    1. **Soucoupe Volante (`Soucoupe Classique`)** : Disque métallique rotatif avec dôme de verre cyan et hublots lumineux.
    2. **Fusée Spatiale (`Fusée Cosmique`)** : Fusée rétro-futuriste à ailettes avec petite flamme de tuyère traversant le cosmos.
    3. **Étoile Filante (`Étoile Filante`)** : Fine strie céleste lointaine et discrète.
    4. **OVNI Extraterrestre (`Éclaireur OVNI`)** : Vaisseau alien géométrique à anneau antigravité violet/émeraude qui oscille doucement.
    5. **Sonde / Satellite (`Sonde Orbitale`)** : Petit satellite à panneaux solaires dérivant lentement dans le vide.
    6. **Comète de Glace (`Comète Cristalline`)** : Petit astre glacé au sillage bleuté translucide.

---

### 1. Architecture Technique & Flux de Contrôle

```
┌──────────────────────────────────────────────────────────────────────────┐
│                 1. GARDE-FOU « ZÉRO PARTIE SANS BALLE »                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Transition vers 'playing' (ou vérification 60 FPS en cours de jeu)      │
│     ├── Niveau déjà terminé / 0 vie ? ──► Recharge proprement le niveau  │
│     ├── 0 balle active détectée ?     ──► Pose immédiatement 1 balle     │
│     │                                     sur la raquette (visée laser)  │
│     └── Balle hors limites / NaN ?    ──► Recalage instantané dans l'arène│
├──────────────────────────────────────────────────────────────────────────┤
│          2. ORCHESTRATEUR DE VOYAGEUR COSMIQUE (SLOT UNIQUE)             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Verrou d'Exclusion Mutuelle : activeTraveler !== null ?                 │
│     ├── OUI (1 objet visible à l'écran)                                  │
│     │    └── Anime uniquement cet objet jusqu'à sa sortie complète       │
│     │        (0 superposition, 0 apparition simultanée possible)         │
│     └── NON (écran libre)                                                │
│          └── Décompte aléatoire (11s - 22s) ──► Tirage aléatoire 1/6 :   │
│               [Soucoupe Volante | Fusée | Étoile Filante |               │
│                OVNI Alien | Sonde Satellite | Comète de Glace]           │
└──────────────────────────────────────────────────────────────────────────┘
```
