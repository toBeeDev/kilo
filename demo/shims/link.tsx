import { hashFromPath } from "./navigation";

export default function Link({
  href,
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a href={hashFromPath(String(href))} {...rest}>
      {children}
    </a>
  );
}
