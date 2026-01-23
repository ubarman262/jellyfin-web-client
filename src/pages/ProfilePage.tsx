import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ProfileSection from "../components/ui/profile/ProfileSection";
import QuickConnectSection from "../components/ui/profile/QuickConnectSection";
import DisplaySection from "../components/ui/profile/DisplaySection";
import MarlinSearchSection from "../components/ui/profile/MarlinSearchSection";

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Profile");

  const tabs = [
    { id: "Profile", label: "Profile" },
    { id: "QuickConnect", label: "Quick Connect" },
    { id: "Display", label: "Display" },
    { id: "Home", label: "Home" },
    { id: "Playback", label: "Playback" },
    { id: "Subtitles", label: "Subtitles" },
    { id: "Plugins", label: "Plugins" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "Profile":
        return <ProfileSection />;
      case "QuickConnect":
        return <QuickConnectSection />;
      case "Display":
        return <DisplaySection />;
      case "Plugins":
        return <MarlinSearchSection />;
      default:
        return (
          <div className="text-center text-zinc-400 py-12">
            <p>{activeTab} settings coming soon...</p>
          </div>
        );
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

        {/* Tab Navigation */}
        <div className="border-b border-zinc-700 mb-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-500"
                    : "border-transparent text-zinc-400 hover:text-white hover:border-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="max-w-4xl">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
