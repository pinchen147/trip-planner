import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const protectedPaths = ['/api/', '/app/', '/trips'];

  return {
    rules: [
      // Default: allow public pages, block protected routes
      {
        userAgent: '*',
        allow: '/',
        disallow: protectedPaths,
      },
      // Explicitly allow AI search engine bots for GEO
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: protectedPaths,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: protectedPaths,
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: protectedPaths,
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: protectedPaths,
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
        disallow: protectedPaths,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: protectedPaths,
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: protectedPaths,
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://trip.ianhsiao.me'}/sitemap.xml`,
  };
}
