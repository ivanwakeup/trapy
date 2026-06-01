@AGENTS.md

# trapy

An iOS journaling app for anxious attachment — helps users recognize triggers, build ambiguity tolerance, and observe patterns over time.

## Stack

- **Expo SDK 54** with React Native 0.81.5 and React 19
- **TypeScript** throughout
- **AsyncStorage** for local persistence (no backend)
- Entry point: `index.ts` → `App.tsx`

## Project structure

```
App.tsx                          # Root: drawer nav, screen switcher, reflection flow
index.ts                         # Registers root component
src/
  types.ts                       # Shared types: CheckInEntry, Reflection
  data/
    tags.ts                      # Tag lists (triggers, thoughts, urges) + activation labels
    reframes.ts                  # selectReframe(entry) — rule-based reframe logic
  components/
    TagSelector.tsx               # Reusable multi-select pill component
  screens/
    CheckInScreen.tsx            # Scrollable check-in form; calls onSaved(entry) on save
    ReflectionScreen.tsx         # Post-check-in reflection (openness → reframe or grounding)
    AnalyticsScreen.tsx          # Aggregate patterns across saved check-ins
features/
  _template.md                   # Spec template for new features
  check-in.md                    # Spec: check-in screen
  analytics.md                   # Spec: analytics screen
  reflection.md                  # Spec: reflection screen
```

## Navigation

Uses a **custom drawer** built with React Native's `Animated` API — no React Navigation, no Reanimated. Screen state (`activeScreen`) is managed in `App.tsx`. The header hides during the reflection flow so the screen feels focused.

**Check-in → reflection flow:**
1. User fills out and saves a check-in in `CheckInScreen`
2. `onSaved(entry)` is called, setting `pendingReflection` in `App.tsx`
3. `ReflectionScreen` renders in place of the normal screen with the entry as a prop
4. On Done, `pendingReflection` is cleared and the user returns to the check-in screen

## Data model

Defined in `src/types.ts`. Stored in AsyncStorage under the key `"checkins"` as a JSON array, newest first.

```ts
interface Reflection {
  openToReframe: boolean;
  reframeOffered?: string;  // prompt text shown, if openToReframe is true
}

interface CheckInEntry {
  id: string;               // Date.now().toString()
  timestamp: string;        // ISO string
  activationLevel: number;  // 1–10
  triggers: string[];
  thoughts: string[];
  urges: string[];
  reflection?: Reflection;  // written by ReflectionScreen on Done
}
```

## Reframe logic

`selectReframe(entry: CheckInEntry): string` in `src/data/reframes.ts` is a pure function — no side effects, easy to swap for an async AI/Claude call later without touching the UI.

Priority order:
1. Thought tags → matched against `THOUGHT_REFRAMES` map, in the order thoughts appear in `src/data/tags.ts`
2. Fallback by activation band (1–4 low, 5–7 mid, 8–10 high)

At activation 8–10, a validation prefix is prepended to the reframe text.

## Key decisions & gotchas

**No babel.config.js** — Do not add one. Expo SDK 54 manages its own Babel pipeline. Adding a `babel.config.js` (especially with a mismatched `babel-preset-expo` version) breaks private class field transforms and causes a Hermes `SyntaxError` at runtime.

**No Reanimated, no gesture handler** — Both were removed because they caused `private properties are not supported` errors in Expo Go. The custom drawer uses `Animated` from core React Native instead.

**Use `expo install` for native packages** — Always use `npx expo install <package>` (not `npm install`) for packages with native modules. This ensures the correct SDK-compatible version is resolved. Example: `@react-native-async-storage/async-storage` must be `2.2.0`, not `3.x`.

**Analytics screen refresh** — `AnalyticsScreen` accepts a `focused: boolean` prop and uses `useEffect` to reload data when the screen comes into focus. This replaces `useFocusEffect` from React Navigation (which is not installed).

## Adding features

New features are specced in `features/` as markdown files before implementation. Use `features/_template.md` as the starting point. Each file covers purpose, user story, UI/UX, data model changes, implementation notes, and out-of-scope decisions. Mark status as `planned` → `in-progress` → `done`.

Existing specs:
- `features/check-in.md` — the check-in flow
- `features/analytics.md` — the analytics screen
- `features/reflection.md` — the post-check-in reflection screen

## Running the app

```bash
npx expo start          # Start dev server
npx expo start --clear  # Clear Metro cache (use after dependency changes)
```

Open in Expo Go on device by scanning the QR code. Expo Go version 1017756 (SDK 54) is confirmed working.
