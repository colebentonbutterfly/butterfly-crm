# QGIS on the linuxserver XFCE web desktop (Selkies, streamed to the browser).
ARG BASE_IMAGE=lscr.io/linuxserver/webtop:ubuntu-xfce
FROM ${BASE_IMAGE}

ENV TITLE=QGIS

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      qgis python3-qgis \
      fonts-dejavu-core \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* /tmp/*

# Open QGIS as soon as the desktop starts. It is also in the Applications menu.
COPY qgis.desktop /etc/xdg/autostart/qgis.desktop
