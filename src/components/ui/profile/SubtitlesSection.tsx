import React, { useEffect, useRef, useState } from "react";

const USER_SETTINGS_KEY = "jellyfin_user_settings";

type SubtitleFontFamily =
  | "default"
  | "sans"
  | "serif"
  | "mono"
  | "inter"
  | "roboto"
  | "poppins"
  | "montserrat"
  | "lato"
  | "raleway";
type SubtitleFontWeight = "regular" | "bold";
type SubtitleBackground = "none" | "shadow" | "solid";

type SubtitleSettings = {
  positionPx: number;
  fontFamily: SubtitleFontFamily;
  fontWeight: SubtitleFontWeight;
  background: SubtitleBackground;
  sizePx: number;
  previewEnabled: boolean;
};

type UserSettings = {
  subtitles?: Partial<SubtitleSettings>;
};

const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
  positionPx: 0,
  fontFamily: "default",
  fontWeight: "regular",
  background: "shadow",
  sizePx: 28,
  previewEnabled: true,
};

function readUserSettings(): UserSettings {
  if (globalThis.window === undefined) return {};
  try {
    const raw = localStorage.getItem(USER_SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UserSettings;
  } catch {
    return {};
  }
}

function writeUserSettings(settings: UserSettings) {
  if (globalThis.window === undefined) return;
  localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
  globalThis.window.dispatchEvent(new Event("user-settings-updated"));
}

function readSubtitleSettings(): SubtitleSettings {
  const stored = readUserSettings().subtitles ?? {};
  const legacyPosition = (stored as { position?: string }).position;
  const legacyPositionPx = (() => {
    switch (legacyPosition) {
      case "middle":
        return -60;
      case "lower":
        return 40;
      case "bottom":
      default:
        return 0;
    }
  })();
  return {
    ...DEFAULT_SUBTITLE_SETTINGS,
    positionPx:
      typeof (stored as { positionPx?: number }).positionPx === "number"
        ? (stored as { positionPx: number }).positionPx
        : legacyPositionPx,
    ...stored,
  };
}

type DropdownOption<T extends string> = {
  value: T;
  label: string;
};

type DropdownProps<T extends string> = {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
};

const CustomDropdown = <T extends string>({
  label,
  value,
  options,
  onChange,
}: DropdownProps<T>) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const selectedLabel =
    options.find((opt) => opt.value === value)?.label ?? value;

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        {label}
      </label>
      <div className="relative" ref={dropdownRef}>
        <button
          className="appearance-none bg-[#242424] text-white rounded px-4 py-2 pr-10 font-semibold border border-[#4d4d4d] transition-all outline-none cursor-pointer flex items-center min-w-[140px] shadow"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {selectedLabel}
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
        {open && (
          <div
            className="absolute z-50 mt-2 left-0 w-full bg-[#242424] border border-[#4d4d4d] rounded shadow-lg overflow-hidden animate-fade-in scrollbar-hide"
            role="listbox"
            tabIndex={-1}
            style={{
              boxShadow: "0 2px 8px 0 rgba(0,0,0,0.15)",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {options.map((option) => (
              <div
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={`px-4 py-2 cursor-pointer transition-all ${
                  option.value === value
                    ? "bg-[var(--accent-secondary)] text-white"
                    : "hover:bg-[#424242] text-white"
                } font-semibold`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onChange(option.value);
                    setOpen(false);
                  }
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SubtitlesSection: React.FC = () => {
  const [settings, setSettings] = useState<SubtitleSettings>(
    readSubtitleSettings(),
  );

  useEffect(() => {
    const updateFromStorage = () => {
      setSettings(readSubtitleSettings());
    };
    updateFromStorage();
    globalThis.window?.addEventListener(
      "user-settings-updated",
      updateFromStorage,
    );
    globalThis.window?.addEventListener("storage", updateFromStorage);
    return () => {
      globalThis.window?.removeEventListener(
        "user-settings-updated",
        updateFromStorage,
      );
      globalThis.window?.removeEventListener("storage", updateFromStorage);
    };
  }, []);

  const updateSettings = (partial: Partial<SubtitleSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      const current = readUserSettings();
      writeUserSettings({
        ...current,
        subtitles: next,
      });
      return next;
    });
  };

  const clampPositionPx = (value: number) => Math.max(-120, Math.min(200, value));

  const previewFontFamily = (() => {
    switch (settings.fontFamily) {
      case "inter":
        return "Inter, system-ui, -apple-system, Segoe UI, sans-serif";
      case "roboto":
        return "Roboto, system-ui, -apple-system, Segoe UI, sans-serif";
      case "poppins":
        return "Poppins, system-ui, -apple-system, Segoe UI, sans-serif";
      case "montserrat":
        return "Montserrat, system-ui, -apple-system, Segoe UI, sans-serif";
      case "lato":
        return "Lato, system-ui, -apple-system, Segoe UI, sans-serif";
      case "raleway":
        return "Raleway, system-ui, -apple-system, Segoe UI, sans-serif";
      case "sans":
        return "Arial, Helvetica, sans-serif";
      case "serif":
        return "Georgia, Times, serif";
      case "mono":
        return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      case "default":
      default:
        return "inherit";
    }
  })();

  const previewBackgroundStyles = (() => {
    switch (settings.background) {
      case "solid":
        return {
          backgroundColor: "rgba(0,0,0,0.6)",
          textShadow: "none",
        };
      case "none":
        return {
          backgroundColor: "transparent",
          textShadow: "none",
        };
      case "shadow":
      default:
        return {
          backgroundColor: "transparent",
          textShadow:
            "0 2px 8px #000, 0 0px 2px #000, 0 0px 8px #000, 0 0px 16px #000, 0 0px 32px #000",
        };
    }
  })();

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Subtitles</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Vertical position
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={-120}
              max={200}
              step={2}
              value={settings.positionPx}
              onChange={(e) =>
                updateSettings({
                  positionPx: clampPositionPx(Number(e.target.value)),
                })
              }
              className="w-full max-w-xl"
            />
            <span className="text-sm text-zinc-300 w-16 text-right">
              {settings.positionPx}px
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Line number where text appears. Positive numbers indicate top down.
            Negative numbers indicate bottom up.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <CustomDropdown
            label="Style"
            value={settings.fontFamily}
            options={[
              { value: "default", label: "Default" },
              { value: "sans", label: "Sans" },
              { value: "serif", label: "Serif" },
              { value: "mono", label: "Monospace" },
              { value: "inter", label: "Inter" },
              { value: "roboto", label: "Roboto" },
              { value: "poppins", label: "Poppins" },
              { value: "montserrat", label: "Montserrat" },
              { value: "lato", label: "Lato" },
              { value: "raleway", label: "Raleway" },
            ]}
            onChange={(value) => updateSettings({ fontFamily: value })}
          />
          <CustomDropdown
            label="Weight"
            value={settings.fontWeight}
            options={[
              { value: "regular", label: "Regular" },
              { value: "bold", label: "Bold" },
            ]}
            onChange={(value) => updateSettings({ fontWeight: value })}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <CustomDropdown
            label="Background"
            value={settings.background}
            options={[
              { value: "shadow", label: "Shadow" },
              { value: "solid", label: "Solid" },
              { value: "none", label: "None" },
            ]}
            onChange={(value) => updateSettings({ background: value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Size
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={12}
              max={72}
              step={2}
              value={settings.sizePx}
              onChange={(e) =>
                updateSettings({ sizePx: Number(e.target.value) })
              }
              className="w-full max-w-xs"
            />
            <span className="text-sm text-zinc-300 w-14 text-right">
              {settings.sizePx}px
            </span>
            <button
              type="button"
              className="text-xs text-zinc-300 border border-white/20 rounded px-2 py-1 hover:bg-white/10"
              onClick={() => updateSettings({ sizePx: 28 })}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">Show preview</p>
            <p className="text-xs text-zinc-400">
              Preview subtitle appearance in this section.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.previewEnabled}
              onChange={(e) =>
                updateSettings({ previewEnabled: e.target.checked })
              }
            />
            <div className="w-11 h-6 rounded-full peer peer-checked:bg-red-600 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
          </label>
        </div>

        {settings.previewEnabled && (
          <div className="relative h-20 rounded-xl border border-white/10 bg-black/40 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(140deg,#aa5cc3,#00a4dc)]">
              <div
                className="absolute w-auto text-center text-white px-3 py-2 rounded"
                style={{
                  left: "50%",
                  fontSize: `${settings.sizePx}px`,
                  fontFamily: previewFontFamily,
                  fontWeight: settings.fontWeight === "bold" ? 700 : 400,
                  maxWidth: "90%",
                  lineHeight: 1.25,
                  wordBreak: "break-word",
                  transform: "translateX(-50%)",
                  ...previewBackgroundStyles,
                }}
              >
                Subtitle preview text
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtitlesSection;
