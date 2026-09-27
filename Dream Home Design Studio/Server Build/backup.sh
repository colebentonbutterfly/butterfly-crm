#!/usr/bin/env bash
# Phase 4, on the Proxmox host. Proxmox backups skip bind mounts, so this
# archives /srv/design-studio (floor plans, FreeCAD, Blender and QGIS files).
#
#   bash backup.sh --install   install to /usr/local/sbin, schedule 2:30 AM nightly, run once now
#   bash backup.sh             make one archive now
#   bash backup.sh --list      list archives
#
# Archives: /mnt/local-backup/design-studio/design-studio-YYYY-MM-DD-HHMM.tar.zst
# Each archive is checked after writing. Archives older than KEEP_DAYS (30)
# are pruned, which is the retention agreed in the handoff.

set -Eeuo pipefail

SRC="${SRC:-/srv/design-studio}"
BACKUP_ROOT="${BACKUP_ROOT:-/mnt/local-backup}"
DEST="${DEST:-$BACKUP_ROOT/design-studio}"
KEEP_DAYS="${KEEP_DAYS:-30}"
INSTALL_PATH=/usr/local/sbin/design-studio-backup
CRON_FILE=/etc/cron.d/design-studio-backup
LOG_FILE=/var/log/design-studio-backup.log

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }
die() { log "ERROR: $*" >&2; exit 1; }

run_backup() {
  [ -d "$SRC" ] || die "$SRC does not exist."
  [ -d "$BACKUP_ROOT" ] || die "$BACKUP_ROOT does not exist."
  if ! mountpoint -q "$BACKUP_ROOT" && [ "$(stat -c %d "$BACKUP_ROOT")" = "$(stat -c %d /)" ]; then
    log "Note: $BACKUP_ROOT is on the root disk, not a separate drive."
  fi
  command -v zstd >/dev/null || die "zstd is not installed (apt install zstd)."
  mkdir -p "$DEST"

  local stamp archive partial
  stamp=$(date +%F-%H%M)
  archive="$DEST/design-studio-$stamp.tar.zst"
  partial="$archive.partial"

  log "Archiving $SRC to $archive"
  tar --numeric-owner --acls --xattrs -C "$(dirname "$SRC")" -cf - "$(basename "$SRC")" \
    | zstd -q -T0 -10 -o "$partial"
  zstd -q -t "$partial" || die "archive failed its integrity test: $partial"
  local files
  files=$(zstd -dc "$partial" | tar -tf - | wc -l)
  mv "$partial" "$archive"
  log "OK: $(du -h "$archive" | cut -f1), $files entries"

  local old
  old=$(find "$DEST" -maxdepth 1 -name 'design-studio-*.tar.zst' -mtime +"$KEEP_DAYS" | sort)
  if [ -n "$old" ]; then
    # Never prune the newest archive, whatever its age.
    local newest
    newest=$(find "$DEST" -maxdepth 1 -name 'design-studio-*.tar.zst' | sort | tail -1)
    while IFS= read -r f; do
      [ "$f" = "$newest" ] && continue
      rm -f -- "$f"
      log "Pruned $(basename "$f") (older than $KEEP_DAYS days)"
    done <<<"$old"
  fi
}

case "${1:-}" in
  --install)
    install -m 0755 "$(readlink -f "$0")" "$INSTALL_PATH"
    cat >"$CRON_FILE" <<EOF
# Design Studio project files, nightly. See $INSTALL_PATH.
30 2 * * * root $INSTALL_PATH >>$LOG_FILE 2>&1
EOF
    chmod 644 "$CRON_FILE"
    log "Installed $INSTALL_PATH and $CRON_FILE (2:30 AM nightly, log $LOG_FILE)."
    run_backup 2>&1 | tee -a "$LOG_FILE"
    ;;
  --list)
    ls -lh "$DEST"
    ;;
  "")
    run_backup
    ;;
  *)
    echo "usage: $0 [--install | --list]" >&2
    exit 2
    ;;
esac
