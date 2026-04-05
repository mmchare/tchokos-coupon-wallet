import { useMemo, useState } from 'react';
import { MapPin, Ship, Plane } from 'lucide-react';

interface OrderShippingMapProps {
  logisticsStep: number;
  status: string;
  shippingMode?: 'sea' | 'air';
}

interface RoutePoint {
  x: number;
  y: number;
  label: string;
  port: string;
  flag: string;
  desc: string;
}

const OrderShippingMap = ({ logisticsStep, status, shippingMode = 'sea' }: OrderShippingMapProps) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const seaPoints: RoutePoint[] = useMemo(() => [
    { x: 82, y: 28, label: 'Guangzhou', port: 'Port de Nansha', flag: '🇨🇳', desc: 'Point de départ — Chine' },
    { x: 68, y: 42, label: 'Singapour', port: 'Port de Singapour', flag: '🇸🇬', desc: 'Escale de transbordement' },
    { x: 45, y: 48, label: 'Colombo', port: 'Port de Colombo', flag: '🇱🇰', desc: 'Traversée Océan Indien' },
    { x: 28, y: 42, label: 'Djibouti', port: 'Port de Djibouti', flag: '🇩🇯', desc: 'Entrée Mer Rouge' },
    { x: 18, y: 52, label: 'Douala', port: 'Port Autonome', flag: '🇨🇲', desc: 'Destination finale' },
  ], []);

  const airPoints: RoutePoint[] = useMemo(() => [
    { x: 82, y: 28, label: 'Guangzhou', port: 'Aéroport Baiyun', flag: '🇨🇳', desc: 'Point de départ — Chine' },
    { x: 50, y: 22, label: 'En vol', port: 'Vol direct', flag: '✈️', desc: 'Survol Asie-Afrique' },
    { x: 18, y: 52, label: 'Douala', port: 'Aéroport Int. de Douala', flag: '🇨🇲', desc: 'Destination finale' },
  ], []);

  const points = shippingMode === 'air' ? airPoints : seaPoints;

  const seaPathD = `M ${seaPoints[0].x} ${seaPoints[0].y} C ${seaPoints[1].x} ${seaPoints[1].y + 10}, ${seaPoints[2].x} ${seaPoints[2].y + 5}, ${seaPoints[3].x} ${seaPoints[3].y} Q ${seaPoints[3].x - 5} ${seaPoints[3].y + 4}, ${seaPoints[4].x} ${seaPoints[4].y}`;
  const airPathD = `M ${airPoints[0].x} ${airPoints[0].y} Q ${airPoints[1].x} ${airPoints[1].y - 8}, ${airPoints[2].x} ${airPoints[2].y}`;
  const pathD = shippingMode === 'air' ? airPathD : seaPathD;

  const progressMap: Record<number, number> = shippingMode === 'air'
    ? { 1: 0.05, 2: 0.15, 3: 0.6, 4: 0.95 }
    : { 1: 0.05, 2: 0.15, 3: 0.55, 4: 0.95 };
  const progress = status === 'delivered' ? 1 : (progressMap[logisticsStep] ?? 0.05);

  if (status === 'cancelled') return null;

  const stepLabels: Record<number, string> = shippingMode === 'air'
    ? { 1: 'En attente à Guangzhou', 2: 'Préparation en cours', 3: 'En vol vers le Cameroun', 4: 'Arrivée au Cameroun' }
    : { 1: 'En attente à Guangzhou', 2: 'Préparation en cours', 3: 'En transit maritime', 4: 'Arrivée au Cameroun' };

  const getTooltipX = (point: RoutePoint, i: number) => {
    if (i === 0) return point.x + 2;
    if (i === points.length - 1) return point.x - 2;
    return point.x;
  };

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MapPin className="h-4 w-4 text-primary" />
        <span>Suivi géographique</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          {shippingMode === 'air' ? (
            <><Plane className="h-3 w-3" /> Avion</>
          ) : (
            <><Ship className="h-3 w-3" /> Bateau</>
          )}
        </span>
        {status === 'delivered' && (
          <span className="text-xs text-green-600 font-semibold">✓ Livré</span>
        )}
      </div>

      <svg
        viewBox="0 0 100 70"
        className="w-full h-auto rounded-lg overflow-visible"
        style={{ background: 'hsl(var(--background))' }}
      >
        {/* Simplified continent shapes */}
        <path d="M10,30 L25,25 L30,30 L32,40 L28,55 L22,60 L15,55 L10,45 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.3" />
        <path d="M20,15 L35,12 L40,18 L35,25 L25,25 L20,20 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.3" />
        <path d="M40,10 L90,8 L95,25 L85,35 L70,30 L55,32 L45,28 L40,18 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.3" />
        <path d="M72,35 L80,38 L85,42 L78,45 L72,40 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.3" />
        <path d="M35,25 L45,28 L42,35 L35,38 L30,32 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.3" />

        {/* Water dots */}
        {[...Array(12)].map((_, i) => (
          <circle key={i} cx={20 + (i % 4) * 18} cy={45 + Math.floor(i / 4) * 8} r="0.3" fill="hsl(var(--primary) / 0.15)" />
        ))}

        {/* Route background */}
        <path d={pathD} fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="0.8" strokeDasharray={shippingMode === 'air' ? '1.5 1' : '2 1.5'} />

        {/* Route progress */}
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

        {/* Port labels */}
        {points.map((point, i) => {
          const isFirst = i === 0;
          const isLast = i === points.length - 1;
          const labelY = isFirst || isLast ? point.y - 4 : point.y + 5.5;
          return (
            <text
              key={`label-${i}`}
              x={point.x}
              y={labelY}
              textAnchor="middle"
              fontSize="2.2"
              fill="hsl(var(--muted-foreground))"
              fontWeight="500"
            >
              {point.flag} {point.label}
            </text>
          );
        })}

        {/* Waypoint dots + hover zones */}
        {points.map((point, i) => {
          const pointProgress = i / (points.length - 1);
          const isReached = pointProgress <= progress;
          const isCurrent = i === Math.round(progress * (points.length - 1));
          const isHovered = hoveredPoint === i;
          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredPoint(i)}
              onMouseLeave={() => setHoveredPoint(null)}
              onTouchStart={() => setHoveredPoint(i)}
              onTouchEnd={() => setTimeout(() => setHoveredPoint(null), 2000)}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={point.x} cy={point.y} r="4" fill="transparent" />
              {isCurrent && (
                <circle
                  cx={point.x} cy={point.y} r="2.5"
                  fill="hsl(var(--primary) / 0.2)"
                  className="animate-ping"
                  style={{ transformOrigin: `${point.x}px ${point.y}px`, animationDuration: '2s' }}
                />
              )}
              <circle
                cx={point.x} cy={point.y}
                r={isHovered ? 2.2 : isCurrent ? 1.8 : 1.2}
                fill={isReached ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.4)'}
                stroke={isCurrent || isHovered ? 'hsl(var(--primary-foreground))' : 'none'}
                strokeWidth="0.4"
                className="transition-all duration-200"
              />

              {isHovered && (
                <g>
                  <rect
                    x={getTooltipX(point, i) - (i === 0 ? 0 : i === points.length - 1 ? 22 : 11)}
                    y={point.y - 14}
                    width="22"
                    height="8"
                    rx="1.2"
                    fill="hsl(var(--popover))"
                    stroke="hsl(var(--border))"
                    strokeWidth="0.3"
                    filter="drop-shadow(0 0.5px 1px rgba(0,0,0,0.15))"
                  />
                  <text
                    x={getTooltipX(point, i) + (i === 0 ? 11 : i === points.length - 1 ? -11 : 0)}
                    y={point.y - 10.5}
                    textAnchor="middle"
                    fontSize="2"
                    fontWeight="600"
                    fill="hsl(var(--foreground))"
                  >
                    {point.port}
                  </text>
                  <text
                    x={getTooltipX(point, i) + (i === 0 ? 11 : i === points.length - 1 ? -11 : 0)}
                    y={point.y - 7.8}
                    textAnchor="middle"
                    fontSize="1.8"
                    fill="hsl(var(--muted-foreground))"
                  >
                    {point.desc}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Transport icon */}
        {logisticsStep === 3 && shippingMode === 'sea' && (
          <text x={seaPoints[2].x} y={seaPoints[2].y - 7} textAnchor="middle" fontSize="4" className="animate-bounce" style={{ animationDuration: '3s' }}>
            🚢
          </text>
        )}
        {logisticsStep === 3 && shippingMode === 'air' && (
          <text x={airPoints[1].x} y={airPoints[1].y - 5} textAnchor="middle" fontSize="4" className="animate-bounce" style={{ animationDuration: '2s' }}>
            ✈️
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
