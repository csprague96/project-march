# Project M.A.R.C.H

**Medical Assessment & Record Capture Hub**

A Progressive Web App (PWA) built for field medics to photograph Ukrainian TCCC casualty cards (картка пораненого). The app uses OCR to extract structured medical data — patient name, blood type, vitals, injuries, triage category, medications, and more — and displays it as a formatted triage card that can be saved locally on the device.

---

## How It Works

**Online mode:** Point the camera at a casualty card and capture. The image is preprocessed (grayscale, contrast, threshold) and sent to a secure backend proxy, which forwards it to Claude AI for high-accuracy extraction. Results are returned in seconds.

**Offline mode:** If there is no internet connection, or no access code has been saved, the app falls back to on-device OCR using Tesseract.js with Ukrainian language support. Results are lower confidence and flagged for manual review. When the device comes back online, offline captures are automatically re-processed by Claude and upgraded in place.

All saved records are stored locally in the browser using IndexedDB. Nothing is sent to a server unless you actively trigger a capture in online mode.

---

## What You Need

- A modern mobile browser (Chrome on Android, Safari on iOS)
- The medic access code — a shared password that authorizes use of the online Claude OCR. Without it, offline OCR still works.
- An internet connection for online mode (optional — the app is fully functional offline)

No app store. No install. Just open the URL in a browser.

---

## Adding to Your Home Screen

### iPhone / iPad (Safari)
1. Open the app URL in Safari
2. Tap the Share button (the box with an arrow at the bottom of the screen)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**

The app will open full-screen with no browser chrome, like a native app.

### Android (Chrome)
1. Open the app URL in Chrome
2. Tap the three-dot menu in the top right
3. Tap **Add to Home screen**
4. Tap **Add**

---

## Language

The app supports English and Ukrainian. Use the globe button in the top-left of the camera screen to toggle between them. The preference is saved across sessions.

---

## Triage Categories

Cards are classified into four TCCC categories:

| Category | Color | Meaning |
|---|---|---|
| IMMEDIATE | Red | Life-threatening — treat now |
| DELAYED | Amber | Serious but stable |
| MINIMAL | Green | Minor injuries |
| EXPECTANT | Black | Unsurvivable — expectant care only |

---

## Required Environment Variables (Vercel)

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude OCR |
| `MEDIC_ACCESS_CODE` | Shared password used by medics to authorize requests |

Set both in the Vercel project dashboard under **Settings > Environment Variables**.
