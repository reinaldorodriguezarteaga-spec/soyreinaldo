import Link from "next/link";

export const metadata = {
  title: "Donación cancelada | Soy Reinaldo",
  description: "Has cancelado la donación.",
};

export default function DonacionCanceladaPage() {
  return (
    <main className="page">
      <div className="wrap">
        <div className="statewrap">
          <div className="statecard">
            <h1>Sin problema.</h1>
            <p>
              La donación se ha cancelado y no se ha cobrado nada. Si quieres,
              puedes intentarlo de nuevo cuando te apetezca.
            </p>

            <div
              className="flex flex-col gap-3 sm:flex-row sm:justify-center"
              style={{ marginTop: 28 }}
            >
              <Link href="/" className="btn btn--accent justify-center">
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
