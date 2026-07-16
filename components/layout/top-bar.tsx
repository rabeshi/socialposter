import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function TopBar() {
  const session = await auth();

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div className="text-sm text-muted-foreground">Liceo Social Media Content Management</div>
      <div className="flex items-center gap-4">
        {session?.user && (
          <span className="text-sm">
            {session.user.name} <span className="text-muted-foreground">({session.user.role})</span>
          </span>
        )}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button variant="outline" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
