---
name: overdew
description: >-
  Operate overdew sticky-note boards over plain HTTP: list boards, read and
  create stories (notes), claim a story (assign to self), tick checklist items,
  update the description, and mark it complete. Trigger whenever the user
  mentions overdew, a board, or a story/card/note to pick up, create, work, or
  finish (e.g. "grab the top story on /acme/launch", "add a card to my
  pipeline board", "mark that overdew story done"). Needs an $OVERDEW_TOKEN
  personal access token.
---

# overdew

Drive overdew boards through the same REST API the web app uses. One story =
one sticky note. No CLI, no repo checkout — just curl.

## Auth & setup

Base URL and token always travel as a **pair** — a token only works on the
server that minted it. Resolve the pair once at the start of the task, in
this order:

1. **The user's explicit ask wins.** "…on prod" → `https://overdew.app` +
   the token file `~/.config/overdew/token`. "…on local/dev" → the
   `$OVERDEW_URL`/`$OVERDEW_TOKEN` env pair (or ask which local server).
2. Otherwise the **env pair** (`$OVERDEW_URL` + `$OVERDEW_TOKEN`) if set —
   dev repos pin their sessions to a local server this way.
3. Otherwise **prod defaults**: `https://overdew.app` + the token file.

Then substitute the **literal values** into every command — shell state
(exports) does not persist between agent tool calls, so `$OVERDEW_TOKEN` in
the examples below is a placeholder to fill in, not a variable to rely on.
`Bearer $(cat ~/.config/overdew/token)` inline also works in any shell.

**No token anywhere?** Tell the user to mint one: open overdew → account
drawer (their avatar, top-right) → **API Tokens** → new token with a label,
copy the `od_…` secret (shown once). Then offer both ways in:

1. They paste the token to you — save it so every future session finds it:

   ```bash
   mkdir -p ~/.config/overdew
   printf %s "od_...paste..." > ~/.config/overdew/token
   chmod 600 ~/.config/overdew/token
   ```

2. Or they run the installer themselves in a terminal (saves the token and
   verifies it against the server):

   ```bash
   npx github:eduardosasso/overdew-skill od_...their-token...
   ```

A missing or revoked token returns `401 Unauthorized`.

## Addressing

A board lives at `/{workspace}/{slug}`. `GET /api/boards` returns each board's
`workspace_slug` and `slug`; join them for the path used by the note routes,
e.g. workspace `acme` + slug `launch` → `/api/boards/acme/launch/notes`. A
personal workspace's slug is the owner's username.

## Endpoints

All paths are under `$OVERDEW_URL/api`. Write bodies are
`application/x-www-form-urlencoded` (curl `--data-urlencode` sets that
Content-Type by default; non-curl clients must set the header explicitly)
unless noted. Every `PUT /notes/{id}` echoes the full updated note, so a
confirming `GET` is optional right after a mutation.

| Do | Method & path | Body fields |
|----|----|----|
| Who am I | `GET /user/profile` | — → `{username,…}` |
| List boards | `GET /boards` | — |
| List a board's notes | `GET /boards/{ws}/{slug}/notes` | — |
| Read one note | `GET /notes/{id}` | — (adds `attachments`) |
| Create a story | `POST /boards/{ws}/{slug}/notes` | `content` (title, **required**); opt `color`, `x`, `y` |
| Update a story | `PUT /notes/{id}` | any of `content`, `description`, `checklist`, `tags`, `assigned_to`, `color`, `due_date`, `stage` |
| Complete a story | `PUT /notes/{id}/complete` | — → `{completed_at}` |

`color` ∈ yellow, pink, green, blue, orange. `tags` is a comma-separated
string. `due_date` is `YYYY-MM-DD` (must be tomorrow or later; `""` clears).
Only fields you send change.

## Story lifecycle → HTTP

**Who am I** (needed to claim — assign uses your username):

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" $OVERDEW_URL/api/user/profile
```

**List boards** → pick `workspace_slug`/`slug`:

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" $OVERDEW_URL/api/boards
```

**List a board's notes** (each note has `id`, `content`, `assigned_to`,
`checklist`, `status` — 0 active, 1 completed). Convention: the "top story" =
among active (`status:0`) unassigned (`assigned_to:""`) notes, the highest `z`
(the visually top-most card), tie-break by newest `created`:

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" \
  $OVERDEW_URL/api/boards/acme/launch/notes
```

**Create a story.** Only `content` (the title) is accepted here — set the
description/checklist with a follow-up `PUT`. Capture the returned `id`:

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" \
  --data-urlencode "content=Write the launch blog post" \
  --data-urlencode "color=blue" \
  $OVERDEW_URL/api/boards/acme/launch/notes
```

**Flesh it out** — description + a 2-item checklist. The checklist is a JSON
string `[{"text":…,"done":…}]`:

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" -X PUT \
  --data-urlencode "description=Cover the three headline features and link the changelog." \
  --data-urlencode 'checklist=[{"text":"Draft the outline","done":false},{"text":"Proofread","done":false}]' \
  $OVERDEW_URL/api/notes/25
```

**Claim = assign to self** (`assigned_to` is your username from `/user/profile`):

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" -X PUT \
  --data-urlencode "assigned_to=alice" \
  $OVERDEW_URL/api/notes/25
```

**Progress = tick a checklist item.** No per-item endpoint: `GET` the note,
flip the item's `done` to `true` in the array, and `PUT` the whole array back:

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" -X PUT \
  --data-urlencode 'checklist=[{"text":"Draft the outline","done":true},{"text":"Proofread","done":false}]' \
  $OVERDEW_URL/api/notes/25
```

**Update the description** (same route, any subset of fields). `description`
is a whole-field overwrite: to append to or amend a non-empty description,
`GET` the note first, modify the text, and `PUT` the full value back —
sending a bare new string destroys the existing content:

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" -X PUT \
  --data-urlencode "description=Outline done. Draft in Google Docs, link below." \
  $OVERDEW_URL/api/notes/25
```

**Done = complete.** Sets `status` to 1 and stamps `completed_at` (Unix epoch
seconds, an integer — not an ISO date):

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" -X PUT \
  $OVERDEW_URL/api/notes/25/complete
```

**Confirm** anything with `GET /notes/{id}`.

## Gotchas

- **Create is title-only.** `POST …/notes` reads just `content` (+ optional
  `color`/`x`/`y`); `description`, `checklist`, `tags`, `assigned_to` are
  ignored there. Set them with a follow-up `PUT /notes/{id}`.
- **Checklist and description are whole-field overwrites.** Read the current
  value first, mutate it, and send it back in full — there is no add/tick
  single-item call, and a bare new `description` string replaces (destroys)
  what was there.
- **Body encoding matters, paths don't.** Workspace/board slugs are lowercase
  and hyphenated (URL-safe as-is), but always use `--data-urlencode` for write
  fields — checklist JSON and free-text descriptions contain `=`, `{`, spaces.
- **`due_date` must be tomorrow or later** (`YYYY-MM-DD`), else `400`.
- **`stage` takes a stage id already on the board, not a name** (`400`
  otherwise; `""` clears). Most boards have none — leave it out.
- **Complete ≠ gone.** A completed note stays on the board (and in the notes
  list, `status:1`) for ~48h, then auto-archives. There is no un-complete call.
- **Live updates via SSE** at `GET /boards/{ws}/{slug}/events`, but a one-shot
  agent should just re-`GET` the notes list rather than hold the stream open.
  Pass `?silent=1` on a `PUT` to suppress the broadcast — normally leave it off
  so collaborators watching the board see your change appear live.
- **No comments API yet** — report-back is via the description/checklist for now.
