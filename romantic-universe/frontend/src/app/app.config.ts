import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { RuntimeConfigService } from './core/services/runtime-config.service';
import { initScrollPerformance } from './core/init/scroll-performance.init';

function initRuntimeConfig(runtime: RuntimeConfigService): () => Promise<void> {
  return () => runtime.load();
}

function initPerformance(): () => void {
  return () => initScrollPerformance();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: initPerformance,
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initRuntimeConfig,
      deps: [RuntimeConfigService],
      multi: true
    }
  ]
};
