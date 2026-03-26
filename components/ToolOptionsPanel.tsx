export default function ToolOptionsPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="hidden sm:flex w-80 flex-shrink-0 flex-col gap-3 overflow-y-auto min-h-0 pr-1">
      {children}
    </div>
  );
}
