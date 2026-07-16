import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Reviewers and role-based access. Brand and automation settings live on their own pages.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Reviewers</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between text-sm">
              <span>{u.name} <span className="text-muted-foreground">({u.email})</span></span>
              <Badge variant="outline">{u.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Environment</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Simulation mode, model names, and default schedule are configured via environment variables — see the README for the full list.</p>
        </CardContent>
      </Card>
    </div>
  );
}
