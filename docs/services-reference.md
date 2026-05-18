# Services Reference

Plain JS modules in `src/services/`. Architecture rule (per `CLAUDE.md`): no React imports allowed in any service file. Components never import services directly — always through a hook in `src/hooks/`.

| File | Responsibility |
|------|----------------|
| `storage-service.js` | **Only** file that reads and writes IndexedDB — exposes `loadBots()` and `saveBots()` for the Zustand store. |
| `autosave.js` | Debounces writes to IndexedDB (400 ms); timer lives in module scope so it survives React re-renders. |
| `avatar.js` | Normalizes a CharSnap avatar URL to a stable filename key used for bot-matching during import. |
| `parser.js` | Parses pasted input — detects CharSnap copy-button text vs. batch JSON and returns a normalized captures array. |
| `backup-service.js` | Triggers a dated JSON file download for data export; reads and validates an imported backup file. |
