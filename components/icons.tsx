// Небольшой набор инлайн-SVG иконок — без внешней библиотеки.
type IconProps = { className?: string };

function base(path: React.ReactNode, props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className ?? "h-4 w-4"}
    >
      {path}
    </svg>
  );
}

export const GridIcon = (p: IconProps) =>
  base(
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>,
    p
  );

export const CalendarIcon = (p: IconProps) =>
  base(
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </>,
    p
  );

export const DocIcon = (p: IconProps) =>
  base(
    <>
      <path d="M6 2.5h9l3 3v16H6z" />
      <path d="M14.5 2.5v3.5H18M9 12h6M9 15.5h6M9 8.5h3" />
    </>,
    p
  );

export const LightbulbIcon = (p: IconProps) =>
  base(
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.6 1 1.3 1 2.1v.3h6v-.3c0-.8.3-1.5 1-2.1A6.5 6.5 0 0 0 12 2.5Z" />
    </>,
    p
  );

export const GearIcon = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.4M12 18.1v2.4M4.9 6.5l1.9 1.4M17.2 16.1l1.9 1.4M3.5 12h2.4M18.1 12h2.4M4.9 17.5l1.9-1.4M17.2 7.9l1.9-1.4" />
    </>,
    p
  );

export const SearchIcon = (p: IconProps) =>
  base(
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </>,
    p
  );

export const BellIcon = (p: IconProps) =>
  base(
    <>
      <path d="M6 9.5a6 6 0 1 1 12 0c0 4 1.5 5 1.5 5H4.5s1.5-1 1.5-5Z" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
    </>,
    p
  );

export const ChevronDownIcon = (p: IconProps) => base(<path d="M6 9l6 6 6-6" />, p);
export const ChevronRightIcon = (p: IconProps) => base(<path d="M9 6l6 6-6 6" />, p);

export const PlusIcon = (p: IconProps) => base(<path d="M12 5v14M5 12h14" />, p);

export const LockIcon = (p: IconProps) =>
  base(
    <>
      <rect x="5" y="10.5" width="14" height="9" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>,
    p
  );

export const CheckCircleIcon = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.3 2.3L16 10" />
    </>,
    p
  );

export const PersonIcon = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="8" r="3.3" />
      <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" />
    </>,
    p
  );

export const UsersIcon = (p: IconProps) =>
  base(
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3.2 2.7-5.3 6-5.3s6 2.1 6 5.3" />
      <circle cx="17.2" cy="9" r="2.4" />
      <path d="M15.5 13.8c2.6.3 4.5 2 4.5 4.7" />
    </>,
    p
  );

export const ShieldIcon = (p: IconProps) =>
  base(<path d="M12 3l7 3v5.5c0 4.3-3 7.7-7 8.9-4-1.2-7-4.6-7-8.9V6z" />, p);

export const MegaphoneIcon = (p: IconProps) =>
  base(
    <>
      <path d="M3 10v4a1.5 1.5 0 0 0 1.5 1.5H6l1 5 2-.5-.8-4.5 8.3 3V6.5l-8.3 3H4.5A1.5 1.5 0 0 0 3 10Z" />
    </>,
    p
  );

export const MapPinIcon = (p: IconProps) =>
  base(
    <>
      <path d="M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </>,
    p
  );

export const CameraIcon = (p: IconProps) =>
  base(
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.3" />
    </>,
    p
  );
