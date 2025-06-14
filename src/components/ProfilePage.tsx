import React, { useState, useEffect, useRef } from "react";
import JellyfinApi from "../api/jellyfin";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ProfilePage: React.FC = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  // State for profile picture
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(
    null
  );
  const [profilePicUploading, setProfilePicUploading] = useState(false);
  const [profilePicSuccess, setProfilePicSuccess] = useState<string | null>(
    null
  );

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
  const [currentProfilePicUrl, setCurrentProfilePicUrl] = useState<
    string | null
  >(null);

  // Helper for user initial
  const getUserInitial = () => {
    return user?.Name ? user.Name.charAt(0).toUpperCase() : "U";
  };

  useEffect(() => {
    if (user?.Id && user?.PrimaryImageTag) {
      const serverUrl = localStorage.getItem("jellyfin_server_url") ?? "";
      const api = new JellyfinApi({ serverUrl });
      setCurrentProfilePicUrl(
        api.getUserImageUrl(user.Id, user.PrimaryImageTag)
      );
    } else {
      setCurrentProfilePicUrl(null);
    }
  }, [user]);

  // Menu state for avatar actions
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target as Node)
      ) {
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

  // Handlers
  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePic(e.target.files[0]);
      setProfilePicPreview(URL.createObjectURL(e.target.files[0]));
      setProfilePicSuccess(null);

      // Directly upload the image
      if (user?.Id && api) {
        setProfilePicUploading(true);
        try {
          await api.uploadUserProfileImage(user.Id, e.target.files[0]);
          // Simulate new tag for cache busting
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
    // Simulate API call
    await new Promise((res) => setTimeout(res, 1200));
    setPasswordLoading(false);
    setPasswordSuccess("Password updated!");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // Delete image handler (simulate API call)
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const handleDeleteImage = async () => {
    setDeleteLoading(true);
    setDeleteSuccess(null);
    // Simulate API call
    await new Promise((res) => setTimeout(res, 1200));
    setCurrentProfilePicUrl(null);
    setDeleteLoading(false);
    setDeleteSuccess("Profile image deleted!");
    // Optionally, update user.PrimaryImageTag in localStorage
    if (user) {
      user.PrimaryImageTag = null;
      localStorage.setItem("jellyfin_user", JSON.stringify(user));
    }
  };

  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-start pt-16">
      {/* Back Button */}
      <div className="w-full max-w-2xl flex items-center mb-4 px-2">
        <button
          onClick={() => navigate('/')}
          className="text-zinc-300 hover:text-white flex items-center gap-2 text-base"
        >
          <span className="text-xl">&#8592;</span>
          <span>Back</span>
        </button>
      </div>
      {/* Profile avatar, name, and menu */}
      <div className="flex flex-col items-center mb-10">
        <div className="relative flex flex-col items-center">
          <button
            type="button"
            className="w-40 h-40 rounded-full bg-red-600 flex items-center justify-center mb-2 overflow-hidden border-none focus:outline-none"
            onClick={() => setShowAvatarMenu((v) => !v)}
            tabIndex={0}
          >
            {currentProfilePicUrl ? (
              <img
                src={currentProfilePicUrl}
                alt={user?.Name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-7xl text-zinc-700 font-bold">
                {getUserInitial()}
              </span>
            )}
          </button>
          {/* Avatar menu */}
          {showAvatarMenu && (
            <div
              ref={avatarMenuRef}
              className="absolute left-1/2 top-full mt-2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded shadow-lg z-20 min-w-[180px] py-2"
            >
              <label className="block px-4 py-2 text-zinc-200 hover:bg-zinc-800 cursor-pointer">
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
                className={`block w-full text-left px-4 py-2 text-red-400 hover:bg-zinc-800 ${
                  (deleteLoading || !currentProfilePicUrl) &&
                  "opacity-50 cursor-not-allowed"
                }`}
              >
                {deleteLoading ? "Deleting..." : "Delete Image"}
              </button>
            </div>
          )}
        </div>
        <div className="text-3xl font-light mt-2 mb-2">
          {user?.Name ?? "User"}
        </div>
        {/* {profilePicSuccess && (
          <div className="text-green-400 text-sm">{profilePicSuccess}</div>
        )}
        {deleteSuccess && (
          <div className="text-green-400 text-sm">{deleteSuccess}</div>
        )} */}
      </div>

      {/* Password Update Section */}
      <form
        onSubmit={handlePasswordUpdate}
        className="w-full max-w-2xl flex flex-col gap-6 items-center"
        style={{ maxWidth: 700 }}
      >
        <div className="w-full">
          <label className="block mb-1 text-zinc-300">Current password</label>
          <input
            type="password"
            placeholder="Current password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-cyan-400 text-lg"
          />
        </div>
        <div className="w-full">
          <label className="block mb-1 text-zinc-300">New password</label>
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-cyan-400 text-lg"
          />
        </div>
        <div className="w-full">
          <label className="block mb-1 text-zinc-300">
            New password confirm
          </label>
          <input
            type="password"
            placeholder="New password confirm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-cyan-400 text-lg"
          />
        </div>
        {passwordError && (
          <div className="text-red-400 w-full">{passwordError}</div>
        )}
        {passwordSuccess && (
          <div className="text-green-400 w-full">{passwordSuccess}</div>
        )}
        <button
          type="submit"
          disabled={passwordLoading}
          className="w-full px-4 py-3 rounded bg-[var(--accent-secondary)] transition text-white font-semibold text-lg"
        >
          {passwordLoading ? "Saving..." : "Save Password"}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
