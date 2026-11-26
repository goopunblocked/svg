# Goop

Goop includes the Matrix homepage, bookmarks, in-page search, UGS and 4Games catalogs, offline games, movies, music, manga, and GoopBlox.

## Run the site

From the repository root, run `python3 -m http.server 8000 --directory site` and visit http://localhost:8000. Deploy the contents of `site/` to the root of a static host. The browser loader is included as `site/nosw.html`. Google, Bing, and Brave searches use that loader and need a working Wisp connection. The bundled loader comes from https://github.com/zaka13alt/nosw and can be refreshed with the included PowerShell script.

## Backend

Copy `.env.example` to `.env` and set the values for your deployment. Run `docker compose up --build` to start the gateway and media services. Use `docker compose --profile blox up --build` to include GoopBlox. Set the public gateway URL in `site/goop-config.js` and allow the frontend origin in the gateway configuration. See BACKEND-SETUP.md and RENDER-SETUP.md for deployment details.

The gateway source is in `backend/`. Service build files in `services/` retrieve upstream dependencies. External catalogs, game payloads, media, and the Roblox runtime require network access. The three built-in games are embedded in the homepage.

## Frontend files

The repository homepage opens site/. The app and browser routing are in site/assets/app/goop.js. The original Matrix theme and site styles are in site/assets/css/goop.css, with motion controls in site/assets/app/matrix-motion.js. Branding lives in site/assets/images/. The web manifest describes Goop, and site/sw.js caches the local interface for offline use. NoSW continues to handle online browser sessions.
