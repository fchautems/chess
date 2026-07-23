# Mission d’ouverture V1 — Première tranche jouable

## Objectif produit

Faire passer rapidement le joueur de l’apprentissage guidé à une vraie séquence d’ouverture jouée contre un adversaire, sans intégrer Stockfish dès cette première version.

## Périmètre volontairement limité

La première mission concerne uniquement les Blancs dans la Partie italienne.

Nom provisoire : **Mettre le roi à l’abri**.

Le joueur part de la position initiale et doit atteindre une position saine après l’ouverture, en jouant une ligne complète contre un adversaire qui choisit une réponse parmi les branches italiennes déjà présentes dans le jeu.

## Boucle de jeu

1. Écran court de mission : objectif, trois principes et récompense.
2. Début depuis la position initiale.
3. L’adversaire choisit aléatoirement une branche connue, sans afficher son nom.
4. Le joueur joue ses coups sans indice stratégique automatique.
5. Un coup du répertoire poursuit la partie.
6. Une alternative déjà reconnue par le jeu est acceptée et signalée comme telle.
7. Un autre coup légal coûte une vie et la position reste à résoudre.
8. La mission se termine lorsque la ligne d’ouverture est achevée ou lorsque les trois vies sont perdues.

## Conditions de victoire

- terminer la ligne ;
- avoir roqué lorsque la branche le prévoit ;
- conserver au moins une vie.

## Résultat affiché

- mission réussie ou échouée ;
- coups réussis du premier essai ;
- alternatives reconnues ;
- vies restantes ;
- XP gagnés ;
- principe principal à retenir.

## Difficulté de cette première version

- adversaire scénarisé à partir des branches existantes ;
- aucune analyse Stockfish ;
- aucune partie complète jusqu’au mat ;
- durée cible : deux à quatre minutes.

## Évolution prévue

1. Mission V1 : ligne continue contre branches existantes.
2. Mission V2 : davantage de branches et profondeur accrue.
3. Coach Stockfish : classification des coups hors répertoire.
4. Adversaire Stockfish réglable : sorties de théorie et difficulté progressive.

## Critères d’acceptation

- la mission possède son propre bouton sur l’accueil ;
- elle ne modifie pas les modes d’entraînement actuels ;
- elle fonctionne sur mobile sans déplacement de l’échiquier ;
- elle peut être quittée et recommencée proprement ;
- sa progression est enregistrée dans le profil joueur ;
- une URL de prévisualisation séparée est disponible avant toute fusion dans `main`.
