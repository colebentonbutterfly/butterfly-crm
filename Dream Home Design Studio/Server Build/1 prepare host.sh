#!/usr/bin/env bash
# Phase 1, on the Proxmox host (butterflyassets):
#
#   cd /root/designstudio && bash "1 prepare host.sh"
#
# Checks storage, IP and template, asks before creating anything, then:
#   - creates CT 136 design-studio (unprivileged, nesting + keyctl, not started on boot)
#   - creates /srv/design-studio and its folders, owned by 100033 (uid 33 in the CT,
#     the same as Nextcloud's www-data)
#   - bind-mounts it into the CT as mp0 and passes /dev/net/tun for Tailscale
#   - starts the CT and copies this build folder to /opt/design-studio
#
# Override any default with an environment variable, e.g.
#   STORAGE=ssd-prod DISK_GB=32 bash "1 prepare host.sh"
# ASSUME_YES=1 skips the questions.

set -Eeuo pipefail

CTID="${CTID:-136}"
CT_HOSTNAME="${CT_HOSTNAME:-design-studio}"
IP="${IP:-192.168.68.136}"
CIDR="${CIDR:-24}"
GATEWAY="${GATEWAY:-$(ip route | awk '/^default/ {print $3; exit}')}"
BRIDGE="${BRIDGE:-vmbr0}"
STORAGE="${STORAGE:-local-lvm}"
DISK_GB="${DISK_GB:-40}"
CORES="${CORES:-4}"
MEMORY_MB="${MEMORY_MB:-10240}"
SWAP_MB="${SWAP_MB:-2048}"
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-local}"
TEMPLATE="${TEMPLATE:-}"
SHARE="${SHARE:-/srv/design-studio}"
SHARE_OWNER="${SHARE_OWNER:-100033}"
REFERENCE_CT="${REFERENCE_CT:-123}"
MIN_ROOT_FREE_GB="${MIN_ROOT_FREE_GB:-15}"
ASSUME_YES="${ASSUME_YES:-0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CT_BUILD_DIR=/opt/design-studio

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

bold "Design Studio: host preparation for CT $CTID"

command -v pct >/dev/null || die "run this on the Proxmox host."
[ "$(id -u)" = 0 ] || die "run as root."
[ -f "$SCRIPT_DIR/compose.yaml" ] || die "run from the Server Build folder (compose.yaml not found next to this script)."

# ---------------------------------------------------------------- checks
bold "Pre-flight checks"

if pct config "$CTID" >/dev/null 2>&1 || qm config "$CTID" >/dev/null 2>&1; then
  die "ID $CTID is already used by a container or VM. Nothing was changed."
fi
info "ID $CTID is free."

