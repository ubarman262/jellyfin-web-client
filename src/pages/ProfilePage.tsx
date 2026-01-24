import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ProfileSection from "../components/ui/profile/ProfileSection";
import QuickConnectSection from "../components/ui/profile/QuickConnectSection";
import DisplaySection from "../components/ui/profile/DisplaySection";
import MarlinSearchSection from "../components/ui/profile/MarlinSearchSection";
import HomeSection from "../components/ui/profile/HomeSection";
import PlaybackSection from "../components/ui/profile/PlaybackSection";
import SubtitlesSection from "../components/ui/profile/SubtitlesSection";
import ProfileSectionsList, {
  ProfileSectionItem,
} from "../components/ui/profile/ProfileSectionsList";
import { useAuth } from "../context/AuthContext";

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState("Profile");

  const sections = useMemo<ProfileSectionItem[]>(
    () => [
      { id: "Profile", label: "Profile", description: "Account info" },
      {
        id: "QuickConnect",
        label: "Quick Connect",
        description: "Pair devices quickly",
      },
      { id: "Display", label: "Display", description: "Theme & layout" },
      { id: "Home", label: "Home", description: "Landing preferences" },
      {
        id: "Playback",
        label: "Playback",
        description: "Player behavior",
      },
      {
        id: "Subtitles",
        label: "Subtitles",
        description: "Caption settings",
      },
      { id: "Plugins", label: "Plugins", description: "Extensions" },
    ],
    []
  );

  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  const renderContent = () => {
    switch (activeSection) {
      case "Profile":
        return <ProfileSection />;
      case "QuickConnect":
        return <QuickConnectSection />;
      case "Display":
        return <DisplaySection />;
      case "Home":
        return <HomeSection />;
      case "Playback":
        return <PlaybackSection />;
      case "Subtitles":
        return <SubtitlesSection />;
      case "Plugins":
        return <MarlinSearchSection />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center text-zinc-400 hover:text-white mr-4"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold">Profile</h1>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          <ProfileSectionsList
            sections={sections}
            activeSectionId={activeSection}
            onSelect={setActiveSection}
            onSignOut={handleSignOut}
          />
          <div className="max-w-4xl">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
