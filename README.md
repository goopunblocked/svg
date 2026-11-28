# Goop (SVG)

Goop is a single, self-contained file. Fonts, styles, scripts and the AI runtime
are all embedded, so it needs no other file from this repository to run.

## Links

| File | jsDelivr link |
| --- | --- |
| `index.svg` | https://cdn.jsdelivr.net/gh/goopunblocked/svg@main/index.svg |
| `Goop.svg` (same file) | https://cdn.jsdelivr.net/gh/goopunblocked/svg@main/Goop.svg |

Open the `.svg` link directly in a browser tab. jsDelivr serves it as
`image/svg+xml`, so its scripts run. If you put it in an `<img>` tag, its scripts don't run.

`index.html` is the same app as a plain HTML page. jsDelivr serves `.html` files
as text, so use the SVG link for jsDelivr. The HTML file is for hosts that serve
HTML, such as GitHub Pages, S3 or the gateway in `backend/`.

## Updating

1. Replace `index.svg` and `Goop.svg` with the new build (they are identical),
   and `index.html` with the new HTML build.
2. Copy the same three files into `site/`, which the gateway in `backend/` serves.
3. Push to `main`. jsDelivr caches `@main` for up to about 12 hours. To refresh
   it right away, open
   https://purge.jsdelivr.net/gh/goopunblocked/svg@main/index.svg
   (and the same with `Goop.svg`).

`tools/build.py` builds from the sources in `app/`, which are older than the
current `index.svg`. Running it would replace the current build with the older one.
