const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function isYouTubeVideoId(value: unknown): value is string {
  return typeof value === "string" && YOUTUBE_VIDEO_ID.test(value);
}

export function parseYouTubeVideoId(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  const isYouTubeHost = host === "youtube.com"
    || host.endsWith(".youtube.com")
    || host === "youtube-nocookie.com"
    || host.endsWith(".youtube-nocookie.com");
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (isYouTubeHost) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/watch") videoId = url.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) videoId = parts[1] ?? null;
  }

  return isYouTubeVideoId(videoId) ? videoId : null;
}

export function youtubeEmbedUrl(videoId: string, autoplay = false): string {
  const url = new URL(`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`);
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  if (autoplay) url.searchParams.set("autoplay", "1");
  return url.toString();
}
