import { NavMenu, type NavMenuLink } from "./NavMenu";

function DocumentationIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 2.5h5.5L15 6v10.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 2.5V6H15M7.25 10h5.5M7.25 13h5.5" />
    </svg>
  );
}

function FaqIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.8 7.8a2.2 2.2 0 1 1 3.3 1.9c-.7.45-1.1.8-1.1 1.6v.3" />
      <path strokeLinecap="round" d="M10 14.2h.01" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5v-1a6 6 0 1 1 12 0v1" />
      <rect x="2.5" y="10" width="3.5" height="4.5" rx="1" />
      <rect x="14" y="10" width="3.5" height="4.5" rx="1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 14.5v.8a2 2 0 0 1-2 2h-2.2" />
    </svg>
  );
}

const RESOURCE_LINKS: NavMenuLink[] = [
  {
    title: "Documentation",
    description: "Guides & API reference",
    href: "https://iohaus.gitbook.io/iceburg",
    external: true,
    icon: <DocumentationIcon />,
  },
  {
    title: "FAQs",
    description: "Answers to common questions",
    href: "/faq",
    icon: <FaqIcon />,
  },
  {
    title: "Help and Support",
    description: "Guides, articles & more",
    href: "/help",
    icon: <SupportIcon />,
  },
];

export function ResourcesMenu() {
  return <NavMenu label="Resources" links={RESOURCE_LINKS} />;
}
