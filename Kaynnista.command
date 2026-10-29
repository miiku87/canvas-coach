#!/bin/bash
# Canvas Coach -palvelimen käynnistys (macOS): tuplaklikkaa tätä tiedostoa.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1 || [ ! -d node_modules ]; then
  echo "Aja ensin Asenna.command (ja asenna tarvittaessa Node.js osoitteesta https://nodejs.org)."
  read -r -p "Paina Enter sulkeaksesi."
  exit 1
fi
npm start
read -r -p "Paina Enter sulkeaksesi ikkunan."
