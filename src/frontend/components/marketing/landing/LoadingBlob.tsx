/** Animated wavy blob cluster for the scan-in-progress state. */
export function LoadingBlob() {
  return (
    <div
      className="loading-blob-stage"
      role="img"
      aria-label="Loading"
    >
      <div className="loading-blob-orbit loading-blob-orbit--outer" />
      <div className="loading-blob-orbit loading-blob-orbit--inner" />
      <div className="loading-blob-wave loading-blob-wave--1" />
      <div className="loading-blob-wave loading-blob-wave--2" />
      <div className="loading-blob-wave loading-blob-wave--3" />
      <div className="loading-blob-core" />
      <div className="loading-blob-pulse" />
    </div>
  );
}
