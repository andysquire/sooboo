# SUBU Org Chart

A native-feeling macOS app for redesigning SUBU's staff structure: drag positions
around a chart, edit role names and employment costs inline, and see the total
team cost track against a target in real time.

## Features

- **Editable org chart** — click any role's name or cost to edit it in place.
- **Drag and drop** — drag a card onto another to move that role (and everyone
  reporting into it) elsewhere in the structure.
- **Add / remove roles** — add a report under any role; delete a role and either
  promote its reports up to the next manager, or remove the whole team beneath it.
- **Live cost totals** — every manager card shows the total cost of their team;
  the toolbar shows the total cost of the whole structure.
- **Target cost & variance** — set a target headcount cost and see exactly how
  far the current structure is over or under, in £ and %.
- **Custom labels** — create colour-coded labels (e.g. "Proposed", "At risk",
  "Confirmed") from the **Labels** button in the toolbar, then assign one to
  any role from the small chip on its card. The card's border and background
  pick up the label's colour, so status is visible at a glance across the
  whole chart.
- **Save / Open** — structures save as `.json` files you can keep in version
  control, email, or store on SharePoint. `Cmd+S` / `Cmd+O` work as expected,
  and the app will prompt to save unsaved changes before closing.
- **Export CSV** — export a flat list of every role, its manager, and its cost
  for use in Excel or Google Sheets.

## Installing the app (no build required)

Pre-built, unsigned app bundles are in the `release/` folder after running a
build (see below), or may have been sent to you directly as a `.zip`. To install:

1. Unzip it and drag **SUBU Org Chart.app** to `/Applications`.
2. Because the app isn't signed with an Apple Developer certificate, the first
   time you open it macOS Gatekeeper will block it. Either:
   - Right-click (or Control-click) the app → **Open** → **Open** again in the
     dialog, or
   - Run `xattr -cr "/Applications/SUBU Org Chart.app"` in Terminal once.
3. After that first launch it opens normally like any other app.

## Development

Requires Node.js 18+.

```bash
npm install
npm run dev        # launches Vite + Electron with hot reload
```

## Building the app yourself

```bash
npm run build       # type-check + bundle the renderer
npm run dist:mac    # package a signed-ready .app, .dmg and .zip for macOS
```

This project was built and tested in a Linux container (no Xcode available),
so the `.dmg` target could not be produced there — DMG creation depends on
`dmg-license`, which only installs on macOS. **Run `npm run dist:mac` on an
actual Mac** to get a proper `.dmg` installer; `.app`/`.zip` builds for both
Apple Silicon and Intel were verified working from Linux via
`electron-builder --mac zip`.

To notarize/sign for distribution outside SUBU, set the usual
`CSC_LINK`/`CSC_KEY_PASSWORD` (or use your Apple Developer identity in
Keychain) and Apple ID notarization environment variables before running
`dist:mac` on a Mac — see the [electron-builder docs](https://www.electron.build/code-signing).

## Data format

Charts save as plain JSON (`ChartDocument` in `src/types.ts`): a tree of
`{ id, title, cost, children }` positions, plus the structure's name and
target cost. This makes charts easy to diff, script against, or generate
programmatically (e.g. from an HR export).

## Project layout

- `electron/main.cjs` — app window, native macOS menu, file save/open dialogs,
  unsaved-changes close guard.
- `electron/preload.cjs` — the `window.api` bridge exposed to the renderer.
- `src/tree.ts` — pure functions for editing the position tree (add, delete,
  rename, move/reparent, cost rollups, CSV export).
- `src/components/` — `Toolbar`, `OrgChart`, `PositionNode`.
- `build/icon-source.svg` / `build/icon.icns` — the app icon.
