/* Internal reference for the storefront design system.
   Not linked from anywhere and kept out of search engines — it exists so the
   token layer and the primitives can be reviewed on one screen before pages
   are migrated onto them. */

import "./style-guide.css";

export const metadata = {
  title: "Design system — Bustaniya",
  robots: { index: false, follow: false, nocache: true },
};

const greens = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"];
const berries = ["50", "100", "200", "300", "400", "500", "600", "700"];
const sands = ["0", "50", "100", "200", "300", "400", "500", "600", "700", "800", "900"];

const spacing = [
  ["1", "4px"], ["2", "8px"], ["3", "12px"], ["4", "16px"], ["5", "20px"],
  ["6", "24px"], ["8", "32px"], ["10", "40px"], ["12", "48px"], ["16", "64px"],
  ["20", "80px"], ["24", "96px"], ["32", "128px"],
];

function Swatch({ token, label }) {
  return (
    <div className="sgSwatch">
      <span className="sgSwatch__chip" style={{ background: `var(${token})` }} />
      <code>{label}</code>
    </div>
  );
}

function Block({ title, note, children }) {
  return (
    <section className="sgBlock">
      <div className="sgBlock__head">
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function StyleGuidePage() {
  return (
    <main className="sgPage">
      <header className="sgHeader bs-container">
        <span className="bs-eyebrow">Internal reference</span>
        <h1 className="bs-display bs-display--xl">Design system</h1>
        <p className="bs-body bs-body--muted" style={{ maxWidth: "58ch" }}>
          The vocabulary every storefront page is being migrated onto. Tokens live in{" "}
          <code>app/design-system.css</code>, primitives in <code>app/components.css</code>.
          Nothing here is wired to a page yet.
        </p>
      </header>

      <div className="bs-container bs-stack bs-stack--lg">

        <Block title="Brand green" note="Primary surfaces, headings and the main action. 700 is the brand colour.">
          <div className="sgSwatches">
            {greens.map((step) => <Swatch key={step} token={`--bs-green-${step}`} label={`green-${step}`} />)}
          </div>
        </Block>

        <Block title="Berry accent" note="Emphasis only — sale, eyebrows, the one primary action on a screen. Never body text.">
          <div className="sgSwatches">
            {berries.map((step) => <Swatch key={step} token={`--bs-berry-${step}`} label={`berry-${step}`} />)}
          </div>
        </Block>

        <Block title="Warm neutrals" note="Tinted toward the cream so nothing reads as cold grey against the paper background.">
          <div className="sgSwatches">
            {sands.map((step) => <Swatch key={step} token={`--bs-sand-${step}`} label={`sand-${step}`} />)}
          </div>
        </Block>

        <Block title="Display type — Cormorant" note="Fluid with clamp(), so there are no per-breakpoint font-size rules to maintain.">
          <div className="bs-stack">
            <p className="bs-display bs-display--xl">The Koti Set</p>
            <p className="bs-display">Shop by category</p>
            <p className="bs-display bs-display--md">New arrivals</p>
            <p className="bs-display bs-display--sm">Loved by our customers</p>
          </div>
        </Block>

        <Block title="UI type — Manrope">
          <div className="bs-stack">
            <span className="bs-eyebrow">Curated collections — eyebrow</span>
            <p className="bs-body">Body — three-piece co-ord in premium fabric, cut for everyday grace. Rs. 4,799</p>
            <p className="bs-body bs-body--sm bs-body--muted">Small muted — Cash on Delivery · Free delivery on 2 suits · Easy exchange</p>
          </div>
        </Block>

        <Block title="Spacing" note="4px base. Section rhythm uses --bs-section-y, which is where most of the added air comes from.">
          <div className="sgSpacing">
            {spacing.map(([step, px]) => (
              <div className="sgSpacing__row" key={step}>
                <code>space-{step}</code>
                <span className="sgSpacing__bar" style={{ width: `var(--bs-space-${step})` }} />
                <small>{px}</small>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Buttons" note="Hover, focus, disabled and loading are all defined once. Tab through them to see the focus ring.">
          <div className="bs-row">
            <button type="button" className="bs-btn bs-btn--primary">Add to cart</button>
            <button type="button" className="bs-btn bs-btn--accent">Shop now</button>
            <button type="button" className="bs-btn bs-btn--secondary">Size guide</button>
            <button type="button" className="bs-btn bs-btn--ghost">Filter</button>
            <button type="button" className="bs-btn bs-btn--link">View all pieces</button>
          </div>
          <div className="bs-row" style={{ marginTop: "var(--bs-space-4)" }}>
            <button type="button" className="bs-btn bs-btn--primary bs-btn--sm">Small</button>
            <button type="button" className="bs-btn bs-btn--primary">Medium</button>
            <button type="button" className="bs-btn bs-btn--primary bs-btn--lg">Large</button>
            <button type="button" className="bs-btn bs-btn--primary" disabled>Disabled</button>
            <button type="button" className="bs-btn bs-btn--primary" aria-busy="true">Placing order</button>
          </div>
        </Block>

        <Block title="Form fields" note="Font-size never drops below 16px, which stops iOS zooming the page on focus.">
          <div className="sgForm">
            <label className="bs-field">
              <span className="bs-label">Full name</span>
              <input className="bs-input" placeholder="Ayesha Khan" />
            </label>
            <label className="bs-field">
              <span className="bs-label">City</span>
              <select className="bs-select" defaultValue="">
                <option value="" disabled>Select your city</option>
                <option>Lahore</option>
                <option>Karachi</option>
                <option>Islamabad</option>
              </select>
            </label>
            <label className="bs-field">
              <span className="bs-label">Phone</span>
              <input className="bs-input" defaultValue="0300" aria-invalid="true" />
              <span className="bs-field__error">Enter a valid 11-digit number, e.g. 03001234567.</span>
            </label>
            <label className="bs-field">
              <span className="bs-label">Landmark <span className="bs-label__optional">(optional)</span></span>
              <input className="bs-input" placeholder="Near the main gate" />
              <span className="bs-field__help">Helps the rider find you faster.</span>
            </label>
            <label className="bs-field" style={{ gridColumn: "1 / -1" }}>
              <span className="bs-label">Delivery address</span>
              <textarea className="bs-textarea" placeholder="House, street, area…" />
            </label>
            <label className="bs-check" style={{ gridColumn: "1 / -1" }}>
              <input type="checkbox" defaultChecked />
              <span>Send me order updates on WhatsApp</span>
            </label>
          </div>
        </Block>

        <Block title="Badges">
          <div className="bs-row">
            <span className="bs-badge bs-badge--new">New</span>
            <span className="bs-badge bs-badge--sale">15% off</span>
            <span className="bs-badge bs-badge--success">Delivered</span>
            <span className="bs-badge bs-badge--warning">Awaiting payment</span>
            <span className="bs-badge bs-badge--danger">Returned</span>
            <span className="bs-badge bs-badge--soldout">Sold out</span>
            <span className="bs-badge">Co-ord sets</span>
          </div>
        </Block>

        <Block title="Section heading" note="Repeated on nearly every page. Centred variant gets the thin berry rule.">
          <div className="sgPanel">
            <div className="bs-section-head bs-section-head--center">
              <div className="bs-section-head__text">
                <span className="bs-eyebrow">New arrivals</span>
                <h3 className="bs-display">Fresh off the atelier</h3>
              </div>
            </div>
            <div className="bs-section-head">
              <div className="bs-section-head__text">
                <span className="bs-eyebrow">Best sellers</span>
                <h3 className="bs-display bs-display--md">Loved by our customers</h3>
              </div>
              <a className="bs-btn bs-btn--link" href="#top">View all pieces</a>
            </div>
          </div>
        </Block>

        <Block title="Product card" note="One definition replacing the three competing ones in globals.css. Hover a card to see the crop and second-image reveal.">
          <div className="bs-grid">
            {[
              { name: "Olive Noor Set", cat: "Co-ord sets", price: "4,799", was: "5,990", badge: "sale", off: "15% off" },
              { name: "Aylin Co-ord Set", cat: "Co-ord sets", price: "5,199", was: "5,700", badge: "new", off: "New" },
              { name: "Aqua Co-ord Set in Lawn", cat: "3 piece suits", price: "4,999", was: null, badge: null, off: null },
              { name: "Sold out piece", cat: "Kurtis", price: "3,499", was: null, badge: "soldout", off: "Sold out" },
            ].map((p) => (
              <article className="bs-card" key={p.name}>
                <div className="bs-card__media">
                  <div className="sgCardPhoto" />
                  {p.badge && (
                    <div className="bs-card__badges">
                      <span className={`bs-badge bs-badge--${p.badge}`}>{p.off}</span>
                    </div>
                  )}
                </div>
                <div className="bs-card__body">
                  <span className="bs-card__category">{p.cat}</span>
                  <h3 className="bs-card__title"><a href="#top">{p.name}</a></h3>
                  <div className="bs-card__swatches">
                    <span className="bs-card__swatch" style={{ background: "var(--bs-green-400)" }} />
                    <span className="bs-card__swatch" style={{ background: "var(--bs-berry-300)" }} />
                  </div>
                  <p className="bs-card__price">
                    <b>Rs. {p.price}</b>
                    {p.was && <s>Rs. {p.was}</s>}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Block>

        <Block title="Loading & empty states" note="Skeletons are shaped like the content that replaces them, so the grid does not jump when products arrive.">
          <div className="bs-grid" style={{ marginBottom: "var(--bs-space-8)" }}>
            {[1, 2, 3, 4].map((n) => (
              <div key={n}>
                <span className="bs-skeleton bs-skeleton--card" />
                <span className="bs-skeleton bs-skeleton--line" style={{ width: "40%", margin: "var(--bs-space-4) auto 0" }} />
                <span className="bs-skeleton bs-skeleton--line" style={{ width: "70%", margin: "var(--bs-space-2) auto 0" }} />
              </div>
            ))}
          </div>
          <div className="sgPanel">
            <div className="bs-empty">
              <h3 className="bs-empty__title">Nothing here yet</h3>
              <p className="bs-empty__text">No pieces match this filter. Try another category, or browse the full collection.</p>
              <a className="bs-btn bs-btn--secondary" href="#top">Browse everything</a>
            </div>
          </div>
        </Block>

        <Block title="Elevation & radius">
          <div className="bs-row" style={{ gap: "var(--bs-space-6)" }}>
            {["xs", "sm", "md", "lg"].map((s) => (
              <div className="sgElevation" key={s} style={{ boxShadow: `var(--bs-shadow-${s})` }}>shadow-{s}</div>
            ))}
          </div>
          <div className="bs-row" style={{ gap: "var(--bs-space-6)", marginTop: "var(--bs-space-6)" }}>
            {["sm", "md", "lg", "xl"].map((r) => (
              <div className="sgElevation" key={r} style={{ borderRadius: `var(--bs-radius-${r})`, boxShadow: "none", border: "1px solid var(--bs-border)" }}>radius-{r}</div>
            ))}
          </div>
        </Block>

      </div>
    </main>
  );
}
