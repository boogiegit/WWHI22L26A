# Deployment and private data

This is a plain HTML/CSS/JavaScript tour companion with a PHP API. This WWHI22L26A project is prepared for a PUBLIC source repository at the owner’s request. Only reviewed application source and public tour assets belong in Git. Local configuration, admin credentials and runtime data remain excluded.

Use `python3 scripts/package_app.py` to create `dist/WWHI22L26A-app.zip`. Extract it only inside `public_html/WWHI22L26A/`. Never write to EWHI11J26A. The older recovery notes below describe inherited security features; they do not imply that recovered private files are present in this new project.

## Requirements and initial configuration

Use PHP 8.2+ (8.3 recommended), PDO SQLite, sessions and password hashing. Enable
GD with JPEG/PNG/WebP support if enabling photo uploads. Apache 2.4 needs
`mod_rewrite`, `mod_authz_core`, `mod_headers`, `mod_access_compat` (for the
retained legacy `data/.htaccess`), and AllowOverride permission for
this folder's `.htaccess` rules. Use HTTPS. Do not deploy on a static-only host or
use a server that ignores these rules. For Nginx, implement and verify equivalent
private-path routing and deny rules before supplying any private documents.

1. Deploy only reviewed repository-eligible application files; never copy this
   entire recovery working directory. Do not include `tests/`, `.private/`,
   databases, recovery exports, local development dependencies or operational
   documents in a public upload package.
2. Copy `server/config.example.php` to `server/config.local.php` on the server.
   The local file is ignored by Git and direct HTTP access to `server/` is denied.
3. Set the exact `origin` (scheme, hostname, optional port; no path) and
   `base_path` (the deployed subdirectory, with leading/trailing slashes).
   HTTPS must reach PHP as HTTPS. Do not blindly trust user-supplied proxy headers.
4. Configure the administrator unlock PIN privately on the server. Store
   only its PHP `password_hash()` output in `admin_password_hash`. There is no
   guest password/hash, default password or browser-side secret. Do not reuse
   the recovered PIN/token. Never commit plaintext passwords or real hashes.
5. Increment `session_version` whenever passwords are rotated or all sessions
   must be revoked. Sessions have an absolute 12-hour default lifetime. Cookies
   are HttpOnly, Secure and SameSite=Strict; IDs rotate at sign-in and admin lock.
6. Ensure PHP can create/write `.private/` and, if enabled, `uploads/photos/`.
   These paths must remain HTTP-inaccessible except through the authorized file
   endpoint. Do not grant world-writable permissions. The database is newly
   created as `.private/runtime.db`; the recovered `data/storage.db` is never
   automatically opened or migrated.
7. Supply an approved WhatsApp community invitation in the ignored configuration
   if needed. The previous invitation is preserved ONLY in ignored
   `.private/recovered-community.json` in this working copy. Review/rotate it
   before reuse. Only administrators receive the invitation. It is not exposed to public visitors.
8. Optional `tomtom_browser_key` is a browser-visible key. Apply provider origin
   and usage restrictions. Never place a privileged API secret in this setting.

One way to hash a new password without putting plaintext in shell history is to
run this interactively on a trusted machine (the output is the hash to copy):

```sh
python3 -c 'import getpass,subprocess; subprocess.run(["php","-r","echo password_hash(trim(stream_get_contents(STDIN)), PASSWORD_DEFAULT), PHP_EOL;"], input=getpass.getpass("New password: "), text=True, check=True)'
```

Keep the resulting hash private too. Configuration failures return HTTP 503
without exposing configuration values or filesystem paths. The administrator hash must
be configured before the API operates. Public static tour content still opens
without a configured or available API; submissions and admin editing require it.

## Access model and operational data

Opening `?admin=1` on either the folder URL or `app.html` now requests a fresh
admin PIN unlock, including when an earlier admin session exists. On success,
Quick Edit Today opens with editable schedule times, titles and short notes.
The PIN remains verified on the server. The editor uses a readable light panel
even when the device uses dark mode.

