# Big Browser Extension

Core SDK and Manifest V3 browser extensions for [Big Browser](https://github.com/jr-k/bigbrowser-plugins).

Big Browser loads plugins from a configurable index server. Users subscribe to the plugins they want and enable individual **tweaks** instead of installing a separate extension or userscript for every website change.

## Structure

```text
bigbrowser-extension/
├── core/       # Plugin SDK and page runtime
├── chrome/     # Shared extension sources and Chrome manifest
└── firefox/    # Firefox manifest and build configuration
```

- **Core** exposes `definePlugin`, `Tweak`, `TweakRequest` and the runtime used to execute enabled tweaks.
- **Chrome** contains the shared extension implementation: background worker, options, popup and browser compatibility layer.
- **Firefox** builds the shared Chrome sources with its own manifest and target-specific configuration.

The source directory is intentionally shared between Chrome and Firefox. Browser differences stay behind `chrome/src/lib/browser.ts` and each target keeps its own manifest.

## How it works

1. The extension fetches `/api/index` from the configured index server.
2. Users subscribe to plugins and select their enabled tweaks from the options page.
3. The extension downloads and caches the required plugin bundles.
4. The core runtime is injected before each bundle.
5. Only tweaks matching the current URL and user configuration are executed.

The plugin index refreshes automatically every 15 minutes and can also be refreshed from the extension interface.

## Requirements

- Node.js 22 or newer
- npm
- Chrome 120+ or Firefox 136+
- A running [Big Browser index server](https://github.com/jr-k/bigbrowser-server)

## Install and build

```bash
npm ci --ignore-scripts

# Build the SDK and both extensions
npm run build

# Check all TypeScript workspaces
npm run typecheck
```

Build outputs are written to:

```text
chrome/dist/
firefox/dist/
```

Targeted commands are also available:

```bash
npm run build:core
npm run build:chrome
npm run build:firefox

npm run dev --workspace chrome
npm run dev --workspace firefox
```

Build the core workspace once before starting an extension watcher when its SDK sources have changed:

```bash
npm run build:core
```

## Load in Chrome

1. Build the Chrome extension with `npm run build:chrome`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the `chrome/dist` directory.

Reload the unpacked extension from `chrome://extensions` after a development rebuild.

## Load in Firefox

1. Build the Firefox extension with `npm run build:firefox`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Select **Load Temporary Add-on**.
4. Choose `firefox/dist/manifest.json`.

Temporary extensions are removed when Firefox closes.

## Configure the index server

Open the extension options and set the index server URL. The development default is:

```text
http://127.0.0.1:8001
```

The options page also controls plugin subscriptions, enabled tweaks and debug mode. The popup displays the current index and runtime state for the active tab.

## Plugin SDK

A plugin registers tweak implementations with the SDK:

```ts
import {definePlugin, Tweak, TweakRequest} from 'bigbrowser';

class CleanDashboard extends Tweak {
  run = (request: TweakRequest): void => {
    document.documentElement.dataset.bigBrowserRoute = request.routeName;
  };
}

export default definePlugin({
  id: 'example',
  tweaks: {
    clean_dashboard: CleanDashboard,
  },
});
```

Plugin manifests, bundles and authoring conventions live in [jr-k/bigbrowser-plugins](https://github.com/jr-k/bigbrowser-plugins).

## Package extensions

```bash
npm run zip --workspace chrome
npm run zip --workspace firefox
```

These commands create `bigbrowser-chrome.zip` and `bigbrowser-firefox.zip` inside their respective workspace directories. GitHub Actions builds both targets and publishes equivalent zip files as workflow artifacts.

## Pull request checklist

- [ ] Shared behavior is implemented in `chrome/src`.
- [ ] Browser-specific behavior remains behind the compatibility layer or target configuration.
- [ ] Chrome and Firefox manifests request only required permissions.
- [ ] `npm run build` passes.
- [ ] `npm run typecheck` passes.
- [ ] Both unpacked extensions have been checked in their target browser.
