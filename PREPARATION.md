# Working-copy preparation record

This records the original recovery/privacy preparation. The subsequent tour
feature update is documented in `TOUR-FEATURES.md`; the counts and verification
results below describe the earlier preparation rather than the current feature tests.

Prepared only this recovered `WWHI22L26A` working folder. No Git initialization, commit,
publication, push, deployment or changes to the separate Hostinger Recovery copy
were performed. No recovered file was deleted. The working folder still contains
private recovered data; it is not itself a public deployment bundle.

## Existing files changed (16)

| File | Change |
|---|---|
| `README-FIRST.txt` | Replaced the inaccurate privacy/deployment claim with pointers to these instructions. |
| `api.php` | Replaced hardcoded-token API with server session authentication, authorization, CSRF, owned guest records, protected private-file delivery, validated uploads with a digest registry and exact-byte quota, rejection of inline image storage for both roles, fixed aggregate analytics and append-only photo feedback. |
| `app.html` | Removed embedded credentials and invitation; integrated administrator-only sign-in and password-free public startup and server-confirmed admin lock, runtime community/key settings, authenticated uploads, safe feedback actions, tab-scoped private drafts and fixed-event analytics; stopped extracting photo GPS/original filenames, removed EXIF library and third-party URL preview requests; removed the excluded legacy script dependency; routed gallery/experience uploads through the server, reused processed images as thumbnails and removed failed-upload inline/local fallbacks. |
| `js/services/storage.js` | Added CSRF to writes; removed browser admin token; remote shared records no longer fall back to persistent private copies; local state uses sessionStorage; included host-content hydration. |
| `js/services/admin-content-storage.js` | Changed local admin-content fallbacks from persistent localStorage to tab-scoped sessionStorage. |
| `js/services/analytics.js` | Replaced identity/location/label-based tracking with opt-in fixed event names and aggregate count display. |
| `sw.js` | Explicit static-only cache; excluded private/runtime files and navigation; no-store private requests; removal of old app caches. |
| `colosseum-tickets.html` | Validated loaded indexes/document paths, escaped displayed record fields, checked HTTP errors and improved missing-access messaging. |
| `pantheon-tickets/index.html` | Same ticket-viewer protections; remains eligible for Git while its operational index/PDFs are ignored. |
| `venice-passes.html` | Moved the verified synthetic embedded index into ignored runtime JSON; added index/path validation, escaped displayed fields and handled missing access/data. |
| `assets/shared/experiences/mount-pilatus-and-lake-cruise.jpg` | Lossless removal of EXIF/XMP/IPTC/comments, including GPS. |
| `assets/shared/experiences/swiss-countryside-and-carriages.jpg` | Same metadata removal. |
| `assets/shared/experiences/mount-stanserhorn.jpg` | Same metadata removal. |
| `assets/shared/today-heroes/rome-02.jpg` | Same metadata removal. |
| `assets/shared/today-heroes/lucerne-02.jpg` | Same metadata removal. |
| `assets/shared/today-heroes/paris-02.jpg` | Same metadata removal. |

The six JPEGs retain their dimensions, ICC colour profiles and exactly the same
decoded RGB pixels. Their original orientation was normal, so no rotation or
recompression was required. Other existing images were not altered.

## New repository-eligible files (12)

| File | Purpose |
|---|---|
| `.gitignore` | Runtime/private data, operational document locations, spreadsheets, credentials, archives, backups and generated tooling exclusions. |
| `.htaccess` | Apache denies for private/configuration/database/dependency paths, authorized operational-file rewrites, directory-listing prevention and response security headers. |
| `server/bootstrap.php` | Fail-closed configuration, HTTPS/origin enforcement, private sessions/database, CSRF, rate limiting, inline-data rejection, processed-photo registry checks and storage-access helpers. |
| `server/config.example.php` | Safe configuration template with an empty administrator password hash and invitation; analytics/uploads disabled. |
| `server/.htaccess` | Denies direct HTTP access to server code/configuration. |
| `js/services/auth.js` | Password-free public startup, server session state, admin upgrade/downgrade support, CSRF handling and sign-out/storage clearing. |
| `DEPLOYMENT.md` | Live configuration, access model, private data handling, functionality limitations and test instructions. |
| `PREPARATION.md` | This exact file/change record. |
| `tests/security.test.mjs` | PHP-WASM integration, permissions, upload, privacy, ignore rules and syntax regression tests. |
| `tests/frontend.test.mjs` | DOM-simulated full startup, navigation, authentication integration, analytics and service-worker checks. |
| `tests/apache.test.mjs` | Native loopback Apache deny/rewrite/header tests with synthetic files and a stand-in API handler. |
| `tests/dev-router.php` | Safe loopback PHP development router; excludes private/configuration paths and routes operational files through authentication. |

