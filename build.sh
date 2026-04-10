#!/usr/bin/env bash

echo "Installing yt-dlp locally..."

mkdir -p bin

curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
  -o ./bin/yt-dlp

chmod +x ./bin/yt-dlp

echo "yt-dlp installed at ./bin/yt-dlp"