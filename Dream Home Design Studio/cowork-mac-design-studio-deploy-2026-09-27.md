# Handoff: Deploy the Dream Home Design Studio from the Mac

**For:** Cowork on Cole's Mac · **From:** Claude Code · **Written:** 2026-09-27
**Cole is away from his desk.** Reach him through this chat for the three approvals marked **ASK COLE** below. Do not guess at them.

## Cole's answers (Cole fills in before sending)

| Question | Answer |
|---|---|
| Nextcloud username | ____ |
| Storage: retire CT 121, or accept the LVM overprovisioning warning? | accept the warning / retire 121 |
| GPU acceleration (phase 5) | no |
| Pencil whiteboards (phase 6) | no |
| Did Cole start CT 108 this morning? | ____ |

If a row is blank, use these defaults: accept the warning, and leave GPU and whiteboards off. If the Nextcloud username is blank, **ASK COLE** before phase 3. Never retire CT 121 on a default; that needs Cole's explicit yes.

## Goal

Stand up CT 136 `design-studio` on the Proxmox host `butterflyassets` (192.168.68.62) using the tested build pack. When done, Cole's iPad opens `https://design-studio.tailadab47.ts.net/` with floor plans, and the FreeCAD, Blender and QGIS desktops are on ports 8443, 8444 and 8445.

The full runbook is `Dream Home Design Studio Handoff.md` inside the pack. Follow it phase by phase; this page covers getting set up from the Mac and the points where you must stop.

## Ground rules

- Read the server living doc `Butterfly-Assets-Hub.md` on the Mac first, and update it after each phase (server-admin skill). The server cannot reach that file, so you are the only one who can keep it current.
- Never permanently delete files; removed files go to the Trash folder on the Butterfly Drive. Never `pct destroy` anything.
- File names use spaces or hyphens, never underscores.
- Never run `docker compose down -v`.

## Step 1: Get the pack onto the Mac and the Drive

The pack is on GitHub: repo `colebentonbutterfly/butterfly-crm`, branch `claude/dream-home-design-studio-nzyo4u`, folder `Dream Home Design Studio`.

```bash
cd ~/Downloads
git clone --depth 1 -b claude/dream-home-design-studio-nzyo4u https://github.com/colebentonbutterfly/butterfly-crm.git design-studio-pack
```

If git cannot authenticate, open https://github.com/colebentonbutterfly/butterfly-crm/tree/claude/dream-home-design-studio-nzyo4u in the browser (Cole is logged in on the Mac) and use Code > Download ZIP, or **ASK COLE** to save the `Dream Home Design Studio.zip` from his Claude Code chat to the Drive.

Copy the folder to the Drive so it matches the runbook's paths:

```bash
cp -R ~/Downloads/design-studio-pack/"Dream Home Design Studio" "/Volumes/Butterfly Drive/Handoffs/"
ls "/Volumes/Butterfly Drive/Handoffs/Dream Home Design Studio"
# expect: Dream Home Design Studio Handoff.md, Server Build, iPad, this file
```

## Step 2: Phase 0 pre-flight (read only)

```bash
ssh root@192.168.68.62
```

Run the Phase 0 block from the runbook. Stop and report to Cole if .136 or CT 136 is taken, `/` has under 15 GB free, or the thin pools differ from the 2026-09-15 remediation notes. Also note what CT 108 is (`pct config 108`), because it came back online at 06:52 today after being removed on 09-15.

## Step 3: Copy the build to the host and create CT 136

```bash
scp -r "/Volumes/Butterfly Drive/Handoffs/Dream Home Design Studio/Server Build" root@192.168.68.62:/root/designstudio
ssh -t root@192.168.68.62 'cd /root/designstudio && bash "1 prepare host.sh"'
```

It asks twice: first whether to continue despite the overprovisioning warning (answer from the table), then whether to create the CT (yes). Use `ssh -t` so the prompts work.

## Step 4: Build the studio

```bash
ssh -t root@192.168.68.62 'pct exec 136 -- bash "/opt/design-studio/2 build studio.sh"'
```

- **ASK COLE:** the script prints a `https://login.tailscale.com/a/...` link and waits. Send it to Cole to approve on his phone. The script continues once he does.
- The first run downloads about 8 GB and takes 10 to 20 minutes.
- It ends with a list of checks. If some desktop checks fail only because the desktops are still starting, wait two minutes and rerun the same command; it is safe to rerun.
- Get the desktop password with `ssh root@192.168.68.62 'pct exec 136 -- grep DESKTOP_PASSWORD /opt/design-studio/.env'` and store it in Infisical (CT 131). Do not paste it into chat or into any file on the Drive.

## Step 5: Link to the Butterfly Drive

**ASK COLE:** "OK to restart Nextcloud now? The Drive will be offline for about a minute." Wait for his yes.

```bash
ssh -t root@192.168.68.62 'cd /root/designstudio && NC_USER=<username> bash "3 link butterfly drive.sh"'
```

Then check that the Design Studio folder shows in his files. Delete a scratch file you created there through the Nextcloud web UI and confirm it appears in Deleted files. If it does not, tell Cole.

## Step 6: Backups

```bash
ssh root@192.168.68.62 'cd /root/designstudio && bash backup.sh --install && ls -lh /mnt/local-backup/design-studio'
```

Also add CT 136 to the existing vzdump schedule (Datacenter > Backup in the web UI, or `/etc/pve/jobs.cfg`). The Proxmox web UI needs Cole's TOTP code, so use SSH where you can.

## Step 7: Acceptance checks

Run through Phase 7 of the runbook. You can do most of it from the Mac's browser (Tailscale must be on for the Mac):

- The home page loads with a padlock; create "Test Plan", draw walls, add furniture, see "Saved", go to Projects, reopen.
- `Floor Plans/Test Plan.sh3d` appears on the Drive.
- FreeCAD, Blender and QGIS open after the desktop login.
- `ssh root@192.168.68.62 'pct stop 136 && pct start 136'`, then the containers come back on their own within a couple of minutes.
- From the Mac, `curl -m 5 http://192.168.68.136:8080` fails. That is correct, because the studio is tailnet-only.

Delete "Test Plan" through Nextcloud afterwards so it goes to Deleted files.

## Step 8: iPad icon and records

- Copy `iPad/Design Studio.mobileconfig` to the Drive's Handoffs folder (already there if Step 1 worked), then tell Cole to open it on the iPad from the Nextcloud or Files app and install it (Settings > Profile Downloaded > Install). If he added the other Butterfly apps from Safari's Share menu instead, he can use Add to Home Screen on the studio home page.
- Update `Butterfly-Assets-Hub.md`:
  - Infrastructure: CT 136, .136, `design-studio.tailadab47.ts.net`
  - Container Resource Allocation: 4 cores, 10 GB, 2 GB swap, 40 GB disk, onboot 0
  - Storage: `/srv/design-studio`, the CT 110 mp, the backup job
  - Known Issues: copy the list from the runbook
  - Session Log, and NEXT STEPS
- Send Cole a short summary: the four URLs, where the desktop password is stored, anything that failed, and what CT 108 turned out to be.

## If something breaks

- `hello-world` fails with an AppArmor or sysctl error: compare with `pct config 123` and match it. Do not invent a fix.
- The build script says HTTPS certificates are off: they are enabled on the DNS page of the Tailscale admin console. **ASK COLE** to switch them on, then rerun.
- The Nextcloud script stops, saying Nextcloud runs in Docker: follow Phase 3B in the runbook.
- Pause everything: `ssh root@192.168.68.62 'pct stop 136'`. Nothing else depends on it.
