type IconProps = { className?: string };

export function YouTubeLogo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#FF0000"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
      />
      <path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export function InstagramLogo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FED576" />
          <stop offset="30%" stopColor="#F47133" />
          <stop offset="60%" stopColor="#BC3081" />
          <stop offset="100%" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig-grad)" />
      <circle
        cx="12"
        cy="12"
        r="4.2"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
      />
      <circle cx="17.4" cy="6.6" r="1.2" fill="#fff" />
    </svg>
  );
}

export function TikTokLogo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#25F4EE"
        d="M16.78 2H13.5v13.42a2.66 2.66 0 1 1-2.66-2.66c.18 0 .35.02.52.05V9.45A6.21 6.21 0 0 0 4 15.5a6.21 6.21 0 1 0 12.42 0V8.07a8 8 0 0 0 4.66 1.5V6.31a4.79 4.79 0 0 1-4.3-4.31z"
        transform="translate(-1 -0.6)"
      />
      <path
        fill="#FE2C55"
        d="M17.78 1.4H14.5v13.42a2.66 2.66 0 1 1-2.66-2.66c.18 0 .35.02.52.05V8.85A6.21 6.21 0 0 0 5 14.9a6.21 6.21 0 1 0 12.42 0V7.47a8 8 0 0 0 4.66 1.5V5.71a4.79 4.79 0 0 1-4.3-4.31z"
        transform="translate(1 0.6)"
      />
      <path
        fill="#000"
        d="M17.28 1.7H14v13.42a2.66 2.66 0 1 1-2.66-2.66c.18 0 .35.02.52.05V9.15a6.21 6.21 0 1 0 5.58 7.61V7.77a8 8 0 0 0 4.66 1.5V6.01a4.79 4.79 0 0 1-4.3-4.31z"
      />
    </svg>
  );
}
