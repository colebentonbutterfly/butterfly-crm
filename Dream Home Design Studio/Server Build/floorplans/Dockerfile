# syntax=docker/dockerfile:1.7
#
# Design Studio floor plans: Sweet Home 3D JS editor on Tomcat, plus the
# studio home page. Plans are saved as .sh3d files in /data/Floor Plans.

ARG SH3DJS_VERSION=7.5.2
ARG SH3DJS_SHA256=4266d20b4f7bf0dc7bd845cf27d15a87792fe3e19a3d3cd4da32d9a3d647b709

FROM tomcat:9.0-jdk17-temurin AS build
ARG SH3DJS_VERSION
ARG SH3DJS_SHA256
ADD --checksum=sha256:${SH3DJS_SHA256} \
    https://downloads.sourceforge.net/project/sweethome3d/SweetHome3DJS/SweetHome3DJS-${SH3DJS_VERSION}.war \
    /tmp/sh3djs.war

WORKDIR /build/app
RUN jar xf /tmp/sh3djs.war \
 && rm -rf homes \
 && mv index.jsp editor.jsp

# Plans and uploaded textures/models live outside the webapp, on the
# Design Studio share. The stock JSPs use folders inside the webapp.
# The save page also loads the furniture and texture catalogs, which the stock
# page fetches from the studio's own public HTTPS address. They are read from
# disk instead, so saving never depends on the container reaching the tailnet.
RUN set -eu; \
    sed -i 's#getServletContext().getRealPath("/homes")#System.getenv("STUDIO_HOMES_DIR")#' \
        readHome.jsp writeHomeEdits.jsp closeHome.jsp; \
    sed -i 's#getServletContext().getRealPath("/userResources")#System.getenv("STUDIO_RESOURCES_DIR")#' \
        writeResource.jsp; \
    if grep -n 'getRealPath' *.jsp; then echo "unpatched getRealPath left" >&2; exit 1; fi; \
    test "$(grep -c STUDIO_HOMES_DIR readHome.jsp writeHomeEdits.jsp closeHome.jsp | grep -c ':1$')" = 3; \
    sed -i 's#new URL(serverBaseUrl, "lib/resources/\(Default[A-Za-z]*Catalog\.json\)")#new File(getServletContext().getRealPath("/lib/resources/\1")).toURI().toURL()#' \
        writeHomeEdits.jsp; \
    test "$(grep -c 'toURI().toURL()' writeHomeEdits.jsp)" = 2

COPY patch-editor.sh /build/
RUN sh /build/patch-editor.sh editor.jsp

COPY src/ /build/src/
RUN javac --release 17 -encoding UTF-8 -nowarn \
      -cp "/usr/local/tomcat/lib/servlet-api.jar:WEB-INF/classes:WEB-INF/lib/*" \
      -d WEB-INF/classes $(find /build/src -name '*.java')

COPY web/ ./

FROM tomcat:9.0-jre17-temurin
ENV LANG=C.UTF-8 \
    UMASK=0002 \
    STUDIO_HOMES_DIR="/data/Floor Plans" \
    STUDIO_RESOURCES_DIR=/data/.studio/user-resources
RUN rm -rf /usr/local/tomcat/webapps/* /usr/local/tomcat/webapps.dist
COPY --from=build /build/app /usr/local/tomcat/webapps/ROOT
COPY conf/server.xml /usr/local/tomcat/conf/server.xml
COPY conf/context.xml /usr/local/tomcat/webapps/ROOT/META-INF/context.xml
COPY conf/setenv.sh /usr/local/tomcat/bin/setenv.sh
RUN mkdir -p /usr/local/tomcat/conf/Catalina/localhost \
 && chown -R 33:33 /usr/local/tomcat/work /usr/local/tomcat/temp /usr/local/tomcat/logs /usr/local/tomcat/conf/Catalina
USER 33:33
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD curl -fsS -o /dev/null http://127.0.0.1:8080/ping.jsp || exit 1
