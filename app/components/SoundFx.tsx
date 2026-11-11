"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";
import { isMuted, playSfx, setMuted, type SfxName } from "@/app/lib/sfx";

/**
 * Adds soft interface sounds to the whole app and one small mute switch.
 *
 * It listens for clicks at the document level, so no existing button needs changing:
 * - primary and call-to-action buttons make a "pop",
 * - every other button and link makes a quiet "tap",
 * - any element can choose its own with data-sfx="success" (or chime, whoosh, error),
 *   or opt out with data-sfx="off".
 * Recipient gift pages (/g/...) are left silent, because they have their own soundtrack.
 */
export default function SoundFx() {
  const pathname = usePathname();
  const [muted, setMutedState] = useState(true);
  const silentPage = pathname.startsWith("/g/");

  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  useEffect(() => {
    if (silentPage) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const element = target.closest<HTMLElement>("[data-sfx], button, a[href]");
      if (!element) return;
      if (element instanceof HTMLButtonElement && element.disabled) return;

      const chosen = element.dataset.sfx;
      if (chosen === "off") return;

      const isCallToAction = /primary|landing-button|publish/i.test(String(element.className));
      const name = (chosen as SfxName | undefined) ?? (isCallToAction ? "pop" : "tap");
      playSfx(name);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [silentPage]);

  if (silentPage) return null;

  return (
    <button
      type="button"
      className="sfx-toggle"
      data-sfx="off"
      aria-pressed={!muted}
      aria-label={muted ? "Turn interface sounds on" : "Turn interface sounds off"}
      title={muted ? "Sounds off" : "Sounds on"}
      onClick={() => {
        const next = !muted;
        setMuted(next);
        setMutedState(next);
        if (!next) playSfx("chime");
      }}
    >
      {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
    </button>
  );
}
