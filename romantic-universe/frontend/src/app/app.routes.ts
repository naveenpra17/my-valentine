import { Routes } from '@angular/router';
import { siteResolver } from './core/site/site.resolver';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/site-selector/site-selector.component').then(m => m.SiteSelectorComponent)
  },
  {
    path: 'not-found',
    loadComponent: () =>
      import('./features/site-not-found/site-not-found.component').then(m => m.SiteNotFoundComponent)
  },
  {
    path: 'site/:slug',
    resolve: { siteReady: siteResolver },
    loadComponent: () =>
      import('./features/experience/experience.component').then(m => m.ExperienceComponent)
  },
  {
    path: ':legacySlug',
    redirectTo: 'site/:legacySlug',
    pathMatch: 'full'
  },
  { path: '**', redirectTo: '' }
];
