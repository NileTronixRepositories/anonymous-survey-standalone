import { Injectable, inject } from '@angular/core';
import { APP_RUNTIME_CONFIG } from '../config/app-runtime-config';

@Injectable({ providedIn: 'root' })
export class MediaUrlService {
  private readonly runtimeConfig = inject(APP_RUNTIME_CONFIG);

  resolve(relativePath: string | null | undefined, fallbackUrl: string): string {
    const normalizedPath = relativePath?.trim().replace(/\\/g, '/').replace(/^\/+/, '');

    if (!normalizedPath) {
      return fallbackUrl;
    }

    const baseUrl = this.runtimeConfig.apiBaseUrl.trim().replace(/\/+$/, '');
    return `${baseUrl}/${normalizedPath}`;
  }
}
