/** Shared, static atmosphere for every application workspace. No timers or external wallpapers. */
export function AppearanceBackdrop() {
  return <div className="appearance-backdrop" aria-hidden="true">
    <div className="appearance-backdrop-image" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}baize-background.webp)` }} />
    <div className="appearance-backdrop-art" />
    <div className="appearance-backdrop-texture" />
    <div className="appearance-backdrop-shade" />
  </div>;
}
