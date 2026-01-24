import React from "react";
import { LogOut } from "lucide-react";

export interface ProfileSectionItem {
  id: string;
  label: string;
  description?: string;
}

interface ProfileSectionsListProps {
  sections: ProfileSectionItem[];
  activeSectionId: string;
  onSelect: (id: string) => void;
  onSignOut: () => void;
}

const ProfileSectionsList: React.FC<ProfileSectionsListProps> = ({
  sections,
  activeSectionId,
  onSelect,
  onSignOut,
}) => {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide px-3 mb-3">
        Settings
      </h2>
      <div className="space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            className={`w-full text-left rounded-lg px-3 py-2 transition-colors border border-transparent hover:bg-white/10 ${
              activeSectionId === section.id
                ? "bg-white/10 text-white border-white/15"
                : "text-zinc-300"
            }`}
          >
            <div className="font-medium text-sm">{section.label}</div>
            {section.description && (
              <div className="text-xs text-zinc-400 mt-1">
                {section.description}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <span>Sign Out</span>
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
};

export default ProfileSectionsList;
