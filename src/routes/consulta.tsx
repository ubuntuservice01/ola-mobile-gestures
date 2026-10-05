import { RouteIndexBoundary } from "../components/RouteIndexBoundary";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  CarFront,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  LoadingButton,
  PageTransition,
  type LoadingButtonState,
} from "../components/mobigest/Experience";
import {
  listPublicVehicleSales,
  type PublicVehicleSale,
  type VehicleType,
} from "../lib/vehicles";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/consulta")({
  head: () => ({
    meta: [
      { title: "Consulta Pública | MobiGest" },
      {
        name: "description",
        content:
          "Consulte veículos e taxistas registados no MobiGest e veja veículos oficialmente declarados à venda.",
      },
    ],
  }),
  component: ConsultaRouteBoundary,
});

type SaleFilter = "todos" | VehicleType;

function Consulta() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"veiculo" | "condutor">("veiculo");
  const [code, setCode] = useState("");
  const [searchState, setSearchState] = useState<LoadingButtonState>("idle");
  const [sales, setSales] = useState<PublicVehicleSale[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [saleFilter, setSaleFilter] = useState<SaleFilter>("todos");

  useEffect(() => {
    let active = true;

    const loadSales = async () => {
      setSalesLoading(true);
      setSalesError(null);
      try {
        const rows = await listPublicVehicleSales();
        if (active) setSales(rows);
      } catch (error) {
        console.error("Falha ao carregar veículos à venda:", error);
        if (active) {
          setSalesError("Não foi possível carregar os veículos à venda neste momento.");
        }
      } finally {
        if (active) setSalesLoading(false);
      }
    };

    void loadSales();
    return () => {
      active = false;
    };
  }, []);

  const filteredSales = useMemo(
    () =>
      saleFilter === "todos"
        ? sales
        : sales.filter((sale) => sale.vehicle_type === saleFilter),
    [saleFilter, sales],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    setSearchState("loading");

    if (mode === "condutor") {
      await navigate({
        to: "/consulta/condutor/$codigo",
        params: { codigo: normalized },
      });
      setSearchState("success");
      return;
    }

    await navigate({
      to: "/consulta/$codigo",
      params: { codigo: normalized },
    });
    setSearchState("success");
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <PageTransition>
        <header className="border-b bg-white">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-10">
            <Link to="/" aria-label="Voltar ao MobiGest">
              <img src="/mobigest-logo.svg" className="h-11 w-auto" alt="MobiGest" />
            </Link>
            <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-sky-700">
              Área reservada
            </Link>
          </div>
        </header>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-2xl px-5 py-14 sm:py-16">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <Search className="h-7 w-7" />
              </div>
              <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
                Consulta pública
              </h1>
              <p className="mt-3 text-slate-500">
                Confirme um veículo ou a identificação profissional de um taxista/condutor
                registado no MobiGest.
              </p>
            </div>

            <form
              onSubmit={submit}
              className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5"
            >
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("veiculo");
                    setCode("");
                  }}
                  className={
                    "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold " +
                    (mode === "veiculo"
                      ? "bg-white text-sky-700 shadow-sm"
                      : "text-slate-500")
                  }
                >
                  <Bike className="h-4 w-4" />
                  Veículo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("condutor");
                    setCode("");
                  }}
                  className={
                    "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold " +
                    (mode === "condutor"
                      ? "bg-white text-sky-700 shadow-sm"
                      : "text-slate-500")
                  }
                >
                  <UserRoundCheck className="h-4 w-4" />
                  Taxista / Condutor
                </button>
              </div>

              <label className="mt-5 block text-sm font-semibold">
                {mode === "veiculo" ? "Número MobiGest" : "Referência MTX / CDT"}
              </label>

              <div className="mt-2 flex items-center rounded-xl border border-slate-300 px-3 focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/10">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder={
                    mode === "veiculo"
                      ? "Ex.: MZ-LIC-000001"
                      : "Ex.: MTX-LIC-000001"
                  }
                  className="h-12 flex-1 px-3 text-sm outline-none"
                />
              </div>

              <LoadingButton
                type="submit"
                disabled={!code.trim()}
                state={searchState}
                idleLabel={
                  mode === "veiculo"
                    ? "Consultar veículo"
                    : "Consultar taxista / condutor"
                }
                loadingLabel="A consultar registos..."
                successLabel="A abrir resultado..."
                errorLabel="Tentar novamente"
                icon={<ArrowRight className="h-4 w-4" />}
                className="mt-4 w-full bg-sky-600 py-3 text-white hover:bg-sky-700"
              />

              <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                Ao digitalizar um QR MobiGest com a câmara do telemóvel, a página de
                verificação abre directamente.
              </p>
            </form>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-white p-4 text-sm">
                <b>Consulta protegida</b>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  A pesquisa normal mostra apenas informação autorizada para confirmação
                  do registo.
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4 text-sm">
                <b>Venda com autorização</b>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Nome, contacto, bairro e fotos só aparecem quando o proprietário declara
                  a venda e autoriza a publicação no município.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-16 lg:px-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                <ShoppingCart className="h-3.5 w-3.5" />
                Declarados no município
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Veículos à venda
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Motorizadas, carros e bicicletas publicados por utilizadores autorizados
                após declaração do proprietário.
              </p>
            </div>

            <div className="flex flex-wrap gap-2" aria-label="Filtrar veículos à venda">
              <FilterButton active={saleFilter === "todos"} onClick={() => setSaleFilter("todos")}>
                Todos
              </FilterButton>
              <FilterButton active={saleFilter === "motorizada"} onClick={() => setSaleFilter("motorizada")}>
                Motorizadas
              </FilterButton>
              <FilterButton active={saleFilter === "carro"} onClick={() => setSaleFilter("carro")}>
                Carros
              </FilterButton>
              <FilterButton active={saleFilter === "bicicleta"} onClick={() => setSaleFilter("bicicleta")}>
                Bicicletas
              </FilterButton>
            </div>
          </div>

          {salesLoading ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="aspect-[16/10] animate-pulse bg-slate-200" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                    <div className="h-9 w-1/3 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : salesError ? (
            <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700">
              {salesError}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <ShoppingCart className="mx-auto h-8 w-8 text-slate-300" />
              <h3 className="mt-4 font-semibold text-slate-800">
                Ainda não há veículos publicados nesta categoria
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Assim que um proprietário declarar uma venda e o município publicar o
                anúncio, o veículo aparecerá automaticamente aqui.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredSales.map((sale) => (
                <SaleCard key={sale.listing_id} sale={sale} />
              ))}
            </div>
          )}
        </section>
      </PageTransition>
    </main>
  );
}

