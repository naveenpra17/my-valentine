import { Injectable, inject } from '@angular/core';
import { ConfigService } from './config.service';
import { SiteContextService } from '../site/site-context.service';
import { HeartStateService } from '../experience/heart-state.service';
import { heartStateCacheKey } from '../experience/heart-state-hash.util';
import { renderHeartSnapshot } from './heart-capture.renderer';

@Injectable({ providedIn: 'root' })
export class HeartShareService {
  private readonly heartState = inject(HeartStateService);
  private readonly config = inject(ConfigService);
  private readonly siteContext = inject(SiteContextService);
  private previewUrl: string | null = null;
  private previewCacheKey: string | null = null;

  /** Read-only capture of the exact personalized heart. */
  async captureHeartImage(): Promise<HTMLCanvasElement> {
    const objects = this.heartState.getValidatedHeartObjects();
    return renderHeartSnapshot(objects, {
      width: 1080,
      height: 1080,
      herName: this.config.get('HER_NAME', ''),
      title: 'Our Little Heart'
    });
  }

  async generateShareImage(): Promise<Blob | null> {
    try {
      const canvas = await this.captureHeartImage();
      return new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/png', 0.92);
      });
    } catch {
      return null;
    }
  }

  async getPreviewDataUrl(): Promise<string | null> {
    const slug = this.siteContext.slug() ?? 'unknown';
    const cacheKey = `${slug}:${heartStateCacheKey(this.heartState.captureHeartState())}`;
    if (this.previewUrl && this.previewCacheKey === cacheKey) {
      return this.previewUrl;
    }
    try {
      const canvas = await this.captureHeartImage();
      this.previewUrl = canvas.toDataURL('image/png', 0.9);
      this.previewCacheKey = cacheKey;
      return this.previewUrl;
    } catch {
      return null;
    }
  }

  clearPreviewCache(): void {
    this.previewUrl = null;
    this.previewCacheKey = null;
  }

  async share(): Promise<boolean> {
    const blob = await this.generateShareImage();
    if (!blob) return false;

    const herName = this.config.get('HER_NAME', 'you');
    const file = new File([blob], 'our-little-heart.png', { type: 'image/png' });
    const title = 'Our Little Heart ❤️';
    const text = `A little universe made for ${herName}`;

    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title, text, files: [file] });
        return true;
      }
    } catch {
      // fall through to download
    }

    return this.download(blob);
  }

  async download(blob?: Blob): Promise<boolean> {
    const image = blob ?? (await this.generateShareImage());
    if (!image) return false;

    const url = URL.createObjectURL(image);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'our-little-heart.png';
    link.click();
    URL.revokeObjectURL(url);
    return true;
  }
}
