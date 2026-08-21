# Chess Openings Trainer

Entraîneur progressif d’ouvertures d’échecs. La version actuelle est la
**v0.5 — Expérience & son**. Elle enseigne d’abord les six fondations de la
structure italienne calme, puis propose des runs de onze décisions qui vont
jusqu’à `Re1`, `Bb3` et la manœuvre `Nbd2–f1–g3`.

Le joueur continue tant qu’il reconnaît les positions. Il ne recommence plus
après chaque coup : chaque bloc est découvert sans interruption, puis reproduit
une seule fois sans aide automatique. Après le parcours initial, les réponses
`...Bc5` et `...Nf6` varient selon un Session Director déterministe qui favorise
les positions faibles, la consolidation et une part de surprise. Une seconde
bifurcation varie aussi l’ordre de `...O-O` et `...a6` avant de rejoindre la
même position.

Chaque run commence avec trois vies. Une erreur ne coûte qu’une vie sur une
position, puis le joueur peut récupérer sans être puni plusieurs fois au même
endroit. Les décisions propres construisent un combo et rapportent de l’or ;
les indices coûtent 5 pièces, ont une qualité variable et deviennent en moyenne
plus précis quand on en rachète sur la même position.

La v0.5 donne maintenant une conséquence visible aux erreurs : un coup légal
reste sur l’échiquier, puis les Noirs jouent une réfutation lorsqu’elle a été
explicitement écrite et vérifiée. Un coup simplement hors répertoire est
signalé sans inventer une fausse punition. Le joueur revient ensuite corriger
la position sans pouvoir y perdre plusieurs vies.

L’interface possède une direction visuelle « atelier » en vert forêt, noyer et
or patiné, une carte de progression, des animations sobres et une identité
sonore générée localement avec Web Audio. Le son est désactivable. Après avoir
atteint toute la profondeur, un défi maître autorisant au plus un indice peut
être lancé ; sa réussite débloque le thème d’échiquier Minuit.

La maîtrise et la prochaine révision sont enregistrées par position. La
progression, l’or, les records et la session en cours sont conservés
automatiquement dans le navigateur. Le plateau accepte le glisser-déposer et le
déplacement par deux clics, avec surlignage de la sélection, des destinations
et du dernier coup.

## Lancer l’application sous Windows

Double-cliquer simplement sur :

```text
Lancer Chess.bat
```

Le lanceur utilise Python, démarre un petit serveur uniquement sur la machine
locale et ouvre automatiquement l’application dans le navigateur. Node.js et
npm ne sont pas nécessaires pour jouer.

La fenêtre du lanceur doit rester ouverte pendant l’utilisation. La fermer
arrête le serveur local.

## Développement

Les sources React/TypeScript se trouvent directement à la racine :

```bash
npm install
npm run dev
```

Contrôles disponibles :

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Architecture :

- `src/domain/` : logique TypeScript pure, sans dépendance React ;
- `src/application/` : contrôleur et modèle de vue ;
- `src/data/` : curriculum statique ;
- `src/ui/` : interface React et adaptateur du plateau ;
- `dist/` : version compilée utilisée par le lanceur Windows.

L’ancienne V7/V7.1 est conservée intégralement sur la branche
[`legacy/v7-v7.1-before-reboot`](https://github.com/fchautems/chess/tree/legacy/v7-v7.1-before-reboot).

Références :

- [Spécification produit](docs/SPEC_REBOOT.md)
- [Plan d’implémentation](docs/IMPLEMENTATION_PLAN.md)
