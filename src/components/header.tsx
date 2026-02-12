import { Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">StageAI</h1>
        </div>
        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
          Beta
        </span>
        <p className="ml-auto text-sm text-muted-foreground">
          AI-Powered Real Estate Photo Staging
        </p>
      </div>
    </header>
  );
}
