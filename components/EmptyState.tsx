import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon: Icon, title, description, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 p-8 min-h-[160px]"
      style={{ background: '#0A0A0A', borderRadius: 2 }}
    >
      <Icon size={28} style={{ color: '#333' }} />
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: '#444', letterSpacing: 1, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}
      >
        {title}
      </span>
      <p
        className="m-0 text-center whitespace-pre-line"
        style={{ color: '#333', fontSize: 11, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", lineHeight: 1.5 }}
      >
        {description}
      </p>
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="flex items-center justify-center cursor-pointer"
          style={{
            background: '#00E87B',
            border: 'none',
            color: '#0A0A0A',
            fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
            padding: '6px 16px',
            height: 32,
            borderRadius: 2,
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
