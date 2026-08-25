import ExtractorImagenes from "./extractor-client";

export const metadata = {
  title: "Imágenes | Admin | Soy Reinaldo",
};

export default function AdminImagenesPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Extractor de imágenes
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">
            Pega la URL de una página y saca sus imágenes en la máxima calidad
            disponible: cuando la web sirve miniaturas (WordPress, next/image,
            Twitter...), se intenta recuperar el fichero original y se muestra
            la resolución real de cada una.
          </p>
        </header>
        <ExtractorImagenes />
      </div>
    </main>
  );
}
