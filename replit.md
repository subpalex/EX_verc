# UrbanEye AI — Smart Cleanliness Monitoring

## Overview
UrbanEye AI (formerly MarketSense) is an AI-powered cleanliness monitoring PWA for smarter cities. Market vendors capture photos of their stalls, an in-browser computer-vision model analyzes waste levels and auto-fills a report, and municipal officers review/grade submissions. A weekly ranking system rewards the cleanest vendors.

## Branding
- **Name**: UrbanEye AI
- **Tagline**: "AI-powered cleanliness monitoring for smarter cities"
- **Theme**: Dark futuristic — bg `#0B0F1A`, primary neon blue `#00D4FF`, secondary purple `#7B61FF`
- **Font**: Inter (Google Fonts)
- **Logo**: `src/components/Logo.tsx` — Eye + AI circuit icon in gradient rounded square + gradient wordmark
- **Visual language**: Glassmorphism cards, neon glow shadows, rounded-2xl, subtle grid backgrounds

## Architecture
- **Frontend**: Vite + React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend/Auth/Storage**: Supabase (existing project: `gbqoewouvejuapmgrlhd`)
- **PWA**: Configured via vite-plugin-pwa for offline support and installability
- **Animations**: Framer Motion throughout
- **Language**: Multi-language support via LanguageContext

## Running the App
```bash
npm run dev   # Starts Vite on port 5000
npm run build # Builds for production
```

## User Roles
- **Vendor**: Market vendors who submit cleanliness photos of their stalls
- **Officer**: Municipal officers who review and grade photo submissions
- **Admin**: Full access (same as officer)

## Demo Mode (currently ON)
- Toggle: `DEMO_MODE` constant in `src/lib/demoMode.ts` (set to `true`)
- When ON: `/auth` auto-redirects to `/dashboard`; `Dashboard` renders `DemoDashboard.tsx` instead of fetching from Supabase; a floating "Demo Mode · Auth Disabled" badge (`src/components/DemoBadge.tsx`) appears bottom-left.
- Mock user: `{ name: "Demo User", role: "Citizen" }` from `DEMO_USER` in `src/lib/demoMode.ts`
- The real Auth + Vendor/Officer dashboards are preserved unchanged behind the flag — flip `DEMO_MODE` to `false` to restore the full Supabase-backed flow.
- AI image analysis (TF.js + MobileNet) keeps working in demo mode since it runs entirely in the browser with no backend.

## Key Features
- Photo upload with offline queue (IndexedDB + retry logic)
- Weekly vendor rankings based on cleanliness points
- Officer photo review dashboard with area filtering
- PWA installable on mobile devices
- Multi-language support

## Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key (public)
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID

## Database (Supabase)
Tables: `profiles`, `market_photos`, `weekly_rankings`, `user_roles`, `upload_logs`
Storage bucket: `market-photos`
Key functions: `get_vendor_rankings`, `update_weekly_rankings`

## Project Structure
```
src/
  pages/        - Index, Auth, Dashboard, Install, NotFound
  components/
    dashboard/  - VendorDashboard, OfficerDashboard, UploadStatusBar
    ui/         - shadcn/ui components
    animations/ - Framer Motion wrappers
  hooks/        - useUploadQueue, use-toast, use-mobile
  contexts/     - LanguageContext
  integrations/
    supabase/   - client.ts, types.ts
  lib/          - uploadStorage (IndexedDB utilities)
```
