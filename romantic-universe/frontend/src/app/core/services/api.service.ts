import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';
import { SiteContextService } from '../site/site-context.service';
import {
  LoveBomb,
  Memory,
  OpenWhenMessage,
  Photo,
  Quote,
  Reason,
  SiteBundle,
  SiteConfig,
  SiteSummary
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly runtime = inject(RuntimeConfigService);
  private readonly siteContext = inject(SiteContextService);

  private get baseUrl(): string {
    return this.runtime.apiUrl();
  }

  private activeSlug(): string | undefined {
    return this.siteContext.slug() ?? undefined;
  }

  listSites(): Observable<SiteSummary[]> {
    return this.http.get<SiteSummary[]>(`${this.baseUrl}/sites`);
  }

  getSiteBundle(slug: string): Observable<SiteBundle> {
    return this.http.get<SiteBundle>(`${this.baseUrl}/sites/${encodeURIComponent(slug)}`);
  }

  unlockSite(slug: string, answer: string): Observable<{ unlocked: boolean }> {
    return this.http.post<{ unlocked: boolean }>(
      `${this.baseUrl}/sites/${encodeURIComponent(slug)}/unlock`,
      { answer }
    );
  }

  /** @deprecated Use getSiteBundle */
  getConfig(): Observable<SiteConfig> {
    return this.http.get<SiteConfig>(`${this.baseUrl}/config`);
  }

  getMemories(slug?: string): Observable<Memory[]> {
    const site = slug ?? this.activeSlug();
    if (site) {
      return this.getSiteBundle(site).pipe(map(bundle => bundle.memories));
    }
    return this.http.get<Memory[]>(`${this.baseUrl}/memories`);
  }

  getMemory(id: number): Observable<Memory> {
    return this.http.get<Memory>(`${this.baseUrl}/memories/${id}`);
  }

  getPhotos(slug?: string): Observable<Photo[]> {
    const site = slug ?? this.activeSlug();
    if (site) {
      return this.getSiteBundle(site).pipe(map(bundle => bundle.photos));
    }
    return this.http.get<Photo[]>(`${this.baseUrl}/photos`);
  }

  getQuotes(slug?: string): Observable<Quote[]> {
    const site = slug ?? this.activeSlug();
    if (site) {
      return this.getSiteBundle(site).pipe(map(bundle => bundle.quotes));
    }
    return this.http.get<Quote[]>(`${this.baseUrl}/quotes`);
  }

  getLoveBomb(sessionId: string, slug?: string): Observable<LoveBomb> {
    const site = slug ?? this.activeSlug();
    if (site) {
      return this.http.get<LoveBomb>(
        `${this.baseUrl}/sites/${encodeURIComponent(site)}/love-bombs/random`,
        { params: { sessionId } }
      );
    }
    return this.http.get<LoveBomb>(`${this.baseUrl}/love-bombs/random`, {
      params: { sessionId }
    });
  }

  getReasons(slug?: string): Observable<Reason[]> {
    const site = slug ?? this.activeSlug();
    if (site) {
      return this.getSiteBundle(site).pipe(map(bundle => bundle.reasons));
    }
    return this.http.get<Reason[]>(`${this.baseUrl}/reasons`);
  }

  getOpenWhenMessages(slug?: string): Observable<OpenWhenMessage[]> {
    const site = slug ?? this.activeSlug();
    if (site) {
      return this.getSiteBundle(site).pipe(map(bundle => bundle.openWhenMessages));
    }
    return this.http.get<OpenWhenMessage[]>(`${this.baseUrl}/open-when`);
  }

  /** @deprecated Use unlockSite */
  verifyEntry(answer: string): Observable<{ valid: boolean }> {
    return this.http.post<{ valid: boolean }>(`${this.baseUrl}/auth/verify`, { answer });
  }
}
