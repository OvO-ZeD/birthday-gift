"use client";

import { useEffect, useRef } from "react";
import {
  isYouTubeVideoId,
  sendYouTubePlayerCommand,
  YOUTUBE_PAUSE_EVENT,
  YOUTUBE_RESUME_EVENT,
  youtubeEmbedUrl,
} from "../lib/gifts/youtube";
import "./youtube-soundtrack.css";

export default function YouTubeSoundtrack({
  videoId,
  className = "",
}: {
  videoId: string;
  className?: string;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const pause = () => sendYouTubePlayerCommand(frameRef.current, "pauseVideo");
    const resume = () => sendYouTubePlayerCommand(frameRef.current, "playVideo");

    window.addEventListener(YOUTUBE_PAUSE_EVENT, pause);
    window.addEventListener(YOUTUBE_RESUME_EVENT, resume);
    return () => {
      window.removeEventListener(YOUTUBE_PAUSE_EVENT, pause);
      window.removeEventListener(YOUTUBE_RESUME_EVENT, resume);
    };
  }, []);

  if (!isYouTubeVideoId(videoId)) return null;

  return (
    <div className={`youtube-soundtrack-compact ${className}`.trim()}>
      <iframe
        ref={frameRef}
        title="YouTube soundtrack"
        src={youtubeEmbedUrl(videoId, true, { enableApi: true })}
        allow="autoplay; encrypted-media; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
