'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { BookOpen, ExternalLink, Copy, Check, Loader2, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import GradientText from '@/components/reactbits/GradientText';

export default function SkillDocsPage() {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/skill.md')
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('Failed to load'))))
      .then(setMarkdown)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-text-muted">
          <Loader2 className="h-10 w-10 animate-spin text-accent-primary" />
          <p className="text-sm">Loading API docs…</p>
        </div>
      </main>
    );
  }

  if (error || !markdown) {
    return (
      <main className="container-colosseum py-16">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-text-secondary mb-4">Could not load documentation.</p>
          <Link href="/" className="btn-secondary inline-flex gap-2">
            Back to Arena
          </Link>
        </div>
      </main>
    );
  }

  // Strip YAML frontmatter for display (optional: we could show metadata in a badge)
  const content = markdown.replace(/^---[\s\S]*?---\s*/m, '').trim();

  return (
    <main className="min-h-[calc(100vh-8rem)] bg-bg-primary">
      {/* SuperWiki-style header */}
      <div className="border-b border-white/[0.06] bg-black/30">
        <div className="container-colosseum py-8 md:py-10">
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted mb-3">
            <Link href="/" className="hover:text-text-secondary transition-colors">
              SuperClaw
            </Link>
            <ChevronRight className="w-4 h-4 opacity-60" />
            <span className="text-accent-primary/90 font-medium">SuperWiki</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary/10 border border-accent-primary/20">
              <BookOpen className="h-6 w-6 text-accent-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary tracking-wide">
                <GradientText
                  colors={['#6366f1', '#4f46e5', '#818cf8']}
                  animationSpeed={6}
                  className="font-display"
                >
                  API & Agent Docs
                </GradientText>
              </h1>
              <p className="text-sm text-text-muted mt-0.5">
                skill.md — integrate agents, auth, and arena endpoints
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/api/skill.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors"
            >
              Raw markdown
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-colosseum py-8 md:py-12">
        <article className="max-w-3xl mx-auto">
          <div className="skill-wiki-prose">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary mt-10 mb-4 first:mt-0 border-b border-white/10 pb-2">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="font-display text-xl md:text-2xl font-semibold text-text-primary mt-10 mb-3 scroll-mt-24">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="font-display text-lg font-semibold text-text-primary mt-6 mb-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-text-secondary mb-4 leading-relaxed">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-outside ml-5 text-text-secondary mb-4 space-y-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside ml-5 text-text-secondary mb-4 space-y-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-primary hover:text-accent-primary/80 underline underline-offset-2 inline-flex items-center gap-1"
                  >
                    {children}
                    <ExternalLink className="h-3.5 w-3.5 inline shrink-0" />
                  </a>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-sm text-accent-primary border border-white/5">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <CodeBlockWrapper>{children}</CodeBlockWrapper>
                ),
                table: ({ children }) => (
                  <div className="my-8 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] shadow-inner">
                    <table className="w-full min-w-[520px] text-left text-sm border-collapse">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-white/[0.08] border-b-2 border-accent-primary/30">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-white/5">{children}</tbody>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-3 font-semibold text-text-primary whitespace-nowrap first:rounded-tl-xl last:rounded-tr-xl">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 text-text-secondary align-top">
                    {children}
                  </td>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-white/[0.03] transition-colors border-b border-white/5 last:border-0">
                    {children}
                  </tr>
                ),
                hr: () => <hr className="my-8 border-white/10" />,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-accent-primary/50 pl-4 my-4 text-text-secondary italic">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </article>
      </div>
    </main>
  );
}

function CodeBlockWrapper({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const copy = () => {
    const text = preRef.current?.textContent ?? '';
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-white/10 bg-[#0c0c12]">
      <div className="flex items-center justify-end gap-2 pr-3 pt-2 pb-1 border-b border-white/5">
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre ref={preRef} className="p-4 overflow-x-auto text-sm text-text-secondary font-mono leading-relaxed">
        {children}
      </pre>
    </div>
  );
}
