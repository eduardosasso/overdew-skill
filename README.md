# overdew agent skill

Teach your AI coding agent to operate [overdew](https://overdew.app) boards — list boards, create stories, claim them, tick checklists, and mark them done — over the same API the web app uses.

Works with any agent that supports [Agent Skills](https://skills.sh) (Claude Code, Cursor, Codex, …).

## Install

```bash
npx skills add eduardosasso/overdew-skill -g
```

`-g` installs it for your user (all projects). Drop it to install into the current project only.

## Set up your token

1. Open [overdew.app](https://overdew.app), click your avatar (top right), and find **API Tokens**.
2. Create a token with a label like `claude-code` and copy the `od_…` secret — it's shown only once.
3. Put it in your shell so agent sessions inherit it:

```bash
# zsh / bash
echo 'export OVERDEW_TOKEN=od_...' >> ~/.zshrc

# fish
set -Ux OVERDEW_TOKEN od_...
```

Lost a token? Revoke it in the same drawer and mint a new one — revocation is instant.

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
