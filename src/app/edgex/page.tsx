// src/app/edgex/page.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function EdgeXFeatureRemovedPage() {
  return (
    <div className="space-y-8">
      <header className="pb-4 mb-6 border-b">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          EdgeX Data (Removed)
        </h1>
      </header>
      <Card className="shadow-lg rounded-lg border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Feature Not Available
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            The EdgeX data display feature has been removed from this application.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
