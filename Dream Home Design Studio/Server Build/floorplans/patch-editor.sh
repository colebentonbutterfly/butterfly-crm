#!/bin/sh
# Adapts the stock Sweet Home 3D JS editor page for the studio: it needs a
# plan name (the home page supplies it), shows a Projects button and a save
# indicator, and can be added to the iPad home screen.
set -eu
f="$1"

expect() {
  n=$(grep -c -F "$1" "$f" || true)
  if [ "$n" != "${2:-1}" ]; then
    echo "patch-editor: expected ${2:-1} match(es) for: $1 (found $n)" >&2
    exit 1
  fi
}

expect 'String homeName = request.getParameter("home");'
expect '<title>Sweet Home 3D JS</title>'
expect "var homeName = '<%= homeName == null ? \"HomeTest\" : homeName %>';"
expect '</head>'
expect '</body>'
expect 'console.info("Update started", update);'
expect 'console.info("Update succeeded", update);'
expect 'console.info("Update failed", update);'
expect 'console.info("Back to online mode");'
expect 'console.info("Lost server connection - going offline");'

# No plan name: go to the project list instead of opening a demo home.
# StudioFilter has already rejected names outside the safe character set.
sed -i 's#String homeName = request.getParameter("home");#&\n   if (homeName == null || homeName.isEmpty()) { response.sendRedirect("./"); return; }#' "$f"
sed -i "s#var homeName = '<%= homeName == null ? \"HomeTest\" : homeName %>';#var homeName = '<%= homeName %>';#" "$f"

sed -i 's#<title>Sweet Home 3D JS</title>#<title><%= homeName %> - Floor Plans</title>\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Design Studio">\n<meta name="apple-mobile-web-app-status-bar-style" content="default">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n<link rel="stylesheet" type="text/css" href="studio-editor.css">\n<script type="text/javascript" src="studio-editor.js"></script>#' "$f"

sed -i 's#console.info("Update started", update);#studioStatus("saving");#' "$f"
sed -i 's#console.info("Update succeeded", update);#studioStatus("saved");#' "$f"
sed -i 's#console.info("Update failed", update);#studioStatus("failed", errorStatus, errorText);#' "$f"
sed -i 's#console.info("Back to online mode");#studioStatus("online");#' "$f"
sed -i 's#console.info("Lost server connection - going offline");#studioStatus("offline", errorStatus, errorText);#' "$f"

sed -i 's#</body>#<a id="studio-back" href="./" aria-label="Back to projects">Projects</a>\n<div id="studio-status" role="status" aria-live="polite"></div>\n</body>#' "$f"

grep -q 'studioStatus("saved")' "$f"
grep -q 'id="studio-back"' "$f"
echo "patch-editor: ok"
