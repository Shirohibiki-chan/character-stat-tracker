# Zustand Stores Reference

Stores live in `src/state/`. CharSnap uses isolated stores to minimize re-renders — each store owns a tightly-scoped slice of state, and components/hooks subscribe via selector syntax.

| Store | Owns |
|-------|------|
| `bot-store.js` | `bots` (all bot records keyed by ID), `initialized` (whether the store has loaded from IndexedDB) |

> Always use selector syntax: `const foo = useStore((s) => s.foo)` rather than destructuring the whole store, to keep re-renders scoped.
