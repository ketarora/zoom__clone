# ZoomConnect — Frontend

A full-featured video meeting web application built with Next.js 15 and React 19. The UI closely mirrors Zoom Workplace complete with a dashboard, meeting scheduler, live meeting room with media controls, waiting room flow, participant management, and real-time chat.

**Live →** [zoom-clone-roan-delta.vercel.app](https://zoom-clone-roan-delta.vercel.app)  
**Backend API →** [zoom-clone-backend-2.onrender.com](https://zoom-clone-backend-2.onrender.com)
**Backend Repo →** [zoom-clone-backend](https://github.com/ketarora/ZOOM_clone_backend/tree/main)
---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 |
| Styling | Tailwind CSS v4 |
| Data fetching | TanStack Query v5 |
| Icons | Lucide React |
| Date handling | date-fns |
| Language | TypeScript 5 |
| Deployment | Vercel |

---

## Features

- **Dashboard** — meeting stats, upcoming/recent lists, quick-action tiles
- **Instant meetings** — one click to start, lands directly in the room
- **Scheduler** — date, time, duration, passcode, waiting-room toggle
- **Meeting room** — camera/mic toggle, screen share, reactions, raise hand, side panels for participants/chat/security
- **Join flow** — camera/mic preview before joining, waiting room with admission polling
- **Launch page** — pre-meeting info, invite copy, participant list, start/end controls
- **Profile & Settings** — personal info, plan details, 20+ toggle-based meeting settings

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Dashboard / home
│   ├── join/page.tsx         # Join flow (form → preview → waiting room)
│   ├── schedule/page.tsx     # Schedule a meeting
│   ├── meetings/page.tsx     # Meeting list with filters
│   ├── launch/[meetingId]/   # Pre-meeting launch screen
│   ├── room/[meetingId]/     # Live meeting room
│   ├── profile/page.tsx
│   └── settings/page.tsx
├── components/
│   └── layout/
│       ├── AppLayout.tsx
│       ├── TopNav.tsx
│       └── Sidebar.tsx
└── lib/
    ├── api.ts                # Type-safe API client
    ├── hooks.ts              # React Query hooks
    └── utils.ts              # Helpers (formatMeetingId, avatarColor, etc.)
```

---

## Getting Started

```bash
git clone https://github.com/ketarora/zoom__clone.git
cd zoom__clone

npm install

# Point at the API
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
# http://localhost:3000
```

The `next.config.ts` rewrites `/api/*` to the backend, so no CORS issues in development.

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the FastAPI backend (no trailing slash) |

---

## Scripts

```bash
npm run dev        # Development server (port 3000)
npm run build      # Production build
npm run start      # Production server
npm run typecheck  # tsc --noEmit
npm run lint       # Next.js ESLint
```

---

## API Contract

All requests go through `/api/*` (rewritten to the backend). The client in `src/lib/api.ts` covers:

- `GET/POST /meetings` — list and create
- `GET/PATCH/DELETE /meetings/:id` — single meeting CRUD
- `POST /meetings/join/:id` — join with display name
- `POST /meetings/:id/end` — end for all
- `GET /meetings/:id/participants` — participant list
- `GET /dashboard/summary` — aggregated stats

Response shapes match the TypeScript interfaces in `api.ts` directly — no transformation layer needed.

---

## Deployment

Deployed on Vercel. Set `NEXT_PUBLIC_API_URL` to the Render backend URL in the Vercel environment variables dashboard.

```
NEXT_PUBLIC_API_URL=https://zoom-clone-backend-2.onrender.com
```

---

## License

MIT
