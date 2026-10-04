export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="container-store max-w-2xl py-12">
      <h1 className="text-3xl font-semibold">Privacy</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        We store the account, address and order data needed to fulfil purchases. Passwords are hashed.
        Payment card data is handled by Cashfree and never stored on Aarohi servers. We do not sell personal
        data. Session cookies are httpOnly. You can request deletion of your account by writing to
        hello@aarohi.in.
      </p>
    </article>
  );
}
