interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="space-y-1">
      {eyebrow && (
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {eyebrow}
        </p>
      )}
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {description && <p className="text-sm text-muted-foreground sm:text-base">{description}</p>}
    </div>
  );
}
