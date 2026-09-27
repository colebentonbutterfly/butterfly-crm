package studio;

import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.List;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.eteks.sweethome3d.io.HomeServerRecorder;

/**
 * Small JSON API behind the studio home page.
 *
 * GET  /api/config                      ports and links for the tool tiles
 * GET  /api/projects                    floor plans, newest first
 * POST /api/projects  action=create     name=...  creates an empty plan
 * POST /api/projects  action=duplicate  name=...  copies a plan as "<name> copy"
 * GET  /api/download?name=...           the .sh3d file as a download
 *
 * Nothing here deletes or renames. Those happen in Nextcloud, so removed
 * plans go to Deleted files on the Butterfly Drive.
 */
public class StudioApi extends HttpServlet {
  private static final String EXTENSION = ".sh3d";

  private Path homesDir() {
    return Paths.get(System.getenv("STUDIO_HOMES_DIR"));
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response)
      throws ServletException, IOException {
    String path = request.getPathInfo() == null ? "" : request.getPathInfo();
    switch (path) {
      case "/config":
        sendConfig(response);
        break;
      case "/projects":
        sendProjects(response);
        break;
      case "/download":
        sendDownload(request, response);
        break;
      default:
        response.sendError(HttpServletResponse.SC_NOT_FOUND);
    }
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response)
      throws ServletException, IOException {
    request.setCharacterEncoding("UTF-8");
    if (!"/projects".equals(request.getPathInfo())) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    // Same-origin check: the page always sends this header, cross-site forms cannot.
    if (!"fetch".equals(request.getHeader("X-Studio-Request"))) {
      sendError(response, HttpServletResponse.SC_FORBIDDEN, "Missing request header");
      return;
    }
    String action = request.getParameter("action");
    String name = normalize(request.getParameter("name"));
    if (!StudioFilter.isValidPlanName(name)) {
      sendError(response, HttpServletResponse.SC_BAD_REQUEST,
          "Use letters, numbers, spaces, hyphens, commas, plus signs or brackets (up to 80 characters).");
      return;
    }
    Files.createDirectories(homesDir());
    if ("create".equals(action)) {
      Path file = planFile(name);
      try {
        Files.write(file, HomeServerRecorder.getNewHomeContent(), StandardOpenOption.CREATE_NEW);
      } catch (FileAlreadyExistsException ex) {
        sendError(response, HttpServletResponse.SC_CONFLICT, "A plan called \"" + name + "\" already exists.");
        return;
      } catch (Exception ex) {
        throw new ServletException("Could not create " + name, ex);
      }
      sendJson(response, HttpServletResponse.SC_CREATED, "{\"name\":" + json(name) + "}");
    } else if ("duplicate".equals(action)) {
      Path source = planFile(name);
      if (!Files.isRegularFile(source)) {
        sendError(response, HttpServletResponse.SC_NOT_FOUND, "No plan called \"" + name + "\".");
        return;
      }
      String base = name + " copy";
      for (int i = 1; i < 1000; i++) {
        String copyName = i == 1 ? base : base + " " + i;
        if (copyName.length() > 80 || !StudioFilter.isValidPlanName(copyName)) {
          break;
        }
        try {
          synchronized (source.toFile().getCanonicalPath().intern()) {
            Files.copy(source, planFile(copyName));
          }
          sendJson(response, HttpServletResponse.SC_CREATED, "{\"name\":" + json(copyName) + "}");
          return;
        } catch (FileAlreadyExistsException ex) {
          // try the next number
        }
      }
      sendError(response, HttpServletResponse.SC_CONFLICT, "Could not find a free name for the copy.");
    } else {
      sendError(response, HttpServletResponse.SC_BAD_REQUEST, "Unknown action");
    }
  }

  private void sendConfig(HttpServletResponse response) throws IOException {
    StringBuilder out = new StringBuilder("{");
    out.append("\"studioHost\":").append(json(env("STUDIO_HOST", ""))).append(',');
    out.append("\"freecadPort\":").append(json(env("FREECAD_PORT", "8443"))).append(',');
    out.append("\"blenderPort\":").append(json(env("BLENDER_PORT", "8444"))).append(',');
    out.append("\"qgisPort\":").append(json(env("QGIS_PORT", "8445"))).append(',');
    out.append("\"driveUrl\":").append(json(env("DRIVE_URL", ""))).append('}');
    sendJson(response, HttpServletResponse.SC_OK, out.toString());
  }

