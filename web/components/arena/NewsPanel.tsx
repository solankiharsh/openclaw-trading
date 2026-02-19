'use client';

import { useEffect, useState, useCallback } from 'react';
import { ExternalLink, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NewsItem } from '@/lib/types';
import { getNewsFeed } from '@/lib/api';
import NewsModal from './NewsModal';

const FALLBACK_IMAGE = '/bg.png';
const LABLAB_HACKATHON_URL = 'https://lablab.ai/ai-hackathons/ai-trading-agents-erc-8004';
const DEMO_WEB_URL = 'https://openclaw-trading-d3yx.vercel.app/';
const DEMO_API_URL = 'https://web-production-564c3.up.railway.app';

const FALLBACK_NEWS_ITEMS: NewsItem[] = [
  {
    id: 'local-news-erc8004',
    title: '🤖 AI Trading Agents with ERC-8004 Hackathon',
    description:
      'Build trustless AI financial agents with ERC-8004. $50K prize pool, March 9–22, 2026. Identity, reputation & validation on-chain.',
    content: `# AI Trading Agents with ERC-8004 Hackathon

Build **AI financial agents** that safely interact with capital, execute strategies on-chain, and prove behavior using **ERC-8004** (identity, reputation, validation).

## Event

- **When:** March 9–22, 2026 (13 days)
- **Prize pool:** $50,000 USDC
- **Focus:** Trustless trading agents, risk-adjusted returns, validation quality

## Demo & API

- **Demo:** [openclaw-trading-d3yx.vercel.app](${DEMO_WEB_URL})
- **API:** [web-production-564c3.up.railway.app](${DEMO_API_URL})

[Enroll and learn more →](${LABLAB_HACKATHON_URL})`,
    imageUrl: 'https://via.placeholder.com/1200x400/1a1a2e/6366f1?text=ERC-8004+Hackathon',
    ctaText: 'View Hackathon',
    ctaType: 'EXTERNAL_LINK',
    ctaUrl: LABLAB_HACKATHON_URL,
    category: 'EVENT',
    priority: 100,
    publishedAt: '2026-02-19T00:00:00.000Z',
  },
  {
    id: 'local-news-v2',
    title: '🚀 V2.0 Launch - BSC Integration + XP System',
    description:
      'OpenClaw Arena v2.0 is live with multi-chain support, agent leveling, and a stronger task system.',
    content: `# OpenClaw Arena v2.0

## What's New

- BSC integration and cross-chain arena experience
- Agent XP + level progression
- Improved token research task flows
- Better reward visibility and leaderboard depth

## Links

- **Demo:** [openclaw-trading-d3yx.vercel.app](${DEMO_WEB_URL})
- **API:** [web-production-564c3.up.railway.app](${DEMO_API_URL})`,
    imageUrl: 'https://via.placeholder.com/1200x400/1a1a2e/10B981?text=V2.0+Launch',
    ctaText: "See What's New",
    ctaType: 'MODAL',
    ctaUrl: null,
    category: 'FEATURE',
    priority: 90,
    publishedAt: '2026-02-10T19:17:59.054Z',
  },
  {
    id: 'local-news-multichain',
    title: '⚡ Multi-Chain Arena Rewards',
    description:
      'Epoch rewards now include Solana and BSC views so users can track both allocation sets clearly.',
    content: `# Multi-Chain Rewards

Users can switch between Solana and BSC reward views in the epoch panel.

## Why this matters

- Cleaner chain-specific reward visibility
- Better allocation readability
- Less confusion during active epochs`,
    imageUrl: 'https://via.placeholder.com/1200x400/111827/F0B90B?text=Multi-Chain+Rewards',
    ctaText: 'View Details',
    ctaType: 'MODAL',
    ctaUrl: null,
    category: 'ANNOUNCEMENT',
    priority: 80,
    publishedAt: '2026-02-09T16:00:00.000Z',
  },
];

