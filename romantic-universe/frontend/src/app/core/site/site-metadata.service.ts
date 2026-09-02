import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SiteDataService } from './site-data.service';

@Injectable({ providedIn: 'root' })
export class SiteMetadataService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly siteData = inject(SiteDataService);

  updateForActiveSite(): void {
    const bundle = this.siteData.bundle();
    if (!bundle) return;

    const herName = bundle.config['HER_NAME']?.trim();
    const siteName = bundle.site.name?.trim();
    const displayName = herName || siteName || 'Someone special';

    const pageTitle = `${displayName} — A Little Universe`;
    const description = `A little universe made for ${displayName}.`;
    const imageUrl = bundle.config['HERO_IMAGE_URL']?.trim() || bundle.config['OG_IMAGE_URL']?.trim() || '';

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    if (imageUrl) {
      this.meta.updateTag({ property: 'og:image', content: imageUrl });
      this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
      this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    }
  }

  resetToDefaults(): void {
    this.title.setTitle('Our Little Universe');
    this.meta.updateTag({
      name: 'description',
      content: 'A little universe made with love — an interactive romantic experience.'
    });
    this.meta.updateTag({ property: 'og:title', content: 'Our Little Universe' });
    this.meta.updateTag({
      property: 'og:description',
      content: 'Someone made a little universe for you.'
    });
    this.meta.updateTag({ name: 'twitter:title', content: 'Our Little Universe' });
    this.meta.updateTag({
      name: 'twitter:description',
      content: 'Someone made a little universe for you.'
    });
    this.meta.removeTag("property='og:image'");
    this.meta.removeTag("name='twitter:image'");
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
  }
}
