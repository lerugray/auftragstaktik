import { cacheGet, cacheSet } from './cache';

const CACHE_KEY_PREFIX = 'telegram';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const TRANSLATION_CACHE_PREFIX = 'tg-translated';
const TRANSLATION_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export interface TelegramPost {
  id: string;
  channel: string;
  text: string;
  translatedText?: string;
  date: string;
  link: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function translateText(
  text: string,
  channel: string,
  messageId: string
): Promise<string> {
  const cacheKey = `${TRANSLATION_CACHE_PREFIX}-${hashString(text)}`;
  const cached = cacheGet<string>(cacheKey);
  if (cached) return cached;

  try {
    const translatte = (await import('translatte')).default;
    const toTranslate = text.length > 500 ? text.substring(0, 500) + '...' : text;
    const result = await translatte(toTranslate, { to: 'en' });
    const translated = result.text || text;
    cacheSet(cacheKey, translated, TRANSLATION_CACHE_TTL);
    return translated;
  } catch (err) {
    console.error('telegram: translate failed:', {
      channel,
      message_id: messageId,
      error: err instanceof Error ? err.message : String(err),
    });
    return text;
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Parse posts from Telegram's public preview page (t.me/s/{channel})
function parsePreviewPage(html: string, channelName: string): TelegramPost[] {
  const posts: TelegramPost[] = [];

  // Match message blocks: each has class "tgme_widget_message_wrap"
  const messageRegex = /class="tgme_widget_message_wrap[\s\S]*?data-post="([^"]+)"[\s\S]*?<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div class="tgme_widget_message_footer|<\/div>\s*<\/div>\s*<\/div>)/g;
  let match;

  while ((match = messageRegex.exec(html)) !== null) {
    const postId = match[1]; // e.g., "DeepStateUA/12345"
    const rawHtml = match[2];
    const text = stripHtml(rawHtml);

    if (!text || text.length < 10) continue;

    posts.push({
      id: postId,
      channel: channelName,
      text,
      date: new Date().toISOString(), // Preview page doesn't always have clean dates
      link: `https://t.me/${postId}`,
    });
  }

  // Fallback: simpler regex if the above doesn't match
  if (posts.length === 0) {
    const simpleRegex = /class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
    let idx = 0;
    while ((match = simpleRegex.exec(html)) !== null) {
      const text = stripHtml(match[1]);
      if (!text || text.length < 10) continue;
      posts.push({
        id: `${channelName}-${idx++}`,
        channel: channelName,
        text,
        date: new Date().toISOString(),
        link: `https://t.me/s/${channelName}`,
      });
    }
  }

  return posts.slice(0, 20); // Limit to 20 most recent
}

function bodyLooksLikeChannelNotFound(html: string): boolean {
  return /channel not found/i.test(html);
}

function parseRetryAfterSeconds(res: Response): number | undefined {
  const raw = res.headers.get('Retry-After');
  if (!raw) return undefined;
  const asInt = parseInt(raw, 10);
  if (!Number.isNaN(asInt)) return asInt;
  const asDate = Date.parse(raw);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, Math.ceil((asDate - Date.now()) / 1000));
  }
  return undefined;
}

export async function fetchTelegramChannel(
  channelName: string,
  translate: boolean = true,
  fetchImpl: typeof fetch = fetch
): Promise<TelegramPost[]> {
  const cacheKey = `${CACHE_KEY_PREFIX}-${channelName}`;
  const cached = cacheGet<TelegramPost[]>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch Telegram's public preview page directly
    const res = await fetchImpl(`https://t.me/s/${channelName}`, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });

    if (res.status === 429) {
      const retryAfter = parseRetryAfterSeconds(res);
      console.error('telegram: rate-limited:', { channel: channelName, retryAfter });
      return [];
    }

    if (res.status === 404) {
      console.error('telegram: channel not found:', channelName);
      return [];
    }

    const html = await res.text();

    if (bodyLooksLikeChannelNotFound(html)) {
      console.error('telegram: channel not found:', channelName);
      return [];
    }

    if (!res.ok) {
      console.error('telegram: preview fetch failed:', { channel: channelName, status: res.status });
      return [];
    }

    const posts = parsePreviewPage(html, channelName);

    // Translate non-Latin posts
    if (translate) {
      for (const post of posts) {
        if (/[\u0400-\u04FF\u0500-\u052F\u0600-\u06FF\u1000-\u109F]/.test(post.text)) {
          post.translatedText = await translateText(post.text, channelName, post.id);
        }
      }
    }

    cacheSet(cacheKey, posts, CACHE_TTL);
    return posts;
  } catch (err) {
    console.error('telegram: fetch error:', { channel: channelName, error: err });
    return [];
  }
}

export async function fetchMultipleChannels(
  channels: string[],
  translate: boolean = true,
  fetchImpl: typeof fetch = fetch
): Promise<TelegramPost[]> {
  const results = await Promise.allSettled(
    channels.map(ch => fetchTelegramChannel(ch, translate, fetchImpl))
  );

  const allPosts: TelegramPost[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allPosts.push(...result.value);
    }
  }

  // Sort by date descending
  allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return allPosts;
}
