# overdew agent skill

Teach your AI coding agent to operate [overdew](https://overdew.app) boards — list boards, create stories, claim them, tick checklists, and mark them done — over the same API the web app uses.

Works with any agent that supports [Agent Skills](https://skills.sh) (Claude Code, Cursor, Codex, …).

## Install

First get your token: open [overdew.app](https://overdew.app), click your avatar (top right) → **API Tokens** → create one and copy the `od_…` secret (shown only once). Then paste this whole block with your token filled in:

```bash
npx skills add eduardosasso/overdew-skill -g
mkdir -p ~/.config/overdew && printf %s "od_...your-token..." > ~/.config/overdew/token && chmod 600 ~/.config/overdew/token
```

That's the entire setup — the skill installs for your user (all projects) and the token lives in its own file (`~/.config/overdew/token`), no shell configuration needed.

**Even easier**: install the skill, then just tell your agent *"set up overdew, here's my token: od_…"* — the skill saves it to that file for you.

Lost a token? Revoke it in the drawer and mint a new one — revocation is instant. Power users can set `$OVERDEW_TOKEN` instead; the env var wins over the file.

## Use it

Just talk to your agent about your boards:

- *"add a card to my /you/ideas board: book the campsite"*
- *"grab the top story on /acme/launch and work it"*
- *"mark that overdew story done"*

The skill triggers on mentions of overdew, boards, or stories, and acts as **you** — everything it does shows up live for collaborators, exactly like your own edits.

## Notes

- The skill talks to `https://overdew.app` by default; set `OVERDEW_URL` to point elsewhere (e.g. a local dev server).
- Each client should get its own token, so you can revoke one without breaking the others.
- Canonical source lives in the main overdew repo (`.claude/skills/overdew/SKILL.md`) and is mirrored here on release.