  private void sendProjects(HttpServletResponse response) throws IOException {
    Path dir = homesDir();
    List<String[]> rows = new ArrayList<>();
    if (Files.isDirectory(dir)) {
      try (DirectoryStream<Path> files = Files.newDirectoryStream(dir, "*" + EXTENSION)) {
        for (Path file : files) {
          String fileName = file.getFileName().toString();
          if (fileName.startsWith(".") || !Files.isRegularFile(file)) {
            continue;
          }
          BasicFileAttributes attributes = Files.readAttributes(file, BasicFileAttributes.class);
          String name = fileName.substring(0, fileName.length() - EXTENSION.length());
          rows.add(new String[] {name, String.valueOf(attributes.lastModifiedTime().toMillis()),
              String.valueOf(attributes.size())});
        }
      }
    }
    rows.sort((a, b) -> Long.compare(Long.parseLong(b[1]), Long.parseLong(a[1])));
    StringBuilder out = new StringBuilder("{\"projects\":[");
    for (int i = 0; i < rows.size(); i++) {
      String[] row = rows.get(i);
      if (i > 0) {
        out.append(',');
      }
      out.append("{\"name\":").append(json(row[0]))
         .append(",\"modified\":").append(row[1])
         .append(",\"size\":").append(row[2])
         .append(",\"openable\":").append(StudioFilter.isValidPlanName(row[0]))
         .append('}');
    }
    out.append("]}");
    sendJson(response, HttpServletResponse.SC_OK, out.toString());
  }

  private void sendDownload(HttpServletRequest request, HttpServletResponse response) throws IOException {
    request.setCharacterEncoding("UTF-8");
    String name = request.getParameter("name");
    if (!StudioFilter.isValidPlanName(name)) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid plan name");
      return;
    }
    Path file = planFile(name);
    if (!Files.isRegularFile(file)) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    String fileName = name + EXTENSION;
    response.setContentType("application/octet-stream");
    response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName.replaceAll("[^\\x20-\\x7e]", "-")
        + "\"; filename*=UTF-8''" + URLEncoder.encode(fileName, "UTF-8").replace("+", "%20"));
    synchronized (file.toFile().getCanonicalPath().intern()) {
      byte[] content = Files.readAllBytes(file);
      response.setContentLength(content.length);
      try (OutputStream out = response.getOutputStream()) {
        out.write(content);
      }
    }
  }

  /** Cole's naming rule: spaces, never underscores. Also trims and collapses spaces. */
  static String normalize(String name) {
    if (name == null) {
      return null;
    }
    return name.replace('_', ' ').replaceAll("\\s+", " ").trim();
  }

  private Path planFile(String name) throws IOException {
    Path file = homesDir().resolve(name + EXTENSION).normalize();
    if (!file.getParent().equals(homesDir().normalize())) {
      throw new IOException("Plan path escapes the plans folder");
    }
    return file;
  }

  private static String env(String name, String defaultValue) {
    String value = System.getenv(name);
    return value == null || value.isEmpty() ? defaultValue : value;
  }

  private static void sendError(HttpServletResponse response, int status, String message) throws IOException {
    sendJson(response, status, "{\"error\":" + json(message) + "}");
  }

  private static void sendJson(HttpServletResponse response, int status, String body) throws IOException {
    response.setStatus(status);
    response.setContentType("application/json");
    response.setCharacterEncoding("UTF-8");
    try (PrintWriter out = response.getWriter()) {
      out.write(body);
    }
  }

  static String json(String value) {
    StringBuilder out = new StringBuilder("\"");
    for (char c : value.toCharArray()) {
      switch (c) {
        case '"': out.append("\\\""); break;
        case '\\': out.append("\\\\"); break;
        case '\n': out.append("\\n"); break;
        case '\r': out.append("\\r"); break;
        case '\t': out.append("\\t"); break;
        case '<': out.append("\\u003c"); break;
        default:
          if (c < 0x20) {
            out.append(String.format("\\u%04x", (int) c));
          } else {
            out.append(c);
          }
      }
    }
    return out.append('"').toString();
  }
}
