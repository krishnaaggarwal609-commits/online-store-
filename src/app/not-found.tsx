import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-store py-24 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">404</p>
      <h1 className="mt-3 text-3xl font-semibold">This page does not exist</h1>
      <p className="mt-2 text-sm text-muted">The object you are looking for has moved, or never did.</p>
      <Link href="/" className="btn-primary mt-6 inline-flex">
        Back to Aarohi
      </Link>
    </div>
  );
}
