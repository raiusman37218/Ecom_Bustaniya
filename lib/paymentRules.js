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

export function normalizePaymentMethod(value) {
  return value === PAYMENT_METHODS.FULL_ADVANCE || value === "bank_deposit" || value === "advance"
    ? PAYMENT_METHODS.FULL_ADVANCE
    : PAYMENT_METHODS.COD;
}

export function calculatePaymentAmounts({ subtotal = 0, paymentMethod, paymentSettings = {} } = {}) {
  const productSubtotal = Math.max(0, Math.round(Number(subtotal || 0) * 100) / 100);
  const method = normalizePaymentMethod(paymentMethod);
  const codDeliveryCharge = Math.max(0, Math.round(Number(paymentSettings.codDeliveryChargePkr ?? 250) * 100) / 100);
  const isFullAdvance = method === PAYMENT_METHODS.FULL_ADVANCE;
  const deliveryCharges = isFullAdvance ? 0 : codDeliveryCharge;
  const totalOrderValue = productSubtotal + deliveryCharges;
  const amountPayableInAdvance = isFullAdvance ? totalOrderValue : 0;
  const amountPayableOnDelivery = isFullAdvance ? 0 : totalOrderValue;

  return {
    paymentMethod: method,
    productSubtotal,
    deliveryCharges,
    totalOrderValue,
    amountPayableInAdvance,
    amountPayableOnDelivery,
    courierCollectionAmount: amountPayableOnDelivery,
    paymentLabel: isFullAdvance ? "Full Advance Payment — Free Delivery" : "Cash on Delivery (COD)",
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
