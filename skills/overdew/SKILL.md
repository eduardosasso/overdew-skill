---
name: overdew
description: >-
  Operate overdew sticky-note boards over plain HTTP: list boards, find, read
  and create stories (cards), claim one, tick checklist items, tag it, comment
  on it, mark it complete or reopen it. Trigger whenever the user mentions
  overdew, a board, or a story/card/note to pick up, create, work, comment on,
  or finish (e.g. "grab the top story on /acme/launch", "add a card to my
  pipeline board", "comment on that overdew card", "mark that story done").
  Needs an od_… personal access token.
---

# overdew

Drive overdew boards through the same REST API the web app uses. One story =
one card = one sticky note. No CLI, no repo checkout, just curl.

The API is bigger than this file. For anything not covered here, read the
live spec (no auth needed): `GET $OVERDEW_URL/api/openapi.json`.

## Auth & setup

Base URL and token always travel as a **pair**: a token only works on the
server that minted it. Resolve the pair once at the start of the task, in
this order:

1. **The user's explicit ask wins.** "…on prod" → `https://overdew.app` +
   the token file `~/.config/overdew/token`. "…on local/dev" → the
   `$OVERDEW_URL`/`$OVERDEW_TOKEN` env pair (or ask which local server).
2. Otherwise the **env pair** (`$OVERDEW_URL` + `$OVERDEW_TOKEN`) if set.
   Dev repos pin their sessions to a local server this way.
3. Otherwise **prod defaults**: `https://overdew.app` + the token file.

Then substitute the **literal values** into every command. Shell state
(exports) does not persist between agent tool calls, so `$OVERDEW_TOKEN` in
the examples below is a placeholder to fill in, not a variable to rely on.
`Bearer $(cat ~/.config/overdew/token)` inline also works in any shell.

**No token anywhere?** Tell the user to mint one: open overdew → account
drawer (their avatar, top-right) → **API Tokens** → new token with a label,
copy the `od_…` secret (shown once). Then offer both ways in:

1. They paste the token to you. Save it so every future session finds it:

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

## Model

- **Board**: lives at `/{workspace}/{slug}`. `GET /api/boards` returns each
  board's `workspace_slug` and `slug`. A personal workspace's slug is the
  owner's username. Board routes are `/api/boards/{ws}/{slug}/…`.
- **Card**: has a numeric `id` and is addressed by id alone: `/api/notes/{id}`.
  Its public link is `https://overdew.app/{ws}/{slug}/{id}-{card-slug}`; the
  id is the number before the first dash. Fields: `content` (title),
  `description`, `checklist`, `tags`, `assigned_to`, `color`, `due_date`,
  `stage`, `status`.
- **Status**: `0` active, `1` completed, `3` archived. A completed card
  auto-archives after ~48h. Completed and archived cards are still readable
  by id and can be reopened.
- **Conversation**: a card has a flat comment thread. Completing a card
  closes the work, not the thread.

## Endpoints

All paths are under `$OVERDEW_URL/api`. Write bodies are
`application/x-www-form-urlencoded` (curl `--data-urlencode` sets that
Content-Type by default; non-curl clients must set the header explicitly)
unless noted. Every `PUT /notes/{id}` echoes the full updated note, so a
confirming `GET` is optional right after a mutation.

| Do | Method & path | Notes |
|----|----|----|
| Who am I | `GET /user/profile` | → `{username,…}` |
| List boards | `GET /boards` | |
| List a board's cards | `GET /boards/{ws}/{slug}/notes` | live board: active + recently completed |
| Search a board | `GET /boards/{ws}/{slug}/notes/search` | `tag` (repeat), `status`, `limit`, `after` |
| Read one card | `GET /notes/{id}` | adds `attachments`; works for any status |
| Create a card | `POST /boards/{ws}/{slug}/notes` | `content` **required**; opt `color`, `x`, `y` |
| Update a card | `PUT /notes/{id}` | any of `content`, `description`, `checklist`, `tags`, `tags_add`, `tags_remove`, `assigned_to`, `color`, `due_date`, `stage` |
| Complete | `PUT /notes/{id}/complete` | → `{completed_at}` |
| Reopen | `DELETE /notes/{id}/complete` | back to active, also from archived |
| Archive | `PUT /notes/{id}/archive` | completed cards only |
| Delete (permanent) | `DELETE /notes/{id}` | cannot be undone |
| Read comments | `GET /notes/{id}/comments` | oldest first |
| Comment | `POST /notes/{id}/comments` | `body` (max 4000 chars) |
| Delete own comment | `DELETE /comments/{id}` | author only |
| Attach a file | `POST /notes/{id}/attachments` | multipart, ≤5MB; `GET` lists them |

`color` ∈ yellow, pink, green, blue, orange. `due_date` is `YYYY-MM-DD` (must
be tomorrow or later; `""` clears). Only fields you send change.

## Recipes

Every command needs `-H "Authorization: Bearer $OVERDEW_TOKEN"`.

### Find work

**List boards**, then a board's cards (each has `id`, `content`,
`assigned_to`, `checklist`, `status`). Convention: the "top story" = among
active (`status:0`) unassigned (`assigned_to:""`) cards, the highest `z` (the
visually top-most), tie-break by newest `created`:

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" $OVERDEW_URL/api/boards
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" \
  $OVERDEW_URL/api/boards/acme/launch/notes
