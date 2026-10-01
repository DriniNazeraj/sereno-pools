/** PLACEHOLDER business details — replace when Drini confirms real info. */
export const SITE = {
  name: "Sereno Pools",
  /** From VITE_SITE_URL (.env); the single source of the site URL. */
  url: (import.meta.env.VITE_SITE_URL ?? "").replace(/\/$/, ""),
  phone: "(512) 555-0142",
  phoneHref: "tel:+15125550142",
  email: "hello@serenopools.com",
  street: "1100 Placeholder Ave, Suite 200",
  city: "Austin",
  region: "TX",
  zip: "78701",
};

export const NAV = [
  { href: "#process", label: "Projects" },
  { href: "#gallery", label: "Gallery" },
  { href: "#services", label: "Services" },
  { href: "#reviews", label: "Reviews" },
];
