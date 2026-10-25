/**
 * The founder's own photograph.
 *
 * The capture never contained one: the portrait was pulled from the old site's
 * object store, so the crawler left an `<img>` pointing at nothing, and the
 * rebrand had been standing in the product mark to keep the block from showing
 * a broken picture. A sign-off under a paragraph written in the first person
 * should carry the face of the person who wrote it, so the mark is replaced
 * here with the photograph the founder supplied, cropped square by the
 * stylesheet (`object-fit: cover`) and labelled with his name.
 *
 * The file lives in the capture's own asset folder —
 * `site/images/people/lulamile-mkhungela.png` — so a page served from any
 * depth resolves it from the root, exactly like every other image on the site.
 * The photograph is 460x460 with the face in the upper third; the stylesheet
 * scales it 2.7x about that point and the wrapper crops the rest.
 */

export const FOUNDER = {
  name: 'Lulamile Mkhungela',
  /** Root-absolute: served pages sit at different depths. */
  photo: '/images/people/lulamile-mkhungela.png',
  role: 'Founder, ProdOps',
}

/**
 * Replace the placeholder in every sign-off block with the photograph.
 *
 * The blocks are mobile-safe markup the capture already had: an `<img>` beside
 * a name and a title. Only the image is swapped, and only inside `.signoff`, so
 * no other image on the page is touched.
 */
export function withFounder(html: string): string {
  // The wrapper is the circle: the photograph is a full-length shot in a square
  // file, so the image inside is scaled up and pinned to the face, and the
  // wrapper crops that back to a 64px disc. Without the wrapper the scale would
  // spill over the paragraph beside it.
  const photo = `<span class="prodops-founder-photo"><img class="prodops-founder" src="${FOUNDER.photo}" alt="${FOUNDER.name}" width="64" height="64" loading="lazy" decoding="async"/></span>`
  let out = html.replace(/<div class="signoff">(\s*)<img\b[^>]*\/?>/g, (_match, space: string) => `<div class="signoff">${space}${photo}`)
  // Some pages put the portrait in the byline of an article rather than in a
  // sign-off; both are the same person and the same file.
  out = out.replace(
    /<img\b[^>]*alt="Brian Casel"[^>]*\/?>/g,
    photo,
  )
  return out
}
