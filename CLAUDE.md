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
App.tsx                        # Root: custom drawer nav + screen switcher
index.ts                       # Registers root component
src/
  data/tags.ts                 # All tag lists (triggers, thoughts, urges) + activation labels
  components/TagSelector.tsx   # Reusable multi-select pill component
  screens/CheckInScreen.tsx    # Main check-in flow (single scrollable screen)
  screens/AnalyticsScreen.tsx  # Aggregate view of saved check-ins
```

## Navigation

Uses a **custom drawer** built with React Native's `Animated` API — no React Navigation, no Reanimated. The hamburger menu in the header slides in a drawer from the left. Screen state is managed in `App.tsx`.

## Data model

Check-in entries are stored in AsyncStorage under the key `"checkins"` as a JSON array:

```ts
interface CheckInEntry {
  id: string;          // Date.now().toString()
  timestamp: string;   // ISO string
  activationLevel: number;   // 1–10
  triggers: string[];
  thoughts: string[];
  urges: string[];
}
```

Newest entries are prepended (index 0 = most recent).

## Key decisions & gotchas

**No babel.config.js** — Do not add one. Expo SDK 54 manages its own Babel pipeline. Adding a `babel.config.js` (especially with a mismatched `babel-preset-expo` version) breaks private class field transforms and causes a Hermes `SyntaxError` at runtime.

**No Reanimated, no gesture handler** — Both were removed because they caused `private properties are not supported` errors in Expo Go. The custom drawer uses `Animated` from core React Native instead.

**Use `expo install` for native packages** — Always use `npx expo install <package>` (not `npm install`) for packages with native modules. This ensures the correct SDK-compatible version is resolved. Example: `@react-native-async-storage/async-storage` must be `2.2.0`, not `3.x`.

**Analytics screen refresh** — `AnalyticsScreen` accepts a `focused: boolean` prop and uses `useEffect` to reload data when the screen comes into focus. This replaces `useFocusEffect` from React Navigation.

## Running the app

```bash
npx expo start          # Start dev server
npx expo start --clear  # Clear Metro cache (use after dependency changes)
```

Open in Expo Go on device by scanning the QR code. Expo Go version 1017756 (SDK 54) is confirmed working.
