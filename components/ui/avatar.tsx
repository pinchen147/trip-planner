interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 28 }: AvatarProps) {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: '#1E1E1E',
        borderRadius: '50%',
        fontFamily: "var(--font-space-grotesk, 'Space Grotesk', sans-serif)",
        fontSize: size * 0.43,
        fontWeight: 600,
        color: '#737373',
      }}
    >
      {initial}
    </div>
  );
}
