#!/usr/bin/env python3
"""
geojson_to_svg.py — convert constituency GeoJSON into an archive-ready SVG map.

Part of The Constituency Archive's add-a-state workflow. Produces an SVG in
which every constituency is a <path> carrying data attributes the site's
JavaScript reads (data-ac, data-name, data-type, data-district), so results
and tooltips wire on automatically.

Usage
-----
Single map:
    python3 tools/geojson_to_svg.py pre.geojson states/<slug>/map-pre2008.svg

Pair sharing one projection (required for the overlay view to align):
    python3 tools/geojson_to_svg.py pre.geojson states/<slug>/map-pre2008.svg \
        --pair post.geojson states/<slug>/map-post2008.svg

Property names are auto-detected from common Election Commission shapefile
conventions (AC_NO / AC_NAME / AC_TYPE / DIST_NAME, case-insensitive).
Features with a truthy APPROX property are rendered dashed and marked
data-approx="true".

No dependencies beyond the Python standard library.
"""
import json
import math
import sys

VIEW_W, VIEW_H, PAD = 860, 1120, 56

KEY_ALIASES = {
    "ac_no": ["AC_NO", "ac_no", "ACNO", "AC_NUMBER"],
    "ac_name": ["AC_NAME", "ac_name", "ACNAME", "NAME"],
    "ac_type": ["AC_TYPE", "ac_type", "TYPE", "RES"],
    "district": ["DIST_NAME", "DISTRICT", "dist_name", "DT_NAME"],
    "approx": ["APPROX", "approx"],
}


def prop(props, key):
    for k in KEY_ALIASES[key]:
        if k in props:
            return props[k]
    return None


def each_coord(geom, fn):
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    for rings in polys:
        for ring in rings:
            for c in ring:
                fn(c)


def build_projection(collections):
    min_lon = min_lat = 1e9
    max_lon = max_lat = -1e9

    def track(c):
        nonlocal min_lon, max_lon, min_lat, max_lat
        min_lon = min(min_lon, c[0]); max_lon = max(max_lon, c[0])
        min_lat = min(min_lat, c[1]); max_lat = max(max_lat, c[1])

    for g in collections:
        for f in g["features"]:
            each_coord(f["geometry"], track)

    mid_lat = (min_lat + max_lat) / 2
    k = math.cos(math.radians(mid_lat))
    sx = (VIEW_W - 2 * PAD) / ((max_lon - min_lon) * k)
    sy = (VIEW_H - 2 * PAD) / (max_lat - min_lat)
    s = min(sx, sy)
    ox = PAD + ((VIEW_W - 2 * PAD) - (max_lon - min_lon) * k * s) / 2
    oy = PAD + ((VIEW_H - 2 * PAD) - (max_lat - min_lat) * s) / 2

    def prj(c):
        return (ox + (c[0] - min_lon) * k * s, oy + (max_lat - c[1]) * s)

    return prj


def path_d(geom, prj):
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    parts = []
    for rings in polys:
        for ring in rings:
            pts = []
            last = None
            for i, c in enumerate(ring):
                x, y = prj(c)
                p = (round(x, 1), round(y, 1))
                if p == last:
                    continue
                pts.append(("M" if not pts else "L") + f"{p[0]} {p[1]}")
                last = p
            parts.append("".join(pts) + "Z")
    return "".join(parts)


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def write_svg(geo, prj, out_path, layer_id):
    feats = sorted(geo["features"], key=lambda f: int(prop(f["properties"], "ac_no") or 0))
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW_W} {VIEW_H}" '
        f'role="img" aria-label="Constituency map">',
        f'  <g id="{layer_id}" class="ac-layer">',
    ]
    for f in feats:
        p = f["properties"]
        n = prop(p, "ac_no")
        name = prop(p, "ac_name") or ""
        ac_type = prop(p, "ac_type") or ""
        dist = prop(p, "district") or ""
        approx = bool(prop(p, "approx"))
        attrs = (f'id="{layer_id}-ac-{n}" class="ac{" ac-approx" if approx else ""}" '
                 f'data-ac="{n}" data-name="{esc(name)}" data-type="{esc(ac_type)}" '
                 f'data-district="{esc(dist)}"')
        if approx:
            attrs += ' data-approx="true"'
        lines.append(f'    <path {attrs} d="{path_d(f["geometry"], prj)}"/>')
    lines.append("  </g>")
    lines.append("</svg>")
    with open(out_path, "w") as fh:
        fh.write("\n".join(lines) + "\n")
    print(f"wrote {out_path}  ({len(feats)} constituencies)")


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        sys.exit(1)
    primary_in, primary_out = argv[1], argv[2]
    pair_in = pair_out = None
    if "--pair" in argv:
        i = argv.index("--pair")
        pair_in, pair_out = argv[i + 1], argv[i + 2]

    with open(primary_in) as fh:
        geo_a = json.load(fh)
    collections = [geo_a]
    geo_b = None
    if pair_in:
        with open(pair_in) as fh:
            geo_b = json.load(fh)
        collections.append(geo_b)

    prj = build_projection(collections)
    write_svg(geo_a, prj, primary_out, "pre")
    if geo_b is not None:
        write_svg(geo_b, prj, pair_out, "post")


if __name__ == "__main__":
    main(sys.argv)
