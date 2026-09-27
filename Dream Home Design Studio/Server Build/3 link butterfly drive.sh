#!/usr/bin/env bash
# Phase 3, on the Proxmox host:
#
#   NC_USER=<cole's nextcloud username> bash "3 link butterfly drive.sh"
#
# Shows /srv/design-studio as the "Design Studio" folder in Cole's Butterfly
# Drive (Nextcloud, CT 110):
#   - adds the next free mpN to CT 110: /srv/design-studio -> /mnt/design-studio
#   - RESTARTS CT 110 (the Drive is offline for about a minute; warn Cole first)
#   - enables files_external and creates a Local mount "/Design Studio"
#     available only to NC_USER, with change detection on
#
# If Nextcloud runs in Docker inside CT 110, this stops and prints the manual
# steps (handoff phase 3B). ASSUME_YES=1 skips the questions.

set -Eeuo pipefail

NC_USER="${NC_USER:-}"
NC_CT="${NC_CT:-110}"
SHARE="${SHARE:-/srv/design-studio}"
NC_MOUNT_PATH="${NC_MOUNT_PATH:-/mnt/design-studio}"
MOUNT_NAME="${MOUNT_NAME:-/Design Studio}"
ASSUME_YES="${ASSUME_YES:-0}"

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
warn() { printf '\033[33m  WARNING: %s\033[0m\n' "$*"; }
die()  { printf '\033[31m  STOP: %s\033[0m\n' "$*" >&2; exit 1; }
ask() {
  [ "$ASSUME_YES" = 1 ] && return 0
  local reply
  read -r -p "  $1 [y/N] " reply
  [[ "$reply" =~ ^[Yy] ]]
}
trap 'die "command failed on line $LINENO: $BASH_COMMAND"' ERR

[ -n "$NC_USER" ] || die "set NC_USER to Cole's Nextcloud username, e.g. NC_USER=cole bash \"$0\""
command -v pct >/dev/null || die "run this on the Proxmox host."
[ -d "$SHARE" ] || die "$SHARE does not exist. Run 1 prepare host.sh first."

bold "Linking $SHARE into Nextcloud (CT $NC_CT) for $NC_USER"

[ "$(pct status "$NC_CT" | awk '{print $2}')" = running ] || die "CT $NC_CT is not running."
pct config "$NC_CT" | grep -q '^unprivileged: 1' \
  || die "CT $NC_CT is privileged, so uid 100033 on the host is not www-data inside it. Ownership needs a different plan; ask Cole."

# ---------------------------------------------------------------- find Nextcloud
OCC=""
for candidate in /var/www/nextcloud/occ /var/www/html/nextcloud/occ /var/www/html/occ /usr/share/nextcloud/occ /opt/nextcloud/occ /srv/nextcloud/occ; do
  if pct exec "$NC_CT" -- test -f "$candidate"; then OCC="$candidate"; break; fi
done
if [ -z "$OCC" ]; then
  if pct exec "$NC_CT" -- sh -c 'command -v docker >/dev/null && docker ps --format "{{.Image}} {{.Names}}" | grep -i nextcloud' 2>/dev/null; then
    cat <<EOF

  Nextcloud runs in Docker inside CT $NC_CT, so this script stops here.
  Follow handoff phase 3B:
    1. pct set $NC_CT -mpN $SHARE,mp=$NC_MOUNT_PATH   (next free N), then pct reboot $NC_CT
    2. Bind $NC_MOUNT_PATH into the Nextcloud container at the same path
       (compose volume, or NEXTCLOUD_MOUNT=/mnt/ for Nextcloud AIO) and recreate it.
    3. Run the same occ commands as this script through
       docker exec -u www-data <container> php occ ...
    4. Check www-data is uid 33 in that container. If not, chown $SHARE to
       100000 + that uid and set PUID, PGID and the floorplans user: to match.
EOF
    exit 2
  fi
  die "could not find occ in CT $NC_CT. Set the path by hand: look for it with pct exec $NC_CT -- find / -name occ -path '*nextcloud*'"
fi
WEB_USER=$(pct exec "$NC_CT" -- stat -c %U "$OCC")
WEB_UID=$(pct exec "$NC_CT" -- id -u "$WEB_USER")
info "Nextcloud: $OCC, runs as $WEB_USER (uid $WEB_UID)."
[ "$WEB_UID" = 33 ] || die "$WEB_USER is uid $WEB_UID, not 33. Files in $SHARE are owned by uid 33 (host 100033). Chown the share to $((100000 + WEB_UID)) and set PUID/PGID and the floorplans user to $WEB_UID, then rerun."

