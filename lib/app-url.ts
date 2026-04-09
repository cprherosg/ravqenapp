function normalizeBaseUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function getCanonicalAppHref(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = normalizeBaseUrl();

  if (!baseUrl) {
    return normalizedPath;
  }

  return new URL(normalizedPath, baseUrl).toString();
}
