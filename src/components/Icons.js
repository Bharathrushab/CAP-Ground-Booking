const base = {
  className: "icon",
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

export const ClockIcon = () => (
  <svg {...base}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M8 4.75V8l2.25 1.5" />
  </svg>
);

export const AlertIcon = () => (
  <svg {...base}>
    <path d="M8 2.25 14.25 13.25H1.75Z" />
    <path d="M8 6.5v3" />
    <path d="M8 11.5v.01" />
  </svg>
);

export const CheckIcon = () => (
  <svg {...base}>
    <path d="M3 8.5 6.5 12 13 4.5" />
  </svg>
);
