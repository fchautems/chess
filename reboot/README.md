# Chess Openings Trainer — reboot

Clean React/TypeScript implementation of the adaptive opening trainer. Version
0.1 deliberately contains only the legal Italian trunk `e4 → Nf3 → Bc4`, with
scripted replies `…e5` and `…Nc6`.

## Commands

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
```

## Architecture

- `src/domain/`: pure TypeScript chess and opening model; no React dependency.
- `src/application/`: pure controller exposing a UI-friendly view model.
- `src/data/`: static, player-independent opening curriculum.
- `src/ui/`: replaceable React presentation and board renderer.

The historical V7/V7.1 implementation remains outside this directory and is not
used by the reboot.
