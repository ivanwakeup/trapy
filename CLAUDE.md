@AGENTS.md

# trapy

An iOS journaling app for anxious attachment — helps users recognize triggers, build ambiguity tolerance, and observe patterns over time.

## Stack

- **Expo SDK 54** with React Native 0.81.5 and React 19
- **TypeScript** throughout
- **AsyncStorage** for local persistence
- **Supabase** for auth (email OTP); database migration is next
- Entry point: `index.ts` → `App.tsx`

## Project structure

```
App.tsx                          # Root: state machine nav, drawer, font loading
index.ts                         # Registers root component
src/
  types.ts                       # Shared types: CheckInEntry, Reflection
  theme.ts                       # Colors, Fonts, Shadow — single source of truth
  data/
    tags.ts                      # Tag lists (triggers, thoughts, urges) + activation labels
    reframes.ts                  # selectReframe(entry) — rule-based reframe logic
  lib/
    supabase.ts                  # Supabase client singleton
    AuthContext.tsx              # React Context + useAuth() hook
  components/
    TagSelector.tsx              # Reusable multi-select pill component
  screens/
    AuthScreen.tsx               # Email + 8-digit OTP sign-in UI
    HomeScreen.tsx               # Landing screen: activation slider, routes by level
    ChoiceScreen.tsx             # 5–7 path: curiosity-based routing question
    ReflectScreen.tsx            # Tag-based reflection (triggers, thoughts, urges)
    ReframeScreen.tsx            # "Consider another possibility" — 5–7 path only
    CalmDownScreen.tsx           # Box breathing + 5-4-3-2-1 grounding
    AnalyticsScreen.tsx          # Aggregate patterns across saved check-ins
features/
  _template.md                   # Spec template for new features
  navigation-restructure.md      # Spec: full app flow and routing logic
  analytics.md                   # Spec: analytics screen
```

## Navigation — activation-based routing

Navigation is a state machine in `App.tsx` with no external library. The `AppScreen` union type drives what renders.

```ts
type AppScreen =
  | { screen: "home" }
  | { screen: "analytics" }
  | { screen: "choice"; activationLevel: number }
  | { screen: "reflect"; activationLevel: number; showReframeAfter: boolean }
  | { screen: "reframe"; entry: CheckInEntry }
  | { screen: "calmdown" };
```

**Routing from Home:**
| Activation | Route |
|---|---|
| 1–4 | Reflect (no reframe after) |
| 5–7 | Choice screen |
| 8–10 | Calm Down |

**5–7 Choice paths:**
- "Yes, let's look at it" → Reflect (`showReframeAfter: true`) → Reframe → Home
- "I need to settle first" → Calm Down → Home

The header renders only for `home`, `analytics`, and `reflect`. Immersive screens (choice, reframe, calmdown) hide it.

## Data model

Defined in `src/types.ts`. Stored in AsyncStorage under the key `"checkins"` as a JSON array, newest first.

```ts
interface Reflection {
  openToReframe: boolean;
  reframeOffered?: string;
}

interface CheckInEntry {
  id: string;               // Date.now().toString()
  timestamp: string;        // ISO string
  activationLevel: number;  // 1–10 (carried from Home into Reflect)
  triggers: string[];
  thoughts: string[];
  urges: string[];
  reflection?: Reflection;  // written by ReframeScreen on Done
}
```

## Reframe logic

`selectReframe(entry)` in `src/data/reframes.ts` is a pure function — designed to be swapped for an async AI/Claude call later without touching the UI.

Priority: thought tags (in order defined in `tags.ts`) → fallback by activation band (low/mid/high). At activation 8–10 a validation prefix is prepended.

## Key decisions & gotchas

**No babel.config.js** — Do not add one. Expo SDK 54 manages its own Babel pipeline. Adding one (especially with a mismatched `babel-preset-expo` version) causes a Hermes `SyntaxError: private properties are not supported` at runtime.

**No Reanimated, no gesture handler, no React Navigation** — All removed due to `private properties are not supported` errors in Expo Go. Navigation is a plain React state machine; the drawer uses `Animated` from core React Native.

**Use `expo install` for native packages** — Always `npx expo install <package>`, not `npm install`. Ensures correct SDK-compatible version. Example: `@react-native-async-storage/async-storage` must be `2.2.0`, not `3.x`.

**Supabase OTP is 8 digits** — Supabase now sends 8-digit codes, not 6. The input, validation guard, and email template must all use 8. Editing Supabase email templates requires custom SMTP — use Resend (free tier, smtp.resend.com port 587, username `resend`, password is your Resend API key).

**Analytics screen refresh** — `AnalyticsScreen` is always passed `focused={true}` since it only mounts when active. The `focused` prop triggers a `useEffect` reload from AsyncStorage.

## Adding features

New features are specced in `features/` before implementation. Use `features/_template.md`. Each spec covers purpose, user story, UI/UX, data model changes, implementation notes, and out-of-scope decisions. Mark status `planned` → `in-progress` → `done`.

Active specs:
- `features/auth.md` — email OTP auth via Supabase (done)
- `features/navigation-restructure.md` — activation-based routing (done)
- `features/analytics.md` — analytics screen (done)
- `features/archived/` — superseded specs

## Running the app

```bash
npx expo start          # Start dev server
npx expo start --clear  # Clear Metro cache (use after dependency changes)
```

Open in Expo Go on device by scanning the QR code. Expo Go version 1017756 (SDK 54) confirmed working.
