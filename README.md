# chat-widgets

Small HTML widgets rendered inside chat sessions.

`widgets.js` exposes two functions:

- `startCard(raw, root)` renders a card picker. `raw` holds the rows to show; the file itself contains no data.
- `afterCreation(title, root)` renders follow-up buttons.

Both send their result through the host-provided `sendPrompt(text)`.

Load a fixed version through jsDelivr by pinning a full commit hash:

```html
<script src="https://cdn.jsdelivr.net/gh/ohnotoomanygreendresses/chat-widgets@<commit-hash>/widgets.js"></script>
```

A pinned hash never changes, so a new commit only takes effect once the caller switches to its hash.

This repository holds layout and behavior only. Never commit data, names or content passed in at call time.
