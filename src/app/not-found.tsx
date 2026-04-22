'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <h1 className="text-6xl font-bold">404</h1>
      <h2 className="mb-2 mt-4 text-2xl">Pagina non trovata</h2>
      <p className="mb-6 text-muted-foreground">
        Spiacenti, non siamo riusciti a trovare la pagina che stai cercando.
      </p>
      <Button asChild>
        <Link href="/">Torna alla Home</Link>
      </Button>
    </div>
  );
}