occ() { pct exec "$NC_CT" -- runuser -u "$WEB_USER" -- php "$OCC" "$@"; }

occ status --output=json | grep -q '"maintenance":false' || die "Nextcloud is in maintenance mode or not installed."
occ user:info "$NC_USER" >/dev/null 2>&1 || die "Nextcloud user '$NC_USER' not found (occ user:list shows the names)."
info "User $NC_USER exists."

# ---------------------------------------------------------------- mount point
existing_mp=$(pct config "$NC_CT" | awk -v s="$SHARE," -F': ' '$1 ~ /^mp[0-9]+$/ && index($2, s) == 1 {print $1}')
if [ -n "$existing_mp" ]; then
  info "CT $NC_CT already has $SHARE as $existing_mp; no restart needed."
else
  used=$(pct config "$NC_CT" | grep -oE '^mp[0-9]+' | tr -d 'mp' | sort -n | tr '\n' ' ')
  n=0
  while grep -qw "$n" <<<"$used"; do n=$((n + 1)); done
  bold "CT $NC_CT needs a restart"
  info "Adding mp$n: $SHARE -> $NC_MOUNT_PATH, then restarting CT $NC_CT."
  warn "The Butterfly Drive (cloud.butterflyassets.com) will be offline for about a minute."
  ask "Has Cole been told, and is it OK to restart CT $NC_CT now?" || die "stopped at your request. Nothing was changed."
  pct set "$NC_CT" "-mp$n" "$SHARE,mp=$NC_MOUNT_PATH"
  pct reboot "$NC_CT"
  info "Waiting for Nextcloud to come back..."
  back=0
  for _ in $(seq 1 90); do
    if occ status --output=json 2>/dev/null | grep -q '"installed":true'; then back=1; break; fi
    sleep 2
  done
  [ "$back" = 1 ] || die "Nextcloud did not answer within 3 minutes of the restart. Check CT $NC_CT."
  info "Nextcloud is back."
fi
pct exec "$NC_CT" -- runuser -u "$WEB_USER" -- test -w "$NC_MOUNT_PATH/Floor Plans" \
  || die "$WEB_USER cannot write to $NC_MOUNT_PATH/Floor Plans inside CT $NC_CT."

# ---------------------------------------------------------------- external storage
bold "External storage"
occ app:enable files_external >/dev/null
info "files_external enabled."

mounts_json=$(occ files_external:list --all --output=json)
mount_id=$(python3 -c '
import json, sys
name, path = sys.argv[1], sys.argv[2]
for m in json.loads(sys.stdin.read() or "[]"):
    cfg = m.get("configuration") or {}
    if m.get("mount_point") == name and cfg.get("datadir") == path:
        print(m.get("mount_id")); break
' "$MOUNT_NAME" "$NC_MOUNT_PATH" <<<"$mounts_json")

if [ -n "$mount_id" ]; then
  info "Mount \"$MOUNT_NAME\" already exists (id $mount_id)."
else
  created=$(occ files_external:create --config "datadir=$NC_MOUNT_PATH" "$MOUNT_NAME" local null::null)
  mount_id=$(grep -oE '[0-9]+' <<<"$created" | tail -1)
  [ -n "$mount_id" ] || die "could not read the new mount id from: $created"
  info "Created \"$MOUNT_NAME\" (id $mount_id)."
fi

# Only Cole sees it. An admin mount with no applicable users is visible to everyone.
occ files_external:applicable --add-user "$NC_USER" "$mount_id" >/dev/null
# Pick up files written by the studio (and the desktops) on direct access.
occ files_external:option "$mount_id" filesystem_check_changes 1 >/dev/null
occ files_external:option "$mount_id" previews true >/dev/null
occ files_external:verify "$mount_id" | sed 's/^/    /'
occ files_external:list --all | sed 's/^/    /'

info "Scanning the new folder..."
occ files:scan --path="/$NC_USER/files$MOUNT_NAME" | tail -4 | sed 's/^/    /'

bold "Done"
info "\"Design Studio\" should now show in $NC_USER's files on the Butterfly Drive."
info "Verify the no-permanent-delete rule: delete a scratch file from Design Studio in"
info "Nextcloud and confirm it appears under Deleted files. If it does not, tell Cole."
info "Rollback: occ files_external:delete $mount_id, remove the mp line from CT $NC_CT, reboot CT $NC_CT."
