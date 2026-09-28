# Payload re-encodes every WebP and GIF upload

Minimal reproduction on Payload 3.90.2: a WebP or GIF uploaded to a collection with no `resizeOptions`, `formatOptions`, `trimOptions` or `imageSizes` is decoded and re-encoded by sharp with its default settings. A quality-95 WebP loses half its size and its colour profile. A duplicate re-encodes the stored file once more. A JPEG is stored as uploaded.

The only changes from the `blank` template are `fixtures/` and `scripts/check.ts`.

## Steps

1. `cp .env.example .env` and fill in `DATABASE_URL` and `PAYLOAD_SECRET`.
2. `pnpm install`
3. `pnpm check` empties the Media collection, uploads each fixture, duplicates it, and compares every stored file with the fixture:

```
same bytes  photo.jpg       upload     fixture 557406 B  stored 557406 B  colour profile yes -> yes
same bytes  photo.jpg       duplicate  fixture 557406 B  stored 557406 B  colour profile yes -> yes
RE-ENCODED  photo.webp      upload     fixture 541550 B  stored 268646 B  colour profile yes -> no
RE-ENCODED  photo.webp      duplicate  fixture 541550 B  stored 252154 B  colour profile yes -> no
RE-ENCODED  animation.gif   upload     fixture 4155 B    stored 4155 B    colour profile no -> no
RE-ENCODED  animation.gif   duplicate  fixture 4155 B    stored 4155 B    colour profile no -> no
RE-ENCODED  animation.webp  upload     fixture 5014 B    stored 3040 B    colour profile no -> no
RE-ENCODED  animation.webp  duplicate  fixture 5014 B    stored 2904 B    colour profile no -> no
```

A `POST /api/media`, the request the admin sends, stores the same 268646 B file for `photo.webp`.

## Why

In `generateFileData`, a file whose type is GIF, TIFF or WebP always goes through `sharp(file, { animated: true }).rotate()` and `toBuffer()`, whether or not it has more than one frame and whether or not the collection asks for any change:

```js
if (sharp && (fileIsAnimatedType || fileHasAdjustments)) {
```

sharp then writes the file with its defaults: WebP quality 80 and no metadata.
