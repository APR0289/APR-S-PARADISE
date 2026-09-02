export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

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
      return new Response("Proxy is Active! Ready to stream.", { status: 200 });
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Referer": targetUrl
        }
      });

      const workerBase = `${url.origin}/?url=`;

      if (targetUrl.includes(".m3u8")) {
        let text = await response.text();
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

        const modified = text.split("\n").map(line => {
          line = line.trim();
          if (!line || line.startsWith("#")) return line;
          let chunk = line.startsWith("http") ? line : baseUrl + line;
          return workerBase + encodeURIComponent(chunk);
        }).join("\n");

        return new Response(modified, {
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          }
        });
      }

      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });

    } catch (err) {
      return new Response("Proxy Error: " + err.message, { status: 500 });
    }
  }
};
