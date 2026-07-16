"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function IntegrationCard({
  service,
  label,
  description,
  connectUrl,
}: {
  service: string;
  label: string;
  description: string;
  connectUrl?: string;
}) {
  const [result, setResult] = useState<{ connected: boolean; detail: string } | null>(null);
  const [testing, setTesting] = useState(false);

  async function test() {
    setTesting(true);
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{label}</CardTitle>
        {result && <Badge variant={result.connected ? "success" : "warning"}>{result.connected ? "Connected" : "Not connected"}</Badge>}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
        {result && <p className="mt-2 text-xs text-muted-foreground">{result.detail}</p>}
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm" variant="outline" disabled={testing} onClick={test}>
          {testing ? "Testing..." : "Test Connection"}
        </Button>
        {connectUrl && (
          <Button size="sm" asChild>
            <a href={connectUrl}>Connect</a>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
