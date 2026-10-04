import type { ReactNode } from 'react';

type AboutRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'header' | 'li';
};

export function AboutReveal({
  children,
  className,
  delay = 0,
  as = 'div',
}: AboutRevealProps) {
  const Tag = as;
  const classes = ['about-reveal', className].filter(Boolean).join(' ');

  return (
    <Tag
      className={classes}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  );
}
