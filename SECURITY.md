# Security

Report a vulnerability through GitHub's private reporting on this repository
(**Security → Report a vulnerability**). Do not open a public issue for it.

Supported: `main`. https://screens.guide serves what `main` builds, and the plugin's install channel
reads `main`, so a fix is published by landing there.

## What counts as a vulnerability here

- A way to run a script in a visitor's browser on https://screens.guide: through a page, a data
  file, a Markdown copy or a query parameter such as `/compare?ids=`.
- A request to `https://screens.guide/mcp` that reads anything other than the dataset, changes any
  state, or gets past the `Origin` check or the rate limit.
- A response that lets another site read or frame a page in a way the headers in
  `public/_headers` or the Worker do not allow. The data files, `llms.txt` and the Markdown copies
  carry `Access-Control-Allow-Origin: *` on purpose.
- A usage event that carries more than its spec lists, such as the client's address, text a client
  sent or a `check_layout` frame; a cookie or browser storage entry the site sets before the
  visitor chooses "Allow cookie"; or one that the "Cookies" section of `/privacy` does not list.
- A value in `data/devices.json` that reached it by any route other than the exporter.
- A skill under `skills/` that instructs an agent to run a command, fetch and execute code, or send
  a credential anywhere.
- A private repository name, internal path or internal planning reference that reached a published
  file, commit message or page.
- A credential in the repository. The PostHog project token in the specs and the pages is the
  project's public key, which every visitor's browser sends.

A wrong measurement is a defect, not a vulnerability: open an issue naming the device, the runtime
and the field.
