"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

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
  shell.setAttribute("data-look", id);
}

function getLookSnapshot(): LookId | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const match = LOOKS.find((entry) => entry.id === saved);
    return match?.id ?? null;
  } catch {
    return null;
  }
}

function subscribeToLook(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
  };
}

function getServerLook(): LookId | null {
  return null;
}

/**
 * The palette changes only the studio's accent; its warm surfaces stay consistent on every device.
 */
export default function StudioLook() {
  const storedLook = useSyncExternalStore(subscribeToLook, getLookSnapshot, getServerLook);
  const [chosenLook, setChosenLook] = useState<LookId | null>(null);
  const look = chosenLook ?? storedLook ?? "sunset";

  useEffect(() => {
    applyLook(look);
  }, [look]);

  function choose(id: LookId) {
    setChosenLook(id);
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
