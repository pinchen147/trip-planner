type SkeletonVariant = 'event' | 'spot' | 'planner';

interface SkeletonCardProps {
  variant: SkeletonVariant;
}

export function SkeletonCard({ variant }: SkeletonCardProps) {
  if (variant === 'event') {
    return (
      <div className="flex gap-3 p-3" style={{ background: '#1A1A1A', borderRadius: 2 }}>
        <div className="skeleton-pulse shrink-0" style={{ width: 48, height: 48, borderRadius: 2 }} />
        <div className="flex-1 flex flex-col gap-2">
          <div className="skeleton-pulse" style={{ width: '70%', height: 12, borderRadius: 2 }} />
          <div className="skeleton-pulse" style={{ width: '50%', height: 10, borderRadius: 2 }} />
        </div>
        <div className="skeleton-pulse shrink-0" style={{ width: 60, height: 24, borderRadius: 2 }} />
      </div>
    );
  }

  if (variant === 'planner') {
    return (
      <div className="flex flex-col gap-1 p-2" style={{ background: '#1A1A1A', borderRadius: 2 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2 h-5">
            <div className="skeleton-pulse" style={{ width: 40, borderRadius: 2 }} />
            <div className="skeleton-pulse flex-1" style={{ borderRadius: 2 }} />
          </div>
        ))}
      </div>
    );
  }

  // spot
  return (
    <div className="flex gap-3 p-3" style={{ background: '#1A1A1A', borderRadius: 2 }}>
      <div className="skeleton-pulse shrink-0" style={{ width: 40, height: 40, borderRadius: 2 }} />
      <div className="flex-1 flex flex-col gap-2">
        <div className="skeleton-pulse" style={{ width: '60%', height: 12, borderRadius: 2 }} />
        <div className="skeleton-pulse" style={{ width: '40%', height: 10, borderRadius: 2 }} />
      </div>
      <div className="flex gap-1">
        <div className="skeleton-pulse" style={{ width: 32, height: 18, borderRadius: 2 }} />
        <div className="skeleton-pulse" style={{ width: 32, height: 18, borderRadius: 2 }} />
      </div>
    </div>
  );
}
