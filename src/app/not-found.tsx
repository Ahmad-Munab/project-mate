import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="space-y-6 max-w-md">
        <h1 className="text-6xl font-bold text-slate-900 dark:text-white">404</h1>
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">
          Page Not Found
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="pt-4">
          <Button asChild>
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
