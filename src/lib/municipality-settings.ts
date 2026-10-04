import { supabase } from "./supabase";

export type MunicipalityIdentity = {
  id: string;
  name: string;
  code: string;
  province: string;
  area: string | null;
  institutional_phone: string | null;
  institutional_email: string | null;
  address: string | null;
  website: string | null;
  status: string;
  display_name: string | null;
  abbreviation: string | null;
  logo_path: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  document_header: string | null;
  receipt_header: string | null;
};

export type MunicipalityStatistics = {
  municipality_id: string;
  vehicles_total: number;
  motorcycles_total: number;
  cars_total: number;
  bicycles_total: number;
  owners_total: number;
  drivers_total: number;
  registrations_total: number;
  fines_total: number;
  revenue_total: number;
  users_total: number;
  posts_total: number;
  localities_total: number;
};

export async function loadMunicipalityIdentity() {
  const { data, error } = await supabase.rpc("current_municipality_identity");

  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  return (row as MunicipalityIdentity | undefined) ?? null;
}

export async function loadMunicipalityStatistics() {
  const { data, error } = await supabase.rpc("current_municipality_statistics");

  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  return (row as MunicipalityStatistics | undefined) ?? null;
}

export async function saveMunicipalityIdentity(input: MunicipalityIdentity) {
  const { error } = await supabase.rpc(
    "update_current_municipality_identity",
    {
      p_name: input.name,
      p_province: input.province,
      p_area: input.area,
      p_institutional_phone: input.institutional_phone,
      p_institutional_email: input.institutional_email,
      p_address: input.address,
      p_website: input.website,
      p_display_name: input.display_name,
      p_abbreviation: input.abbreviation,
      p_logo_path: input.logo_path,
      p_primary_color: input.primary_color,
      p_secondary_color: input.secondary_color,
      p_accent_color: input.accent_color,
      p_document_header: input.document_header,
      p_receipt_header: input.receipt_header,
    },
  );

  if (error) throw new Error(error.message);
}

export async function uploadMunicipalityLogo(
  municipalityId: string,
  file: File,
) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Use uma imagem PNG, JPG ou WebP.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("O logótipo deve ter no máximo 2 MB.");
  }

  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";

  const path = municipalityId + "/logo." + extension;

  const { error } = await supabase.storage
    .from("mobigest-branding")
    .upload(path, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type,
    });

  if (error) throw new Error(error.message);

  return path;
}

export function municipalityLogoUrl(path: string | null) {
  if (!path) return null;

  const { data } = supabase.storage
    .from("mobigest-branding")
    .getPublicUrl(path);

  return data.publicUrl;
}
