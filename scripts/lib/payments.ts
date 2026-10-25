/**
 * Money, in rand, and the ways to pay that cost nobody a fee.
 *
 * The captured site is priced in dollars and its checkout step exists only as a
 * shell that would have handed off to a card processor: there is no form of
 * payment in it that works offline, and a card processor is not something this
 * project should pretend to be. ProdOps is sold from Johannesburg, so the copy
 * is priced in rand and paid the way South Africans pay each other —
 * **PayShap**, an **instant EFT**, or an **invoice**. None of the three charges
 * the payer or the seller a fee, and none of them needs a card.
 *
 * Everything the operator has to fill in is in `MERCHANT` below. While a field
 * is null the page offers to send the detail instead of inventing one, which is
 * the honest state of a page whose account details have not been handed over
 * yet — and the moment a field is filled in, the matching block appears.
 */

/** The operator's own details. Replace the nulls; nothing else needs editing. */
export const MERCHANT = {
  /** Your name, as it appears on the account the money lands in. */
  name: 'Lulamile Mkhungela',
  /** A ShakID — a phone number or an email registered with PayShap. */
  payShap: null as string | null,
  /** Instant EFT destination. Leave all three null until the account exists. */
  bank: null as string | null,
  account: null as string | null,
  branch: null as string | null,
  /** Where a booking or an invoice request goes. */
  email: 'support@prodops.dev',
}

/**
 * Prices in rand.
 *
 * The captured pages are priced in dollars ($299 a year for Pro, $1,495 a year
 * for a five-seat team, $50 for a workshop ticket). Each is shown here at the
 * rand price the operator charges, written the South African way — a space for
 * thousands, no decimals on whole rand.
 */
export const ZAR_PRICES: [RegExp, string][] = [
  [/\$1,495/g, 'R27 499'],
  [/\$299/g, 'R5 499'],
  [/\$50(?![\d,])/g, 'R899'],
]

/** What each checkout page is selling, in the words of its own Purchase card. */
interface Sale {
  product: string
  price: string
  /** The reference the payer puts on the payment. */
  reference: string
}

const SALES: Record<string, Sale> = {
  '/checkout3366.html': { product: 'ProdOps Pro', price: 'R5 499', reference: 'PRODOPS-PRO' },
  '/checkout1d1a.html': { product: 'ProdOps Pro — team', price: 'R27 499', reference: 'PRODOPS-TEAM' },
  '/checkoutd3b3.html': { product: 'Workshop ticket', price: 'R899', reference: 'PRODOPS-WORKSHOP' },
}

const DEFAULT_SALE: Sale = { product: 'ProdOps', price: 'R5 499', reference: 'PRODOPS' }

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function mailto(subject: string): string {
  return `mailto:${MERCHANT.email}?subject=${encodeURIComponent(subject)}`
}

/**
 * The payment block.
 *
 * Three options, in the order they cost the least effort: PayShap (instant, in
 * a banking app), instant EFT (a normal transfer), or an invoice for anyone who
 * needs one on paper. Each states its reference, because the reference is what
 * matches a payment to a person — there is no card form and no account on this
 * side to attach it to.
 */
