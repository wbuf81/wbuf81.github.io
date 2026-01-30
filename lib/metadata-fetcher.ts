// URL metadata fetcher using CORS proxies

interface URLMetadata {
  title?: string;
  description?: string;
  image?: string;
}

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

async function fetchWithProxy(url: string, proxyUrl: string): Promise<string> {
  const response = await fetch(proxyUrl + encodeURIComponent(url), {
    headers: {
      'Accept': 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`Proxy fetch failed: ${response.status}`);
  }

  return response.text();
}

function extractMetaContent(html: string, property: string): string | undefined {
  // Try Open Graph first
  const ogMatch = html.match(
    new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`, 'i')
  ) || html.match(
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${property}["']`, 'i')
  );

  if (ogMatch?.[1]) {
    return ogMatch[1];
  }

  // Try Twitter cards
  const twitterMatch = html.match(
    new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']*)["']`, 'i')
  ) || html.match(
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']twitter:${property}["']`, 'i')
  );

  if (twitterMatch?.[1]) {
    return twitterMatch[1];
  }

  // Try standard meta tags for description
  if (property === 'description') {
    const metaMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
    ) || html.match(
      /<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i
    );

    if (metaMatch?.[1]) {
      return metaMatch[1];
    }
  }

  return undefined;
}

function extractTitle(html: string): string | undefined {
  // Try og:title first
  const ogTitle = extractMetaContent(html, 'title');
  if (ogTitle) return ogTitle;

  // Fall back to <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return titleMatch?.[1]?.trim();
}

export async function fetchURLMetadata(url: string): Promise<URLMetadata | null> {
  for (const proxy of CORS_PROXIES) {
    try {
      const html = await fetchWithProxy(url, proxy);

      const metadata: URLMetadata = {
        title: extractTitle(html),
        description: extractMetaContent(html, 'description'),
        image: extractMetaContent(html, 'image'),
      };

      // If we got at least a title, consider it a success
      if (metadata.title) {
        // Make relative image URLs absolute
        if (metadata.image && !metadata.image.startsWith('http')) {
          try {
            const urlObj = new URL(url);
            metadata.image = new URL(metadata.image, urlObj.origin).href;
          } catch {
            // Keep the relative URL if parsing fails
          }
        }

        return metadata;
      }
    } catch (error) {
      console.warn(`Proxy ${proxy} failed for ${url}:`, error);
      continue;
    }
  }

  return null;
}
