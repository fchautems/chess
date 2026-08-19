# Chess

Adaptive, gamified chess-opening trainer.

## Current direction

The project is being rebooted from scratch around progressive opening-tree learning, adaptive branch selection, mastery tracking, lives, gold, variable-quality hints, sound and unlockable visual themes.

The first opening used to validate the new design will be the **Italian Game**. Development is desktop-browser first, with a portable core intended for a later mobile version.

➡️ **Product reference:** [Reboot specification](docs/SPEC_REBOOT.md)

The previous V7/V7.1 implementation remains in the repository as historical reference, but is no longer the architecture to extend.

## Reboot application

The clean React/TypeScript implementation lives in [`reboot/`](reboot/). The
legacy files at the repository root remain untouched as historical reference.

```bash
cd reboot
npm install
npm run dev
```
