# Artifacts Explorer: Spec

## Problem

A folder of Claude-generated HTML artifacts (starting with `Task Control.html`) will become a GitHub repo served on GitHub Pages. Nothing lists them, filenames contain spaces, and there is no metadata to find one later.

## Goals

- `index.html` at the site root is an explorer over every artifact: search, tag filters, sort, date range.
- Clicking a card opens that artifact full-page on its own URL.
- Adding an artifact HTML and pushing is the whole workflow. The index rebuilds itself.

## Non-goals

- Editing artifacts. They are published as-is.
- Auth, privacy or unlisted pages. Pages is public and the index lists everything.
- Thumbnails (not selected for v1).
- Grid/list toggle (not selected for v1).

## Decisions

| Question | Decision | Why |
|----------|----------|-----|
| URL id | **Slug from title, not base32** | The index links every artifact, so an unguessable id adds no privacy. Slugs are readable and greppable. No unlisted artifacts are needed, so no id scheme is kept. |
| Dates | File mtime when no sidecar `created` | Agreed; no git history to rely on for existing files. |
| Sidecar authoring | A `publish-artifact` skill writes it | Agreed; see Skill below. |
| Layout | `<slug>/index.html` per artifact | Clean URLs (`/task-control/`), room for per-artifact assets. |
| Metadata | Parse HTML + optional sidecar JSON | Works with zero effort, richer when a sidecar exists. |
| Index UX | Search + tag filters; sort + date range | Selected. |
| Rebuild | GitHub Action on push | Selected. Nothing to run locally. |

## Repo layout

```
inbox/                      drop new artifact HTML here (any filename)
  Task Control.html
  Task Control.json         optional sidecar, same basename
task-control/index.html     generated: moved/renamed from inbox/
task-control/meta.json      generated: merged metadata (title, tags, dates)
index.html                  generated: the explorer
manifest.json               generated: array of all artifacts, consumed by index.html
scripts/build.mjs           the build
.github/workflows/pages.yml
```

Ingest is part of the build: every `inbox/*.html` is slugged, moved to `<slug>/index.html`, and its sidecar becomes `<slug>/meta.json`. Existing slugs are immutable, so published URLs never change. A slug collision gets `-2`, `-3`.

## Metadata

Resolved per artifact, sidecar wins over parsed over default:

| Field | Parsed from | Default |
|-------|-------------|---------|
| `title` | `<title>` | filename |
| `description` | `<meta name="description">`, else first `<h1>`/`<p>` text (160 chars) | empty |
| `tags` | sidecar only | `[]` |
| `created` | sidecar, else file mtime | file mtime |
| `kind` | sidecar (`dashboard`, `tool`, `report`, `doc`) | `other` |

Sidecar shape:

```json
{ "tags": ["tasks", "dashboard"], "description": "...", "kind": "dashboard", "created": "2026-10-19" }
```

## Skill: `publish-artifact`

Run when an artifact is published from a Claude conversation.

- Saves the HTML into `inbox/<name>.html`, never overwriting an existing file without asking.
- Writes the sidecar `inbox/<name>.json` from the conversation: 2-5 lowercase tags (reusing tags already in `manifest.json` where they fit), a one-sentence description, a `kind`, and today's date as `created`.
- Shows the sidecar for confirmation, then stops. Committing and pushing stay with the user.
- Lives in this repo's `.claude/skills/publish-artifact/SKILL.md` so it travels with the repo.

## Explorer (`index.html`)

- Self-contained static page. No framework, no build step for the page itself. Inlines `manifest.json` at build time so it works offline and without a fetch.
- Card per artifact: title, description, kind, tags, date. Card is an `<a href="./<slug>/">`, so open-in-new-tab and middle-click work.
- Search: case-insensitive substring over title, description, tags. Debounced, no network.
- Tag chips: multi-select, AND semantics, with counts. `kind` is a second chip row.
- Sort: newest (default), oldest, title A-Z.
- Date range: from/to inputs, month granularity is enough.
- Filter state lives in the URL query (`?q=&tag=&sort=&from=&to=`) so a filtered view is shareable and survives back-navigation.
- Empty state with a "clear filters" action. Result count always visible.
- Follows the existing artifact look (warm paper palette, Archivo / IBM Plex Mono, light + dark via `prefers-color-scheme`), phone-width friendly.

## Build (`scripts/build.mjs`)

- Node 22, zero runtime dependencies (a small HTML head parser by regex, or `node-html-parser` if regex proves brittle).
- Idempotent: running twice produces no diff.
- Fails the build, with the file name, on: unparseable sidecar JSON, duplicate title slug that can't be resolved, empty HTML.
- Never rewrites artifact HTML content. Only moves it.

## CI (`.github/workflows/pages.yml`)

- Trigger: push to `main` touching `inbox/**`, `**/meta.json`, `scripts/**`.
- Steps: checkout, run `node scripts/build.mjs`, commit generated files back to `main` if changed (guard against a loop with `[skip ci]` or a path filter on generated output), deploy to Pages.
- Alternative if committing back is unwanted: build into `_site/` and deploy via `actions/deploy-pages` without committing generated output. Slugs would then need a committed ingest step. Decide in Open questions.

## Acceptance criteria

1. With only `Task Control.html` in `inbox/`, a push yields `/task-control/` (the artifact, unchanged byte for byte) and an `/` index listing one card.
2. Dropping a second HTML and pushing adds a card within one workflow run, with no manual step.
3. Searching, a tag chip, sort and date range each change the visible set; the URL reflects them; reloading restores them.
4. Re-running the build with no inbox changes produces no git diff.
5. Existing artifact URLs are unchanged after later builds.
6. Index passes a Lighthouse accessibility check and is usable at 375px width.

## Open questions

1. **Committing generated output vs. deploy-only build.** Committing keeps the repo self-describing and Pages "deploy from branch" simple; deploy-only keeps history clean. Default here: commit back.

Resolved: no unlisted artifacts, mtime is the date fallback, a skill writes the sidecar.
