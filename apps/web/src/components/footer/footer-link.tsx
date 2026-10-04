import Link from 'next/link';
import type { FooterNavItem } from './nav';

export function FooterLink({ item }: { item: FooterNavItem }) {
  if (item.href) {
    return (
      <Link href={item.href} className="footer-link">
        {item.label}
      </Link>
    );
  }

  return (
    <span className="footer-pending">
      {item.label}
      <span className="sr-only"> — coming soon</span>
    </span>
  );
}
