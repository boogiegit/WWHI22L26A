# Xmas Whirl 2026 · WWHI22L26A

Independent, editable tour companion for WWHI22L26A. This repository and its
Hostinger deployment are separate from EWHI11J26A.

## Run and edit

Double-click `Preview App.command`, or run `python3 scripts/preview.py`.
The preview supports Today days 1–12. Production admin saving uses PHP.

- `app.html`, `css/`, `js/`: interface and features.
- `tours/WWHI22L26A/`: itinerary, hotels, experiences, resources and branding.
- `assets/`: images and maps.
- `api.php`, `server/`: authenticated admin editing and submissions.

No frontend build or framework conversion is required. Source files are the
editable application. The itinerary and dates remain starter content awaiting
the final Christmas itinerary. Montmartre is €50; its timing is still TBC.

## Publish to Hostinger

Run `python3 scripts/package_app.py`. Upload and extract
`dist/WWHI22L26A-app.zip` **inside `public_html/WWHI22L26A/` only**.
The archive includes `.htaccess`, application code, tour JSON and assets.
It excludes all credentials, private runtime data and development files.

Configure `server/config.local.php` separately using the example. Use PHP 8.2+
with PDO SQLite and cURL, origin `https://brendonbush.com` and base path
`/WWHI22L26A/`. Never upload over EWHI11J26A or reuse its local configuration.
Updates preserve the new app's `.private/` database and `config.local.php`.

Expected app: https://brendonbush.com/WWHI22L26A/app.html

Unlock admin from Tools, or open `app.html?admin=1`. The app supports installation
to a home screen using its own manifest and scoped service worker. Online access
is needed for fresh tour data, admin changes and submissions.

## Public repository

This repository contains application source and public tour content. Passwords,
local configuration, databases, uploaded guest files and deployment archives are
excluded by `.gitignore`. See `DEPLOYMENT.md` for backend configuration and tests.


## Phone admin shortcut
Guest link: `https://brendonbush.com/WWHI22L26A/app.html`.
Director link: `https://brendonbush.com/WWHI22L26A/admin.php`.
Save the director link separately to the phone Home Screen as **Whirl Admin**.
It opens Announcements and uses the existing server session and PIN; it never
puts a PIN in the link. Its manifest has a separate app identity. Session expiry
or Lock requires the PIN again. Device installation should be checked on the
actual phone; browser support for multiple installed apps varies.

AI polishing is optional. Configure `openai_api_key` and `openai_model` only in
Hostinger's existing `server/config.local.php`, preserving all other settings.
Do not commit that file or send the key in chat. The API account has separate
billing. The button remains disabled until configured. Only administrators can
call the endpoint, with CSRF protection and 30 requests/hour. Draft text is sent
to OpenAI only on request (`store: false`); the result is reviewed before posting.
Dictation uses supported browser speech recognition or the phone keyboard microphone.
The composer supports links, one photo and one video/audio clip (20 MB) per post.
