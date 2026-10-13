# Clearspace Photos — PRD

## Original problem statement
> Expand my gamified photo organising / storage saving app with multi features,
> slick UI and improve the swiping experience on saving and deleting photos.
> Please make it work seamlessly with the users device, asking for permission
> to view all photos etc. Project on GitHub: j4miee/Clearspace-Photos.

User choices (2026-10-13):
- Existing codebase (Expo at `/app/artifacts/clearspace-photos`) kept intact.
- Mobile-first web PWA with device photo access.
- Gamification focus: storage-saved tracker + achievements.
- Swipes: right = keep, left = delete, up = favourite, haptic + undo.
- Visual style: Clean minimal (iOS-feel) — warm cream / coral / honey palette.

## Architecture
- Frontend: React 18 + CRA (craco) + Tailwind + Framer Motion + lucide-react.
  Entrypoint `/app/frontend/src/App.js`. Mobile frame max-w 440 px, centered.
- Backend: FastAPI at `/app/backend/server.py` with Mongo for optional
  progress sync (`/api/ping`, `/api/progress` POST + GET). Photos never leave
  the browser; backend only receives aggregate counters.
- Local persistence: `localStorage` key `clearspace::state::v1` for streak,
  XP, achievements, favorites, pending removals.
- Device photo access: `<input type=file multiple accept="image/*">` opens the
  native OS photo picker on mobile; File System Access API fallback on
  Chromium desktop; sample Unsplash set available for demos.

## Users
- Phone-first users with cluttered camera rolls looking for a mindful,
  on-device cleanup tool with light gamification.

## Core requirements (static)
- Nothing leaves the device.
- Deletion always needs explicit confirmation.
- Swipeable review UX with keep/delete/favourite + undo.
- Burst / similar-moments grouping based on time + aspect ratio.
- Storage-saved tracker with level/XP and achievement unlocks.

## Implemented (2026-10-13)
- Home: brand mark, Level/XP card, streak, stat tiles, queue alert, trophy
  shortcut, settings. Fluid Spectral/Manrope type pairing.
- Review: on-boarding "Allow photo access" with 3 paths (OS picker, system
  picker, sample demo), burst grouping, 3-card deep stack with drag + rotate +
  stamps (KEEP / REMOVE / ★ LOVE), fallback buttons, undo, "add more photos".
- Delete drawer: queue grid, individual unqueue, Reclaim-X-MB confirm with
  haptic + spinner.
- Achievements: 13 trophies across bronze/silver/gold tiers (space saved,
  photos cleared, streaks, favourites, burst busters) with live progress bars
  and toast on unlock.
- Settings: privacy hero, progress summary, "how picks work", reset action.
- Backend: /api/ping, /api/progress POST + GET.
- Tests: iteration_1.json — all 12 scenarios passed (3 backend + 9 frontend).

## Backlog (P1/P2)
- P1: Daily reminder / notification cadence (service-worker push).
- P1: Dark-mode toggle (dark tokens for the warm palette).
- P1: Share card ("I reclaimed 1.2 GB with Clearspace").
- P2: Weekly recap screen with sparkline of MB freed per day.
- P2: Sync between Expo native app and web (device_id already supported).
- P2: Family / household leaderboard (opt-in).
