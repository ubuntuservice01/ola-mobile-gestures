import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Bike,
  Building2,
  CarFront,
  CheckCircle2,
  FileText,
  ImageUp,
  MapPin,
  Palette,
  ReceiptText,
  Save,
  Settings,
  ShieldCheck,
  UserRoundCheck,
  Users,
  Wallet,
} from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import { MobiGestShell, Card } from "../components/MobiGestShell";
import { loadAccessProfile } from "../lib/access-control";
import {
  loadMunicipalityIdentity,
  loadMunicipalityStatistics,
  municipalityLogoUrl,
  saveMunicipalityIdentity,
  uploadMunicipalityLogo,
  type MunicipalityIdentity,
  type MunicipalityStatistics,
} from "../lib/municipality-settings";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/meu-municipio")({
  component: MeuMunicipioPage,
});

const EMPTY_STATS: MunicipalityStatistics = {
  municipality_id: "",
  vehicles_total: 0,
  motorcycles_total: 0,
  cars_total: 0,
  bicycles_total: 0,
  owners_total: 0,
  drivers_total: 0,
  registrations_total: 0,
  fines_total: 0,
  revenue_total: 0,
  users_total: 0,
  posts_total: 0,
  localities_total: 0,
};

function MeuMunicipioPage() {
  const [identity, setIdentity] = useState<MunicipalityIdentity | null>(null);
  const [stats, setStats] = useState<MunicipalityStatistics>(EMPTY_STATS);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("Sessão inválida.");

        const [profile, municipalIdentity, municipalStats] = await Promise.all([
          loadAccessProfile(user.id),
          loadMunicipalityIdentity(),
          loadMunicipalityStatistics(),
        ]);

        if (!active) return;

        if (!profile) throw new Error("Perfil MobiGest não encontrado.");
        if (!municipalIdentity) throw new Error("Município não encontrado.");

        setCanManage(
          profile.role === "admin_municipal" ||
            profile.role === "super_admin",
        );
        setIdentity(municipalIdentity);
        setStats(municipalStats ?? EMPTY_STATS);
      } catch (error) {
        if (!active) return;
        console.error("Falha ao carregar Meu Município:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o município.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const updateField = <K extends keyof MunicipalityIdentity>(
    key: K,
    value: MunicipalityIdentity[K],
  ) => {
    setIdentity((current) =>
      current ? { ...current, [key]: value } : current,
    );
    setMessage(null);
    setErrorMessage(null);
  };

  const save = async () => {
    if (!identity || !canManage) return;

    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await saveMunicipalityIdentity(identity);
      const refreshed = await loadMunicipalityIdentity();
      if (refreshed) setIdentity(refreshed);
      setMessage("Dados do município actualizados com sucesso.");
    } catch (error) {
      console.error("Falha ao guardar Meu Município:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar as alterações.",
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !identity || !canManage) return;

    setUploadingLogo(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const path = await uploadMunicipalityLogo(identity.id, file);
      const nextIdentity = { ...identity, logo_path: path };
      await saveMunicipalityIdentity(nextIdentity);
      setIdentity(nextIdentity);
      setMessage("Logótipo actualizado com sucesso.");
    } catch (error) {
      console.error("Falha ao carregar logótipo:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o logótipo.",
      );
    } finally {
      event.target.value = "";
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <MobiGestShell
        title="Meu Município"
        subtitle="A carregar identidade institucional..."
      >
        <Card className="p-10 text-center text-sm text-slate-500">
          A carregar...
        </Card>
      </MobiGestShell>
    );
  }

  if (!identity) {
    return (
      <MobiGestShell
        title="Meu Município"
        subtitle="Identidade institucional e configuração municipal."
      >
        <Card className="p-8 text-sm font-medium text-red-700">
          {errorMessage ?? "Não foi possível carregar o município."}
        </Card>
      </MobiGestShell>
    );
  }

  const logoUrl = municipalityLogoUrl(identity.logo_path);
  const displayName = identity.display_name || identity.name;

  return (
    <MobiGestShell
      title="Meu Município"
      subtitle="Identidade, estrutura, utilizadores, estatísticas e configurações do município actual."
    >
      <section
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
        style={{
          borderTopColor: identity.primary_color,
          borderTopWidth: 5,
        }}
      >
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-center gap-4">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-white"
              style={{ borderColor: identity.accent_color }}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={"Logótipo de " + displayName}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <Building2
                  className="h-9 w-9"
                  style={{ color: identity.primary_color }}
                />
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Município actual
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                {displayName}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {identity.province} · Código {identity.code}
                {identity.abbreviation ? " · " + identity.abbreviation : ""}
              </p>
              <span
                className="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: identity.primary_color }}
              >
                {statusLabel(identity.status)}
              </span>
            </div>
          </div>

          {canManage && (
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold hover:bg-slate-50">
              <ImageUp className="h-4 w-4" />
              {uploadingLogo ? "A carregar..." : "Carregar logótipo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={uploadingLogo}
                onChange={uploadLogo}
              />
            </label>
          )}
        </div>
      </section>

      {message && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      <SectionTitle
        icon={<BarChart3 className="h-5 w-5" />}
        title="Estatísticas"
        description="Indicadores actuais do município, calculados directamente no Supabase."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Veículos" value={stats.vehicles_total} icon={<Bike />} />
        <Metric label="Motorizadas" value={stats.motorcycles_total} icon={<Bike />} />
        <Metric label="Carros" value={stats.cars_total} icon={<CarFront />} />
        <Metric label="Bicicletas" value={stats.bicycles_total} icon={<Bike />} />
        <Metric label="Proprietários" value={stats.owners_total} icon={<Users />} />
        <Metric label="Taxistas / condutores" value={stats.drivers_total} icon={<UserRoundCheck />} />
        <Metric label="Registos" value={stats.registrations_total} icon={<FileText />} />
        <Metric label="Multas" value={stats.fines_total} icon={<ReceiptText />} />
        <Metric label="Utilizadores" value={stats.users_total} icon={<Users />} />
        <Metric label="Postos administrativos" value={stats.posts_total} icon={<MapPin />} />
        <Metric label="Localidades / bairros" value={stats.localities_total} icon={<MapPin />} />
        <MoneyMetric label="Receita líquida" value={stats.revenue_total} icon={<Wallet />} />
      </div>

      <SectionTitle
        icon={<Building2 className="h-5 w-5" />}
        title="Dados institucionais"
        description="Informação pública e administrativa do município."
      />

      <Card className="p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Nome do município"
            value={identity.name}
            disabled={!canManage}
            onChange={(value) => updateField("name", value)}
          />
          <TextField
            label="Nome a mostrar no sistema"
            value={identity.display_name ?? ""}
            disabled={!canManage}
            onChange={(value) => updateField("display_name", value || null)}
            placeholder="Ex.: Município de Mandimba"
          />
          <TextField
            label="Abreviatura"
            value={identity.abbreviation ?? ""}
            disabled={!canManage}
            onChange={(value) => updateField("abbreviation", value || null)}
            placeholder="Ex.: CMM"
          />
          <TextField
            label="Província"
            value={identity.province}
            disabled={!canManage}
            onChange={(value) => updateField("province", value)}
          />
          <TextField
            label="Área / distrito"
            value={identity.area ?? ""}
            disabled={!canManage}
            onChange={(value) => updateField("area", value || null)}
          />
          <TextField
            label="Telefone institucional"
            value={identity.institutional_phone ?? ""}
            disabled={!canManage}
            onChange={(value) =>
              updateField("institutional_phone", value || null)
            }
          />
          <TextField
            label="Email institucional"
            type="email"
            value={identity.institutional_email ?? ""}
            disabled={!canManage}
            onChange={(value) =>
              updateField("institutional_email", value || null)
            }
          />
          <TextField
            label="Website"
            type="url"
            value={identity.website ?? ""}
            disabled={!canManage}
            onChange={(value) => updateField("website", value || null)}
            placeholder="https://..."
          />
          <div className="md:col-span-2">
            <TextAreaField
              label="Endereço"
              value={identity.address ?? ""}
              disabled={!canManage}
              onChange={(value) => updateField("address", value || null)}
            />
          </div>
        </div>
      </Card>

      <SectionTitle
        icon={<Palette className="h-5 w-5" />}
        title="Identidade visual"
        description="Logótipo, cores institucionais e cabeçalhos usados pelo município."
      />

      <Card className="p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-5 md:grid-cols-3">
            <ColorField
              label="Cor principal"
              value={identity.primary_color}
              disabled={!canManage}
              onChange={(value) => updateField("primary_color", value)}
            />
            <ColorField
              label="Cor secundária"
              value={identity.secondary_color}
              disabled={!canManage}
              onChange={(value) => updateField("secondary_color", value)}
            />
            <ColorField
              label="Cor de destaque"
              value={identity.accent_color}
              disabled={!canManage}
              onChange={(value) => updateField("accent_color", value)}
            />

            <div className="md:col-span-3">
              <TextAreaField
                label="Cabeçalho para documentos"
                value={identity.document_header ?? ""}
                disabled={!canManage}
                onChange={(value) =>
                  updateField("document_header", value || null)
                }
                placeholder="Texto institucional para documentos oficiais"
                maxLength={240}
              />
            </div>

            <div className="md:col-span-3">
              <TextAreaField
                label="Cabeçalho para recibos"
                value={identity.receipt_header ?? ""}
                disabled={!canManage}
                onChange={(value) =>
                  updateField("receipt_header", value || null)
                }
                placeholder="Texto institucional para recibos"
                maxLength={240}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Pré-visualização
            </p>
            <div
              className="overflow-hidden rounded-2xl border"
              style={{ borderColor: identity.accent_color }}
            >
              <div
                className="p-5 text-white"
                style={{ backgroundColor: identity.secondary_color }}
              >
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt=""
                      className="h-12 w-12 rounded-xl bg-white object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                      <Building2 className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs opacity-70">MobiGest</p>
                    <p className="font-semibold">{displayName}</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div
                  className="h-2 w-24 rounded-full"
                  style={{ backgroundColor: identity.primary_color }}
                />
                <p className="mt-4 text-sm font-semibold">
                  {identity.document_header || "Cabeçalho institucional"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {identity.address || "Endereço do município"}
                </p>
                <span
                  className="mt-5 inline-flex rounded-lg px-3 py-2 text-xs font-semibold text-white"
                  style={{ backgroundColor: identity.primary_color }}
                >
                  Acção municipal
                </span>
              </div>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="mt-6 flex justify-end border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "A guardar..." : "Guardar alterações"}
            </button>
          </div>
        )}
      </Card>

      <SectionTitle
        icon={<MapPin className="h-5 w-5" />}
        title="Estrutura territorial"
        description="Organização administrativa do município."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <QuickLink
          to="/postos-administrativos"
          icon={<Building2 />}
          title="Postos administrativos"
          description="Criar, consultar e gerir os postos do município."
          value={stats.posts_total}
        />
        <QuickLink
          to="/localidades"
          icon={<MapPin />}
          title="Localidades / bairros"
          description="Gerir localidades e bairros ligados aos postos."
          value={stats.localities_total}
        />
      </div>

      <SectionTitle
        icon={<Users className="h-5 w-5" />}
        title="Utilizadores"
        description="Contas e perfis operacionais vinculados ao município."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <RoleLink title="Administrador Municipal" subtitle="Gestão municipal" />
        <RoleLink title="Técnicos" subtitle="Registo e validação" />
        <RoleLink title="Fiscais" subtitle="Fiscalização e multas" />
        <RoleLink title="Financeiros" subtitle="Cobranças e pagamentos" />
      </div>

      <div className="mt-4">
        <Link
          to="/utilizadores"
          className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Gerir utilizadores
        </Link>
      </div>

      <SectionTitle
        icon={<Settings className="h-5 w-5" />}
        title="Configurações operacionais"
        description="Regras que controlam o funcionamento diário do município."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <OperationalLink
          to="/definicoes/taxas"
          title="Taxas"
          description="Valores, vigência e isenções."
        />
        <OperationalLink
          to="/definicoes/documentos"
          title="Documentos obrigatórios"
          description="Requisitos por tipo de veículo."
        />
        <OperationalLink
          to="/definicoes/numeracao"
          title="Numeração"
          description="Sequência MobiGest do município."
        />
        <OperationalLink
          to="/permissoes"
          title="Permissões"
          description="Matriz de perfis e acessos."
        />
        <OperationalLink
          to="/auditoria"
          title="Auditoria"
          description="Histórico das acções realizadas."
        />
        <OperationalLink
          to="/relatorios"
          title="Relatórios"
          description="Indicadores operacionais e financeiros."
        />
      </div>
    </MobiGestShell>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 mt-8 flex items-start gap-3">
      <span className="mt-0.5 text-sky-600">{icon}</span>
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        {icon}
      </div>
      <p className="mt-4 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">
        {new Intl.NumberFormat("pt-MZ").format(Number(value || 0))}
      </p>
    </Card>
  );
}

function MoneyMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        {icon}
      </div>
      <p className="mt-4 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">
        {new Intl.NumberFormat("pt-MZ", {
          style: "currency",
          currency: "MZN",
          maximumFractionDigits: 2,
        }).format(Number(value || 0))}
      </p>
    </Card>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-sky-500 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <textarea
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-24 w-full resize-y rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-sky-500 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-300 bg-white p-2">
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="min-w-0 flex-1 border-0 bg-transparent font-mono text-sm outline-none disabled:text-slate-500"
        />
      </div>
    </label>
  );
}

