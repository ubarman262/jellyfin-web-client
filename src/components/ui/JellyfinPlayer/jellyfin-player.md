# JellyfinPlayer Component

A reusable, Prime Video–style web video player for [Jellyfin](https://jellyfin.org/). It streams any Jellyfin item (movies, episodes, etc.) via HLS, supports audio/subtitle switching, quality selection, episode lists for TV shows, X-Ray metadata, and persists playback state back to the Jellyfin server.

## Table of contents

- [Quick start](#quick-start)
- [Authentication](#authentication)
- [Props](#props)
  - [Core playback props](#core-playback-props)
  - [Metadata / chrome props](#metadata--chrome-props)
  - [Feature toggles](#feature-toggles)
  - [Icon theming](#icon-theming)
- [Feature details](#feature-details)
  - [Audio track switching](#audio-track-switching)
  - [Subtitle switching](#subtitle-switching)
  - [Video quality](#video-quality)
  - [Resume / session reporting](#resume--session-reporting)
  - [Episodes panel (TV shows)](#episodes-panel-tv-shows)
  - [X-Ray panel](#x-ray-panel)
  - [Controls auto-hide](#controls-auto-hide)
  - [Picture-in-picture & fullscreen](#picture-in-picture--fullscreen)
- [Icon themes](#icon-themes)
  - [Built-in presets](#built-in-presets)
  - [Custom icon map](#custom-icon-map)
  - [Override a preset](#override-a-preset)
- [Types](#types)
- [Errors & troubleshooting](#errors--troubleshooting)

---

## Quick start

```tsx
import { JellyfinPlayer } from "@/components/jellyfin-player";

function WatchPage({ session, itemId }: { session: JellyfinSession; itemId: string }) {
  return (
    <JellyfinPlayer
      serverUrl={session.serverUrl}
      userId={session.userId}
      accessToken={session.accessToken}
      deviceId={session.deviceId}
      itemId={itemId}
      onClose={() => router.navigate({ to: "/" })}
    />
  );
}
```

The player will:

1. Fetch `PlaybackInfo` for the item.
2. Build an HLS master playlist URL (`/Videos/{id}/master.m3u8`).
3. Auto-play (by default) from the saved resume position.
4. Render the dark overlay with title, controls, audio/subtitle/quality menus, and any TV episode list.

---

## Authentication

The component itself is unopinionated about how you obtain a Jellyfin access token. The bundled test app uses `authenticateJellyfin()` from `src/lib/jellyfin-auth.tsx`:

```tsx
import { authenticateJellyfin } from "@/lib/jellyfin-auth";

const session = await authenticateJellyfin(
  "https://jellyfin.example.com",
  "alice",
  "password",
);
// { serverUrl, userId, username, accessToken, deviceId }
```

Every API request the player makes carries the Jellyfin `Authorization` header:

```
MediaBrowser Client="JellyfinPlayer", Device="Web", DeviceId="...", Version="1.0.0", Token="..."
```

---

## Props

### Core playback props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `serverUrl` | `string` | required | Base URL of the Jellyfin server, e.g. `https://jellyfin.example.com`. Trailing slashes are stripped. |
| `itemId` | `string` | required | Jellyfin item id to play (movie, episode, etc.). |
| `userId` | `string` | required | Jellyfin user id that owns the session. |
| `accessToken` | `string` | required | Access token from `/Users/AuthenticateByName` or an API key. |
| `deviceId` | `string` | random | Stable device identifier. If omitted, a random id is generated per mount. |
| `maxStreamingBitrate` | `number` | `20_000_000` | Upper cap (bits/sec) used for `MaxStreamingBitrate` in the stream URL and quality preset filtering. |
| `autoPlay` | `boolean` | `true` | Start playback as soon as the stream is ready. |
| `startPositionSeconds` | `number` | `0` | Fallback start position if the server has no saved resume position (or when `enableResume` is `false`). |
| `className` | `string` | `"w-full"` | Extra classes for the outer wrapper. |

### Metadata / chrome props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `string` | auto | Title shown in the top bar. If omitted, derived from the Jellyfin item (`SeriesName` for episodes, `Name` otherwise). |
| `subtitle` | `string` | auto | Subtitle shown under the title. If omitted, derived from the item (e.g. `S3 E4 — Episode Name` for episodes, `ProductionYear` for movies). |
| `showBackButton` | `boolean` | `true` | Render the back button in the top-left. |
| `showCloseButton` | `boolean` | `true` | Render the close button in the top-right. |
| `onBack` | `() => void` | — | Called when the back button is clicked. Button only renders if both `showBackButton` and `onBack` are provided. |
| `onClose` | `() => void` | — | Called when the close button is clicked. Button only renders if both `showCloseButton` and `onClose` are provided. |

### Feature toggles

All feature toggles default to `true`. Set any to `false` to hide or disable the corresponding UI/functionality.

| Prop | What it disables |
| --- | --- |
| `enableAudioTracks` | Audio track selection in the audio/subtitles menu. |
| `enableSubtitles` | Subtitle selection in the audio/subtitles menu. |
| `enableQualitySelector` | Gear icon / video quality menu. |
| `enableEpisodes` | Episode list panel for TV series and the episodes icon in the controls. |
| `enablePictureInPicture` | Picture-in-picture button. |
| `enableFullscreen` | Fullscreen button. |
| `enableSkipButtons` | ±10s skip buttons in the center and bottom controls. |
| `enableVolumeControl` | Volume icon + slider. |
| `enableProgressBar` | Seek slider and current/total time labels. |
| `enableTitle` | Top-bar title/subtitle. |
| `enableCenterControls` | Large center play/pause and skip buttons. |
| `enableBufferingIndicator` | Center spinner shown while buffering. |
| `enableSessionReporting` | `POST /Sessions/Playing/Progress` and `Stopped` calls that persist state to Jellyfin. |
| `enableResume` | Loading the saved resume position from Jellyfin `UserData` on initial load. |
| `enableAutoHideControls` | Hiding the overlay after 3 seconds of inactivity. |
| `enableXRay` | X-Ray side panel (cast & crew / details) and its toggle button. |

### Icon theming

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `iconTheme` | `IconThemeInput` | `"default"` | Preset name, a custom icon map, or `{ base, overrides }`. See [Icon themes](#icon-themes). |

---

## Feature details

### Audio track switching

When the user selects an audio track, the player rebuilds the HLS URL with a new `AudioStreamIndex` and a unique `PlaySessionId`. This forces Jellyfin to start a fresh transcode for the requested track rather than returning a cached manifest with the old track.

The player also verifies the switch:

- If the HLS manifest exposes multiple audio renditions, the component selects the matching one via `hls.audioTrack`.
- If only one audio track is exposed (typical for transcoded streams), the single track is treated as proof the server honored the requested `AudioStreamIndex`.

UI feedback: a `Check` icon appears next to the applied track; the pending track shows "loading…".

### Subtitle switching

Text subtitles are loaded separately from the video stream:

1. The player fetches the Jellyfin `Stream.vtt` endpoint with the auth header.
2. The VTT payload is converted to a `blob:` URL.
3. A `<track kind="subtitles">` element is injected into the `<video>` element.

This avoids CORS/auth problems that occur when `<track>` loads an external URL directly. Subtitle toggling does **not** restart the video stream.

### Video quality

The gear icon opens a quality menu with presets from 4K/120 Mbps down to 240p/420 kbps. Selecting a preset updates the `bitrate` state, which changes the stream URL (`MaxStreamingBitrate`, `VideoBitrate`, `AudioBitrate`, and a new `PlaySessionId`). The player re-attaches the HLS source and resumes at the current playback position.

Only presets whose bitrate is `<= maxStreamingBitrate` are shown.

### Resume / session reporting

When `enableSessionReporting` is true, the player posts to:

- `POST /Sessions/Playing` on first play
- `POST /Sessions/Playing/Progress` every 10 seconds and on play/pause/seek/audio/subtitle changes
- `POST /Sessions/Playing/Stopped` on unmount or tab close

The payload includes `PositionTicks`, `AudioStreamIndex`, and `SubtitleStreamIndex`. Jellyfin stores these in `UserItemData` and returns them on the next load.

When `enableResume` is true, the player fetches `/Users/{userId}/Items/{itemId}` on load and uses `UserData.PlaybackPositionTicks` to set the initial resume position. If the server has no saved position, it falls back to `startPositionSeconds`.

Audio and subtitle selections are also restored from the same `UserData` fields.

### Episodes panel (TV shows)

If the playing item is an `Episode`, the player:

1. Fetches `/Shows/{seriesId}/Seasons`.
2. Fetches `/Shows/{seriesId}/Episodes?seasonId=...` for the selected season.
3. Renders a slide-up panel with season selector and horizontally scrollable episode cards.

Clicking an episode switches the internal `activeItemId` without re-mounting the component. The new episode always starts from its own saved position (or 0) — never from the previous episode’s position.

The episodes panel can be disabled with `enableEpisodes={false}`.

### X-Ray panel

The X-Ray panel is a Prime Video–style side drawer. It requires the item fetch to include `People, Genres, Studios, Overview, Taglines` fields (done automatically).

Tabs:

- **Cast & Crew**: lists actors with their roles and avatars, plus other crew members (directors, writers, etc.).
- **Details**: overview, production year, rating, community rating, runtime, genres, and studios.

Controlled by `enableXRay` and opened via the `Users` icon in the controls.

### Controls auto-hide

When `enableAutoHideControls` is true, the overlay fades out after 3 seconds of mouse/touch inactivity while the video is playing. It reappears on mouse move, touch, or when the video is paused.

### Picture-in-picture & fullscreen

- `enablePictureInPicture` toggles the native `requestPictureInPicture()` API.
- `enableFullscreen` toggles fullscreen on the player container element, so the overlay and popovers remain usable.

---

## Icon themes

### Built-in presets

```tsx
<JellyfinPlayer iconTheme="classic" {...rest} />
```

Presets: `default`, `minimal`, `bold`, `classic`, `filled`, `rounded`.

A preset changes both the set of Lucide icons used and the stroke width. For example, the `classic` preset swaps the skip icons to `SkipBack`/`SkipForward`, the settings icon to `Sliders`, and the loader to `LoaderCircle`.

### Custom icon map

Pass a partial map of `IconKey` to Lucide icons:

```tsx
import { Cog, ArrowLeft } from "lucide-react";

<JellyfinPlayer
  iconTheme={{
    settings: Cog,
    back: ArrowLeft,
  }}
/>
```

Missing keys fall back to the `default` preset.

### Override a preset

Pass a `base` preset plus `overrides`:

```tsx
<JellyfinPlayer
  iconTheme={{
    base: "classic",
    overrides: { back: ArrowLeft },
  }}
/>
```

### Icon keys

The icon keys you can customize:

`play`, `pause`, `skipBack`, `skipForward`, `volumeOn`, `volumeOff`, `settings`, `subtitles`, `pip`, `maximize`, `minimize`, `close`, `check`, `search`, `episodes`, `chevronDown`, `loader`, `back`, `xray`.

---

## Types

```tsx
export type IconThemeName = "default" | "minimal" | "bold" | "classic" | "filled" | "rounded";
export type IconKey =
  | "play" | "pause" | "skipBack" | "skipForward" | "volumeOn" | "volumeOff"
  | "settings" | "subtitles" | "pip" | "maximize" | "minimize" | "close"
  | "check" | "search" | "episodes" | "chevronDown" | "loader" | "back" | "xray";

export type IconSet = Record<IconKey, LucideIcon>;
export type IconThemeInput =
  | IconThemeName
  | Partial<IconSet>
  | { base?: IconThemeName; overrides: Partial<IconSet> };

export interface JellyfinPlayerProps {
  serverUrl: string;
  itemId: string;
  userId: string;
  accessToken: string;
  deviceId?: string;
  maxStreamingBitrate?: number;
  autoPlay?: boolean;
  startPositionSeconds?: number;
  className?: string;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showCloseButton?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  enableAudioTracks?: boolean;
  enableSubtitles?: boolean;
  enableQualitySelector?: boolean;
  enableEpisodes?: boolean;
  enablePictureInPicture?: boolean;
  enableFullscreen?: boolean;
  enableSkipButtons?: boolean;
  enableVolumeControl?: boolean;
  enableProgressBar?: boolean;
  enableTitle?: boolean;
  enableCenterControls?: boolean;
  enableBufferingIndicator?: boolean;
  enableSessionReporting?: boolean;
  enableAutoHideControls?: boolean;
  enableResume?: boolean;
  enableXRay?: boolean;
  iconTheme?: IconThemeInput;
}
```

---

## Errors & troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "PlaybackInfo failed (401)" | Invalid or expired `accessToken`. | Re-authenticate. |
| Audio track changes but sounds the same | Jellyfin returned a cached manifest. The player uses a unique `PlaySessionId` per audio selection to avoid this. If it still happens, verify the server is transcoding (not direct streaming) and that the `AudioStreamIndex` parameter is present in the manifest URL. |
| Subtitles never appear | The subtitle endpoint may require auth or CORS may block it. The player already fetches the VTT as a blob with auth headers. Check that the selected subtitle is a text-based track (e.g. SRT/ASS converted to VTT) and that Jellyfin exposes a `Stream.vtt` URL. |
| Quality stays low | The server may be ignoring the bitrate parameter or transcoding to a lower quality. Verify `VideoBitrate` and `MaxStreamingBitrate` are present in the stream URL and that the server has enough CPU for the requested transcode. |
| Menus not visible in fullscreen | The Radix popovers are portalized into the player container. If you moved the container or changed the fullscreen element, ensure the popover `container` still points to the fullscreen element. |
| Episode list not shown | The item must have `Type: "Episode"` and a `SeriesId`. The player fetches seasons/episodes only for episodes. |
| Resume position ignored | `enableResume` must be true and the server must have `UserData.PlaybackPositionTicks` saved from a previous `Playing/Progress` or `Playing/Stopped` call. |
