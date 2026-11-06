/**
 * Root-segment loading state.
 *
 * Deliberately nothing. A top progress bar was drawing attention to every
 * transition — including the many that finish in under a tenth of a second —
 * and a line that appears and vanishes reads as slowness rather than speed.
 * Mainstream storefronts show no such bar; they let the previous page stand
 * until the next one is ready, and the routes that genuinely take a moment
 * (collection, product, cart, checkout, search) each render their own
 * skeleton from their own loading.js.
 *
 * This boundary also covers /admin, so it must stay neutral.
 */
export default function RootLoading() {
  return null;
}
