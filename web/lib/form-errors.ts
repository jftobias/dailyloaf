import { ApiError } from "@/lib/api-client";

export function formErrors(error: unknown) {
  if (!(error instanceof ApiError)) {
    return { form: "The API is unavailable. Please try again." };
  }

  const details = error.details;
  const fields: Record<string, string> = {};
  if (details && typeof details === "object") {
    for (const [key, value] of Object.entries(details)) {
      if (Array.isArray(value) && typeof value[0] === "string") fields[key] = value[0];
    }
  }

  return { form: fields.email_address || fields.password ? "Please check the highlighted fields." : error.message, fields };
}
