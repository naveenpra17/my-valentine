# Session State

## localStorage

| Key | Service | Purpose |
|-----|---------|---------|
| `romantic_universe_entered` | `SessionService` | Visitor has passed opening (long-lived preference) |
| Entry lock answer | `SessionService` | Optional password gate |

Use for preferences that should survive browser restarts.

## sessionStorage

| Key | Service | Purpose |
|-----|---------|---------|
| `ru_experience_v3` | `ExperienceStateService` | Discoveries, heart pool, constellation stars, chapter |
| `ru_controller_v1` | `ExperienceControllerService` | Visited/unlocked chapters, constellation revealed |
| `love_bombs_count` | `LoveBombComponent` | Catch game score for session |

Use for the current journey — cleared when the tab session ends.

## Why split?

- **Discoveries** belong to one visit's emotional arc (`sessionStorage`).
- **"She already entered"** can persist so refresh doesn't replay the void (`localStorage`).

Clear everything for a fresh run:

```js
sessionStorage.clear();
localStorage.removeItem('romantic_universe_entered');
location.reload();
```
