# Feature: React Navigation Refactor

**Status:** `planned`

## Purpose

Replace the custom state-machine navigation in `App.tsx` with React Navigation's native stack, giving users real iOS push/pop transitions and swipe-back gestures through the check-in flow. The app currently swaps screens instantly with no animation, which feels abrupt on mobile.

## User story

> As someone moving through a check-in, I want the screens to animate naturally so the app feels like a real iOS app rather than a webpage.

## UI / UX

No visual changes to individual screens. What changes:

- Navigating into Reflect, Choice, Reframe, CalmDown, or JournalEditor gets a native right-to-left push transition
- Swipe-back gesture works on any screen that was pushed
- Returning to Home or JournalList slides back left (pop)
- Drawer-accessible screens (Home, Analytics, Journal, AI) remain instant-swap — no push transition needed there
- Custom drawer stays as-is (visual + behavior unchanged)

## Data

No data model changes.

## Implementation notes

**Packages to add:**
```bash
npx expo install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context
```

**Architecture: one root Native Stack**

Use a single `NativeStack.Navigator` at the root. The drawer-accessible screens (Home, Analytics, Journal, AI) are the "base" — navigating between them via the drawer replaces without animation using `navigation.reset()` or `navigation.navigate()`. The check-in flow screens (Choice, Reflect, Reframe, CalmDown) and JournalEditor are pushed on top with native transitions.

Do not add `@react-navigation/drawer` — the existing custom drawer in `App.tsx` works well and avoids an extra dependency.

**Typed param list:**
```ts
type RootStackParamList = {
  Home: undefined;
  Analytics: undefined;
  Journal: undefined;
  JournalEditor: { entryId?: string; checkinId?: string };
  AI: undefined;
  Choice: { activationLevel: number };
  Reflect: { activationLevel: number; showReframeAfter: boolean };
  Reframe: { entry: CheckInEntry };
  CalmDown: undefined;
};
```

**Header strategy:**
Set `headerShown: false` globally on the navigator and keep the existing custom header in `App.tsx`. Individual screens that are immersive (Choice, Reframe, CalmDown) already hide the header in the current setup — that logic stays.

**Drawer + navigation coexistence:**
The drawer currently calls `setCurrent(target)` to switch screens. After the refactor it calls `navigation.navigate(target)` instead. The `navigation` ref from `useNavigationContainerRef()` can be passed down or accessed via `useNavigation()` inside `MainApp`.

**Files to modify:**
- `App.tsx` — remove `AppScreen` union type and `renderScreen()` switch; wrap in `NavigationContainer`; replace `useState<AppScreen>` with navigator; update drawer's `navigateTo` to use `navigation.navigate()`
- All screen components — accept `navigation` and `route` props (or use `useNavigation()` / `useRoute()` hooks) instead of callback props like `onSaved`, `onDone`, `onBack`

**Biggest risk:** `CheckInEntry` is passed as a route param to `ReframeScreen`. React Navigation serializes params, so passing a full object is fine for in-memory navigation but won't survive app reload. This is acceptable — the existing app has the same limitation (it's in component state).

**The `focused` prop on AnalyticsScreen and JournalListScreen** — currently used to trigger a data reload when the screen becomes active. Replace with `useFocusEffect` from `@react-navigation/native` instead of the prop.

## Out of scope

- Replacing the custom drawer with `@react-navigation/drawer`
- Bottom tab navigation
- Deep linking / URL routing
- Persistent navigation state across app restarts
- Any changes to screen UI or business logic
