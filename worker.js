export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    // Handle browser CORS pre-flight checks
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    if (!targetUrl) {
      return new Response("Proxy is Active! Ready to stream.", { 
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": targetUrl,
        }
      });

      const contentType = response.headers.get("content-type") || "";
      const workerBase = `${url.origin}/?url=`;

      // Intercept any M3U8 playlist (Master or Variant)
      if (targetUrl.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("application/x-mpegURL")) {
        let text = await response.text();
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

        const modified = text.split("\n").map(line => {
          let trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) {
            if (trimmed.includes('URI="')) {
              return trimmed.replace(/URI="([^"]+)"/, (match, uri) => {
                let absolute = uri.startsWith("http") ? uri : (new URL(uri, baseUrl)).href;
                return `URI="${workerBase}${encodeURIComponent(absolute)}"`;
              });
            }
            return trimmed;
          }

          let fullUrl = trimmed.startsWith("http") ? trimmed : (new URL(trimmed, baseUrl)).href;
          return workerBase + encodeURIComponent(fullUrl);
        }).join("\n");

        return new Response(modified, {
          status: response.status,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          }
        });
      }

      // Pass TS/MP4 video chunks directly with full CORS
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });

    } catch (err) {
      return new Response("Proxy Error: " + err.message, { 
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};
