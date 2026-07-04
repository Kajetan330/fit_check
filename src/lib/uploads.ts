import { supabase } from "./supabase";

export interface UploadResult {
  url: string;
  storagePath?: string;
  demo: boolean;
}

const safeFileName = (file: File) => file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");

export async function uploadPrivateImage(file: File, ownerKey: string): Promise<UploadResult> {
  if (!supabase) {
    return {
      url: URL.createObjectURL(file),
      demo: true,
    };
  }

  const path = `${ownerKey}/${Date.now()}-${safeFileName(file)}`;
  const { error } = await supabase.storage.from("private-booking-uploads").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = await supabase.storage.from("private-booking-uploads").createSignedUrl(path, 60 * 60);

  return {
    url: data?.signedUrl ?? "",
    storagePath: path,
    demo: false,
  };
}

export async function uploadPublicImage(file: File, ownerKey: string): Promise<UploadResult> {
  if (!supabase) {
    return {
      url: URL.createObjectURL(file),
      demo: true,
    };
  }

  const path = `${ownerKey}/${Date.now()}-${safeFileName(file)}`;
  const { error } = await supabase.storage.from("public-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("public-media").getPublicUrl(path);

  return {
    url: data.publicUrl,
    storagePath: path,
    demo: false,
  };
}
