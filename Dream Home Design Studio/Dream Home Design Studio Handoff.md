# Claude Code Handoff: Dream Home Design Studio

Prepared September 27, 2026. Save a copy in the Butterfly Drive Handoffs folder.

## Goal

Stand up a free, self-hosted home design suite that Cole uses from his iPad, on the Proxmox server `butterflyassets` (192.168.68.62). One new container, CT 136 `design-studio`, reachable only over Tailscale with real HTTPS certificates.

| Address | What it is |
|---|---|
| `https://design-studio.tailadab47.ts.net/` | Studio home page and Sweet Home 3D floor plan editor |
| `https://design-studio.tailadab47.ts.net:8443/` | FreeCAD (browser-streamed desktop) |
| `https://design-studio.tailadab47.ts.net:8444/` | Blender (browser-streamed desktop) |
| `https://design-studio.tailadab47.ts.net:8445/` | QGIS on an XFCE desktop |

Project files live on the host at `/srv/design-studio`, bind-mounted into CT 136 and into the Nextcloud CT 110, where they appear as the Design Studio folder on the Butterfly Drive.

Everything needed is in the `Server Build` folder of this pack. `Server Build/README.md` lists each file and what was tested. Expected location on the Butterfly Drive:
`Handoffs/Dream Home Design Studio/` (unzipped from `Dream Home Design Studio.zip`). On the Mac that is
`/Volumes/Butterfly Drive/Handoffs/Dream Home Design Studio/`. The same pack is in GitHub: `colebentonbutterfly/butterfly-crm`, branch `claude/dream-home-design-studio-nzyo4u`, folder `Dream Home Design Studio`.

**Status as of September 27, 2026:** the pack is built and tested off-server. Nothing is deployed. The server map (v87, 06:52) shows no CT 136. Start at Phase 0.

## Ground rules from Cole

- Read the server living doc first and update it after every change (server-admin skill). The server map in `Server Maps` refreshes itself.
- Never permanently delete files. Anything removed goes to the Trash folder on the Butterfly Drive. Do not `pct destroy` anything without his explicit OK and a verified backup first.
- File names use spaces, never underscores.
- The Proxmox web UI uses TOTP, so Cole has to log in for you if you work through the browser. SSH as root is simpler if he has it set up.
- Never run `docker compose down -v` on any container.

## Confirm with Cole before starting

1. **Storage.** CT 136 gets a 40 GB thin disk on `local-lvm` (pve/data). That pool was already 100% committed on 2026-09-15, so this brings back the LVM overprovisioning warning, even though real usage is about 29%. `1 prepare host.sh` shows the before and after commitment and asks before continuing. The offset option is retiring CT 121 `virtual-desktop` (stopped, XFCE over xrdp), which the studio's streamed desktops replace. If he agrees, back it up with `vzdump 121 --storage <backup storage> --compress zstd`, verify the archive, then ask again before removing it.
2. **His Nextcloud username**, needed for Phase 3.
3. **Optional extras**: GPU acceleration (Phase 5) and Pencil whiteboards (Phase 6). Both default to off.
4. **CT 108.** Server map v87 (2026-09-27 06:52) shows CT 108 back and running, although it was removed on 2026-09-15 and the camera handoff from the same morning still calls it destroyed. Ask what it is before counting on its RAM being free.

## Phase 0: Pre-flight (read only)

```bash
pct list; qm list
pvesm status
lvs -o lv_name,lv_size,data_percent,metadata_percent pve
free -h; df -h / /srv 2>/dev/null
ping -c1 -W1 192.168.68.136 || echo ".136 is free"
pct status 136 2>&1 | grep -q "does not exist" && echo "CT 136 is free"
ls -d /mnt/local-backup
pct config 123 | grep -E 'features|lxc.apparmor|dev'   # reference for a CT where Docker already works
```

Stop and report to Cole if .136 or CT 136 is taken, `/` has under 15 GB free, or the thin pools look different from the 2026-09-15 remediation notes.

## Phase 1: Host preparation

Copy `Server Build` to the host. From the Mac, with the Butterfly Drive mounted at `/Volumes/Butterfly Drive`:

```bash
scp -r "/Volumes/Butterfly Drive/Handoffs/Dream Home Design Studio/Server Build" root@192.168.68.62:/root/designstudio
```

Then on the host:

```bash
cd /root/designstudio
bash "1 prepare host.sh"
```

It checks the ID, IP, storage, free disk and template (downloading the latest Debian 13 template if needed), and asks before creating anything. Then it:

