const path = require('path');
const fs = require('fs');

async function downloadYtDlp() {
  const binDir = path.join(__dirname, '..', 'bin');
  const isWindows = process.platform === 'win32';
  const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
  const binaryPath = path.join(binDir, binaryName);

  // Skip if binary already exists
  if (fs.existsSync(binaryPath)) {
    console.log(`✓ yt-dlp binary already exists at ${binaryPath}`);
    return;
  }

  console.log('⬇ Downloading yt-dlp binary from GitHub...');

  // Create bin directory
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  try {
    const YTDlpWrap = require('yt-dlp-wrap').default;
    await YTDlpWrap.downloadFromGithub(binaryPath);

    // Set executable permissions on Linux/macOS
    if (!isWindows) {
      fs.chmodSync(binaryPath, 0o755);
    }

    console.log(`✓ yt-dlp binary downloaded to ${binaryPath}`);
  } catch (error) {
    console.error('✗ Failed to download yt-dlp binary:', error.message);
    console.error('  You can manually download it from: https://github.com/yt-dlp/yt-dlp/releases');
    // Don't exit with error code - allow npm install to complete
    // The server will check for the binary on startup
  }
}

downloadYtDlp();
