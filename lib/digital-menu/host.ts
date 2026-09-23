import "server-only";

/** Preparado para el futuro routing por {slug}.tapixxo.com, sin cambiar DNS ni proxy. */
export function getMenuSlugFromHost(host: string, rootDomain = "tapixxo.com") {
  const hostname = host.toLowerCase().split(":")[0];
  const suffix = `.${rootDomain}`;
  if (!hostname.endsWith(suffix)) return null;
  const slug = hostname.slice(0, -suffix.length);
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}
