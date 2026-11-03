export default function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas">
      <div className="flex items-center gap-3 text-sm font-semibold text-ink">
        <span className="spinner" aria-hidden="true" />
        Loading your workspace
      </div>
    </main>
  );
}
