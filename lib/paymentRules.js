export const PAYMENT_METHODS = {
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
  return value === PAYMENT_METHODS.FULL_ADVANCE || value === "bank_deposit"
    ? PAYMENT_METHODS.FULL_ADVANCE
    : PAYMENT_METHODS.COD_ADVANCE_DELIVERY;
}

export function calculatePaymentAmounts({ subtotal = 0, paymentMethod, paymentSettings = {} } = {}) {
  const productSubtotal = Math.max(0, Math.round(Number(subtotal || 0) * 100) / 100);
  const method = normalizePaymentMethod(paymentMethod);
  const codDeliveryCharge = Math.max(0, Math.round(Number(paymentSettings.codDeliveryChargePkr ?? 250) * 100) / 100);
  const isFullAdvance = method === PAYMENT_METHODS.FULL_ADVANCE;
  const deliveryCharges = isFullAdvance ? 0 : codDeliveryCharge;
  const amountPayableInAdvance = isFullAdvance ? productSubtotal : deliveryCharges;
  const amountPayableOnDelivery = isFullAdvance ? 0 : productSubtotal;

  return {
    paymentMethod: method,
    productSubtotal,
    deliveryCharges,
    totalOrderValue: productSubtotal + deliveryCharges,
    amountPayableInAdvance,
    amountPayableOnDelivery,
    courierCollectionAmount: amountPayableOnDelivery,
    paymentLabel: isFullAdvance ? "Full Advance Payment — Free Delivery" : `Cash on Delivery — Rs. ${deliveryCharges.toLocaleString()} Delivery Charges Paid in Advance`,
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
