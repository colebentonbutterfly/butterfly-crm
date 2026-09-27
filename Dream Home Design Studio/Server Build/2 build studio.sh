#!/usr/bin/env bash
# Phase 2, inside CT 136:
#
#   pct exec 136 -- bash "/opt/design-studio/2 build studio.sh"
#
# Installs Tailscale (prints a login link for Cole to approve) and Docker,
# writes .env (tailnet name, generated desktop password, whiteboard secret),
# builds the floor plan and QGIS images, pulls FreeCAD and Blender, starts
# everything, publishes the four HTTPS ports with `tailscale serve`, then
# runs checks. The first run downloads about 8 GB.
#
# Safe to rerun: existing secrets are kept and STUDIO_HOST is never changed
# once floor plans exist.
#
# Optional: TS_AUTHKEY=tskey-... to log in to Tailscale without the link.

set -Eeuo pipefail

STUDIO_DIR="${STUDIO_DIR:-/opt/design-studio}"
SHARE=/srv/design-studio
TS_HOSTNAME="${TS_HOSTNAME:-design-studio}"
ENV_FILE="$STUDIO_DIR/.env"

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
warn() { printf '\033[33m  WARNING: %s\033[0m\n' "$*"; }
die()  { printf '\033[31m  STOP: %s\033[0m\n' "$*" >&2; exit 1; }
trap 'die "command failed on line $LINENO: $BASH_COMMAND"' ERR

[ "$(id -u)" = 0 ] || die "run as root inside CT 136."
cd "$STUDIO_DIR" || die "$STUDIO_DIR not found. Run 1 prepare host.sh on the host first."
[ -f compose.yaml ] || die "compose.yaml not found in $STUDIO_DIR."

get_env() { [ -f "$ENV_FILE" ] && sed -n "s/^$1=//p" "$ENV_FILE" | tail -1 || true; }
set_env() {
  touch "$ENV_FILE"; chmod 600 "$ENV_FILE"
  if grep -q "^$1=" "$ENV_FILE"; then
    local tmp; tmp=$(mktemp)
    awk -v k="$1" -v v="$2" 'BEGIN{FS=OFS="="} $1==k {print k "=" v; next} {print}' "$ENV_FILE" >"$tmp"
    cat "$tmp" >"$ENV_FILE"; rm -f "$tmp"
  else
    printf '%s=%s\n' "$1" "$2" >>"$ENV_FILE"
  fi
}
secret() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

bold "Design Studio build ($(hostname), $(. /etc/os-release; echo "$PRETTY_NAME"))"

# ---------------------------------------------------------------- share
bold "Checking the project folder"
[ -d "$SHARE/Floor Plans" ] || die "$SHARE/Floor Plans is missing. Is mp0 attached? (pct config 136 on the host)"
share_uid=$(stat -c %u "$SHARE")
[ "$share_uid" = 33 ] || die "$SHARE is owned by uid $share_uid inside the CT; expected 33 (100033 on the host)."
setpriv --reuid=33 --regid=33 --clear-groups test -w "$SHARE/Floor Plans" || die "uid 33 cannot write to $SHARE/Floor Plans."
info "$SHARE is mounted and writable by uid 33."

# ---------------------------------------------------------------- packages
bold "Base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg jq openssl >/dev/null
info "ok"

# ---------------------------------------------------------------- tailscale
bold "Tailscale"
[ -c /dev/net/tun ] || die "/dev/net/tun is missing in the CT. On the host: pct set 136 -dev0 /dev/net/tun && pct reboot 136"
if ! command -v tailscale >/dev/null; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi
systemctl enable --now tailscaled >/dev/null
for _ in $(seq 1 15); do tailscale status --json >/dev/null 2>&1 && break; sleep 1; done

backend_state=$(tailscale status --json 2>/dev/null | jq -r '.BackendState // ""')
if [ "$backend_state" != Running ]; then
  if [ -n "${TS_AUTHKEY:-}" ]; then
    tailscale up --hostname="$TS_HOSTNAME" --auth-key="$TS_AUTHKEY"
  else
    info "Send the login link below to Cole to approve. This waits until he does."
    tailscale up --hostname="$TS_HOSTNAME"
  fi
fi
ts_json=$(tailscale status --json)
detected_host=$(jq -r '.Self.DNSName' <<<"$ts_json" | sed 's/\.$//')
[ -n "$detected_host" ] && [ "$detected_host" != null ] || die "could not read this node's tailnet name."
case "$detected_host" in
  "$TS_HOSTNAME".*) ;;
  *) warn "Tailscale named this node $detected_host, not $TS_HOSTNAME.<tailnet>. An old '$TS_HOSTNAME' machine may still exist in the admin console." ;;
