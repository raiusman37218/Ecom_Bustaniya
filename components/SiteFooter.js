export default function SiteFooter({ categories = [], storeSettings = {} }) {
  const supportWhatsapp = String(storeSettings?.paymentSettings?.whatsappNumber || "").replace(/[^0-9]/g, "");
  const categoryRecords = (categories || []).filter((category) => category && !category.parentSlug);

  return (
    <footer id="footer">
      <div className="footerBrand">
        <a className="brand" href="/" aria-label="Bustaniya home"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /></a>
        <p>Pakistani clothing, rooted in grace.</p>
        <span>Thoughtfully designed silhouettes for everyday elegance and memorable occasions.</span>
      </div>
      <div><b>Shop</b>{categoryRecords.map((category) => <a href={`/category/${category.slug}`} key={category.slug}>{category.name}</a>)}</div>
      <div><b>Help</b><a href="/shipping-policy">Delivery</a><a href="/exchange-return-policy">Exchange & returns</a><a href="/contact">Contact Us</a><a href="/about">About Bustaniya</a></div>
      <div><b>Follow</b><a href="https://www.instagram.com/bustaniya_/" target="_blank" rel="noreferrer">Instagram</a></div>
      <div><b>Shop with confidence</b><span className="footerTrustCopy">COD delivery charges are verified in advance.</span><span className="footerTrustCopy">Full advance orders include free delivery.</span>{supportWhatsapp && <a href={`https://wa.me/${supportWhatsapp}`} target="_blank" rel="noreferrer">WhatsApp support</a>}</div>
      <div className="copyright">
        <p>Copyright 2026 Bustaniya. Made with care in Pakistan.</p>
        <div><a href="/privacy-policy">Privacy</a><a href="/terms-and-conditions">Terms</a><a href="/shipping-policy">Shipping</a></div>
      </div>
    </footer>
  );
}
