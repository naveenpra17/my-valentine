import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/experience/experience.component').then(m => m.ExperienceComponent)
  },
  { path: '**', redirectTo: '' }
];
