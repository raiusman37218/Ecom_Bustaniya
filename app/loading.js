/**
 * Minimal, zero-layout-shift root loading indicator.
 * Provides a clean top progress bar during transitions instead of
 * destroying the page layout with a jarring full-screen skeleton.
 */
export default function RootLoading() {
  return (
    <div
      className="bs-st-loadingChrome"
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        height: "3px",
        pointerEvents: "none",
        background: "transparent",
      }}
    >
      <div className="bs-st-loadingChrome__bar" />
    </div>
  );
}