export default function NewsPanel() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItem | null>(null);
  const [dataSource, setDataSource] = useState<'api' | 'fallback'>('fallback');
  const [showDataSourceInfo, setShowDataSourceInfo] = useState(false);

  // Load features & announcements: backend API (GET /news/feed) → merge with fallback so featured items always appear
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const apiItems = await getNewsFeed(10);
        const list = Array.isArray(apiItems) ? apiItems : [];
        if (!cancelled) {
          const apiIds = new Set(list.map((i) => i.id));
          const merged =
            list.length > 0
              ? [...list, ...FALLBACK_NEWS_ITEMS.filter((f) => !apiIds.has(f.id))]
              : FALLBACK_NEWS_ITEMS;
          setNewsItems(merged);
          setDataSource(list.length > 0 ? 'api' : 'fallback');
        }
      } catch {
        if (!cancelled) {
          setNewsItems(FALLBACK_NEWS_ITEMS);
          setDataSource('fallback');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-rotate every 5 seconds (unless paused)
  useEffect(() => {
    if (newsItems.length === 0 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % newsItems.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [newsItems.length, isPaused]);

  const handleCTAClick = (item: NewsItem) => {
    if (item.ctaType === 'MODAL') {
      setSelectedNewsItem(item);
      setSelectedNewsId(item.id);
    } else if (item.ctaType === 'EXTERNAL_LINK' && item.ctaUrl) {
      window.open(item.ctaUrl, '_blank', 'noopener,noreferrer');
    } else if (item.ctaType === 'INTERNAL_LINK' && item.ctaUrl) {
      window.location.href = item.ctaUrl;
    }
  };

  if (loading) {
    return (
      <div className="bg-[#12121a]/50 backdrop-blur-xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] h-52 max-w-md animate-pulse" />
    );
  }

  if (newsItems.length === 0) {
    return null;
  }

  const currentItem = newsItems[currentIndex];
  // Use fallback for missing or placeholder test URLs (dark-on-dark, invisible)
  const isPlaceholder = !currentItem.imageUrl || currentItem.imageUrl.includes('placeholder');
  const bgImage = isPlaceholder ? FALLBACK_IMAGE : currentItem.imageUrl;

  return (
    <>
      <div className="max-w-md space-y-1">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Features &amp; announcements
          </span>
          <button
            type="button"
            onClick={() => setShowDataSourceInfo((v) => !v)}
            className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-white/5 transition-colors"
            aria-label="Where does this data come from?"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      <div
        className="relative overflow-hidden border border-white/[0.15] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.4)] cursor-pointer transition-all duration-300 hover:border-accent-primary/40 hover:shadow-[inset_0_1px_0_rgba(99,102,241,0.2),0_8px_32px_rgba(99,102,241,0.2)] h-52 max-w-md"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onClick={() => handleCTAClick(currentItem)}
      >
        {/* Background Image with smooth transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
        </AnimatePresence>

        {/* Gradient overlay — keeps text readable without killing the image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        {/* Content + Vertical Dots */}
        <div className="relative z-10 h-full flex">
          {/* Main content */}
          <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 min-w-0">
            {/* Category badge - absolute top-left */}
            <AnimatePresence mode="wait">
              <motion.span
                key={`${currentItem.id}-category`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="absolute top-4 left-4 text-xs font-mono uppercase tracking-wider text-accent-primary bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded border border-accent-primary/20"
              >
                {currentItem.category}
              </motion.span>
            </AnimatePresence>

            {/* Title + Description - centered vertically with dots */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentItem.id}-content`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="mt-8"
              >
                <h3 className="text-sm font-bold text-white drop-shadow-lg line-clamp-1">
                  {currentItem.title}
                </h3>
                {currentItem.description && (
                  <p className="text-xs text-white/70 leading-tight line-clamp-3 drop-shadow mt-1">
                    {currentItem.description}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Bottom: CTA */}
            <AnimatePresence mode="wait">
              <motion.button
                key={`${currentItem.id}-cta`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCTAClick(currentItem);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary hover:bg-accent-primary/90 text-black text-xs font-semibold rounded transition-all shadow-lg hover:shadow-accent-primary/50 w-fit"
              >
                {currentItem.ctaText}
                {currentItem.ctaType === 'EXTERNAL_LINK' ? (
                  <ExternalLink className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </motion.button>
            </AnimatePresence>
          </div>

          {/* Right: Vertical pagination dots with smooth animations */}
          {newsItems.length > 1 && (
            <div className="flex flex-col items-center justify-center gap-1.5 px-3">
              {newsItems.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  animate={{
                    height: index === currentIndex ? 24 : 6,
                    backgroundColor: index === currentIndex ? '#6366f1' : 'rgba(255, 255, 255, 0.3)',
                    scale: index === currentIndex ? 1.1 : 1,
                  }}
                  whileHover={{
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    scale: 1.2
                  }}
                  transition={{
                    duration: 0.3,
                    ease: 'easeInOut'
                  }}
                  className="w-1.5 rounded-full shadow-lg"
                  style={{
                    boxShadow: index === currentIndex ? '0 0 10px rgba(99, 102, 241, 0.5)' : 'none'
                  }}
                  aria-label={`Go to news item ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
      {showDataSourceInfo && (
        <motion.div
          key="data-source-info"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded border border-white/[0.08] bg-black/30 px-3 py-2 text-[11px] text-text-muted overflow-hidden"
        >
          <p className="font-medium text-text-secondary mb-1">Where does this data come from?</p>
          <p className="leading-relaxed">
            Features and announcements are loaded from the <strong>OpenClaw backend API</strong> (
            <code className="text-accent-primary/90">GET /news/feed</code>), which reads published
            items from the <strong>PostgreSQL</strong> <code className="text-accent-primary/90">news_items</code> table.
            When the API is unavailable or returns no items, fallback content is shown here. Admins can add or
            edit items by running the backend seed script (<code className="text-accent-primary/90">bun run scripts/seed-news.ts</code>)
            or updating the database directly.
          </p>
          <p className="mt-1.5 text-white/50">
            Current source: <span className={dataSource === 'api' ? 'text-emerald-400/90' : 'text-amber-400/90'}>{dataSource === 'api' ? 'Backend API' : 'Fallback content'}</span>
          </p>
        </motion.div>
      )}
      </AnimatePresence>

      {selectedNewsId && (
        <NewsModal
          newsId={selectedNewsId}
          initialItem={selectedNewsItem}
          onClose={() => {
            setSelectedNewsId(null);
            setSelectedNewsItem(null);
          }}
        />
      )}
      </div>
    </>
  );
}
