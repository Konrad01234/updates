#!/bin/sh
# Wraps src/cockpit.html into a standalone, installable index.html (PWA).
set -e
cd "$(dirname "$0")"
{
  printf '%s\n' '<!doctype html>' '<html lang="de">' '<head>' \
    '<meta charset="utf-8">' \
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' \
    '<meta name="apple-mobile-web-app-capable" content="yes">' \
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">' \
    '<meta name="theme-color" content="#0d1417">' \
    '<link rel="manifest" href="manifest.webmanifest">' \
    '<link rel="apple-touch-icon" href="icon.svg">' \
    '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}</style>' \
    '</head>' '<body>'
  cat src/cockpit.html
  printf '%s\n' '</body>' '</html>'
} > index.html
echo "index.html gebaut"
