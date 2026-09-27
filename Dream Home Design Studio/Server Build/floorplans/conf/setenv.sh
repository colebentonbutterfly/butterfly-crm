# shellcheck shell=sh
# Sourced by catalina.sh before Tomcat starts.

: "${STUDIO_HOST:?STUDIO_HOST is not set. It must be the studio tailnet name, e.g. design-studio.tailnet.ts.net}"
: "${STUDIO_HOMES_DIR:?}"
: "${STUDIO_RESOURCES_DIR:?}"

mkdir -p "$STUDIO_HOMES_DIR" "$STUDIO_RESOURCES_DIR"

CATALINA_OPTS="$CATALINA_OPTS -Dstudio.host=$STUDIO_HOST -Dstudio.port=${STUDIO_PORT:-443}"
CATALINA_OPTS="$CATALINA_OPTS -Djava.awt.headless=true -Dfile.encoding=UTF-8 -Dsun.jnu.encoding=UTF-8"
CATALINA_OPTS="$CATALINA_OPTS -Xmx${JAVA_MAX_HEAP:-768m}"

# Required on Java 17. writeHomeEdits.jsp rebuilds Sweet Home 3D undoable
# edits by reflection. Without these every save fails with
# java.lang.reflect.InaccessibleObjectException.
JAVA_OPTS="$JAVA_OPTS \
  --add-opens=java.base/java.lang=ALL-UNNAMED \
  --add-opens=java.base/java.util=ALL-UNNAMED \
  --add-opens=java.base/java.lang.reflect=ALL-UNNAMED \
  --add-opens=java.base/java.io=ALL-UNNAMED \
  --add-opens=java.desktop/javax.swing.undo=ALL-UNNAMED \
  --add-opens=java.desktop/javax.swing.event=ALL-UNNAMED \
  --add-opens=java.desktop/java.awt.geom=ALL-UNNAMED \
  --add-opens=java.desktop/java.beans=ALL-UNNAMED"
