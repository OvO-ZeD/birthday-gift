"use client";

import { useEffect, useState } from "react";

const LOOKS = [
  { id: "violet", name: "Violet night", swatch: "#e58cac" },
  { id: "rose", name: "Rose quartz", swatch: "#c9788f" },
  { id: "ocean", name: "Ocean", swatch: "#5fb4d6" },
  { id: "sage", name: "Sage", swatch: "#8fbf9f" },
  { id: "sunset", name: "Sunset", swatch: "#f1995a" },
] as const;

type LookId = (typeof LOOKS)[number]["id"];

const STORAGE_KEY = "afterglow-studio-look";

function applyLook(id: LookId) {
  const shell = document.querySelector<HTMLElement>(".studio-shell");
  if (!shell) return;
  if (id === "violet") shell.removeAttribute("data-look");
  else shell.setAttribute("data-look", id);
}

/**
 * Changes the colours of the studio itself (not the gift) and remembers the choice on this
 * device. It only sets one data attribute on the studio shell, so it does not touch the
 * studio's own state.
 */
export default function StudioLook() {
  const [look, setLook] = useState<LookId>("violet");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const match = LOOKS.find((entry) => entry.id === saved);
      if (match) {
        setLook(match.id);
        applyLook(match.id);
      }
    } catch {
      /* Keep the default look when storage is unavailable. */
    }
  }, []);

  function choose(id: LookId) {
    setLook(id);
    applyLook(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* The choice then lasts for this visit only. */
    }
  }

  return (
    <div className="studio-look" role="group" aria-label="Studio colours">
      {LOOKS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={`look-dot ${look === entry.id ? "is-active" : ""}`}
          style={{ background: entry.swatch }}
          aria-pressed={look === entry.id}
          aria-label={`${entry.name} studio colours`}
          title={entry.name}
          data-sfx="tap"
          onClick={() => choose(entry.id)}
        />
      ))}
    </div>
  );
}