esac
if [ "$(jq -r '(.CertDomains // []) | length' <<<"$ts_json")" = 0 ]; then
  die "HTTPS certificates are not enabled for this tailnet. Turn on MagicDNS and HTTPS Certificates in the Tailscale admin console (DNS page), then rerun this script."
fi
info "Tailnet name: $detected_host"

# ---------------------------------------------------------------- docker
bold "Docker"
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  . /etc/os-release
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$ID $VERSION_CODENAME stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
fi
systemctl enable --now docker >/dev/null
if ! docker run --rm hello-world >/tmp/hello-world.log 2>&1; then
  sed 's/^/    /' /tmp/hello-world.log | tail -15
  die "Docker cannot start containers in this CT. Compare with CT 123 on the host:
    pct config 123 | grep -E 'features|lxc.apparmor|dev'
  An AppArmor or sysctl permission error is the late-2025 runc/containerd AppArmor
  regression in LXC. Copy what CT 123 does (see 1 prepare host.sh, REFERENCE_CT)
  rather than inventing a fix, reboot CT 136, then rerun this script."
fi
docker image rm hello-world >/dev/null 2>&1 || true
info "$(docker --version), $(docker compose version | head -1)"

# ---------------------------------------------------------------- .env
bold "Settings (.env)"
current_host=$(get_env STUDIO_HOST)
if [ -n "$current_host" ] && [ "$current_host" != "$detected_host" ]; then
  if find "$SHARE/Floor Plans" -maxdepth 1 -name '*.sh3d' | grep -q .; then
    die "STUDIO_HOST in .env is $current_host but this node is now $detected_host.
  Floor plans already exist, and each one stores links that start with $current_host.
  Keep the old name (rename this machine back to $TS_HOSTNAME in the Tailscale admin
  console, or keep $current_host as an alias) or re-export the projects before changing it."
  fi
  warn "No floor plans yet, so updating STUDIO_HOST from $current_host to $detected_host."
fi
set_env STUDIO_HOST "$detected_host"
[ -n "$(get_env STUDIO_PORT)" ] || set_env STUDIO_PORT 443
[ -n "$(get_env FREECAD_PORT)" ] || set_env FREECAD_PORT 8443
[ -n "$(get_env BLENDER_PORT)" ] || set_env BLENDER_PORT 8444
[ -n "$(get_env QGIS_PORT)" ] || set_env QGIS_PORT 8445
[ -n "$(get_env DESKTOP_USER)" ] || set_env DESKTOP_USER cole
[ -n "$(get_env DESKTOP_PASSWORD)" ] || set_env DESKTOP_PASSWORD "$(secret 24)"
[ -n "$(get_env WHITEBOARD_JWT_SECRET)" ] || set_env WHITEBOARD_JWT_SECRET "$(secret 48)"
[ -n "$(get_env NEXTCLOUD_URL)" ] || set_env NEXTCLOUD_URL https://cloud.butterflyassets.com
[ -n "$(get_env DRIVE_URL)" ] || set_env DRIVE_URL "https://cloud.butterflyassets.com/apps/files/?dir=/Design%20Studio"
if [ -z "$(get_env TZ)" ]; then
  tz=$(timedatectl show -p Timezone --value 2>/dev/null || cat /etc/timezone 2>/dev/null || true)
  set_env TZ "${tz:-America/New_York}"
fi
if [ ! -e /proc/net/if_inet6 ] || [ "$(cat /proc/sys/net/ipv6/conf/all/disable_ipv6 2>/dev/null || echo 0)" = 1 ]; then
  set_env DISABLE_IPV6 true
  info "IPv6 is off in this CT; the desktops will listen on IPv4 only."
else
  set_env DISABLE_IPV6 ""
fi
chmod 600 "$ENV_FILE"
info "Written $ENV_FILE (mode 600). Desktop user: $(get_env DESKTOP_USER)"

mkdir -p data/freecad data/blender data/qgis
chown 33:33 data/freecad data/blender data/qgis

# ---------------------------------------------------------------- build and start
bold "Building images (first run downloads about 8 GB)"
docker compose build --pull
docker compose pull freecad blender
docker compose up -d --remove-orphans
info "Containers started."

