package studio;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Guards the stock Sweet Home 3D JS pages, which trust their parameters.
 * Plan names and resource paths end up in file paths and inline JavaScript,
 * so anything outside a safe character set is rejected before a JSP sees it.
 */
public class StudioFilter implements Filter {
  /** Letters, digits, spaces, parentheses, plus, comma and hyphen. No dots, slashes, quotes or underscores. */
  public static final Pattern PLAN_NAME = Pattern.compile("[\\p{L}\\p{N}](?:[\\p{L}\\p{N} ()+,-]{0,78}[\\p{L}\\p{N})])?");
  /** Uploaded resources are named <uuid>.<ext> or userPreferences.json by the editor. */
  private static final Pattern RESOURCE_PATH = Pattern.compile("[A-Za-z0-9][A-Za-z0-9-]{0,99}(?:\\.[A-Za-z0-9]{1,10})?");

  public static boolean isValidPlanName(String name) {
    return name != null && PLAN_NAME.matcher(name).matches();
  }

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
      throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    String path = request.getServletPath();

    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "same-origin");
    response.setHeader("X-Frame-Options", "SAMEORIGIN");

    if (path.endsWith(".jsp") || path.startsWith("/api/") || path.equals("/") || path.endsWith(".html")) {
      response.setHeader("Cache-Control", "no-store");
    }

    if (path.equals("/writeResource.jsp")) {
      // The body is the raw file; read the path from the query string only.
      String resourcePath = queryParameter(request.getQueryString(), "path");
      if (resourcePath == null || !RESOURCE_PATH.matcher(resourcePath).matches()) {
        response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid resource path");
        return;
      }
    } else if (path.endsWith(".jsp")) {
      // Decode form bodies as UTF-8 before anything reads a parameter.
      request.setCharacterEncoding("UTF-8");
      String home = request.getParameter("home");
      if (home != null && !isValidPlanName(home)) {
        response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid plan name");
        return;
      }
    }
    chain.doFilter(req, res);
  }

  private static String queryParameter(String query, String name) {
    if (query == null) {
      return null;
    }
    for (String pair : query.split("&")) {
      int eq = pair.indexOf('=');
      String key = eq < 0 ? pair : pair.substring(0, eq);
      if (key.equals(name)) {
        try {
          return URLDecoder.decode(eq < 0 ? "" : pair.substring(eq + 1), StandardCharsets.UTF_8.name());
        } catch (IllegalArgumentException | IOException ex) {
          return null;
        }
      }
    }
    return null;
  }
}
