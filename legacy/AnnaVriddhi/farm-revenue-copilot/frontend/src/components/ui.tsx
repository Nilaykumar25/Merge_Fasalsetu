import { C, shadow, radius } from "../tokens";

// ── Badge ──────────────────────────────────────────────────────────────────────
export function Badge({
  children,
  color = C.sage,
  bg,
  size = "md",
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: { fontSize: 10, padding: "3px 8px" }, md: { fontSize: 11, padding: "4px 10px" }, lg: { fontSize: 12, padding: "6px 14px" } };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: radius.full,
        fontWeight: 600,
        color,
        background: bg ?? `${color}15`,
        letterSpacing: "0.03em",
        ...sizes[size],
      }}
    >
      {children}
    </span>
  );
}

// ── IconBadge ─────────────────────────────────────────────────────────────────
export function IconBadge({
  children,
  bg,
  size = 48,
  borderRadius,
}: {
  children: React.ReactNode;
  bg: string;
  size?: number;
  borderRadius?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: borderRadius ?? size * 0.28,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.44,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({
  children,
  style,
  hover = true,
  onClick,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  hover?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.surface,
        borderRadius: radius.xl,
        border: `1px solid ${C.line}`,
        boxShadow: shadow.card,
        padding: "24px",
        transition: hover ? "all 0.2s" : undefined,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
      onMouseEnter={
        hover
          ? (e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = shadow.cardHover;
              if (onClick) el.style.transform = "translateY(-2px)";
            }
          : undefined
      }
      onMouseLeave={
        hover
          ? (e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = shadow.card;
              el.style.transform = "none";
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({
  children,
  variant = "primary",
  onClick,
  fullWidth,
  size = "md",
  disabled = false,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  onClick?: () => void;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: C.sage, color: "#fff", border: "none", boxShadow: shadow.btn },
    secondary: { background: C.surface, color: C.ink, border: `1.5px solid ${C.line}` },
    ghost: { background: "transparent", color: C.sage, border: `1.5px solid ${C.sage}` },
    danger: { background: C.rust, color: "#fff", border: "none" },
  };
  const sizes = {
    sm: { padding: "7px 14px", fontSize: 12 },
    md: { padding: "9px 18px", fontSize: 13 },
    lg: { padding: "12px 24px", fontSize: 14 },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: radius.full,
        fontWeight: 600,
        fontFamily: "var(--font-body)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        width: fullWidth ? "100%" : undefined,
        opacity: disabled ? 0.5 : 1,
        ...styles[variant],
        ...sizes[size],
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const el = e.currentTarget as HTMLElement;
        el.style.opacity = "0.88";
        el.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        const el = e.currentTarget as HTMLElement;
        el.style.opacity = "1";
        el.style.transform = "none";
      }}
    >
      {children}
    </button>
  );
}

// ── GaugeBar ──────────────────────────────────────────────────────────────────
export function GaugeBar({
  value,
  label,
  color = C.sage,
  showValue = true,
}: {
  value: number;
  label: string;
  color?: string;
  showValue?: boolean;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        {showValue && <span style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>{value}%</span>}
      </div>
      <div style={{ height: 8, borderRadius: radius.full, background: C.line, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            borderRadius: radius.full,
            background: `linear-gradient(90deg, ${color}88 0%, ${color} 100%)`,
            transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}

// ── CircularGauge ─────────────────────────────────────────────────────────────
export function CircularGauge({
  value,
  max = 100,
  label,
  unit = "%",
  color = C.sage,
  size = 160,
}: {
  value: number;
  max?: number;
  label: string;
  unit?: string;
  color?: string;
  size?: number;
}) {
  const stroke = size * 0.1;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = value / max;
  const dash = pct * circ * 0.75;
  const gap = circ - dash;
  const rotation = 135;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: `rotate(${rotation}deg)` }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.line} strokeWidth={stroke} strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap + circ * 0.25}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontSize: size * 0.22, fontWeight: 800, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {value}
            <span style={{ fontSize: size * 0.13, fontWeight: 600, color: C.inkMuted }}>{unit}</span>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.inkMuted, textAlign: "center" }}>{label}</div>
    </div>
  );
}

// ── Sparkline SVG ─────────────────────────────────────────────────────────────
export function Sparkline({
  data,
  color = C.sage,
  height = 60,
  width = "100%",
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number | string;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.length;
  const viewW = 300;
  const pad = 4;
  const points = data
    .map((v, i) => {
      const x = pad + (i / (pts - 1)) * (viewW - pad * 2);
      const y = pad + ((max - v) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
  const areaClose = `${pad + ((pts - 1) / (pts - 1)) * (viewW - pad * 2)},${height} ${pad},${height}`;

  return (
    <svg viewBox={`0 0 ${viewW} ${height}`} style={{ width, height, display: "block" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${points} ${areaClose}`} fill={`url(#sg-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  onBack,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  back?: string;
  onBack?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 28,
        gap: 16,
      }}
    >
      <div>
        {back && onBack && (
          <button
            onClick={onBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: C.inkMuted,
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginBottom: 8,
              fontFamily: "var(--font-body)",
            }}
          >
            ← {back}
          </button>
        )}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 700,
            color: C.sageDeep,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: C.inkMuted, marginTop: 4, margin: 0 }}>{subtitle}</p>
        )}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

// ── StatTile ──────────────────────────────────────────────────────────────────
export function StatTile({
  icon,
  iconBg,
  label,
  value,
  sub,
  color,
}: {
  icon: string;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <IconBadge bg={iconBg} size={44}>{icon}</IconBadge>
        <div>
          <div style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: color ?? C.ink, letterSpacing: "-0.025em", lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 4 }}>{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

// ── SectionLabel ──────────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: C.inkMuted,
        marginBottom: 12,
        marginTop: 4,
      }}
    >
      {children}
    </div>
  );
}
