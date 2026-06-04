# Feature: Authentication

**Status:** `done`

## Purpose

Gate the app behind a Supabase email OTP auth flow so that every check-in is tied to a real user identity. This is the prerequisite for cloud storage, cross-device sync, and the eventual Claude integration (which needs per-user history as context).

## User story

> As a new user, I want to sign in with my email so that my check-ins are saved to my account and available across devices.

## Auth method

**Email OTP** — Supabase sends a 6-digit code to the user's email. The user enters it in-app to verify. No password. Works in Expo Go. Apple/Google OAuth can be added later when moving to a development build.

---

## Flow

```
App launch
    │
    ├─ Active session found ──→ Home (normal app flow)
    │
    └─ No session ───────────→ Auth screen
                                    │
                                Step 1: Email entry
                                    │ submit
                                Supabase sends OTP
                                    │
                                Step 2: Code entry
                                    │ verify
                                Session created
                                    │
                                Home
```

**Sign out:** accessible from the drawer → clears session → Auth screen.

---

## UI / UX

Single screen, two steps. Step 2 replaces Step 1 in place (no screen transition) after the code is sent.

### Step 1 — Email

- App name / wordmark at the top (same serif treatment as the drawer title)
- A short line of context: *"Enter your email to get started."*
- Email text input (keyboard type: email, auto-capitalise: none)
- "Send code" button (primary teal)
- Loading state on button while Supabase request is in flight
- Error state below input for invalid email or Supabase errors

### Step 2 — OTP code

- Confirmation line: *"We sent a code to [email]."*
- 8-digit code input (numeric keyboard, single field)
- "Verify" button (primary teal)
- "Resend code" text link below (re-triggers Step 1 request, has a 30s cooldown)
- Loading state on button while verifying
- Error state for wrong/expired code
- "Use a different email" link → back to Step 1

### Auth screen background

Same warm off-white (`Colors.background`) as the rest of the app. No special splash treatment — keep it consistent.

---

## Session persistence

Supabase JS client stores the session token in AsyncStorage automatically (configured via the `storage` option on the client). On app launch, `supabase.auth.getSession()` returns the cached session if valid. No extra work needed.

---

## App.tsx changes

Replace the current static initial screen with a session-aware gate:

```ts
type AuthState = "loading" | "authenticated" | "unauthenticated";
```

- On mount: call `supabase.auth.getSession()` → set `authState`
- Subscribe to `supabase.auth.onAuthStateChange` → update `authState` reactively
- If `loading` → show a centered `ActivityIndicator`
- If `unauthenticated` → show `AuthScreen` (full screen, no drawer, no header)
- If `authenticated` → show the existing `AppScreen` state machine

The drawer gets a **Sign out** item at the bottom. On press: `supabase.auth.signOut()` — the `onAuthStateChange` listener handles the rest.

---

## Data

No schema changes in this spec. Check-ins continue to be stored in AsyncStorage for now. The Supabase migration spec (next) will move them to the database and attach a `user_id`. Existing local check-ins are not migrated — Supabase becomes the source of truth going forward.

---

## AuthContext

`src/lib/AuthContext.tsx` is a React Context that wraps the app and exposes the current user via a `useAuth()` hook. It subscribes to `supabase.auth.onAuthStateChange` so any component can access the user reactively without prop drilling.

```ts
const { user, signOut } = useAuth();
// user.id     → UUID, used as foreign key on every Supabase row
// user.email  → their email address
// signOut()   → calls supabase.auth.signOut(), context handles the rest
```

**Why a context and not just calling Supabase directly?**
Supabase normalises all auth providers (email OTP, Apple, Google) into the same `user` object — so the rest of the app never needs to know how someone signed in. If a new provider is added, only the auth screen changes. If the auth system is ever swapped entirely, only the `AuthContext` implementation changes — the `useAuth()` interface stays the same everywhere else.

`App.tsx` reads `authState` from the context to decide whether to show `AuthScreen` or the main app. All other components that need `user.id` (e.g. when saving a check-in to Supabase) call `useAuth()` directly.

---

## New files

| File | Purpose |
|---|---|
| `src/lib/supabase.ts` | Supabase client singleton |
| `src/lib/AuthContext.tsx` | React Context + `useAuth()` hook |
| `src/screens/AuthScreen.tsx` | Email + OTP UI |
| `.env` | `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| `.env.example` | Committed version with placeholder values |

---

## Supabase project setup (manual steps before implementation)

1. Create a project at [supabase.com](https://supabase.com)
2. In Auth settings: confirm "Enable email provider" is on
3. Set OTP expiry to something reasonable (e.g. 10 minutes)
4. Disable "Confirm email" (the OTP flow handles verification — a separate confirmation link would conflict)
5. Copy the Project URL and `anon` public key into `.env`

---

## Packages

```bash
npx expo install @supabase/supabase-js react-native-url-polyfill
```

`react-native-url-polyfill` is required because Supabase's JS client uses the browser `URL` API internally, which doesn't exist in React Native's JS runtime.

The polyfill must be imported at the very top of `index.ts`:
```ts
import 'react-native-url-polyfill/auto';
```

---

## Out of scope

- Apple / Google OAuth (requires dev build — future)
- Password reset / account deletion
- Email change
- Migrating existing AsyncStorage check-ins to Supabase (next spec)
- Row-level security policies (covered in Supabase migration spec)
