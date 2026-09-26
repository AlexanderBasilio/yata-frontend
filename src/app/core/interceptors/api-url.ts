import { environment } from '../../../environments/environment';

/** Match complete API origins, never substrings controlled by another host. */
export function isBackendUrl(url: string): boolean {
  try {
    const target = new URL(url);
    return [environment.platformUrl, environment.apiUrl, environment.restaurantServiceUrl,
      environment.portalUrl, environment.liquorServiceUrl].some(base => {
      return target.origin === new URL(base).origin;
    });
  } catch { return false; }
}
