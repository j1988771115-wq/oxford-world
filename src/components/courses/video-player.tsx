"use client";

import MuxPlayer from "@mux/mux-player-react";

interface VideoPlayerProps {
  playbackId: string;
  title: string;
  accentColor?: string;
}

export function VideoPlayer({ playbackId, title, accentColor = "#2563eb" }: VideoPlayerProps) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      metadata={{
        video_title: title,
      }}
      accentColor={accentColor}
      className="w-full aspect-video"
      streamType="on-demand"
    />
  );
}
