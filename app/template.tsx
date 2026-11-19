// Intentionally a plain pass-through. The homepage must render exactly as its original code does,
// so no page-level fade or wrapper is applied here.
export default function Template({ children }: { children: React.ReactNode }) {
  return children;
}
