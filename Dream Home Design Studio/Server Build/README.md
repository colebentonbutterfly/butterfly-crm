# Design Studio: Server Build

Everything needed to stand up CT 136 `design-studio` on butterflyassets. Follow the phases in `../Dream Home Design Studio Handoff.md`; this page lists the files and what each one does.

| File | Runs on | What it does |
|---|---|---|
| `1 prepare host.sh` | Proxmox host | Checks ID, IP, storage, disk and template, asks, then creates CT 136, `/srv/design-studio`, mp0 and `/dev/net/tun`, starts the CT and copies this folder to `/opt/design-studio` |
| `2 build studio.sh` | inside CT 136 | Tailscale login, Docker, `.env`, builds and starts the containers, `tailscale serve` on 443/8443/8444/8445, checks |
| `3 link butterfly drive.sh` | Proxmox host | Adds `/srv/design-studio` to Nextcloud CT 110 and creates the "Design Studio" folder for one user. Restarts CT 110 |
| `backup.sh` | Proxmox host | Nightly `.tar.zst` of `/srv/design-studio` to `/mnt/local-backup/design-studio`, 30 days kept |
| `compose.yaml` | inside CT 136 | floorplans, freecad, blender, qgis, and whiteboard (optional profile) |
| `.env.example` | reference | The settings `2 build studio.sh` writes to `/opt/design-studio/.env` |
| `floorplans/` | image | Sweet Home 3D JS 7.5.2 editor on Tomcat 9 / Java 17, plus the studio home page |
| `qgis/` | image | QGIS 3.40 LTR on the linuxserver XFCE web desktop |

## Copy to the server

From the Mac, with the Butterfly Drive mounted:

```bash
scp -r "/Volumes/Butterfly Drive/Handoffs/Dream Home Design Studio/Server Build" root@192.168.68.62:/root/designstudio
```

Then on the host: `cd /root/designstudio && bash "1 prepare host.sh"`.

## Addresses once running

| Address | What |
|---|---|
| `https://design-studio.<tailnet>.ts.net/` | Home page and floor plan editor |
| `https://design-studio.<tailnet>.ts.net:8443/` | FreeCAD |
| `https://design-studio.<tailnet>.ts.net:8444/` | Blender |
| `https://design-studio.<tailnet>.ts.net:8445/` | QGIS |

Inside CT 136 the apps listen on 127.0.0.1 only (8080, 3100, 3200, 3300), so nothing is reachable from the LAN.

## Project folder layout

```
/srv/design-studio            (host, owner 100033 = uid 33 in the CTs)
├── Floor Plans/              one .sh3d file per plan, saved as you draw
├── FreeCAD/
├── Blender/
├── QGIS/
├── Exports/
├── Whiteboards/
└── .studio/user-resources/   textures and models imported in the editor
```

The desktops see this folder as `Design Studio` in their home folder. Nextcloud shows it as `Design Studio`.

## What the floor plan image adds to stock Sweet Home 3D JS

- A home page with New, Open, Duplicate and Download, which can be added to the iPad home screen.
- Plans are stored in `Floor Plans` on the share instead of inside the web app.
- A Projects button and a save indicator (Saving, Saved, Not saved, Offline) in the editor.
- Plan names are limited to letters, numbers, spaces, hyphens, commas, plus signs and brackets. Underscores become spaces. The stock pages accepted any name, including `../` paths.
- The Java 17 `--add-opens` flags, without which every save fails with `InaccessibleObjectException`.
- The save page reads the furniture and texture catalogs from disk. The stock page downloads them from the studio's own HTTPS address, so saving would depend on the container reaching itself over the tailnet.

Nothing in the studio deletes or renames files. Those happen on the Butterfly Drive, so they go through Deleted files.

## Tested before handoff (2026-09-27, in a scratch Docker host)

- Floor plans image builds (SourceForge download pinned by SHA-256) and runs as uid 33.
- In Chromium with an iPad Pro viewport: create a plan, draw walls, add furniture, see "Saved", go back to Projects, reopen, and everything is still there. The `.sh3d` file on disk contains the walls and furniture.
- Without the `--add-opens` flags the same test fails with `InaccessibleObjectException`; with them it passes.
- API: invalid names, `../` paths and quotes are rejected with 400, a missing request header gets 403, duplicates get " copy", UTF-8 names work, and Download sends the `.sh3d`.
- QGIS image builds and runs: QGIS opens on the XFCE desktop, the login is enforced (401 without, 200 with), and `Design Studio` is visible with uid 33 ownership kept.
- `1 prepare host.sh`, `2 build studio.sh` and `3 link butterfly drive.sh` were dry-run against stubbed `pct`, `pvesm`, `lvs`, `pveam`, `occ`, `tailscale` and `docker`. `backup.sh` ran for real, including pruning.
- Not testable there: the real Proxmox host, Tailscale, FreeCAD and Blender (the images can't be pulled from that sandbox), and Nextcloud.
