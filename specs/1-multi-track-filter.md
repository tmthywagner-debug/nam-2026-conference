# Select several tracks at once on the Schedule page

## What this changes
On `/schedule` the Track chips become a multi-select: clicking a track adds it, clicking a selected track removes it, and "All" clears the selection. The list shows sessions whose track is any selected one. The selection lives in `?track=a,b` (comma-separated, one key), so a reload or a shared link keeps it, and today's `?track=a` links are unchanged. The other filters still narrow the result.

## Where
- `server/routes/sessions.js` — the `trackSlug` line (~38): split on commas, trim, drop empties, and push `t.slug IN (?, ?, …)`; one value yields the same query as today. Update the `Filters:` comment. `speakers.js` reads its own params and is untouched.
- `src/pages/SchedulePage.jsx` — Track chip block (~163-182): derive `selectedTracks = filters.track === ALL ? [] : filters.track.split(',')`; a chip is active when its slug is in that list, and clicking it calls `set('track', next.join(','))` with the slug added or removed (empty → `ALL`, which deletes the key). Each track chip gets `aria-pressed`, and "All" gets `aria-pressed` when nothing is selected. `filters.track`, `activeKeys`, `BLOCKERS` and the `useFetch` deps already treat the value as one opaque string, so they need no change; `qs()` in `src/lib/api.js` passes the comma through (`URLSearchParams` encodes it as `%2C`, which Express decodes).
- `tests/api/sessions-tracks.test.js` (new) — API layer via `startApi`/`client` from `tests/api/harness.js`.
- `tests/schedule.spec.js` — Playwright, in the `Schedule` describe, using `visit`, `waitForResults`, `API` and `conferenceDays` from `tests/helpers.js` (read-only, default lane; no reservations are touched).

## How it will be proved
| Done when | Check | Layer |
| --- | --- | --- |
| Two or more tracks list only talks from those tracks | `GET /sessions?trackSlug=a,b` returns exactly the union of the `a` and `b` results, every item's track is `a` or `b`, and the count is larger than either alone | API |
| Two or more tracks list only talks from those tracks | On `/schedule?view=list`, clicking track A then track B makes `result-count` equal the API's A∪B count; clicking A again drops it to B's count (a removal, not only additions) | Playwright |
| Selection kept in the URL; single-track links still work | After the clicks the URL has `track=a%2Cb` (or `a,b`) and a reload keeps both chips `aria-pressed=true` and the same count; `?track=a` loads with only A pressed and A's count | Playwright |
| Single-track links still work | `trackSlug=a` returns the same ids as before the change (pinned by the existing `endpoints.test.js` row plus the union test's single-value case) | API |
| Other filters still combine | `trackSlug=a,b&day=<d>` equals the A∪B sessions on that day, and `&level=<l>` narrows further; in the page, a selected pair plus a `day` tab matches the API count for the same filters | API, Playwright |
| Tests cover the filter rule and the page | The rows above | API, Playwright |

## Decisions
- Use one `?track=a,b` key (the convention in `schedule.md` Gotchas) rather than repeated `?track=a&track=b` — OK?
- Show "All" as pressed only when no track is selected, and clicking it clears the selection — OK?
- An unknown slug in the list is ignored by the query (it matches nothing) rather than rejected — OK?

## Out of scope
Other filters, new pages, My Agenda, `/speakers?trackSlug=`.
