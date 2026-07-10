#!/usr/bin/env node
// Set up the overdew agent skill in one command:
//   npx overdew od_<token>
// Saves the token to ~/.config/overdew/token and installs the skill for
// Claude Code at ~/.claude/skills/overdew/SKILL.md.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const BASE = process.env.OVERDEW_URL || "https://overdew.app";
const token = process.argv[2];

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!token || !token.startsWith("od_")) {
  fail(
    "Usage: npx overdew od_<token>\n\n" +
      "Get a token at https://overdew.app — click your avatar (top right)\n" +
      "→ API Tokens → create one and copy the od_… secret (shown once).",
  );
}

// 1. Token → its own file, owner-read-only.
const cfgDir = path.join(os.homedir(), ".config", "overdew");
const tokenFile = path.join(cfgDir, "token");
fs.mkdirSync(cfgDir, { recursive: true });
fs.writeFileSync(tokenFile, token, { mode: 0o600 });
fs.chmodSync(tokenFile, 0o600);
console.log(`✓ token saved to ${tokenFile}`);

// 2. Skill → Claude Code's user-level skills directory. The SKILL.md ships
// inside this package, so no network fetch is needed and versions match.
const src = path.join(__dirname, "..", "skills", "overdew", "SKILL.md");
const skillDir = path.join(os.homedir(), ".claude", "skills", "overdew");
let linked = false;
try {
  linked = fs.lstatSync(skillDir).isSymbolicLink();
} catch {}
if (linked) {
  console.log(`✓ skill already present as a symlink at ${skillDir} — left as is`);
} else {
  fs.mkdirSync(skillDir, { recursive: true });
  fs.copyFileSync(src, path.join(skillDir, "SKILL.md"));
  console.log(`✓ skill installed at ${skillDir}/SKILL.md`);
}

// 3. Verify the token actually works (non-fatal — the file is saved either way).
const verify = async () => {
  try {
    const res = await fetch(`${BASE}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const profile = await res.json();
      console.log(`✓ authenticated with ${BASE} as @${profile.username}`);
    } else {
      console.log(
        `⚠ token saved, but ${BASE} returned ${res.status} — check the token (revoked?) or try again later`,
      );
    }
  } catch {
    console.log(`⚠ token saved, but ${BASE} could not be reached to verify`);
  }
  console.log(
    '\nDone. Try it in Claude Code: "add a card to my board: hello from my agent"',
  );
};

verify();
