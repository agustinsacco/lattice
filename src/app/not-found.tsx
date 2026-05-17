import Link from "next/link";
import { Button } from "@/client/components/ui/button";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Page Not Found</h2>
      <p className="mt-4 text-lg text-gray-600">Could not find requested resource</p>
      <div className="mt-8">
        <Button asChild>
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    </div>
  );
}
