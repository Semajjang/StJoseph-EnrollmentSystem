interface StepHeadingProps {
  title: string;
  description: string;
}

/** Consistent title block at the top of each wizard step's card. */
export function StepHeading({ title, description }: StepHeadingProps) {
  return (
    <div className="border-b border-line pb-4">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}
