#!/usr/bin/env bash
# Regenerate <lastmod> values in sitemap.xml from each URL's source file git log.
# Untracked/uncommitted files fall back to today's date.
# Run from any directory — cd is handled.

set -euo pipefail
cd "$(dirname "$0")/.."

# url|source-file — keep in sync with sitemap.xml entries
entries=(
  "https://kindredconnect.app/|index.html"
  "https://kindredconnect.app/privacy/|privacy/index.html"
  "https://kindredconnect.app/terms/|terms/index.html"
  "https://kindredconnect.app/blog/|blog/index.html"
  "https://kindredconnect.app/blog/weekly-couples-check-in/|blog/weekly-couples-check-in/index.html"
  "https://kindredconnect.app/blog/couples-check-in-questions/|blog/couples-check-in-questions/index.html"
  "https://kindredconnect.app/blog/best-couples-apps/|blog/best-couples-apps/index.html"
  "https://kindredconnect.app/blog/paired-vs-kindred/|blog/paired-vs-kindred/index.html"
)

today=$(date +%F)
lookup=""

for entry in "${entries[@]}"; do
  url="${entry%%|*}"
  file="${entry##*|}"
  if [[ ! -f "$file" ]]; then
    echo "warning: $file not found, skipping $url" >&2
    continue
  fi
  date=$(git log -1 --format=%cs -- "$file" 2>/dev/null || true)
  [[ -z "$date" ]] && date="$today"
  lookup+="$url|$date"$'\n'
done

export KC_LOOKUP="$lookup"

perl -i -pe '
  BEGIN {
    for my $line (split /\n/, $ENV{KC_LOOKUP}) {
      next unless length $line;
      my ($u, $d) = split /\|/, $line, 2;
      $m{$u} = $d;
    }
  }
  if (m{<loc>([^<]+)</loc>}) { $cur = $1 }
  if ($cur && exists $m{$cur}
      && s{<lastmod>[^<]*</lastmod>}{<lastmod>$m{$cur}</lastmod>}) {
    $cur = "";
  }
' sitemap.xml

if command -v xmllint >/dev/null 2>&1; then
  xmllint --noout sitemap.xml && echo "✓ sitemap.xml valid"
else
  echo "✓ sitemap.xml updated (xmllint not installed — XML not validated)"
fi
