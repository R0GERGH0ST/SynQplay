"use client";

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#212121] p-8 rounded-xl shadow-2xl border border-red-500/20 text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-gray-400 mb-6">
          We encountered an error while loading SynQplay. Please try again.
        </p>
        <button
          onClick={reset}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}