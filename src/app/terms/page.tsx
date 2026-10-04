export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="container-store max-w-2xl py-12">
      <h1 className="text-3xl font-semibold">Terms</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        By placing an order you agree that prices are in INR and inclusive of GST, that the contract is formed
        when payment is verified by our servers (not when the browser shows a success screen), and that we may
        cancel an order if an item cannot be fulfilled. Title passes on delivery. Aarohi is operated for the
        Indian market.
      </p>
    </article>
  );
}
