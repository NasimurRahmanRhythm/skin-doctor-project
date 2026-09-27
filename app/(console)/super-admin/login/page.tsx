import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: PageProps<"/super-admin/login">) {
  const params = await searchParams;
  return <LoginForm expired={params.expired === "1"} />;
}
