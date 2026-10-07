# WWHI22L26A guest features

This update applies to Xmas Whirl, ending in Paris. The ETRV18I26A project
was restored to its unchanged state after the destination-project correction.
No production deployment, database migration, commit or push was performed.

## Onward travel

The opening Today page prompts “Please complete your onward travel details.”
Days 5, 6 and 7 also show the prompt in Today and Itinerary. Opening it from
Itinerary takes the guest to the form in Today. No Day 1 deadline is shown.

- Flying from Paris: name, airport, flight date/time, terminal, airline,
  flight number and transfer choice. An unconfirmed terminal may be “Not known”.
- There is **one complimentary transfer**, explicitly chosen by the guest,
  only for departures **after 10:30**. A 10:30 departure is not eligible under
  this rule. PT/private transfer and own arrangements are separate choices.
  These are flight times, not vehicle pickup times. Confirm airport and date
  suitability with the operator before finalising transport.
- Eurostar: name, train date/time, optional train number, and whether the guest
  is flying onward from London. If yes, London airport, flight date/time,
  terminal, airline and flight number are required. If no, those fields are
  hidden and omitted from both server records and exports.
- Staying in Paris: name and that choice only. Flight details from an earlier
  choice are discarded server-side when a record is updated.

Anonymous server sessions, CSRF protection and record ownership apply without
guest sign-in. Guests cannot list or read any stored submission. Administrators can review
all submissions. Form success is displayed only after the server confirms the
save; failed saves do not replace the last confirmed local copy. A tab-scoped
copy permits editing during the existing session. As before, a new browser or
expired/replaced session does not recover the old record's ownership.

In **Tools → administrator controls → Onward Travel Sheet**, refresh records
and download the `.xlsx` workbook:

- **Paris flights**: complimentary transfer first, PT/private next, own
  arrangements next; older incomplete/ineligible records are marked for review.
  Within groups, rows sort by flight date/time and then name.
- **Eurostar and London**: train details and any onward London flight details,
  ordered by train date/time and name.
- Guests staying in Paris are omitted from both sheets.

The workbook keeps the supplied references' tabular layout and colour grouping,
with frozen headers, filters and landscape printing. Guest text is exported as
text, never spreadsheet formulas. Real workbooks are generated only on the
administrator's device and must remain outside Git. Existing older records
missing the newly required fields should be reviewed or resubmitted.

## Daily links and recaps

Every Today day and every expanded Itinerary day ends with the same day-specific
Links & Documents section. In administrator **Full Edit Mode**, expand
“Add a link or document”, paste or drag a URL, add a title and save. Both views
read the same server record; a failed save retains the previously saved links.
This accepts links to documents, not raw file uploads. Guests can open resources
but cannot change them. Private documents still require their existing access
rules; adding a link does not make a document public.

Each of the twelve Today days has a Journey Recap based on the saved itinerary,
with optional activities described as applying to participating guests. Recaps
are authored summaries, not proof that a scheduled activity actually happened.
If the programme changes, update `js/core/journey-recaps.js` accordingly.

## Analytics

Collection remains controlled by the ignored server configuration's
`analytics_enabled` setting. The source template defaults to false. No claim is
made that live collection is enabled, because production was not accessed.

The updated counters cover signed-in app opens, restored pages, foreground
returns, all main tabs, itinerary-day opens, individual tools, buttons, links,
field-change counts, form submissions, expandable sections, document/resource
opens, recaps and onward submission/export actions. Admin activity is included
and labelled separately. The dashboard remains administrator-only.

No field values, guest names, flight details, document titles, URLs, device IDs
or locations enter analytics. Only approved event names and daily counts are
stored. This is a broad activity overview, not a recording of every keystroke
or a count of unique people. Offline/blocked requests and unauthenticated opens
are not fully captured, and some event categories overlap. See `DEPLOYMENT.md`.

## Validation

Run `tests/security.test.mjs`, `tests/frontend.test.mjs` and
`tests/onward-export.test.mjs` with Node and the documented ignored dependencies.
The optional `tests/browser-features.test.mjs` exercises real Chrome with mocked
network responses. All fixtures are synthetic. Production PHP/Apache settings,
real credentials and real transport arrangements still require deployment checks.
