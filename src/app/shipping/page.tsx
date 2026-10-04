export const metadata = { title: "Shipping" };

export default function ShippingPage() {
  return (
    <article className="container-store prose-store max-w-2xl py-12">
      <h1 className="text-3xl font-semibold">Shipping</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        We ship pan-India via Delhivery and Bluedart. Orders placed before 2 pm IST on business days usually
        leave the warehouse the same day. Typical delivery is 3–6 business days, longer for remote PIN codes.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Shipping is ₹99, and free on orders of ₹1,999 and above. A tracking number is added when the order
        moves to SHIPPED. We do not currently offer cash on delivery — payments are collected through Cashfree.
      </p>
    </article>
  );
}
