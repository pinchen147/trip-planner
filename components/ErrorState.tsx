import { WifiOff, RefreshCw, LogIn } from 'lucide-react';

type ErrorVariant = 'connection-lost' | 'sync-failed' | 'session-expired';

interface ErrorStateProps {
  variant: ErrorVariant;
  onRetry?: () => void;
}

const CONFIG: Record<ErrorVariant, { icon: typeof WifiOff; title: string; description: string; btnLabel: string; color: string }> = {
  'connection-lost': {
    icon: WifiOff,
    title: 'CONNECTION LOST',
    description: 'Unable to reach the server.\nYour changes will sync when reconnected.',
    btnLabel: 'RETRY',
    color: '#FF4444',
  },
  'sync-failed': {
    icon: RefreshCw,
    title: 'SYNC FAILED',
    description: 'Event sources failed to sync.\n3 sources have errors.',
    btnLabel: 'RETRY',
    color: '#FF8800',
  },
  'session-expired': {
    icon: LogIn,
    title: 'SESSION EXPIRED',
    description: 'Your session has expired.\nPlease sign in again to continue.',
    btnLabel: 'SIGN IN',
    color: '#FF4444',
  },
};

export function ErrorState({ variant, onRetry }: ErrorStateProps) {
  const { icon: Icon, title, description, btnLabel, color } = CONFIG[variant];
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 p-8 min-h-[180px]"
      style={{ background: '#0A0A0A', borderRadius: 2 }}
    >
      <Icon size={28} style={{ color }} />
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color, letterSpacing: 1, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}
      >
        {title}
      </span>
      <p
        className="m-0 text-center whitespace-pre-line"
        style={{ color: '#666', fontSize: 11, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", lineHeight: 1.5 }}
      >
        {description}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center justify-center cursor-pointer"
          style={{
            background: variant === 'session-expired' ? '#00E87B' : 'transparent',
            border: variant === 'session-expired' ? 'none' : `1px solid ${color}`,
            color: variant === 'session-expired' ? '#0A0A0A' : color,
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
          {btnLabel}
        </button>
      )}
    </div>
  );
}
