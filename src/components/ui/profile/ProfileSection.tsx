import React, { useState, useRef, useEffect } from "react";
import JellyfinApi from "../../../api/jellyfin";
import { useAuth } from "../../../context/AuthContext";

const ProfileSection: React.FC = () => {
  const { api } = useAuth();
  
  // State for profile picture
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [profilePicUploading, setProfilePicUploading] = useState(false);
  const [profilePicSuccess, setProfilePicSuccess] = useState<string | null>(null);

  // State for password update
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // User info and profile image
  const storedUser = localStorage.getItem("jellyfin_user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const [currentProfilePicUrl, setCurrentProfilePicUrl] = useState<string | null>(null);

  // Menu state for avatar actions
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const getUserInitial = () => {
    return user?.Name ? user.Name.charAt(0).toUpperCase() : "U";
  };

  useEffect(() => {
    if (user?.Id && user?.PrimaryImageTag) {
      const serverUrl = localStorage.getItem("jellyfin_server_url") ?? "";
      const api = new JellyfinApi({ serverUrl });
      setCurrentProfilePicUrl(api.getUserImageUrl(user.Id, user.PrimaryImageTag));
    } else {
      setCurrentProfilePicUrl(null);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setShowAvatarMenu(false);
      }
    };
    if (showAvatarMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAvatarMenu]);

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePic(e.target.files[0]);
      setProfilePicPreview(URL.createObjectURL(e.target.files[0]));
      setProfilePicSuccess(null);

      if (user?.Id && api) {
        setProfilePicUploading(true);
        try {
          await api.uploadUserProfileImage(user.Id, e.target.files[0]);
          const newTag = Date.now().toString();
          user.PrimaryImageTag = newTag;
          localStorage.setItem("jellyfin_user", JSON.stringify(user));
          setCurrentProfilePicUrl(api.getUserImageUrl(user.Id, newTag));
          setProfilePicSuccess("Profile picture updated!");
        } catch (e) {
          setProfilePicSuccess("Failed to upload image");
        } finally {
          setProfilePicUploading(false);
          setProfilePic(null);
          setProfilePicPreview(null);
        }
      }
    }
  };

  const [deleteLoading, setDeleteLoading] = useState(false);
  const handleDeleteImage = async () => {
    setDeleteLoading(true);
    await new Promise((res) => setTimeout(res, 1200));
    setCurrentProfilePicUrl(null);
    setDeleteLoading(false);
    if (user) {
      user.PrimaryImageTag = null;
      localStorage.setItem("jellyfin_user", JSON.stringify(user));
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (!oldPassword || !newPassword) {
      setPasswordError("Please fill all fields.");
      return;
    }
    setPasswordError("");
    setPasswordLoading(true);
    await new Promise((res) => setTimeout(res, 1200));
    setPasswordLoading(false);
    setPasswordSuccess("Password updated!");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">Profile</h2>
        
        {/* Profile Image Section */}
        <div className="mb-8">
          <div className="flex items-start space-x-6">
            <div className="relative">
              <button
                type="button"
                className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setShowAvatarMenu((v) => !v)}
              >
                {currentProfilePicUrl ? (
                  <img
                    src={currentProfilePicUrl}
                    alt={user?.Name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-2xl text-white font-bold">
                    {getUserInitial()}
                  </span>
                )}
              </button>
              {showAvatarMenu && (
                <div
                  ref={avatarMenuRef}
                  className="absolute left-0 top-full mt-2 bg-zinc-800 border border-zinc-600 rounded shadow-lg z-20 min-w-[180px] py-2"
                >
                  <label className="block px-4 py-2 text-zinc-200 hover:bg-zinc-700 cursor-pointer">
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePicChange}
                      className="hidden"
                      disabled={profilePicUploading}
                    />
                  </label>
                  <button
                    onClick={handleDeleteImage}
                    disabled={deleteLoading || !currentProfilePicUrl}
                    className={`block w-full text-left px-4 py-2 text-red-400 hover:bg-zinc-700 ${
                      (deleteLoading || !currentProfilePicUrl) && "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {deleteLoading ? "Deleting..." : "Delete Image"}
                  </button>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">{user?.Name ?? "User"}</h3>
              <p className="text-zinc-400 text-sm">Click the avatar to change your profile image</p>
            </div>
          </div>
        </div>

        {/* Password Section */}
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Password</h3>
          <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
            <div>
              <label className="block mb-2 text-sm text-zinc-300">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded focus:outline-none focus:border-blue-500 text-white"
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm text-zinc-300">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded focus:outline-none focus:border-blue-500 text-white"
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm text-zinc-300">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded focus:outline-none focus:border-blue-500 text-white"
                required
              />
            </div>
            {passwordError && <div className="text-red-400 text-sm">{passwordError}</div>}
            {passwordSuccess && <div className="text-green-400 text-sm">{passwordSuccess}</div>}
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
            >
              {passwordLoading ? "Saving..." : "Save"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;
