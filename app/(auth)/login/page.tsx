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
          <img src="/social-poster-logo.png" alt="Social Poster logo" className="mx-auto h-20 w-20 rounded-2xl" />
          <h1 className="text-2xl font-bold">Social Poster</h1>
          <p className="text-sm text-muted-foreground">Sign in to review and publish content</p>
        </div>
        <LoginForm callbackUrl={params.callbackUrl ?? "/dashboard"} error={params.error} />
      </div>
    </div>
  );
}