- creates CT 136 (unprivileged, nesting and keyctl, not started on boot, tagged `design-studio`)
- makes `/srv/design-studio` and its subfolders, owned by 100033 (uid 33 in unprivileged CTs, the same as Nextcloud's www-data)
- attaches the folder as mp0 and passes `/dev/net/tun` for Tailscale
- copies any `lxc.apparmor` lines from CT 123, so Docker behaves the same
- starts the CT and copies the build to `/opt/design-studio`

Override defaults with environment variables such as `STORAGE=ssd-prod` or `DISK_GB=32`.

## Phase 2: Build the studio

```bash
pct exec 136 -- bash "/opt/design-studio/2 build studio.sh"
```

It prints a Tailscale login link; send it to Cole to approve. Then the script:

- installs Docker
- writes `.env`: tailnet name, generated desktop password, whiteboard secret, time zone, and an IPv6 switch
- builds the floor plan and QGIS images and pulls FreeCAD and Blender from lscr.io (which avoids Docker Hub's pull limits)
- starts everything and publishes the four HTTPS ports with `tailscale serve`
- runs checks: each app answers, desktops demand the login, nothing listens on the LAN, and everything restarts on boot

The first run downloads about 8 GB. The script is safe to rerun: it keeps existing secrets and refuses to change STUDIO_HOST once plans exist.

Afterward:

- Store the desktop login from `/opt/design-studio/.env` in Infisical (CT 131).
- If the script stops saying HTTPS certificates are off, enable MagicDNS and HTTPS Certificates on the DNS page of the Tailscale admin console, then rerun it. They should already be on, since Infisical uses a ts.net name.

## Phase 3: Link to the Butterfly Drive

**3A. Native Nextcloud (the script handles this):**

```bash
cd /root/designstudio
NC_USER=<cole's nextcloud username> bash "3 link butterfly drive.sh"
```

It restarts CT 110, so the Drive is offline about a minute; warn Cole first. It then:

- adds the next free `mpN` for `/srv/design-studio` at `/mnt/design-studio`
- enables `files_external`
- creates a Local mount named `/Design Studio`, applicable only to his user
- turns on change detection, verifies the mount and scans it

**3B. If Nextcloud runs in Docker inside CT 110** (the script stops and says so):

1. `pct set 110 -mpN /srv/design-studio,mp=/mnt/design-studio`, then `pct reboot 110`.
2. Bind `/mnt/design-studio` into the Nextcloud container at the same path (compose volume, or `NEXTCLOUD_MOUNT=/mnt/` for Nextcloud AIO), then recreate that container.
3. Run the same `occ files_external` commands the script uses, through `docker exec -u www-data <container> php occ ...`.
4. Check that www-data is uid 33 inside that container. If it isn't, chown `/srv/design-studio` to 100000 plus that uid, and set `PUID`, `PGID`, and the floorplans `user:` to match.

**Verify:**

- The Design Studio folder shows in Cole's files.
- Delete a scratch file from it in Nextcloud and confirm it lands in Deleted files. Cole's no-permanent-delete rule depends on this. If Nextcloud deletes external storage files outright, tell Cole, and suggest making the mount read-only for deletes or relying on the nightly backups.

## Phase 4: Backups

Proxmox backups skip bind mounts, so no existing job covers `/srv/design-studio`.

```bash
cd /root/designstudio
bash backup.sh --install      # runs now and schedules 2:30 AM nightly, keeps 30 days
ls -lh /mnt/local-backup/design-studio
```

Each archive is integrity-checked after writing, and the newest archive is never pruned. Also add CT 136 to the existing vzdump schedule. It holds the app settings and images, not the projects.

## Phase 5 (optional): GPU acceleration with the RX 580

This gives smoother desktops and a hardware-accelerated 3D viewport. It will **not** enable Blender Cycles GPU rendering, because Blender does not support Polaris cards.

```bash
ls -l /dev/dri                                    # expect card0 and renderD128
pct exec 136 -- getent group render video         # note the gids
pct set 136 -dev1 /dev/dri/renderD128,gid=<render gid in CT>
pct set 136 -dev2 /dev/dri/card0,gid=<video gid in CT>
pct reboot 136
```

Then uncomment the `devices` block in `/opt/design-studio/compose.yaml` and run `docker compose up -d`. CT 126 (stable-diffusion) uses the same card. Sharing the render node between containers works, but don't run heavy SDXL jobs while Cole is designing.

## Phase 6 (optional): Pencil whiteboards saved to the Drive

Nextcloud Whiteboard, which is built on Excalidraw, stores `.whiteboard` files directly on the Butterfly Drive. It needs its backend, which is already in compose under the `whiteboard` profile.

1. `occ app:install whiteboard` (or enable it if already installed).
2. `cd /opt/design-studio && docker compose --profile whiteboard up -d`.
3. The backend must be reachable from Cole's browser and from Nextcloud. Nextcloud is served publicly at cloud.butterflyassets.com, so the clean path is a Cloudflare tunnel hostname such as `whiteboard.butterflyassets.com` pointing to `192.168.68.136:3002`. For that, change the port line to `"3002:3002"` so it listens on the LAN. The backend only accepts JWTs signed with the shared secret.
4. Run `occ config:app:set whiteboard collabBackendUrl --value="https://whiteboard.butterflyassets.com"` and `occ config:app:set whiteboard jwt_secret_key --value="<WHITEBOARD_JWT_SECRET from .env>"`.
5. Test on the iPad: in the Design Studio folder, New > Whiteboard, draw with the Pencil, reopen.

## Phase 7: Acceptance checks

- [ ] iPad with Tailscale on: the home page loads with a padlock, and Add to Home Screen opens it as an app.
- [ ] Create "Test Plan", draw walls, add furniture, and watch the indicator show "Saved". Tap Projects, reopen: everything is still there.
- [ ] `Floor Plans/Test Plan.sh3d` appears on the Butterfly Drive.
- [ ] Duplicate and Download work from the home page.
- [ ] FreeCAD, Blender, and QGIS each open after the desktop login, and `Design Studio` is visible in each app's file dialog.
- [ ] A file saved in FreeCAD's `Design Studio/FreeCAD` folder shows on the Drive.
- [ ] `pct stop 136 && pct start 136`: all containers come back on their own.
- [ ] From another LAN machine, `curl http://192.168.68.136:8080` fails, which is correct because the studio is tailnet-only.
- [ ] The backup archive exists and lists the test project.

Delete the test project through Nextcloud when done, so it goes to the Trash.

## Phase 8: Record it

- Living doc: Infrastructure (CT 136, .136, tailnet name), Container Resource Allocation (4 cores, 10 GB ceiling, 2 GB swap, 40 GB disk, onboot 0), Storage (`/srv/design-studio`, the CT 110 mp, backup job), Known Issues (below), Session Log, NEXT STEPS.
- Tell Cole the URLs and where the desktop password is stored.

## Known issues and gotchas

- **STUDIO_HOST must never change** once floor plans exist. Each saved plan stores furniture and textures as links such as `https://design-studio.tailadab47.ts.net/lib/resources/models/bath.zip`. If the tailnet or hostname ever changes, keep the old name as a Tailscale alias or re-export the projects. The build script refuses to change it once plans exist.
- **Desktop Sweet Home 3D needs Tailscale on** to show furniture in these plans, because the models load from those links.
- **The Java module flags are required.** `floorplans/conf/setenv.sh` sets `--add-opens` flags for `javax.swing.undo` and a few others. Without them, every save fails with `InaccessibleObjectException`. This was reproduced in testing.
- **The save page reads its catalogs from disk.** Stock Sweet Home 3D JS downloads its furniture and texture catalogs from the studio's own HTTPS address on the first save. The image patches this, so saving never depends on the container reaching itself over the tailnet.
- **Plan names** may use letters, numbers, spaces, hyphens, commas, plus signs and brackets. Underscores become spaces. A `.sh3d` dropped into `Floor Plans` with other characters is listed with a note to rename it on the Drive before it can be opened in the browser.
- **Rename and delete on the Drive.** The studio never deletes or renames, so removed plans go through Deleted files.
- **Docker in LXC.** If `hello-world` fails with an AppArmor or sysctl permission error, compare against CT 123's config. The late-2025 runc/containerd AppArmor regression in LXC is the usual cause. Match whatever CT 123 does rather than inventing a fix. `1 prepare host.sh` already copies CT 123's `lxc.apparmor` lines.
- **No IPv6 in the CT.** The desktops' web server binds `[::]:3000` and fails without IPv6. The build script detects this and sets `DISABLE_IPV6=true`.
- **Selkies desktops need HTTPS.** That's why FreeCAD, Blender, and QGIS sit behind `tailscale serve`. Plain HTTP to ports 3100 to 3300 from another machine shows a blank or broken page, and that is expected.
- **tailscale serve ports.** Arbitrary HTTPS ports are allowed for serve (only Funnel is restricted). If a version rejects 8444 or 8445, the build script falls back to 10000 and 10001 and records them in `.env`.
- **One device per project.** Sweet Home 3D JS saves each edit as it happens. Two devices editing the same plan at once will overwrite each other.
- **Memory.** Host RAM is 32 GB and heavily allocated. That's why CT 136 does not start on boot: Cole starts and stops it from the Proxmox app when he designs. Idle desktops use roughly 2 to 3 GB combined. The floor plan service is capped at 1 GB.

## Rollback

- Pause: `pct stop 136`. Nothing else depends on it.
- Unlink from the Drive: `occ files_external:delete <id>`, remove the `mpN` line from CT 110, then reboot CT 110.
- Remove entirely (only with Cole's OK): `vzdump 136` first, verify, then remove. Project files stay safe in `/srv/design-studio` and the nightly archives either way.
