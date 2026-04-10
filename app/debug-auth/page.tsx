import { getServerAuthUser } from "@/lib/supabase/session";

export default async function DebugAuthPage() {
  const user = await getServerAuthUser();

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <pre className="whitespace-pre-wrap break-all text-sm">
        {JSON.stringify(
          {
            userId: user?.id ?? null,
            userEmail: user?.email ?? null,
          },
          null,
          2,
        )}
      </pre>
    </main>
  );
}
