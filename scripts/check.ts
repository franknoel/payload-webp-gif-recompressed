// Uploads each fixture, duplicates it, and compares every stored file with the fixture.
import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '../src/payload.config'

const describe = async (file: string) => {
  const data = await readFile(file)
  const { icc } = await sharp(data).metadata()
  return { hash: createHash('sha256').update(data).digest('hex'), icc: Boolean(icc), size: data.length }
}

const payload = await getPayload({ config })
await payload.delete({ collection: 'media', where: { id: { exists: true } } })

for (const name of ['photo.jpg', 'photo.webp', 'animation.gif', 'animation.webp']) {
  const fixture = path.resolve('fixtures', name)
  const source = await describe(fixture)
  const created = await payload.create({ collection: 'media', data: { alt: name }, filePath: fixture })
  const duplicated = await payload.duplicate({ collection: 'media', id: created.id })

  for (const [step, doc] of [['upload', created], ['duplicate', duplicated]] as const) {
    const stored = await describe(path.resolve('media', doc.filename!))
    const verdict = stored.hash === source.hash ? 'same bytes' : 'RE-ENCODED'
    console.log(
      [verdict, name, step, `fixture ${source.size} B`, `stored ${stored.size} B`, `colour profile ${source.icc ? 'yes' : 'no'} -> ${stored.icc ? 'yes' : 'no'}`].join('\t'),
    )
  }
}
process.exit(0)
