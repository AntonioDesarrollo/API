import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function base(props: P, children: React.ReactNode, filled = false) {
  const { size = 24, ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={filled ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const ChevronRight = (p: P) => base(p, <path d="M9 6l6 6-6 6" />);
export const ChevronLeft = (p: P) => base(p, <path d="M15 6l-6 6 6 6" />);
export const ChevronDown = (p: P) => base(p, <path d="M6 9l6 6 6-6" />);
export const Plus = (p: P) => base(p, <path d="M12 5v14M5 12h14" />);
export const Close = (p: P) => base(p, <path d="M6 6l12 12M18 6L6 18" />);
export const Check = (p: P) => base(p, <path d="M5 12l5 5L20 7" />);
export const Trash = (p: P) => base(p, <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />);
export const Gear = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>,
  );
export const Pencil = (p: P) => base(p, <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />);

// Tab icons (filled, SF-like)
export const HomeIcon = (p: P) =>
  base(p, <path d="M12 2.6 2.5 10.8a1 1 0 0 0 .65 1.75H4.5V20a1.5 1.5 0 0 0 1.5 1.5h3.5V15a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6.5H18a1.5 1.5 0 0 0 1.5-1.5v-7.45h1.35a1 1 0 0 0 .65-1.75L12 2.6z" />, true);
export const ListIcon = (p: P) =>
  base(
    p,
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M7 9h10M7 12.5h10M7 16h6" stroke="var(--bg)" strokeWidth="1.8" strokeLinecap="round" />
    </>,
    true,
  );
export const CardIcon = (p: P) =>
  base(
    p,
    <>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <rect x="2" y="8.5" width="20" height="3" fill="var(--bg)" opacity="0.9" />
      <rect x="5" y="14" width="6" height="2" rx="1" fill="var(--bg)" opacity="0.9" />
    </>,
    true,
  );
export const DebtIcon = (p: P) =>
  base(
    p,
    <>
      <rect x="2" y="6" width="20" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="3" fill="var(--bg)" />
      <circle cx="6" cy="12" r="1" fill="var(--bg)" />
      <circle cx="18" cy="12" r="1" fill="var(--bg)" />
    </>,
    true,
  );
export const PlanIcon = (p: P) =>
  base(
    p,
    <>
      <path d="M12 2.5a9.5 9.5 0 1 0 9.5 9.5H12V2.5z" />
      <path d="M14 1.8a9.5 9.5 0 0 1 8.2 8.2H14V1.8z" opacity="0.55" />
    </>,
    true,
  );
export const PiggyIcon = (p: P) =>
  base(p, <path d="M19 10.5V9a1 1 0 0 0-1-1h-1.3a6 6 0 0 0-10.2-1L5 7v3H3.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5H5a6 6 0 0 0 2 2.7V19a1 1 0 0 0 1 1h1.5a1 1 0 0 0 1-1v-1h3v1a1 1 0 0 0 1 1H16a1 1 0 0 0 1-1v-2.3A6 6 0 0 0 19 14h1.5a.5.5 0 0 0 .5-.5v-2.5a.5.5 0 0 0-.5-.5H19zM9 10.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />, true);
