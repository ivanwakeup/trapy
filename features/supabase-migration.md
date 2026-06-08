# Feature: Supabase Migration

**Status:** `done`

## Purpose

Move check-in storage from AsyncStorage (device-local) to Supabase (cloud), so that every check-in is tied to the authenticated user and available across devices. This is the prerequisite for the Claude AI integration, which needs the full per-user history as context.

## User story

> As a returning user, I want my check-ins to be saved to my account so I can see my history on any device.

---

## Data

### Supabase table

```sql
create table checkins (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  created_at   timestamptz default now() not null,
  activation_level smallint not null check (activation_level between 1 and 10),
  triggers     text[] not null default '{}',
  thoughts     text[] not null default '{}',
  urges        text[] not null default '{}',
  open_to_reframe  boolean,
  reframe_offered  text
);
```

The `reflection` nested object from `CheckInEntry` is flattened into two nullable columns (`open_to_reframe`, `reframe_offered`) so they're queryable. The TypeScript type keeps the nested shape — a mapping layer handles the translation.

### RLS policy

```sql
alter table checkins enable row level security;

create policy "users can only access their own checkins"
  on checkins for all
  using (auth.uid() = user_id);
```

No `service_role` access needed — the anon key + RLS is sufficient.

### Updated TypeScript type (`src/types.ts`)

```ts
export interface Reflection {
  openToReframe: boolean;
  reframeOffered?: string;
}

export interface CheckInEntry {
  id: string;               // UUID from Supabase (was Date.now().toString())
  timestamp: string;        // ISO string, mapped from created_at
  activationLevel: number;
  triggers: string[];
  thoughts: string[];
  urges: string[];
  reflection?: Reflection;
}
```

`id` becomes the Supabase-generated UUID. `timestamp` is still an ISO string — just sourced from `created_at` on the way out.

---

## Implementation notes

### Manual Supabase setup (before implementation)

1. Run the SQL above in Supabase → SQL Editor
2. Confirm RLS is enabled on the `checkins` table (Table Editor → RLS badge)
3. Verify the policy appears under Authentication → Policies

### Files to change

| File | Change |
|---|---|
| `src/types.ts` | No change needed — types stay the same |
| `src/screens/ReflectScreen.tsx` | Replace AsyncStorage INSERT with Supabase insert |
| `src/screens/ReframeScreen.tsx` | Replace AsyncStorage UPDATE with Supabase update |
| `src/screens/AnalyticsScreen.tsx` | Replace AsyncStorage read with Supabase select |

### ReflectScreen — INSERT

Replace the `handleSave` AsyncStorage block with:

```ts
const { user } = useAuth();

const { data, error } = await supabase
  .from("checkins")
  .insert({
    user_id: user!.id,
    activation_level: activationLevel,
    triggers,
    thoughts,
    urges,
  })
  .select()
  .single();

if (error) {
  Alert.alert("Error", "Could not save. Please try again.");
  return;
}

const entry: CheckInEntry = {
  id: data.id,
  timestamp: data.created_at,
  activationLevel: data.activation_level,
  triggers: data.triggers,
  thoughts: data.thoughts,
  urges: data.urges,
};
onSaved(entry);
```

### ReframeScreen — UPDATE

Replace `saveReflection`'s AsyncStorage block with:

```ts
await supabase
  .from("checkins")
  .update({
    open_to_reframe: reflection.openToReframe,
    reframe_offered: reflection.reframeOffered ?? null,
  })
  .eq("id", entry.id);
```

No need to read the full array first. Supabase updates by row id directly. RLS ensures the user can only update their own rows.

### AnalyticsScreen — SELECT

Replace AsyncStorage.getItem with:

```ts
const { user } = useAuth();

const { data, error } = await supabase
  .from("checkins")
  .select("*")
  .eq("user_id", user!.id)
  .order("created_at", { ascending: false });

const entries: CheckInEntry[] = (data ?? []).map((row) => ({
  id: row.id,
  timestamp: row.created_at,
  activationLevel: row.activation_level,
  triggers: row.triggers,
  thoughts: row.thoughts,
  urges: row.urges,
  reflection: row.open_to_reframe !== null
    ? { openToReframe: row.open_to_reframe, reframeOffered: row.reframe_offered ?? undefined }
    : undefined,
}));
```

### Error handling

- INSERT failure → show Alert, do not call `onSaved`, let the user retry
- UPDATE failure in ReframeScreen → swallow silently (same as current AsyncStorage behaviour — non-critical)
- SELECT failure in AnalyticsScreen → show the existing "No check-ins yet" empty state (treat error same as empty)

---

## Out of scope

- Migrating existing AsyncStorage check-ins to Supabase — Supabase is the source of truth going forward; local data stays local and will age out naturally
- Offline support / optimistic writes — if there's no network the save fails; deferred to a future spec
- Typed Supabase client (Database generic) — adds safety but is optional boilerplate; can be added later
- Pagination — analytics loads all entries for now; fine until counts grow large
