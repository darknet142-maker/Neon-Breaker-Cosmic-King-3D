# Plan d'Implémentation — QG Profil Utilisateur, Brouillon Auto-Sauvegardé, Budget Tactique & Système de Clashs

## 1. Sauvegarde Automatique Instantanée & Mode « Test Libre » avant Publication
- **Auto-Save Temps Réel (< 1s)** :
  - Dès que le joueur ouvre l'éditeur ou modifie la moindre brique, la vitesse de la balle, le titre ou un obstacle (même 2 secondes après l'ouverture), l'état complet du niveau en cours de création est **sauvegardé automatiquement en local (`neon_breaker_rival_draft_v1`)** avec un indicateur visuel discret (`Sauvegardé automatiquement à l'instant`).
  - Si le joueur quitte l'éditeur, teste son niveau ou rafraîchit la page, il retrouve intact son brouillon au bloc près.
- **Test Libre du Brouillon avant Publication (`playMode: 'draft_test'`)** :
  - Depuis l'éditeur ou son Profil, le joueur dispose d'un bouton **« Tester mon Niveau (Brouillon) »** qui lance immédiatement son niveau dans l'arène 3D.
  - Pendant le test du brouillon, un bandeau dédié en haut permet en 1 clic de **« Retourner à l'Éditeur »** pour ajuster les blocs ou de **« Publier Officiellement »** lorsque le joueur est satisfait, sans consommer son quota de modification de 30 jours tant qu'il n'a pas cliqué sur *Publier*.

---

## 2. Budget Global de PV & Nombre de Blocs Limité (Créativité & Rigueur)
- **Double Contrainte Anti-Spam de Blocs 50** :
  - **Nombre de blocs limité** : Maximum **16 blocs au total** sur la grille (et minimum 5 blocs destructibles), obligeant le créateur à choisir chaque emplacement avec précision.
  - **Budget Global de Points de Vie (`MAX_HP_BUDGET = 420 PV`)** : Chaque brique posée consomme son montant de PV dans la jauge de budget (`50 PV`, `40 PV`, `30 PV`, `20 PV`, `10 PV`, et un coût tactique équivalent de `45 PV` pour un bloc Titane).
  - **Effet direct** : Si un joueur tente de ne poser que des blocs de `50 PV`, il épuise son budget de `420 PV` au bout de **8 blocs seulement** ! Pour utiliser ses 16 emplacements et construire une défense ingénieuse, il doit combiner stratégiquement des blocs de `20`, `30`, `40`, `50`, Kawaii et Éclairs.
  - Une jauge visuelle de **Budget PV (`ex. 310 / 420 PV`)** et de **Capacité Blocs (`ex. 12 / 16 Blocs`)** guide le joueur en direct.

---

## 3. Barème de Score Resserré & Réaliste
- **Nouvelle Économie de Points Compétitive (500 à 3 000 pts par partie)** :
  - **Impact sur brique** : **+1 point par PV retiré** (multiplié par un multiplicateur plafonné de `x1` à `x4` max au lieu de `x10`).
  - **Destruction de brique** : **+25 points** pour une brique standard, **+45 points** pour une brique Kawaii, **+150 points** pour la Brique Rivale de Revanche.
  - **Étoile capturée** : **+35 points** (et progression douce du multiplicateur).
  - **Rebond sur obstacle** : **+10 points**.
  - **Rééquilibrage global** : Les scores du Niveau 7 (scène de départ à `640 pts`), des Rivaux sociaux et du **Hall of Fame** (scores compris entre `450 pts` et `2 850 pts`) sont alignés sur cette échelle réaliste où chaque centaine de points gagnée est une vraie performance.

---

## 4. Système de Clashs & Palmarès (« Vous avez battu le niveau de X »)
- **Journal de Victoires & Clashs Communautaires** :
  - Lorsqu'un joueur termine victorieusement le niveau créé par un autre joueur en Mode Rival, le moteur enregistre automatiquement un **Trophée de Clash** horodaté :
    - Exemple : *« 🏆 Vous avez battu @CyberLeo sur "Piège du Vortex Noir" (Complexité 68/100) — Score : 1 180 pts »*.
  - Sur chaque carte de niveau du Mode Rival, un badge **« ✔ BATTU »** (avec votre meilleur score sur ce niveau) s'affiche sur les créateurs que vous avez déjà vaincus.
  - Un fil d'activité de Clashs dans le Profil et le Hall of Fame met en avant les duels entre créateurs et conquérants.

---

## 5. Nouveau « QG Profil Utilisateur » (Centre de Commandement Complet)
- Remplacement du simple encart par un véritable **Quartier Général (Mon Profil)** accessible dès le HUD et les menus, organisé en **3 espaces fluides sans barre de défilement** :
  1. **Identité & Vue d'Ensemble (Chez Soi)** :
     - Édition instantanée de votre **Pseudo** (`@VotreNom`), choix de votre **Avatar / Emblème Cosmique** et de votre **Titre de Joueur**, accompagnés de vos compteurs clés (Record Classic, Record Rival, Série de victoires, Nombre de créateurs battus).
  2. **Mon Atelier & Niveau Rival (Orchestration)** :
     - État de votre niveau publié (ou de votre brouillon auto-sauvegardé), jauge de complexité `0–100`, statistiques de votre arène (tentatives des autres joueurs, taux de résistance), boutons directs pour **Tester le Brouillon**, **Ouvrir le Studio Créateur**, **Publier / Mettre à jour** (avec compteur de la règle des 30 jours), **Masquer / Rendre Public** et **Supprimer**.
  3. **Mon Palmarès & Tableau de Chasse (Clashs)** :
     - Liste de tous les utilisateurs dont vous avez vaincu le niveau (*« A battu @LunaPop », « A battu @AstroMax », « A battu @CyberLeo »*), avec la complexité du niveau tombé et le score réalisé.
