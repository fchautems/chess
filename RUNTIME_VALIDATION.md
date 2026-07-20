# Validation fonctionnelle V7.1 séparée

Date : 2026-07-21

Environnement de test : Chromium headless, viewport mobile 412 × 915, fichiers servis localement par HTTP depuis `v71-preview/`.

## Contrôles réussis

- Chargement de l’accueil sans erreur fatale.
- Feuille de style externe appliquée : profil en grille, carte de configuration et bouton principal dimensionnés correctement.
- Aucun débordement horizontal sur l’accueil et l’écran d’entraînement.
- Sélection Blancs / Noirs fonctionnelle et listes d’ouvertures peuplées.
- Modale « Comprendre l’ouverture » fonctionnelle depuis l’accueil et l’entraînement.
- Échiquier carré, 64 cases et 32 pièces dans la position initiale.
- Exécution de `e4`, réponse automatique `e5` et historique mis à jour.
- Indice fonctionnel avec marquage des cases.
- Ligne complète du Giuoco Piano jouée jusqu’au résultat de session.
- XP et profil enregistrés dans `localStorage`.
- Niveau 2 : rotation constatée entre plusieurs branches sur trois démarrages successifs.
- Niveau 3 : démarrage du défi de positions mélangées.
- Boss : démarrage avec trois vies, indices désactivés, puis passage de trois à deux vies après un coup légal hors répertoire.
- Aucune erreur JavaScript de page ni erreur de console pendant le scénario.

## Limite du contrôle

Il s’agit d’un test automatisé dans Chromium avec les dimensions d’un téléphone. Le contrôle visuel final sur le Pixel réel sera effectué sur une URL de prévisualisation avant toute modification de `main`.

La branche `main` n’a pas été modifiée.
