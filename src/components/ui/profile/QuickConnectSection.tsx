import React from "react";

const QuickConnectSection: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Quick Connect</h2>
      <div className="space-y-4">
        <p className="text-zinc-300">
          Quick Connect allows you to sign in to apps without entering your password.
        </p>
        <div className="bg-zinc-800 p-4 rounded">
          <p className="text-zinc-400 text-sm">Quick Connect is currently disabled.</p>
        </div>
      </div>
    </div>
  );
};

export default QuickConnectSection;
