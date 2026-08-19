# Chess Openings Trainer

Entraîneur progressif d’ouvertures d’échecs. La version actuelle est la
**v0.2 — Teaching vertical slice**. Elle enseigne progressivement les six
premières décisions de la structure italienne calme : `e4`, `Nf3`, `Bc4`,
`d3`, `O-O` et `c3`.

Chaque concept est d’abord découvert, puis doit être reproduit depuis la
position initiale. La progression est conservée automatiquement dans le
navigateur. Le plateau accepte le glisser-déposer et le déplacement par deux
clics, avec surlignage de la sélection, des destinations et du dernier coup.

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
