# Project boundary

Work in this Xmas Whirl 2026 folder only. This app is WWHI22L26A.
Preserve the existing design and features unless the user requests changes.
Never modify, deploy to, or push the EWHI11J26A project or its repository.

Hosting target: `public_html/WWHI22L26A/` on brendonbush.com.
Keep admin credentials and runtime databases out of Git. Use
`scripts/package_app.py` to produce the application-only deployment archive.
Do not overwrite server/config.local.php or .private/ during routine updates.

The tour JSON is authoritative for bundled content. Published admin overrides
are stored separately by the PHP backend. Run appropriate existing tests when
changing application behavior; use the local preview for visual checks.
