import React from "react";

const DisplaySection: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Display</h2>
      <div className="space-y-6">
        <div>
          <label htmlFor="language-select" className="block text-sm font-medium text-zinc-300 mb-2">Language</label>
          <select id="language-select" className="w-full max-w-xs px-3 py-2 bg-zinc-800 border border-zinc-600 rounded focus:outline-none focus:border-blue-500 text-white">
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
            <option>German</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="date-format-select" className="block text-sm font-medium text-zinc-300 mb-2">Date Format</label>
          <select id="date-format-select" className="w-full max-w-xs px-3 py-2 bg-zinc-800 border border-zinc-600 rounded focus:outline-none focus:border-blue-500 text-white">
            <option>MM/DD/YYYY</option>
            <option>DD/MM/YYYY</option>
            <option>YYYY-MM-DD</option>
          </select>
        </div>

        <div>
          <label htmlFor="time-format-select" className="block text-sm font-medium text-zinc-300 mb-2">Time Format</label>
          <select id="time-format-select" className="w-full max-w-xs px-3 py-2 bg-zinc-800 border border-zinc-600 rounded focus:outline-none focus:border-blue-500 text-white">
            <option>12 Hour</option>
            <option>24 Hour</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default DisplaySection;
