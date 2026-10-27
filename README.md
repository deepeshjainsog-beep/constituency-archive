# Boundaries

An open reference publishing the pre-2008-delimitation electoral maps of India's
state legislative assemblies, one state at a time. Live at
[boundaries.in](https://boundaries.in).

Static site; no backend, no build step, no dependencies. Every state page is
rendered in the browser from the files under `states/`.

## Layout

```
index.html                  Homepage: India map + register of all states
state.html                  Shared state-page template (state.html?state=<slug>)
essays.html                 Essay index, built from essays/manifest.json
limitations.html            What the archive can and cannot tell you
submission-guidelines.html  What we want from essay contributors
privacy.html, terms.html    Policy pages (readable without signing in)
notes.html                  Old address; redirects to essays.html
sitemap.xml                 Every public page, for search engines
CNAME                       Custom domain for GitHub Pages (boundaries.in)

assets/styles.css           Design system
assets/theme.js             Light/dark switch; also loads auth.js on every page
assets/auth.js              Required Google sign-in (see below)
assets/home.js              Renders the homepage register from the manifest
assets/state.js             Renders a state page from its data.json
assets/search.js            Seat search across all live states
assets/essays.js            Renders the essay index
assets/india-map.svg        Homepage map; one shape per state (data-slug)

states/manifest.json        Every state, with status: "live" | "coming-soon"
states/<slug>/data.json     The state's data module
states/<slug>/map-pre2008.svg    Pre-delimitation constituency map
states/<slug>/map-post2008.svg   Post-delimitation map
states/<slug>/hero.jpg      Picture in the state page header
states/_template/data.json  Skeleton to copy for a new state

essays/                     Essays: template, manifest, how-to (essays/README.md)
admin/                      Decap CMS editor for the manifest and state data
tools/geojson_to_svg.py     GeoJSON-to-SVG converter (stdlib Python only)
```

## Add a state

1. **Create the folder and copy the skeleton.**
   ```
   mkdir states/goa
   cp states/_template/data.json states/goa/data.json
   ```
   Fill in the top-level fields and one entry per constituency. Field notes:
   - `type`: `GEN`, `SC` or `ST`.
   - `region` values must match the `regions` array. Keep at least one region;
     if a state has no natural regions, list its districts as regions.
   - `after_2008.status`: `continuing`, `renamed` or `abolished`. These three
     words drive the region-summary table.
   - `after_2008.successors`: post-2008 AC numbers; they become links into the
     post-2008 map when `post2008_constituencies` and the post map exist.
   - `maps`: file names for `pre2008`, `post2008` and `hero`. Omit `post2008`
     if there is no post map (the view toggle disappears). Omit `hero` to fall
     back to `assets/hero-illustration.jpg`.
   - `map_caveats`, `data_flags`, `footnotes`, `sources` are free lists; empty
     lists render nothing.
   - For a state redrawn in a year other than 2008, set `post_order_year`
     (and, if needed, `pre_election_year` / `post_election_year`). Assam is the
     example: it uses the 2023 order and `map-pre2023.svg` / `map-post2023.svg`,
     still under the `pre2008` / `post2008` keys.

2. **Generate the maps.**
   From constituency GeoJSON (Election Commission property names are
   auto-detected: `AC_NO`, `AC_NAME`, `AC_TYPE`, `DIST_NAME`; a truthy `APPROX`
   property renders that seat dashed):
   ```
   python3 tools/geojson_to_svg.py pre.geojson states/goa/map-pre2008.svg \
       --pair post.geojson states/goa/map-post2008.svg
   ```
   The `--pair` form projects both files identically so the Overlay view
   aligns. A hand-made SVG also works if every constituency is a
   `<path class="ac" id="pre-ac-<n>" data-ac="<n>" data-name="..."
   data-type="..." data-district="...">` inside `<g id="pre" class="ac-layer">`
   (use `post` in place of `pre` for the post-2008 map).

   Optional: to add faint neighbouring-territory labels (as on Punjab, where
   "PAKISTAN", "HARYANA" etc. sit along the border), add a
   `<g class="nbr-labels"><text class="nbr-label" x="…" y="…" transform="rotate(deg cx cy)">NAME</text>…</g>`
   block just inside the SVG's `<g id="pre" class="ac-layer">` opening tag,
   with coordinates on the same projection as the constituency polygons.

3. **Flip the manifest.**
   In `states/manifest.json`, set the state's `status` to `"live"` and add a
   `last_updated` date. The homepage card, the India map and the seat search
   pick it up automatically.

4. **Add it to the sitemap.**
   Add a `<url>` entry for `https://boundaries.in/state.html?state=<slug>` to
   `sitemap.xml`. This is the one step that is not automatic.

5. **Preview, then publish.**
   `python3 -m http.server` from the project root, then open
   `http://localhost:8000`. (Opening `index.html` directly from disk will not
   work: the pages fetch JSON and SVG files, which browsers block on `file://`.)

## Essays

See `essays/README.md`. In short: copy `essays/_template.html` to
`essays/<slug>.html`, write the piece, and add an entry to
`essays/manifest.json`. Entries marked `"status": "draft"` stay off the index.
Add each published essay to `sitemap.xml` too.

## Sign-in

`assets/auth.js` asks every reader to sign in with Google after 30 seconds on
the site; the card cannot be dismissed. Reading is free. It is loaded on every
page by `theme.js`, except `privacy.html` and `terms.html`, and is skipped for
search-engine crawlers. If Google's sign-in script cannot load, the card stands
down rather than locking the reader out.

On sign-in it sends the reader's name, email, current page, referring site and
a timestamp to a Google Sheet through an Apps Script web app, and keeps the
name and email in the browser so the reader is not asked again. The Google
client ID and the Apps Script URL are the two constants at the top of the file.

`privacy.html` describes exactly this behaviour. If you change what
`auth.js` records or when it appears, update the privacy policy and terms to
match.

## Editing in the browser

`admin/` is a Decap CMS editor (`boundaries.in/admin/`) that edits
`states/manifest.json` and each state's `data.json` and commits to the GitHub
repository. Its fields are defined in `admin/config.yml`.

## Deploy

The site is served by GitHub Pages from the `main` branch, repository root,
at the custom domain in `CNAME`. Every commit to `main` publishes, usually
within a minute or two. All asset paths are relative.
