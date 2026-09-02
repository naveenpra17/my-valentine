import { Routes } from '@angular/router';
import { siteResolver } from './core/site/site.resolver';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/site-empty/site-empty.component').then(m => m.SiteEmptyComponent)
  },
  {
    path: 'site',
    loadComponent: () =>
      import('./features/site-empty/site-empty.component').then(m => m.SiteEmptyComponent)
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
