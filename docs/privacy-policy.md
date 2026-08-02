# Proteu QA — Privacy Policy

**Last updated:** August 2, 2026

## Summary

Proteu QA does **not** collect, transmit, or store any personal data. Everything runs locally in your browser.

## Data collection

**None.** Proteu QA:

- Makes **zero network requests** — no analytics, no telemetry, no remote APIs.
- Does **not** read, access, or exfiltrate any user data from web pages.
- Stores only your settings (country, theme, language) and a session history of generated values in Chrome's local/sync storage. This data never leaves your browser.

## Permissions explained

| Permission | Why it's needed |
|---|---|
| `contextMenus` | Adds "Copy selector" options to the right-click menu. |
| `storage` | Saves your preferences (country, theme, language) locally. |
| `activeTab` | Inserts generated data into the focused field when you use a keyboard shortcut. |
| `scripting` | Registers the content script that detects which element you right-clicked. |
| `http://*/*`, `https://*/*` (optional) | Only requested if you enable "Copy selectors from right-click menu". Needed so the content script can listen for right-clicks on any page. **You are never asked for this automatically** — it's opt-in. |

## Third-party services

None. Proteu QA has no dependencies and contacts no external servers.

## Data retention

Generated data lives only in your browser's session history (cleared when you click "Clear" or close the browser). Settings persist in Chrome sync storage until you uninstall the extension.

## Changes

If this policy changes, the update will be published here before the new version goes live.

## Contact

For questions about this policy: **jonnasrock@gmail.com**
