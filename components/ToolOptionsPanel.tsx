export default function ToolOptionsPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
      {children}
    </div>
  );
}
