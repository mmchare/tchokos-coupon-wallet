import { useMemo } from 'react';
import { MapPin } from 'lucide-react';

interface OrderShippingMapProps {
  logisticsStep: number;
  status: string;
}

const OrderShippingMap = ({ logisticsStep, status }: OrderShippingMapProps) => {
  // Key points on the route: China (Guangzhou) → Indian Ocean → East Africa → Cameroon (Douala)
  const points = useMemo(() => [
    { x: 82, y: 28, label: 'Guangzhou', flag: '🇨🇳' },
    { x: 68, y: 42, label: 'Singapour', flag: '' },
    { x: 45, y: 48, label: 'Océan Indien', flag: '' },
    { x: 28, y: 45, label: 'Djibouti', flag: '' },
    { x: 18, y: 52, label: 'Douala', flag: '🇨🇲' },
  ], []);

  // Path as SVG curve through the points
  const pathD = `M ${points[0].x} ${points[0].y} C ${points[1].x} ${points[1].y + 10}, ${points[2].x} ${points[2].y + 5}, ${points[3].x} ${points[3].y} Q ${points[3].x - 5} ${points[3].y + 4}, ${points[4].x} ${points[4].y}`;

  // Map logistics step to progress percentage
  const progressMap: Record<number, number> = {
    1: 0.05,   // Confirmed - at origin
    2: 0.15,   // Preparing in China
    3: 0.55,   // International shipping - mid route
    4: 0.95,   // Local delivery - near destination
  };
  const progress = status === 'delivered' ? 1 : (progressMap[logisticsStep] ?? 0.05);

  if (status === 'cancelled') return null;

  const stepLabels: Record<number, string> = {
    1: 'En attente à Guangzhou',
    2: 'Préparation en cours',
    3: 'En transit maritime',
    4: 'Arrivée au Cameroun',
  };

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MapPin className="h-4 w-4 text-primary" />
        <span>Suivi géographique</span>
        {status === 'delivered' && (
          <span className="text-xs text-green-600 ml-auto font-semibold">✓ Livré</span>
        )}
      </div>

      <svg
        viewBox="0 0 100 70"
        className="w-full h-auto rounded-lg overflow-hidden"
        style={{ background: 'hsl(var(--background))' }}
      >
        {/* Simplified world map background shapes */}
        {/* Africa */}
        <path
          d="M10,30 L25,25 L30,30 L32,40 L28,55 L22,60 L15,55 L10,45 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="0.3"
        />
        {/* Europe */}
        <path
          d="M20,15 L35,12 L40,18 L35,25 L25,25 L20,20 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="0.3"
        />
        {/* Asia */}
        <path
          d="M40,10 L90,8 L95,25 L85,35 L70,30 L55,32 L45,28 L40,18 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="0.3"
        />
        {/* Southeast Asia / Islands */}
        <path
          d="M72,35 L80,38 L85,42 L78,45 L72,40 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="0.3"
        />
        {/* Middle East */}
        <path
          d="M35,25 L45,28 L42,35 L35,38 L30,32 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="0.3"
        />

        {/* Water pattern dots */}
        {[...Array(12)].map((_, i) => (
          <circle
            key={i}
            cx={20 + (i % 4) * 18}
            cy={45 + Math.floor(i / 4) * 8}
            r="0.3"
            fill="hsl(var(--primary) / 0.15)"
          />
        ))}

        {/* Route path - background */}
        <path
          d={pathD}
          fill="none"
          stroke="hsl(var(--primary) / 0.2)"
          strokeWidth="0.8"
          strokeDasharray="2 1.5"
        />

        {/* Route path - progress */}
        <path
          d={pathD}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={1 - progress}
          className="transition-all duration-1000 ease-in-out"
        />

        {/* Waypoint dots */}
        {points.map((point, i) => {
          const pointProgress = i / (points.length - 1);
          const isReached = pointProgress <= progress;
          const isCurrent = i === Math.round(progress * (points.length - 1));
          return (
            <g key={i}>
              {isCurrent && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="2.5"
                  fill="hsl(var(--primary) / 0.2)"
                  className="animate-ping"
                  style={{ transformOrigin: `${point.x}px ${point.y}px`, animationDuration: '2s' }}
                />
              )}
              <circle
                cx={point.x}
                cy={point.y}
                r={isCurrent ? 1.8 : 1.2}
                fill={isReached ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.4)'}
                stroke={isCurrent ? 'hsl(var(--primary-foreground))' : 'none'}
                strokeWidth="0.4"
              />
            </g>
          );
        })}

        {/* Origin label */}
        <text x={points[0].x} y={points[0].y - 3} textAnchor="middle" fontSize="3" fill="hsl(var(--foreground))" fontWeight="600">
          🇨🇳 Chine
        </text>

        {/* Destination label */}
        <text x={points[4].x} y={points[4].y - 3} textAnchor="middle" fontSize="3" fill="hsl(var(--foreground))" fontWeight="600">
          🇨🇲 Cameroun
        </text>

        {/* Ship icon for in-transit */}
        {logisticsStep === 3 && (
          <text
            x={points[2].x}
            y={points[2].y - 3}
            textAnchor="middle"
            fontSize="4"
            className="animate-bounce"
            style={{ animationDuration: '3s' }}
          >
            🚢
          </text>
        )}
      </svg>

      <p className="text-xs text-muted-foreground text-center">
        {status === 'delivered' ? 'Colis livré avec succès !' : stepLabels[logisticsStep] || 'Traitement en cours'}
      </p>
    </div>
  );
};

export default OrderShippingMap;
