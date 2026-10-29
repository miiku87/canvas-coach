#!/bin/bash
# Canvas Coach -asennus (macOS): tuplaklikkaa tätä tiedostoa.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js puuttuu. Asenna se osoitteesta https://nodejs.org ja tuplaklikkaa tätä tiedostoa uudelleen."
  read -r -p "Paina Enter sulkeaksesi."
  exit 1
fi
node scripts/setup.mjs
read -r -p "Paina Enter sulkeaksesi ikkunan."
