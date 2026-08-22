export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 h-full p-8 text-center">
      <h1 className="text-4xl font-black text-foreground mb-2 tracking-tighter">404</h1>
      <p className="text-lg font-medium text-muted-foreground">Coordinates unmapped. Sector invalid.</p>
    </div>
  );
}
