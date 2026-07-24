import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-[#f2f4f7] p-6">
      <LoginForm next={next ?? "/dashboard"} />
    </main>
  );
}
