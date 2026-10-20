---
name: publish-artifact
description: Use after an artifact HTML is published from a Claude conversation and needs adding to this repo's explorer index. Saves it into inbox/ and writes the sidecar JSON (tags, description, kind, created) from the conversation. Triggers on "add this artifact to the index", "publish artifact", "save artifact to the repo".
---

# publish-artifact

Adds one artifact to the repo. Does not commit or push.

1. Save the HTML to `inbox/<name>.html`. If that file exists, or a `<slug>/` for the same title exists, ask before overwriting; never overwrite silently.
2. Read tags already in use: `jq -r '.[].tags[]' manifest.json | sort | uniq -c | sort -rn` (skip if `manifest.json` is absent).
3. Write `inbox/<name>.json` from the conversation, reusing existing tags where they fit:

   ```json
   { "tags": ["tasks", "dashboard"], "description": "One sentence on what it shows.", "kind": "dashboard", "created": "YYYY-MM-DD" }
   ```

   - `tags`: 2-5, lowercase, hyphenated.
   - `kind`: one of `dashboard`, `tool`, `report`, `doc`, `other`.
   - `created`: today's date.
4. Show the sidecar and wait for confirmation or edits.
5. Run `node scripts/build.mjs` for a local preview if asked; otherwise stop. The user commits and pushes; the GitHub Action rebuilds and deploys.