The Trafalgar Eurostar extension form collects only London flight date, time,
flight number and terminal. Train date/time/number, London airport and airline
are no longer requested or required. Previously stored records remain intact;
new submissions and updates store only the relevant fields.

In **Tools → Usage Analytics**, “Onward travel forms completed” counts currently
saved onward records, with Paris-flight, Eurostar and staying-in-Paris totals.
Updating a form does not add another completion; separate submissions from
another browser/device can. This is a record count, not verified unique people,
and is independent of the optional 90-day activity counters. Only administrators
can view these totals. No names or travel details are added to analytics events.

Use **Tools → Onward Travel Sheet → Download Excel Sheet** (also linked from
Usage Analytics). One worksheet prints on exactly one A4 portrait page, fitting
both width and height. Larger lists therefore print in smaller text. The columns
are Name, Journey, Flight date, Time, Flight no., Terminal and Transfer. City,
airport and airline columns are omitted; the form still collects the travel details.
Paris flights retain complimentary/private/own-arrangements grouping, followed
by Eurostar travellers whose rows show London flight details or “No flight”.
Guests staying in Paris are included in the bottom tally but are not listed by name.
The footer counts complimentary transfers, private transfers, Eurostar and staying
in Paris, plus own/review arrangements when present. These are saved-form counts.
Eurostar travellers' London flight date, time, flight number and terminal use bold
italic Georgia to distinguish them from Paris flight details.

Normal visitors open the tour without signing in. An anonymous HttpOnly session
provides CSRF protection and submission ownership; it is not an authenticated
identity or a grant of private-data access.

| Capability | Access |
| --- | --- |
| Itinerary, hotels, experiences, normal tools, director-published daily notices/resources | Public read |
| Onward form | Anonymous validated submission/update of that session's own record; no server read/list/delete |
| Fixed aggregate analytics events | Anonymous collection when enabled; rate-limited and no free-form fields |
| All onward records, exports, analytics summaries, management writes/deletes | Administrator only |
| Recovered tickets, seating plans, meal choices, uploaded photos, group introductions/comments | Administrator only |
| Community invitation | Administrator only |

The public storage read allowlist is limited to director-published tour content:
`admin-note:`, `admin-brief:`, `admin-day-content:`, `optional-content:`,
`optional-image:`, `meeting-points:`, `day-resource-links:`, `city-guide-links:`
and exact `host-content`. These editors publish to everyone: do not put guest
records, credentials or private links in them. All other storage reads default
to private. Recovered databases are never migrated automatically. Review any
existing runtime content in these public namespaces before upgrading a live site.
Uploaded image URLs remain protected even if pasted into public content; use
reviewed static assets for public images.

Guests cannot fetch stored onward details, including their own, by a guessed URL
or key. Their tab-local draft supports editing during the current session; only
administrators can retrieve server records. A new browser or replaced session
cannot update the old record. There is no guest login or individual ticket portal.
Photos, introductions and their editing tools are available only to admins so
removing the guest password does not publish people's information.

Use **Tools → Unlock Admin** to enter your Admin PIN. The PIN is configured privately before deployment; there is no guest setup,
account or username. PHP
verifies the hash, rotates the session ID, and grants an expiring admin session.
Every private endpoint checks the server session; URL parameters and client-side
flags cannot authorize it. **Lock Admin** removes the server privilege, rotates
the session, clears local tour state and reloads the public app. HTTPS, CSRF,
same-origin checks, rate limits, private-path rules and no-store responses remain.

The following operational paths remain on disk in this working copy but are
ignored, even where the recovered contents look synthetic. This prevents a later
replacement with real data from silently becoming eligible for Git:

- `data/*` except `data/.htaccess`; all database files and sidecars anywhere.
- `menu-choices.json`, `moulin-rouge-menu-choices.json`, legacy `tour-data.json`
  and `tour-data.js` (the app normally loads `tours/WWHI22L26A/`).
- `seating-plans/`, `venice-passes/`, ticket indexes/PDFs under
  `colosseum-tickets/` and `pantheon-tickets/`. The reusable Pantheon HTML page
  is retained. Venice now reads its index from ignored `venice-passes/index.json`.