function QuickLink({
  to,
  icon,
  title,
  description,
  value,
}: {
  to: "/postos-administrativos" | "/localidades";
  icon: React.ReactNode;
  title: string;
  description: string;
  value: number;
}) {
  return (
    <Link to={to}>
      <Card className="flex h-full items-center gap-4 p-5 transition hover:border-sky-200 hover:bg-sky-50/30">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span className="text-2xl font-bold text-slate-900">{value}</span>
      </Card>
    </Link>
  );
}

function RoleLink({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <Link to="/utilizadores">
      <Card className="p-5 transition hover:border-sky-200 hover:bg-sky-50/30">
        <Users className="h-5 w-5 text-sky-600" />
        <p className="mt-3 font-semibold">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </Card>
    </Link>
  );
}

function OperationalLink({
  to,
  title,
  description,
}: {
  to:
    | "/definicoes/taxas"
    | "/definicoes/documentos"
    | "/definicoes/numeracao"
    | "/permissoes"
    | "/auditoria"
    | "/relatorios";
  title: string;
  description: string;
}) {
  return (
    <Link to={to}>
      <Card className="h-full p-5 transition hover:border-sky-200 hover:bg-sky-50/30">
        <ShieldCheck className="h-5 w-5 text-sky-600" />
        <p className="mt-3 font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </Card>
    </Link>
  );
}

function statusLabel(status: string) {
  if (status === "activo") return "Activo";
  if (status === "configuracao") return "Em configuração";
  if (status === "suspenso") return "Suspenso";
  if (status === "inactivo") return "Inactivo";
  return status;
}