function paymentBlock(sale: Sale): string {
  const payShap = MERCHANT.payShap
  const eft = MERCHANT.bank && MERCHANT.account && MERCHANT.branch
  const shapStep = payShap
    ? `<li>Open your banking app, choose <strong>PayShap</strong>, and send
        <strong>${sale.price}</strong> to
        <code class="prodops-pay-id">${escapeHtml(payShap)}</code>
        <button type="button" class="prodops-pay-copy" data-copy="${escapeHtml(payShap)}">Copy</button></li>`
    : `<li>Ask for a PayShap request: <a href="${mailto(`PayShap request — ${sale.product}`)}">send a note</a>
        with what you are booking. A request arrives on your phone and you approve it in your banking app —
        no card, no fee.</li>`
  const eftBlock = eft
    ? `<dl class="prodops-pay-eft">
        <div><dt>Bank</dt><dd>${escapeHtml(MERCHANT.bank as string)}</dd></div>
        <div><dt>Account name</dt><dd>${escapeHtml(MERCHANT.name)}</dd></div>
        <div><dt>Account number</dt><dd>${escapeHtml(MERCHANT.account as string)}</dd></div>
        <div><dt>Branch code</dt><dd>${escapeHtml(MERCHANT.branch as string)}</dd></div>
        <div><dt>Reference</dt><dd><code>${sale.reference}</code></dd></div>
      </dl>`
    : `<p>Instant EFT costs nothing either way. <a href="${mailto(`Bank details — ${sale.product}`)}">Ask for the
        banking details</a> and they come back with the reference to use.</p>`

  return `<section class="prodops-pay" aria-label="How to pay">
    <div class="prodops-pay-head">
      <p class="kicker">Step 2 — payment</p>
      <h3>Pay ${sale.price} with PayShap</h3>
      <p class="prodops-pay-lede">PayShap moves money between South African bank accounts in seconds, and neither
      side pays a fee for it. No card, no currency conversion, no processor in the middle.</p>
    </div>

    <ol class="prodops-pay-steps">
      ${shapStep}
      <li>Use the reference <code>${sale.reference}</code>, so the payment finds your account.</li>
      <li>Send the confirmation to <a href="${mailto(`Paid — ${sale.product}`)}">${MERCHANT.email}</a>. Access
      opens the same working day.</li>
    </ol>

    <h4>Or pay by instant EFT</h4>
    ${eftBlock}

    <h4>Or ask for an invoice</h4>
    <p>For a team, a purchase order, or an employer who pays: <a href="${mailto(`Invoice — ${sale.product}`)}">ask
    for an invoice</a> and one arrives with the amount, the reference and the terms.</p>

    <p class="prodops-pay-note">This page collects no card details and sends nothing anywhere. Paying in rand keeps
    the price the price — no conversion fee on top.</p>
  </section>`
}

/**
 * Put the block on a checkout page, in the column that already holds the
 * Purchase card, and price the page in rand.
 *
 * The captured step 2 was a hand-off to a card processor; this replaces that
 * step rather than sitting beside it, so the page has one way to pay and no
 * dead form. Everything else on the page — the register step, the purchase
 * details — is left exactly as the site drew it.
 */
export function withPayment(html: string, path: string): string {
  if (!/\/checkout[\w]*\.html$/.test(path)) return withRandPrices(html)
  const sale = SALES[path] ?? DEFAULT_SALE
  let out = withRandPrices(html)
  // The right-hand column: the purchase details card ends, the payment block
  // follows in the same stack.
  if (!out.includes('prodops-pay')) {
    const at = out.lastIndexOf('</aside>')
    if (at !== -1) out = out.slice(0, at) + paymentBlock(sale) + out.slice(at)
  }
  return out
}

/**
 * Dollars to rand, everywhere a price is shown.
 *
 * The capture writes a price three ways, so there are three rules: as plain
 * text (`$299`), as a styled pair (`<span>$</span>299`, which is how the Pro
 * page draws its big price), and in structured data (`"price":299,
 * "priceCurrency":"USD"`). The last one matters most for an answer engine: it
 * is the price a search result would quote, so it has to be rand too.
 */
export function withRandPrices(html: string): string {
  let out = html
  // The styled price: drop the dollar glyph's wrapper, keep the rest of the line.
  out = out.replace(/<span[^>]*>\$<\/span>([\d,]+)/g, (_match, amount: string) => {
    const zar = ZAR_PRICES.find(([pattern]) => new RegExp(pattern.source).test(`$${amount}`))
    return zar ? zar[1] : `R${amount}`
  })
  for (const [pattern, replacement] of ZAR_PRICES) out = out.replace(pattern, replacement)
  // Structured data, raw and HTML-escaped.
  out = out.replace(/("price":)(299|1,?495|50)\b/g, (_match, key: string, amount: string) =>
    `${key}${amount.replace(/,/g, '').replace('$', '') === '299' ? '5499' : amount.replace(/,/g, '') === '1495' ? '27499' : '899'}`,
  )
  out = out.replace(/(&quot;price&quot;:)(299|1495|50)\b/g, (_match, key: string, amount: string) =>
    `${key}${amount === '299' ? '5499' : amount === '1495' ? '27499' : '899'}`,
  )
  out = out.replace(/("priceCurrency":")USD(")/g, '$1ZAR$2')
  out = out.replace(/(&quot;priceCurrency&quot;:&quot;)USD(&quot;)/g, '$1ZAR$2')
  return out
}

/** For the checks: what a page says it costs. */
export function priceFor(path: string): Sale {
  return SALES[path] ?? DEFAULT_SALE
}