- Uploads, imports/exports, guest/passenger/rooming lists, private operational
  folders, spreadsheets, logs, backups, local credentials, deployment archives
  and generated test dependencies. See `.gitignore` for exact patterns.

Missing private files do not prevent app startup or service-worker installation.
Private menus, tickets and passes require administrator access. The legacy
`guest_files` allowlist is no longer supported: adding it cannot expose a private
file. Supply genuinely public resources as reviewed public assets instead.

Existing relative private-file URLs are rewritten to `api.php?action=privateFile`.
The endpoint checks the session, path, extension, real path, and administrator authorization.
Direct database/configuration/recovery downloads are denied. Protect equivalent
paths in any reverse proxy/CDN and never cache their responses.

The retained itinerary, hotel, experience and branding JSON, maps, source code,
and host/business contact defaults are intended repository content. They are
static assets and are NOT protected by the API login. Review whether that travel
schedule, business contacts and image usage are suitable for the actual website
audience. Use a whole-site access gate if those static assets must also be private.
Do not add private guest data to these retained files or to HTML/JavaScript.

## Photos, analytics and browser privacy

Photo sharing is disabled by default. Set `uploads_enabled` only after verifying
GD, permissions and disk quota. Server uploads have size/dimension/rate/quota
limits and are decoded/re-encoded without original EXIF/GPS. The frontend no
longer reads GPS or stores original filenames. Six recovered repository images
were stripped losslessly; their colour profiles and decoded pixels were kept.
Other approved assets are retained; review author/copyright metadata and visual
content when adding future images.

All uploaded gallery images, thumbnails and administrator experience images must
use `uploadPhoto`. Thumbnails reuse the processed display image. Upload errors
are reported; no raw base64 or local fallback is saved. The general storage API
rejects data/blob URLs for every role and key, including nested values and
browser-normalized schemes containing tabs or line breaks. Photo
records accept only registered, existing processed files whose digest matches
the upload registry. Unknown extra gallery fields are discarded. The upload quota
counts the actual processed JPEG bytes while holding a shared upload lock.

The upload registry is automatically created as `photo_uploads` in the private
runtime database. Existing files that did not pass through this version's image
processor are not eligible for delivery as uploaded photos; re-upload them through
the authenticated uploader. Older inline records are hidden on reads and need to
be re-uploaded as well. No recovered files or databases are migrated or deleted.
Local preview remains available for the tour, but image sharing requires the
configured, authenticated server. Configured external editorial image URLs and
repository images remain ordinary approved assets, not uploaded image bytes.

Analytics is disabled by default. Set `analytics_enabled => true` in the ignored
server configuration to collect activity after deployment. If enabled, only the
fixed allowlist in `config/analytics-events.json` is accepted: public and administrator opens and
returns, tabs, itinerary days, tools, buttons, links, field-change counts, document
and resource opens, recaps and onward-travel actions. Administrator counts have
an `admin:` prefix. Extra fields and dynamic labels are rejected.
Storage consists of daily aggregate counts, with no device ID, URL, guest name or form value. App loads/returns also count broad device classes (not exact phone models) and country codes from the trusted server `GEOIP_COUNTRY_CODE` variable. Client country headers are ignored. If server GeoIP is unavailable, country is Unknown; no external geolocation service receives guest IPs. Raw user-agent strings and IPs are not stored in analytics. Device/country counts begin with this version and do not identify unique people. On each accepted event, activity counts older than 90 days are
removed. If collection is stopped, existing counts remain until explicitly
removed by the operator. Authentication/rate-limit buckets use short-lived
hashed IPs for abuse control; those are not analytics. Web-server/CDN logs have
their own retention policy and must never log request bodies or passwords.
These counters do not guarantee every interaction is recorded: there is no
offline retry queue, failed/blocked requests can be lost, and visits before
authentication are excluded. Click and feature counters overlap and must not be
added together as a count of unique actions or people. Earlier unrecorded usage
cannot be reconstructed. Separate ticket/viewer pages are counted when opened
from the main app, not by tracking every interaction inside those pages.

## Onward travel, daily resources and recaps

