import Link from 'next/link';
import { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

export function Cards({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12 not-prose">
      {children}
    </div>
  );
}

export function Card({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02] hover:border-primary/50 transition-all"
    >
      {icon && <div className="w-8 h-8 text-primary mb-4">{icon}</div>}
      <h3 className="font-mono text-lg mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="font-mono text-sm text-foreground/60 mb-4">{description}</p>
      <span className="font-mono text-sm text-primary flex items-center gap-2">
        Learn more <ArrowRight className="w-4 h-4" />
      </span>
    </Link>
  );
}
