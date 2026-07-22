# Migration V7.1 modulaire

Cette branche repart du véritable prototype V7.1 et le découpe sans modifier volontairement son comportement.

## Structure cible

- `index.html` : structure de la page
- `css/` : styles de base et styles de campagne
- `js/data/openings.js` : répertoire, variantes et niveaux
- `js/assets/` : pièces et sons intégrés, isolés du moteur
- `js/app/core.js` : échiquier et déroulement de base
- `js/app/progression.js` : profil, XP, maîtrise et répétition
- `js/app/v7.js` : quiz de positions, boss, concepts et nuances de coups

Les clés `localStorage` de la V7.1 sont conservées. La branche ne doit remplacer `main` qu’après validation sur mobile.