See `TOUR-FEATURES.md` for the Paris airport/Eurostar form, single complimentary
transfer rule, authenticated Excel export, daily resource editing and all twelve
recaps. New guest submissions remain in the private runtime database. No extra
database or public guest index is required. Supply operational credentials and
data separately as described above; never deploy the recovered database.

The service worker caches only an explicit list of application code/icons.
Navigation, API responses, tour JSON, private documents, uploads and third-party
responses are never put in Cache Storage. API/private requests also bypass the
HTTP cache. Only this app’s `wwhi22l26a-*` caches are removed at activation; original-tour caches are preserved. A live
migration should verify that existing devices activate the new worker and clear
old caches; no source update can recall documents previously downloaded by users.
Fresh authenticated data and full app startup require a network connection.

Shared data uses in-memory caches; personal/local drafts and admin fallbacks use
tab-scoped sessionStorage. Sign-out clears this application's `tour:` browser
storage and reloads. Legacy browser storage is also cleared when an unauthenticated
session opens the public app. Data already displayed on a page cannot be
recalled remotely. Close/sign out on shared devices. Generic app preferences
may still use localStorage. Submitted resource URLs are no longer sent to an
external link-preview service. Maps, fonts, translation/weather services and
other existing external links still have their usual third-party network behaviour.

## Local preview and tests

Do not use an unrestricted static file server on the recovery folder: it can
expose ignored material and does not run the API or `.htaccess` protections.
With native PHP installed, start a loopback-only preview using the included router:

```sh
php -S 127.0.0.1:8080 tests/dev-router.php
```

Open `http://127.0.0.1:8080/app.html?preview=1` for an explicit read-only-source
preview without a configured API. Server privileges are never granted by this
parameter. To test actual authentication locally, create the ignored config with
origin `http://127.0.0.1:8080`, base path `/`, a new test-only administrator password hash and
`allow_http_localhost => true`, and open `/app.html` without `preview=1`.
Never enable the HTTP exception on a live server.

The automated tests use isolated PHP-WASM 8.3 and a DOM simulator. They do not
deploy or connect to Hostinger. Install their pinned dependencies only under the
ignored test folder (Node.js 24 recommended):

```sh
npm install --prefix tests/.runtime --ignore-scripts @php-wasm/node@3.1.52 @php-wasm/universal@3.1.52 ignore@7.0.8 linkedom@0.18.13
node tests/security.test.mjs
node tests/frontend.test.mjs
node tests/onward-export.test.mjs
# Optional native Apache test on macOS:
node tests/apache.test.mjs
```

The optional real-browser test, `tests/browser-features.test.mjs`, requires
Playwright (install it under ignored `tests/.runtime/`) and Google Chrome. It
mocks all network requests and writes synthetic screenshots and a disposable
browser profile only under `tests/.runtime/`. Set `TMPDIR` to that folder when
running it. `PLAYWRIGHT_MODULE` may point to an existing Playwright installation.

The PHP test writes a synthetic test site, new temporary password hashes,
database and sessions beneath `tests/.runtime/`. It never reads the recovered
database or uses real guest/ticket data. PHP-WASM needs loopback socket permission.
These tests supplement, rather than replace, verification on the target PHP and
Apache installation, especially the hosting provider’s rewrites, proxy/TLS setup, cookie handling and image libraries.
The isolated tests do exercise multipart image uploads; the native Apache test
checks deny/rewrite rules using synthetic files and a stand-in API handler.

Before live use, verify direct requests to database/configuration/recovery paths
are denied; private documents reject anonymous users; password-free public startup and administrator sign-in/lock work; and private responses are never cached by the server/CDN. Supply
private files and runtime config separately, with appropriate access and retention.
Review the candidate Git file list before the FIRST commit. `.gitignore` does not
sanitize already tracked files or recognize private content added under arbitrary
new filenames. See the current repository history and local deployment status for publication progress.

Couples select two people on the onward form. Their names stay in a single export row labelled “(2 people)”; all transfer tallies count people. Existing forms without a party size count as one until updated; names are never heuristically split. The analytics summary reports both saved forms and people represented.
