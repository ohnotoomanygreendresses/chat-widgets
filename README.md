# chat-widgets

Small HTML widgets rendered inside chat sessions.

`widgets.js` exposes three functions:

- `startCard(raw, root)` renders a card picker from rows passed in at call time.
- `startCardSealed(key, root)` reads the encrypted snapshot in `data/start.txt`, opens it with `key`, and renders the same picker.
- `afterCreation(title, root)` renders follow-up buttons.

All send their result through the host-provided `sendPrompt(text)`.

Load a fixed version of the code through jsDelivr by pinning a full commit hash:

```html
<script src="https://cdn.jsdelivr.net/gh/ohnotoomanygreendresses/chat-widgets@<commit-hash>/widgets.js"></script>
```

A pinned hash never changes, so a new code commit only takes effect once the caller switches to its hash.

## Snapshot

`data/start.txt` is the only data in this repository, and it is encrypted (AES-256-GCM). `widgets.js` reads it from the `main` branch, so a refreshed snapshot takes effect without changing the caller. The key is never committed.

`tools/seal.py` writes and reads the snapshot (see its header for usage). After pushing a new snapshot, purge the jsDelivr cache:

```
curl https://purge.jsdelivr.net/gh/ohnotoomanygreendresses/chat-widgets@main/data/start.txt
```

Never commit plain data, names, or content passed in at call time.
