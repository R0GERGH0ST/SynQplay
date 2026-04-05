export default function Loading() {
  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 mx-auto mb-4">
          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Loading SynQplay</h2>
        <p className="text-gray-400">Syncing your music experience...</p>
      </div>
    </div>
  );
}