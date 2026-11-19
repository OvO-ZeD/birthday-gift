import "../../theme-refresh.css";
import "../../polish.css";
import { fontVariables } from "../../lib/fonts";

// Gift pages only: the gift theme and polish load here, not on the homepage.
export default function GiftLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={fontVariables} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
