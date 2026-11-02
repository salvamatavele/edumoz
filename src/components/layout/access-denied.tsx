export function AccessDenied({ message }: { readonly message: string }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <p role="alert" className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