if grep -Eqs "ip=${IP//./\\.}/" /etc/pve/lxc/*.conf /etc/pve/qemu-server/*.conf 2>/dev/null; then
  die "$IP is already assigned in a guest config: $(grep -Els "ip=${IP//./\\.}/" /etc/pve/lxc/*.conf /etc/pve/qemu-server/*.conf | xargs -n1 basename | tr '\n' ' ')"
fi
if ping -c1 -W1 "$IP" >/dev/null 2>&1; then
  die "$IP answers ping, so something on the LAN already uses it."
fi
info "$IP is free (no guest config uses it, no ping reply)."
[ -n "$GATEWAY" ] || die "could not work out the default gateway; set GATEWAY=..."
info "Gateway $GATEWAY, bridge $BRIDGE."

root_free_gb=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
[ "$root_free_gb" -ge "$MIN_ROOT_FREE_GB" ] || die "/ has ${root_free_gb} GB free; need at least ${MIN_ROOT_FREE_GB} GB."
info "/ has ${root_free_gb} GB free."

storage_line=$(pvesm status --storage "$STORAGE" 2>/dev/null | awk 'NR==2') || true
[ -n "$storage_line" ] || die "storage '$STORAGE' not found (pvesm status)."
storage_type=$(awk '{print $2}' <<<"$storage_line")
storage_state=$(awk '{print $3}' <<<"$storage_line")
[ "$storage_state" = active ] || die "storage '$STORAGE' is $storage_state."
info "Storage $STORAGE ($storage_type) is active."

if [ "$storage_type" = lvmthin ]; then
  storage_cfg() {
    awk -v s="$STORAGE" -v k="$1" '
      /^[a-z]+: / { inblock = ($2 == s) ; next }
      inblock && $1 == k { print $2; exit }' /etc/pve/storage.cfg
  }
  pool=$(storage_cfg thinpool) || true
  vg=$(storage_cfg vgname) || true
  pool="${pool:-data}"; vg="${vg:-pve}"
  if lvs "$vg/$pool" >/dev/null 2>&1; then
    pool_size=$(lvs --noheadings --units g --nosuffix -o lv_size "$vg/$pool" | tr -d ' ')
    data_pct=$(lvs --noheadings -o data_percent "$vg/$pool" | tr -d ' ')
    meta_pct=$(lvs --noheadings -o metadata_percent "$vg/$pool" | tr -d ' ')
    committed=$(lvs --noheadings --units g --nosuffix -o lv_size,pool_lv "$vg" 2>/dev/null \
      | awk -v p="$pool" '$2==p {s+=$1} END {printf "%.0f", s}')
    after=$(awk -v c="$committed" -v d="$DISK_GB" 'BEGIN {printf "%.0f", c+d}')
    info "Thin pool $vg/$pool: ${pool_size} GB, data ${data_pct}% used, metadata ${meta_pct}% used."
    info "Committed now: ${committed} GB ($(awk -v c="$committed" -v s="$pool_size" 'BEGIN{printf "%.0f", 100*c/s}')%). After CT $CTID: ${after} GB ($(awk -v c="$after" -v s="$pool_size" 'BEGIN{printf "%.0f", 100*c/s}')%)."
    if awk -v a="$after" -v s="$pool_size" 'BEGIN{exit !(a>s)}'; then
      warn "this overcommits $vg/$pool, so Proxmox will show the LVM overprovisioning warning again."
      warn "Real usage is what matters (${data_pct}% now). Retiring CT 121 is the planned offset."
      ask "Continue anyway?" || die "stopped at your request. Nothing was changed."
    fi
  fi
fi

[ -c /dev/net/tun ] || die "/dev/net/tun is missing on the host (needed for Tailscale in the CT)."
info "/dev/net/tun is present."

# ---------------------------------------------------------------- template
if [ -z "$TEMPLATE" ]; then
  TEMPLATE=$(pveam list "$TEMPLATE_STORAGE" 2>/dev/null | awk '{print $1}' | sed -n 's#.*vztmpl/##p' \
    | grep -E '^debian-13-standard_.*_amd64\.tar\.(zst|xz|gz)$' | sort -V | tail -1 || true)
fi
if [ -z "$TEMPLATE" ]; then
  info "No Debian 13 template on $TEMPLATE_STORAGE yet. Checking the Proxmox template list..."
  pveam update >/dev/null 2>&1 || warn "pveam update failed; using the cached list."
  TEMPLATE=$(pveam available --section system | awk '{print $2}' \
    | grep -E '^debian-13-standard_.*_amd64\.tar\.(zst|xz|gz)$' | sort -V | tail -1 || true)
  [ -n "$TEMPLATE" ] || die "no debian-13-standard template available. Set TEMPLATE=... to one from 'pveam list $TEMPLATE_STORAGE'."
  ask "Download template $TEMPLATE to $TEMPLATE_STORAGE?" || die "stopped at your request. Nothing was changed."
  pveam download "$TEMPLATE_STORAGE" "$TEMPLATE"
fi
info "Template: $TEMPLATE"

# ---------------------------------------------------------------- reference CT
apparmor_lines=""
if pct config "$REFERENCE_CT" >/dev/null 2>&1; then
  bold "CT $REFERENCE_CT (Docker already works there) for reference"
  pct config "$REFERENCE_CT" | grep -E '^(features|unprivileged|dev[0-9]+|lxc\.)' | sed 's/^/    /' || true
  apparmor_lines=$(grep -E '^lxc\.apparmor\.' "/etc/pve/lxc/$REFERENCE_CT.conf" || true)
fi

# ---------------------------------------------------------------- confirm
bold "About to create"
info "CT $CTID '$CT_HOSTNAME': unprivileged, features nesting=1,keyctl=1, onboot 0"
info "  $CORES cores, ${MEMORY_MB} MB RAM, ${SWAP_MB} MB swap, ${DISK_GB} GB on $STORAGE"
info "  net0: $BRIDGE, $IP/$CIDR, gateway $GATEWAY"
info "  mp0:  $SHARE -> /srv/design-studio   dev0: /dev/net/tun"
[ -n "$apparmor_lines" ] && info "  AppArmor lines copied from CT $REFERENCE_CT: $(tr '\n' ' ' <<<"$apparmor_lines")"
info "Folder $SHARE (Floor Plans, FreeCAD, Blender, QGIS, Exports, Whiteboards), owner $SHARE_OWNER"
info "Build files copied to $CT_BUILD_DIR in the CT"
ask "Create CT $CTID now?" || die "stopped at your request. Nothing was changed."

# ---------------------------------------------------------------- share
bold "Creating $SHARE"
make_dir() {
  if [ ! -d "$1" ]; then
    mkdir -p "$1"
    chown "$SHARE_OWNER:$SHARE_OWNER" "$1"
    chmod 2775 "$1"
    info "created $1"
  else
    info "exists  $1"
  fi
}
make_dir "$SHARE"
for sub in "Floor Plans" FreeCAD Blender QGIS Exports Whiteboards .studio .studio/user-resources; do
  make_dir "$SHARE/$sub"
done

# ---------------------------------------------------------------- CT
bold "Creating CT $CTID"
pct create "$CTID" "$TEMPLATE_STORAGE:vztmpl/$TEMPLATE" \
  --hostname "$CT_HOSTNAME" \
  --cores "$CORES" --memory "$MEMORY_MB" --swap "$SWAP_MB" \
  --rootfs "$STORAGE:$DISK_GB" \
  --net0 "name=eth0,bridge=$BRIDGE,ip=$IP/$CIDR,gw=$GATEWAY" \
  --unprivileged 1 --features nesting=1,keyctl=1 \
  --onboot 0 --ostype debian --timezone host \
  --tags design-studio \
  --description "Design Studio: Sweet Home 3D JS, FreeCAD, Blender and QGIS over Tailscale. Projects in $SHARE. Built from Handoffs/Dream Home Design Studio."

pct set "$CTID" -mp0 "$SHARE,mp=/srv/design-studio"

if ! pct set "$CTID" -dev0 /dev/net/tun 2>/dev/null; then
  warn "pct dev passthrough not available; adding raw LXC lines for /dev/net/tun instead."
  cat >>"/etc/pve/lxc/$CTID.conf" <<'EOF'
lxc.cgroup2.devices.allow: c 10:200 rwm
lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file
EOF
fi

if [ -n "$apparmor_lines" ]; then
  printf '%s\n' "$apparmor_lines" >>"/etc/pve/lxc/$CTID.conf"
  info "Copied AppArmor settings from CT $REFERENCE_CT."
fi

bold "Starting CT $CTID"
pct start "$CTID"
for _ in $(seq 1 30); do
  pct exec "$CTID" -- true 2>/dev/null && break
  sleep 2
done
online=0
for _ in $(seq 1 30); do
  if pct exec "$CTID" -- bash -c 'getent hosts deb.debian.org >/dev/null && timeout 5 bash -c "</dev/tcp/deb.debian.org/80"' 2>/dev/null; then
    online=1; break
  fi
  sleep 2
done
if [ "$online" = 1 ]; then
  info "CT $CTID is online."
else
  warn "CT $CTID has no internet yet. Check its network before phase 2."
fi

bold "Copying the build to $CT_BUILD_DIR"
pct exec "$CTID" -- mkdir -p "$CT_BUILD_DIR"
tar -C "$SCRIPT_DIR" --exclude=./.env --exclude=./data -cf - . | pct exec "$CTID" -- tar -C "$CT_BUILD_DIR" -xf -
pct exec "$CTID" -- chmod 700 "$CT_BUILD_DIR"
pct exec "$CTID" -- ls "$CT_BUILD_DIR" | sed 's/^/    /'

bold "Done"
info "CT $CTID is running. Next, phase 2:"
info "  pct exec $CTID -- bash \"$CT_BUILD_DIR/2 build studio.sh\""
info "Then update the living doc (Infrastructure, Container Resource Allocation, Storage, Session Log)."
