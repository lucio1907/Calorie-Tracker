import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

/** Page title: body font on mobile, display face (Bricolage Grotesque) on desktop. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-12">
      <div className="flex flex-col gap-4">
        <h1 className="text-heading-sm font-semibold text-ink lg:display-text lg:text-heading-lg">{title}</h1>
        {description ? <p className="text-body text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex gap-8">{actions}</div> : null}
    </header>
  );
}