```

**Search**, including done cards. `status` is comma-separated, default
`active,completed`; add `archived` for older completed cards. `tag` repeats
and every tag must match. The result is `{notes, nextCursor}`; pass
`nextCursor` back as `after` until it is `null`:

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" \
  "$OVERDEW_URL/api/boards/acme/launch/notes/search?status=active,completed&tag=in-review"
```

### Create and shape a card

**Create** takes the title only (plus optional `color`/`x`/`y`). Capture the
returned `id`, then set everything else with a `PUT`:

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" \
  --data-urlencode "content=Write the launch blog post" \
  --data-urlencode "color=blue" \
  $OVERDEW_URL/api/boards/acme/launch/notes
```

**Description + checklist.** The checklist is a JSON string
`[{"text":…,"done":…}]`:

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" -X PUT \
  --data-urlencode "description=Cover the three headline features." \
  --data-urlencode 'checklist=[{"text":"Draft the outline","done":false},{"text":"Proofread","done":false}]' \
  $OVERDEW_URL/api/notes/25
```

**Claim = assign to self** (`assigned_to` is your username from
`/user/profile`):

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" -X PUT \
  --data-urlencode "assigned_to=alice" $OVERDEW_URL/api/notes/25
```

**Tick a checklist item.** No per-item endpoint: `GET` the card, flip the
item's `done`, and `PUT` the whole array back (the first `PUT` example above).

**Tags.** Comma-separated, lowercased and deduplicated. `tags` replaces the
whole set. `tags_add` and `tags_remove` patch it and leave other tags alone
(removal wins). Do not send `tags` together with either:

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" -X PUT \
  --data-urlencode "tags_add=in-review" --data-urlencode "tags_remove=blocked" \
  $OVERDEW_URL/api/notes/25
```

**Description** is a whole-field overwrite. To append to a non-empty one,
`GET` the card, change the text, and `PUT` the full value back. A bare new
string destroys the old content.

### Finish, reopen, talk

**Done = complete.** Sets `status` to 1 and stamps `completed_at` (Unix epoch
seconds, an integer). **Reopen** undoes it:

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" -X PUT \
  $OVERDEW_URL/api/notes/25/complete
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" -X DELETE \
  $OVERDEW_URL/api/notes/25/complete
```

**Comment** to report back or ask something. An `@username` of a board
member notifies them. Prefer a comment over rewriting the description for
progress notes and questions:

```bash
curl -s -H "Authorization: Bearer $OVERDEW_TOKEN" \
  --data-urlencode "body=Draft is up for review, see the link in the description." \
  $OVERDEW_URL/api/notes/25/comments
```

## Gotchas

- **Create is title-only.** `POST …/notes` ignores `description`, `checklist`,
  `tags`, `assigned_to`. Set them with a follow-up `PUT /notes/{id}`.
- **Checklist and description are whole-field overwrites.** Read the current
  value first, change it, and send it back in full. Only tags have patch
  fields.
- **Encode write fields.** Always use `--data-urlencode`: checklist JSON and
  free text contain `=`, `{` and spaces. Board slugs are URL-safe as is.
- **`due_date` must be tomorrow or later** (`YYYY-MM-DD`), else `400`.
- **`stage` takes a stage id already on the board, not a name** (`400`
  otherwise; `""` clears). Most boards have none: leave it out.
- **Complete ≠ gone.** A completed card stays on the board for ~48h, then
  auto-archives. Both states are readable by id and reopenable. Completing an
  archived card returns `409`: reopen it instead.
- **Live updates via SSE** at `GET /boards/{ws}/{slug}/events`, but a one-shot
  agent should just re-`GET` rather than hold the stream open. Pass
  `?silent=1` on a `PUT` to suppress the broadcast; normally leave it off so
  collaborators watching the board see your change appear live.
- **Errors**: `400` bad input, `401` token, `403` no access to the board,
  `404` unknown or deleted card, `409` wrong state.
