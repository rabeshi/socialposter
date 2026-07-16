import { LoginForm } from "@/components/forms/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Liceo Social</h1>
          <p className="text-sm text-muted-foreground">Sign in to review and publish content</p>
        </div>
        <LoginForm callbackUrl={params.callbackUrl ?? "/dashboard"} error={params.error} />
      </div>
    </div>
  );
}
