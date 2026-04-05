# SynQPlay - YouTube Music Player

A modern, sleek music player that syncs with your real YouTube Music library using Google OAuth.

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**:
   - Go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs: `http://localhost:3000` (for development)
   - Copy the Client ID

### 2. Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and replace `your_google_client_id_here` with your actual Google Client ID:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Real YouTube Integration**: Sync with your actual liked songs and playlists
- **Google OAuth**: Secure authentication with Google
- **Modern UI**: Sleek dark theme with Tailwind CSS
- **YouTube Player**: Embedded YouTube player for high-quality audio
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
src/
├── app/
│   └── page.js          # Main application entry
├── components/          # Reusable UI components
├── views/              # Page-level components
└── utils/              # Utility functions
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

Make sure to add your environment variables in Vercel's dashboard for production deployment.
