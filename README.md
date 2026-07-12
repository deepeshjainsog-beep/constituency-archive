# The Constituency Archive

An open reference publishing the pre-2008-delimitation electoral maps of India's
state legislative assemblies, one state at a time. Static site; no backend, no
build step, no dependencies. Every page is rendered from the files under
`states/`.

## Layout

```
index.html                  Homepage: mission + register of all states
state.html                  Shared state-page template (state.html?state=<slug>)
assets/styles.css           Design system
assets/home.js              Renders the homepage from the manifest
assets/state.js             Renders a state page from its data module
states/manifest.json        Every state, with status: "live" | "coming-soon"
states/<slug>/data.json     The state's data module
states/<slug>/map-pre2008.svg    Pre-2008 constituency map (required)
states/<slug>/map-post2008.svg   Post-2008 map (optional; enables the
                                 Post-2008 and Overlay views)
states/_template/data.json  Skeleton to copy for a new state
tools/geojson_to_svg.py     GeoJSON-to-SVG converter (stdlib Python only)
```

## Add a state (the daily workflow)

1. **Create the folder.**
   `mkdir states/rajasthan`

2. **Copy the skeleton and fill it in.**
   `cp states/_template/data.json states/rajasthan/data.json`
   Fill in the top-level fields and one entry per constituency. Field notes:
   - `type`: `GEN`, `SC` or `ST`.
   - `region` values must match the `regions` array; delete both to publish
     without regional grouping (the index then needs `regions` \u2014 keep at least
     one region, or group by district by listing districts as regions).
   - `after_2008.status`: `continuing`, `renamed` or `abolished`. These three
     words drive the region-summary table.
   - `after_2008.successors`: post-2008 AC numbers; they become links into the
     post-2008 map when `post2008_constituencies` and `map-post2008.svg` exist.
   - `post2008_constituencies` and the post-2008 map are optional. Omit the
     `post2008` key from `maps` if there is no post map; the view toggle
     disappears automatically.
   - `map_caveats`, `data_flags`, `footnotes`, `sources` are free lists; empty
     lists render nothing.

3. **Generate the map(s).**
   From constituency GeoJSON (Election Commission property names are
   auto-detected: `AC_NO`, `AC_NAME`, `AC_TYPE`, `DIST_NAME`; a truthy `APPROX`
   property renders that seat dashed):
   ```
   python3 tools/geojson_to_svg.py pre.geojson states/rajasthan/map-pre2008.svg \
       --pair post.geojson states/rajasthan/map-post2008.svg
   ```
   The `--pair` form projects both files identically so the Overlay view
   aligns. A hand-made SVG also works if every constituency is a
   `<path class="ac" id="pre-ac-<n>" data-ac="<n>" data-name="..."
   data-type="..." data-district="...">` inside `<g id="pre" class="ac-layer">`
   (use `post` in place of `pre` for the post-2008 map).

4. **Flip the manifest.**
   In `states/manifest.json`, set the state's `status` to `"live"`. The
   homepage card links itself; the state page renders itself. Nothing else
   changes.

   Optional: to add faint neighbouring-territory labels on the map (as on
   Punjab, where "PAKISTAN", "HARYANA" etc. sit along the border), add a
   `<g class="nbr-labels"><text class="nbr-label" x="…" y="…" transform="rotate(deg cx cy)">NAME</text>…</g>`
   block just inside the SVG's `<g id="pre" class="ac-layer">` opening tag,
   with coordinates computed on the same projection as the constituency
   polygons. Skip this for states with no adjoining international border or
   where it adds no orientation value.

5. **Preview, commit, push.**
   `python3 -m http.server` from the project root, then open
   `http://localhost:8000`. (Opening `index.html` directly from disk will not
   work: the pages fetch JSON and SVG files, which browsers block on `file://`.)

## Deploy

**Netlify:** drag the project folder onto https://app.netlify.com/drop, or
connect the repository with no build command and the publish directory set to
the repository root. Every push publishes.

**GitHub Pages:** push the repository, then Settings \u2192 Pages \u2192 deploy from
branch (`main`, `/ root`). All asset paths are relative, so the site works
under a project subpath (`https://<user>.github.io/<repo>/`).

## Punjab notes

Punjab is the first live state: 117 constituencies of the 1976 order across
Majha, Doaba and Malwa, with the fate of each seat under the 2008 order,
1976-order extents, and both maps on a shared projection. Region assignments
were derived from each seat's pre-2008 district (Gurdaspur and Amritsar to
Majha; Jullundur, Hoshiarpur and Kapurthala to Doaba; the rest to Malwa) and
are editable per constituency. Two caveats are recorded in
`states/punjab/data.json` and rendered on the page: the Dakala (73) polygon is
approximated, and three seats carry an SC-status conflict between the curated
records and the shapefile attributes (see `data_flags`).
