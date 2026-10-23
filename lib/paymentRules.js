export const PAYMENT_METHODS = {
  COD: "cod",
  COD_ADVANCE_DELIVERY: "cod",
  FULL_ADVANCE: "full_advance",
};

export const PAYMENT_STATUSES = [
  "Awaiting Payment",
  "Proof Submitted",
  "Payment Verified",
  "Payment Rejected",
];

/** Default advance taken on a COD order to confirm it. Overridable per store. */
export const DEFAULT_COD_ADVANCE_PKR = 300;
export const DEFAULT_COD_DELIVERY_CHARGE_PKR = 250;

function money(value, fallback = 0) {
  const amount = Number(value ?? fallback);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100) / 100;
}

export function normalizePaymentMethod(value) {
  return value === PAYMENT_METHODS.FULL_ADVANCE || value === "bank_deposit" || value === "advance"
    ? PAYMENT_METHODS.FULL_ADVANCE
    : PAYMENT_METHODS.COD;
}

/**
 * The single source for an order's money. The cart, the checkout, the stored
 * order columns and the amount PostEx is told to collect all come from here,
 * so they cannot drift apart.
 *
 * Two rules this encodes that used to live only in marketing copy:
 *
 *  - Delivery is free once the bag passes the store's threshold. The cart
 *    advertised this with a progress bar, but checkout charged the fee anyway,
 *    so a shopper who added items to "unlock free delivery" paid more than the
 *    cart had quoted.
 *  - A COD order is confirmed with a fixed advance and the courier collects the
 *    rest. The announcement bar has said "300/- advance for order confirmation"
 *    all along while the maths recorded a zero advance and a full COD balance.
 */
export function calculatePaymentAmounts({
  subtotal = 0,
  paymentMethod,
  paymentSettings = {},
  deliverySettings = {},
} = {}) {
  const productSubtotal = money(subtotal);
  const method = normalizePaymentMethod(paymentMethod);
  const isFullAdvance = method === PAYMENT_METHODS.FULL_ADVANCE;

  const codDeliveryCharge = money(paymentSettings.codDeliveryChargePkr, DEFAULT_COD_DELIVERY_CHARGE_PKR);
  const freeDeliveryThreshold = money(deliverySettings.freeDeliveryThreshold, 0);
  const qualifiesForFreeDelivery =
    isFullAdvance || (freeDeliveryThreshold > 0 && productSubtotal >= freeDeliveryThreshold);

  const deliveryCharges = qualifiesForFreeDelivery ? 0 : codDeliveryCharge;
  const totalOrderValue = productSubtotal + deliveryCharges;

  // Capped at the total so a small order can never leave a negative balance
  // for the rider to collect.
  const codAdvance = Math.min(
    money(paymentSettings.codAdvancePkr, DEFAULT_COD_ADVANCE_PKR),
    totalOrderValue,
  );

  const amountPayableInAdvance = isFullAdvance ? totalOrderValue : codAdvance;
  const amountPayableOnDelivery = money(totalOrderValue - amountPayableInAdvance);

  return {
    paymentMethod: method,
    productSubtotal,
    deliveryCharges,
    totalOrderValue,
    amountPayableInAdvance,
    amountPayableOnDelivery,
    courierCollectionAmount: amountPayableOnDelivery,
    freeDeliveryApplied: qualifiesForFreeDelivery,
    codAdvanceRequired: isFullAdvance ? 0 : codAdvance,
    paymentLabel: isFullAdvance
      ? "Full Advance Payment — Free Delivery"
      : `Cash on Delivery — Rs. ${codAdvance.toLocaleString()} advance to confirm`,
  };
}

export function paymentSnapshot(paymentSettings = {}) {
  return {
    bankName: String(paymentSettings.bankName || "").trim(),
    bankTitle: String(paymentSettings.bankTitle || "").trim(),
    bankAccountNumber: String(paymentSettings.bankAccountNumber || "").trim(),
    bankIban: String(paymentSettings.bankIban || "").trim(),
    instructions: String(paymentSettings.instructions || "").trim(),
    whatsappNumber: String(paymentSettings.whatsappNumber || "").replace(/\D/g, ""),
  };
}
