export function ProjectSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-16 bg-muted rounded-lg animate-pulse"
        ></div>
      ))}
    </div>
  );
}