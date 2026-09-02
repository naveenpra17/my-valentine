import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { ExperienceControllerService } from '../experience/experience-controller.service';
import { ExperienceFlowService } from '../experience/experience-flow.service';
import { ExperienceStateService } from '../experience/experience-state.service';
import { HeartShareService } from '../services/heart-share.service';
import { SessionService } from '../services/session.service';
import { SiteContextService } from './site-context.service';
import { SiteDataService } from './site-data.service';
import { SiteMetadataService } from './site-metadata.service';

export const siteResolver: ResolveFn<boolean> = async (route) => {
  const siteData = inject(SiteDataService);
  const siteContext = inject(SiteContextService);
  const session = inject(SessionService);
  const experienceState = inject(ExperienceStateService);
  const controller = inject(ExperienceControllerService);
  const metadata = inject(SiteMetadataService);
  const flow = inject(ExperienceFlowService);
  const heartShare = inject(HeartShareService);
  const router = inject(Router);

  const slug = route.paramMap.get('slug');
  if (!slug) {
    await router.navigateByUrl('/');
    return false;
  }

  const normalized = slug.trim().toLowerCase();
  const previousSlug = siteContext.slug();

  if (previousSlug && previousSlug !== normalized) {
    siteData.clear();
    flow.clearSiteCache();
    heartShare.clearPreviewCache();
  }

  const ok = await siteData.load(normalized);
  if (!ok && siteData.notFound()) {
    metadata.resetToDefaults();
    await router.navigate(['/not-found'], { queryParams: { slug: normalized } });
    return false;
  }

  if (!ok) {
    metadata.resetToDefaults();
    return false;
  }

  session.initializeForSite();
  experienceState.initializeForSite();
  controller.initializeForSite();
  metadata.updateForActiveSite();

  return true;
};
