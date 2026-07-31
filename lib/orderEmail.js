import nodemailer from "nodemailer";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendOrderConfirmation({
  customer,
  order,
  trackingNumber,
  items,
}) {
  const recipient = customer.email?.trim();
  if (!recipient || !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e8e2;color:#173d2a">
            ${escapeHtml(item.name)} × ${item.quantity}
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #e5e8e2;text-align:right;color:#173d2a">
            Rs. ${(item.price * item.quantity).toLocaleString()}
          </td>
        </tr>`
    )
    .join("");

  await transporter.sendMail({
    from: `"Bustaniya" <${process.env.GMAIL_USER}>`,
    to: recipient,
    subject: `Bustaniya order confirmed — ${order.order_number}`,
    text: `Thank you for your order. Order ${order.order_number} has been confirmed. Tracking ID: ${trackingNumber}. Total: Rs. ${Number(order.total).toLocaleString()}.`,
    html: `
      <div style="margin:0;padding:36px 16px;background:#f7f3eb;font-family:Arial,sans-serif;color:#173d2a">
        <div style="max-width:620px;margin:auto;background:#fff;border-top:5px solid #173d2a">
          <div style="padding:34px 34px 24px;background:#dcffb8">
            <p style="margin:0 0 8px;color:#bc174d;font-size:12px;letter-spacing:2px">BUSTANIYA</p>
            <h1 style="margin:0;font-family:Georgia,serif;font-size:38px;font-weight:500">Your order is confirmed</h1>
          </div>
          <div style="padding:30px 34px">
            <p>Assalam-o-Alaikum ${escapeHtml(customer.firstName)},</p>
            <p style="line-height:1.7;color:#526158">Thank you for shopping with Bustaniya. Your order is confirmed and ready for courier processing.</p>
            <div style="margin:24px 0;padding:18px;background:#f7f8f3">
              <p style="margin:0 0 8px"><b>Order:</b> ${escapeHtml(order.order_number)}</p>
              <p style="margin:0"><b>Tracking ID:</b> ${escapeHtml(trackingNumber)}</p>
            </div>
            <table style="width:100%;border-collapse:collapse">${itemRows}</table>
            <p style="margin:20px 0 0;text-align:right;font-size:18px"><b>Total: Rs. ${Number(order.total).toLocaleString()}</b></p>
            <p style="margin-top:30px;line-height:1.6;color:#526158">Delivery address:<br>${escapeHtml(customer.address)}, ${escapeHtml(customer.city)}</p>
          </div>
          <div style="padding:20px 34px;background:#173d2a;color:#fff;font-size:12px">
            Pakistani clothing, rooted in grace.
          </div>
        </div>
      </div>`,
  });

  return true;
}
