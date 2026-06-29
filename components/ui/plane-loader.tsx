import { Plane } from 'lucide-react';

interface Props {
  phase?: string;
  label?: string;
  description?: string;
}

export default function PlaneLoader({ phase, label, description }: Props) {
  return (
    <div className="flex flex-col items-center gap-5 py-4">
      {/* Outer ring with pulsing dots */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Dashed trail ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64" cy="64" r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="6 8"
            className="text-teal-300/40 dark:text-teal-600/30 animate-trail-dash"
          />
        </svg>

        {/* Connecting route dots */}
        {[0, 72, 144, 216, 288].map((deg, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-teal-400/50 dark:bg-teal-500/50 animate-pulse-dot"
            style={{
              transform: `rotate(${deg}deg) translateX(54px)`,
              transformOrigin: 'center',
            }}
          />
        ))}

        {/* Airplane */}
        <div className="absolute animate-plane-orbit">
          <Plane className="h-6 w-6 text-teal-500 dark:text-teal-400 -rotate-45" />
        </div>

        {/* Center glow */}
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400/20 to-emerald-400/20 animate-ping" />
      </div>

      {/* Label */}
      {label && (
        <div className="text-center">
          <div className="text-sm font-medium text-foreground">{label}</div>
          {description && (
            <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
          )}
        </div>
      )}
    </div>
  );
}