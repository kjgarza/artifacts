# Artifacts

Claude-generated HTML artifacts, published with GitHub Pages. The index at the site root is an explorer with search, tag and date filters. See `SPEC.md` for the design.

## Adding an artifact

Use the `publish-artifact` skill, or drop the HTML (and an optional `<name>.json` sidecar) in `inbox/` and push. The GitHub Action rebuilds the index.

## Licenses

| What | License |
|------|---------|
| Artifacts (`<slug>/` pages and `meta.json`) | [CC BY 4.0](LICENSE-content) |
| Build script, workflow, skill (`scripts/`, `.github/`, `.claude/`) | [MIT](LICENSE) |

Cite via `CITATION.cff`.
