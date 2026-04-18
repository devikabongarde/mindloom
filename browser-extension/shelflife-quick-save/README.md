# ShelfLife Quick Save Extension

One-click save for the current tab URL into your ShelfLife shelf.

## What it does
- Click the extension icon while browsing.
- It sends the current tab URL to your existing ShelfLife backend (`POST /api/links`).
- Your existing enrichment/processing flow continues as usual.
- Right-click and pick any shelf from your live shelf list.
- Set a default shelf once, then normal icon-click saves there automatically.

## Load in Chrome
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `browser-extension/shelflife-quick-save`

## Configure once
1. In extension details, open **Extension options**
2. Set:
   - `API Base URL` (default `http://localhost:5000`)
   - `JWT Token` (`shelflife_token` from your web app localStorage)
   - Optional `Default Shelf ID` (leave empty to use profile `defaultShelfId`)

## Right-click shelf picker
After setup, right-click (page or extension icon) and use:

- `ShelfLife > Save current URL to shelf` to save to a specific shelf one time
- `ShelfLife > Set default shelf` to pick the default shelf for normal icon-click saves
- `ShelfLife > Save current URL (default shelf)` for quick save with your selected default

## How to get token
On your ShelfLife app tab, open DevTools Console and run:

```js
localStorage.getItem('shelflife_token')
```

Copy and paste that value into extension options.

## Behavior
- No token configured: opens options page and shows warning badge.
- Save success: shows `OK` badge briefly.
- Save error: shows `ERR` badge briefly.
- Shelf list can be refreshed from right-click menu (`Refresh shelf list`).

## Notes
- Backend must be running.
- Server CORS has been updated to allow `chrome-extension://` origins.