# ---------------------------------------------------------------- tailscale serve
bold "Publishing HTTPS with tailscale serve"
tailscale serve reset
serve() { tailscale serve --bg --https="$1" "$2" >/dev/null; }

serve "$(get_env STUDIO_PORT)" http://127.0.0.1:8080
serve "$(get_env FREECAD_PORT)" http://127.0.0.1:3100
ports_changed=0
if ! serve "$(get_env BLENDER_PORT)" http://127.0.0.1:3200; then
  warn "Tailscale refused port $(get_env BLENDER_PORT) for Blender; using 10000."
  set_env BLENDER_PORT 10000; serve 10000 http://127.0.0.1:3200; ports_changed=1
fi
if ! serve "$(get_env QGIS_PORT)" http://127.0.0.1:3300; then
  warn "Tailscale refused port $(get_env QGIS_PORT) for QGIS; using 10001."
  set_env QGIS_PORT 10001; serve 10001 http://127.0.0.1:3300; ports_changed=1
fi
[ "$ports_changed" = 1 ] && docker compose up -d floorplans
tailscale serve status | sed 's/^/    /'

# ---------------------------------------------------------------- checks
bold "Checks"
failures=0
check() { if eval "$2" >/dev/null 2>&1; then info "ok    $1"; else warn "FAIL  $1"; failures=$((failures + 1)); fi; }
wait_for() { for _ in $(seq 1 "$2"); do eval "$1" >/dev/null 2>&1 && return 0; sleep 2; done; return 1; }

host="$(get_env STUDIO_HOST)"
user="$(get_env DESKTOP_USER)"
pass="$(get_env DESKTOP_PASSWORD)"
ts_ip="$(tailscale ip -4 | head -1)"
# Reach our own tailnet name without depending on DNS inside the CT.
resolve() { printf -- "--resolve %s:%s:%s" "$host" "$1" "$ts_ip"; }

wait_for "curl -fsS http://127.0.0.1:8080/ping.jsp" 60 || true
check "floor plans app answers on 127.0.0.1:8080" "curl -fsS http://127.0.0.1:8080/api/config"
check "floor plans app over HTTPS: https://$host/" "curl -fsS $(resolve "$(get_env STUDIO_PORT)") https://$host:$(get_env STUDIO_PORT)/api/projects"
for app in freecad:3100:FREECAD_PORT blender:3200:BLENDER_PORT qgis:3300:QGIS_PORT; do
  IFS=: read -r name local_port port_key <<<"$app"
  wait_for "[ \"\$(curl -s -o /dev/null -w '%{http_code}' -u '$user:$pass' http://127.0.0.1:$local_port/)\" = 200 ]" 90 || true
  check "$name desktop asks for the login" "[ \"\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$local_port/)\" = 401 ]"
  check "$name desktop over HTTPS: https://$host:$(get_env "$port_key")/" \
    "[ \"\$(curl -s -o /dev/null -w '%{http_code}' -u '$user:$pass' $(resolve "$(get_env "$port_key")") https://$host:$(get_env "$port_key")/)\" = 200 ]"
done
check "nothing listens on the LAN (only 127.0.0.1 and the tailnet)" \
  "! ss -Hltn | awk '{print \$4}' | grep -E ':(8080|3100|3200|3300|3002)\$' | grep -vE '^127\\.0\\.0\\.1:'"
check "Docker starts on boot" "systemctl is-enabled docker"
check "Tailscale starts on boot" "systemctl is-enabled tailscaled"
check "all containers restart on their own" \
  "[ -z \"\$(docker compose ps -q | xargs -r docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' | grep -v unless-stopped)\" ]"
check "uid 33 can still write to Floor Plans" "setpriv --reuid=33 --regid=33 --clear-groups test -w '$SHARE/Floor Plans'"

bold "Design Studio"
info "Home page and floor plans  https://$host/"
info "FreeCAD                    https://$host:$(get_env FREECAD_PORT)/"
info "Blender                    https://$host:$(get_env BLENDER_PORT)/"
info "QGIS                       https://$host:$(get_env QGIS_PORT)/"
info "Desktop login: user '$user', password in $ENV_FILE (DESKTOP_PASSWORD). Store it in Infisical (CT 131)."
info "Projects: $SHARE (Design Studio on the Butterfly Drive after phase 3)."
if [ "$failures" -gt 0 ]; then
  warn "$failures check(s) failed. The desktops can take a few minutes on first start; rerun this script to check again."
  exit 1
fi
info "All checks passed."
