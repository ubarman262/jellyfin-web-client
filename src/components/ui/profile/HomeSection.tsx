import React, { useEffect, useState } from "react";

const USER_SETTINGS_KEY = "jellyfin_user_settings";
const DEFAULT_SHOW_QUALITY = false;

type UserSettings = {
  home?: {
    showQualityIndicators?: boolean;
  };
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

const HomeSection: React.FC = () => {
  const [showQualityIndicators, setShowQualityIndicators] = useState(
    DEFAULT_SHOW_QUALITY,
  );

  useEffect(() => {
    const settings = readUserSettings();
    setShowQualityIndicators(
      settings.home?.showQualityIndicators ?? DEFAULT_SHOW_QUALITY,
    );
  }, []);

  const handleToggle = (checked: boolean) => {
    setShowQualityIndicators(checked);
    const current = readUserSettings();
    writeUserSettings({
      ...current,
      home: {
        ...current.home,
        showQualityIndicators: checked,
      },
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Home</h2>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white">Show quality</p>
          <p className="text-xs text-zinc-400">
            Display HD/4K indicators on media cards.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={showQualityIndicators}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:bg-red-600 transition-colors" />
          <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
        </label>
      </div>
    </div>
  );
};

export default HomeSection;
