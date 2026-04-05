export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#212121] p-8 rounded-xl shadow-2xl border border-white/10 text-center">
        <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-.98-5.5-2.5m.5-4C6.99 8.98 8.94 8 12 8c3.06 0 5.01.98 5.5 2.5m-.5 4.5a7.962 7.962 0 01-5.5-2.5" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Page Not Found</h2>
        <p className="text-gray-400 mb-6">
          The page you're looking for doesn't exist in SynQplay.
        </p>
        <a
          href="/"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}