## New ignored local files and generated tooling

- `venice-passes/index.json`: the existing verified synthetic pass record moved
  out of HTML. Its operational location is ignored so later real replacements
  cannot accidentally enter Git.
- `.private/recovered-community.json`: preserves the previous community invitation
  locally; never deploy or commit this recovery record. No original admin PIN or
  token was copied into any new file.
- `.private/.htaccess`: additional deny rule for local/private files.
- `.private/before-sha256.json`: original file hashes, without file contents.
- `.private/image-verification.json`: lossless image verification results.
- `.private/preservation-verification.json`: changed/unchanged original-file results.
- `.private/candidate-files.json`: candidate repository file list after exclusions.
- `.private/preparation-inventory.json`: complete created/changed path inventory,
  including generated dependencies and synthetic test files. It is deliberately
  ignored and must not be deployed.
- `tests/.runtime/`: isolated downloaded test dependencies, package manifests,
  cache/store/state, and synthetic PHP/Apache test sites, hashes, sessions,
  databases, image uploads and logs. All generated tooling stays ignored. It is
  approximately 1 GB and is disposable; it is not an application dependency.

All existing runtime databases, operational files, meal-choice files, seating
plans and ticket/pass PDFs were preserved on disk and excluded. Although many
current records/documents are sample-labelled, their operational locations are
not used as committed fixture directories. `data/.htaccess` is unchanged and
retained. Branding, reusable CSS/JavaScript, tour itinerary/hotel/experience data,
source-document references and existing host/business profile content remain
available as application source. No machine-specific private filesystem paths were introduced in application
configuration or examples.

## Verification

- **Current security regression suite**: PHP 8.3 parsing; missing-config fail-closed behaviour;
  administrator sign-in and anonymous public access; secure cookie attributes and session rotation; anonymous
  private API denial; CSRF and cross-origin rejection; tour namespace restrictions;
  anonymous write-only onward submissions and admin-only reads/listing; administrator access;
  default-disabled uploads; real multipart invalid/valid image uploads; quota;
  server sanitisation of submitted photo locations/names; inline/nested image rejection, registered-file integrity, invalid thumbnails, exact quota boundaries, synthetic EXIF GPS removal and failed-upload fallback denial; administrator-only comments and
  reactions; private-file authentication and symlink/traversal protection;
  fixed analytics allowlist/extra-field rejection and aggregation; server-side
  admin lock/logout; login throttling; Gitignore exclusions; retained source;
  all retained JavaScript/inline-script syntax and development-router PHP syntax.
- **Frontend checks passed**: full tour startup, six main tabs, URL-PIN rejection,
  admin dialog/server-confirmed unlock and lock, runtime invitation plumbing,
  outgoing analytics filtering, processed gallery/experience uploads and thumbnail references, failure-without-storage behaviour, precache resource existence, private-cache bypass
  and selective cleanup of legacy app caches. Uses a simulated DOM with synthetic
  API responses; it is not a visual browser or mobile-device acceptance test.
- **Native Apache tests passed**: direct private/database/configuration paths
  denied; operational files routed to the handler instead of served directly;
  query routing cannot expose private file bytes; reusable viewer and security
  headers retained. Uses synthetic files, not recovered material.
- **Preservation passed**: all 141 original files still exist; 125 are byte-for-byte
  unchanged, including `data/storage.db`. Only the 16 files listed above changed.
- **Image checks passed**: all six have no EXIF and unchanged decoded pixels and
  dimensions. No separate recovery originals were touched.
- Candidate-source scan found no original invitation or legacy embedded-admin
  credential mechanism. No Git metadata exists. Ignore matching was tested using
  a Gitignore-compatible parser without creating a repository.

The tests do not validate the real Hostinger PHP configuration, CDN rules,
third-party availability, mobile layout or existing devices' service-worker
migration. Those remain deployment checks. No live password hashes or production
configuration have been supplied. See `DEPLOYMENT.md` for the exact requirements
and the limits of public tour access, session-based ownership and offline use.
