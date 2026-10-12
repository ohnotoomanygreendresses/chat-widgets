# chat-widgets

Small HTML widgets rendered inside chat sessions.

`widgets.js` exposes two functions:

- `startCard(raw, root)` renders a card picker. `raw` holds the rows to show; the file itself contains no data.
- `afterCreation(title, root)` renders follow-up buttons.

Both send their result through the host-provided `sendPrompt(text)`.

Load a tagged version through jsDelivr:

```html
<script src="https://cdn.jsdelivr.net/gh/ohnotoomanygreendresses/chat-widgets@v1.0.0/widgets.js"></script>
```

This repository holds layout and behavior only. Never commit data, names or content passed in at call time.
