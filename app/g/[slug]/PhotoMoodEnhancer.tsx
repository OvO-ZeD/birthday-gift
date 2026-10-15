"use client";

import { useEffect } from "react";

/** Samples the gift's own photos and softly tints the backdrop to suit them. */
export default function PhotoMoodEnhancer() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".public-gift");
    if (!root) return;

    let cancelled = false;
    const sample = () => {
      if (cancelled) return;
      const photos = Array.from(root.querySelectorAll<HTMLImageElement>(".ambient-photo"))
        .filter((img) => img.complete && img.naturalWidth > 0);
      if (!photos.length) return;

      const canvas = document.createElement("canvas");
      canvas.width = 18;
      canvas.height = 18;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      let red = 0, green = 0, blue = 0, samples = 0;
      for (const photo of photos.slice(0, 4)) {
        try {
          context.clearRect(0, 0, 18, 18);
          context.drawImage(photo, 0, 0, 18, 18);
          const pixels = context.getImageData(0, 0, 18, 18).data;
          for (let i = 0; i < pixels.length; i += 16) {
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
            const brightness = (r + g + b) / 3;
            if (brightness < 24 || brightness > 238) continue;
            red += r; green += g; blue += b; samples++;
          }
        } catch {
          // If browser privacy settings block canvas sampling, retain the selected theme.
          return;
        }
      }
      if (!samples) return;
      const r = Math.round(red / samples);
      const g = Math.round(green / samples);
      const b = Math.round(blue / samples);
      root.style.setProperty("--photo-mood", `rgba(${r}, ${g}, ${b}, .20)`);
      root.dataset.photoMood = "ready";
    };

    const images = Array.from(root.querySelectorAll<HTMLImageElement>(".ambient-photo"));
    images.forEach((img) => {
      if (!img.complete) img.addEventListener("load", sample, { once: true });
    });
    sample();
    return () => {
      cancelled = true;
      images.forEach((img) => img.removeEventListener("load", sample));
    };
  }, []);

  return null;
}