function SaleCard({ sale }: { sale: PublicVehicleSale }) {
  const photos = sale.photo_paths ?? [];
  const firstPhoto = photos[0] ? publicPhotoUrl(photos[0]) : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/8">
      <div className="relative aspect-[16/10] bg-slate-100">
        {firstPhoto ? (
          <img
            src={firstPhoto}
            alt={`${vehicleTypeLabel(sale.vehicle_type)} ${sale.make ?? ""} ${sale.model ?? ""} à venda`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            {sale.vehicle_type === "carro" ? <CarFront className="h-16 w-16" /> : <Bike className="h-16 w-16" />}
          </div>
        )}
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow">
          <BadgeCheck className="h-3.5 w-3.5" />
          Registo MobiGest
        </div>
        {photos.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-lg bg-slate-950/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
            {photos.length} fotos
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-sky-700">
              {vehicleTypeLabel(sale.vehicle_type)}
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">
              {[sale.make, sale.model].filter(Boolean).join(" ") || vehicleTypeLabel(sale.vehicle_type)}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {sale.mobigest_number}
              {sale.manufacture_year ? ` · ${sale.manufacture_year}` : ""}
              {sale.color ? ` · ${sale.color}` : ""}
            </p>
          </div>
          <p className="whitespace-nowrap text-lg font-extrabold text-emerald-700">
            {formatPrice(sale.price)}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            Condição: {conditionLabel(sale.vehicle_condition)}
          </span>
          <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
            {sale.municipality_name}
          </span>
        </div>

        {sale.declared_problems && (
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
              Condições / problemas declarados
            </p>
            <p className="mt-1 line-clamp-3 text-xs leading-5 text-amber-900">
              {sale.declared_problems}
            </p>
          </div>
        )}

        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <UserRound className="h-4 w-4 text-slate-400" />
            <span>{sale.contact_name}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{sale.location}</span>
          </div>
        </div>

        {photos.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {photos.slice(0, 6).map((path, index) => (
              <img
                key={path}
                src={publicPhotoUrl(path)}
                alt={`Foto ${index + 1} do veículo`}
                className="h-14 w-20 shrink-0 rounded-lg border border-slate-200 object-cover"
                loading="lazy"
              />
            ))}
          </div>
        )}

        <a
          href={phoneHref(sale.contact_phone)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#147D92] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#106a7c]"
        >
          <Phone className="h-4 w-4" />
          {sale.contact_phone}
        </a>

        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] leading-5 text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          A venda declarada não substitui o processo formal de transferência de propriedade.
        </div>
      </div>
    </article>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-xl border px-3.5 py-2 text-xs font-bold transition " +
        (active
          ? "border-sky-600 bg-sky-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700")
      }
    >
      {children}
    </button>
  );
}

function publicPhotoUrl(path: string) {
  return supabase.storage.from("mobigest-sale-photos").getPublicUrl(path).data.publicUrl;
}

function phoneHref(value: string) {
  const digits = value.replace(/\D/g, "");
  return `tel:${digits.startsWith("258") ? "+" + digits : "+258" + digits}`;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-MZ", {
    style: "currency",
    currency: "MZN",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function vehicleTypeLabel(type: VehicleType) {
  if (type === "motorizada") return "Motorizada";
  if (type === "carro") return "Carro";
  return "Bicicleta";
}

function conditionLabel(value: string) {
  if (value === "excelente") return "Excelente";
  if (value === "boa") return "Boa";
  if (value === "razoavel") return "Razoável";
  if (value === "necessita_reparacao") return "Necessita reparação";
  return value;
}

function ConsultaRouteBoundary() {
  return (
    <RouteIndexBoundary pattern="/consulta">
      <Consulta />
    </RouteIndexBoundary>
  );
}
