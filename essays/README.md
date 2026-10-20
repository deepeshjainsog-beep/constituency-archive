# Publishing an essay

Two files change. Nothing is compiled.

1. Copy `essays/_template.html` to `essays/<slug>.html` and write the piece.
   Every class you need is in the template; delete the blocks you do not use.
   Images go in `essays/media/`.

2. Add one entry to the top of the `essays` array in `essays/manifest.json`:

       {
         "slug": "the-slug",
         "url": "essays/the-slug.html",
         "title": "The title",
         "dek": "One sentence for the index page.",
         "author": "Author Name",
         "date": "2026-11-01",
         "section": "Delimitation",
         "reading_time": "8 min",
         "image": "essays/media/the-slug-thumb.jpg",
         "status": "published"
       }

   `date` must be ISO (YYYY-MM-DD); the index sorts on it and prints it long.
   `image` and `section` may be omitted. Set `"status": "draft"` to keep an
   entry in the file but off the index.

## The typographic kit

| What | How |
|---|---|
| Title in monospace instead of the serif | `class="essay essay--mono-title"` on `<article>` |
| Opening drop cap | `class="dropcap"` on the first `<p>` |
| Section head | `<h2>` — set lowercase automatically, with a rule above |
| Sub-head | `<h3>` — small monospace caps |
| Quotation from a source | `<blockquote>` with an optional `<cite>` |
| Line lifted from the argument | `<blockquote class="pullquote">` |
| Aside | `<div class="aside">` with a `<span class="label">` |
| Image past the text column | `class="wide"` on the `<figure>` |
| Footnote marker | `<sup class="fn"><a href="#n1" id="r1">1</a></sup>` |
| Break between movements | `<hr>` |

Body copy is EB Garamond at 19.5px on a 41rem column. Everything that is not
prose — kickers, bylines, dates, section heads, captions, notes labels — is
JetBrains Mono. Dark mode and print both work without anything extra.
