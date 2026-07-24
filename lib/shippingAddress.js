function cleanAddressPart(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function hasStructuredShippingAddress(details = {}) {
  return Boolean(
    cleanAddressPart(details.houseNo) &&
    cleanAddressPart(details.street) &&
    cleanAddressPart(details.block)
  );
}

export function buildShippingAddress(details = {}) {
  const houseNo = cleanAddressPart(details.houseNo);
  const street = cleanAddressPart(details.street);
  const block = cleanAddressPart(details.block);
  const landmark = cleanAddressPart(details.landmark);

  const structuredParts = [
    houseNo ? `House / Flat: ${houseNo}` : "",
    street ? `Street / Road: ${street}` : "",
    block ? `Block / Area: ${block}` : "",
    landmark ? `Near: ${landmark}` : "",
  ].filter(Boolean);

  if (structuredParts.length) return structuredParts.join(", ");
  return cleanAddressPart(details.address);
}
