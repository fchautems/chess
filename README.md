# Chess Openings Trainer

Entraîneur progressif d’ouvertures d’échecs. La version actuelle est la
**v0.3 — Adaptive trainer**. Elle enseigne progressivement les six
premières décisions de la structure italienne calme : `e4`, `Nf3`, `Bc4`,
`d3`, `O-O` et `c3`.

Le joueur continue tant qu’il reconnaît les positions. Il ne recommence plus
après chaque coup : chaque bloc est découvert sans interruption, puis reproduit
une seule fois sans aide automatique. Après le parcours initial, les réponses
`...Bc5` et `...Nf6` varient selon un Session Director déterministe qui favorise
les positions faibles, la consolidation et une part de surprise.

La maîtrise et la prochaine révision sont enregistrées par position. Les
indices restent masqués jusqu’à une demande explicite. La progression et la
session en cours sont conservées automatiquement dans le navigateur. Le plateau
accepte le glisser-déposer et le déplacement par deux clics, avec surlignage de
la sélection, des destinations et du dernier coup.

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
