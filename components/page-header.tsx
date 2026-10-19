type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

// The heading every page in the dashboard starts with, so the pages look the same.
export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      {eyebrow && (
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>
      )}
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
    </div>
  );
}
