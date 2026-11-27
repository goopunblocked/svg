# Goop

Goop’s HTML and SVG editions share one interface, including the sidebar, Home, games, web tabs, media, AI, and Chat. You can publish the checked-in files directly.

## Update your existing Goop sites

1. In the repository that runs your Goop Chat gateway, upload `backend/chat.mjs`, `backend/chat-store.mjs`, and the new `backend/player.mjs` from this project, keeping them together at their current paths. Redeploy that service first. It adds tables for saved items, invitations, and game reports to the existing chat database on first use. Keep your current database connection and admin settings.
2. Extract this ZIP and upload its contents to the root of your Goop front-end repository. The two public entry points are `index.html` and `index.svg`. If you also serve Goop from S3, upload the entry files there with content types `text/html` and `image/svg+xml`. Open the SVG as a page in its own tab.
3. The web tabs use Goop’s existing isolated browsing helper on the mathscholar S3 bucket in us-east-1. Upload a copy of this release’s `index.svg` to the same bucket under the existing key **Goop.svg**, with content type `image/svg+xml`. Keep the existing NoSW assets for the older fallback. The helper and your configured Wisp server need to be reachable for web searches. Home goes back to the current site’s address.
4. For account features, serve the front end from a trusted HTTPS origin allowed by the gateway’s existing `CORS_ORIGINS` setting. To add a dedicated Goop hostname, append its exact origin to the comma-separated list. Storage and origin permissions on shared CDNs are shared across projects on that hostname. Use your dedicated S3 or custom origin for signed-in chat and sync.

The portable entry files include their interface, styles, built-in games, and AI engine. Web browsing, external catalogs, media, chat, and first-time model downloads use their existing network services.

## What players can do

- Home shows the last five distinct games played on this browser. Built-in 2048 and Tic Tac Toe also restore the saved board. Other games reopen from the list.
- Type at least two characters in Home search for game, movie, and manga suggestions. Select a result to open it in Goop, or press Enter to search the web with the selected engine.
- Use the tab bar to open multiple web pages. Switching to Chat, AI, a game, or Home keeps each web tab alive until it is closed or the Goop page reloads.
- Select **Invite to Chat** in a game and choose a text channel or an existing DM. Start a DM in Chat first if needed. For skribbl.io and Gartic Phone you can paste the game’s room invitation so the recipient joins that room. Other invitations open the selected game.
- Select **Report game** in a game to send a note and any available player error. A signed-in visitor with a current admin session can resolve it in **Chat → Review reports**.
- To sync bookmarks and favorite games, sign in to the same Chat account and opt in on each device under **Settings** or **Chat → Account**. The first sync merges the device’s items with the account. Game boards and the recent-games list stay on the device.

## Build and run

Edit the shared app files under `app/`. The gateway addresses live in `site/goop-config.js`. Rebuild both entry points and their copies in `site/` with Python 3.

```sh
python3 tools/build.py
```

To run the site and local SQLite chat gateway together, use Node 22.13 or newer from the repository root.

```sh
npm ci --prefix backend
node backend/server.mjs
```

Open `http://localhost:4000/` or `http://localhost:4000/index.svg`. The existing Compose setup can also run the gateway and the media services. The gateway regression test uses a disposable SQLite database and two temporary accounts.

```sh
node --test tests/player.test.mjs
```
