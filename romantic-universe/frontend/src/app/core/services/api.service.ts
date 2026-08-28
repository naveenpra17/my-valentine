import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';
import {
  LoveBomb,
  Memory,
  OpenWhenMessage,
  Photo,
  Quote,
  Reason,
  SiteConfig
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly runtime = inject(RuntimeConfigService);

  private get baseUrl(): string {
    return this.runtime.apiUrl();
  }

  getConfig(): Observable<SiteConfig> {
    return this.http.get<SiteConfig>(`${this.baseUrl}/config`);
  }

  getMemories(): Observable<Memory[]> {
    return this.http.get<Memory[]>(`${this.baseUrl}/memories`);
  }

  getMemory(id: number): Observable<Memory> {
    return this.http.get<Memory>(`${this.baseUrl}/memories/${id}`);
  }

  getPhotos(): Observable<Photo[]> {
    return this.http.get<Photo[]>(`${this.baseUrl}/photos`);
  }

  getQuotes(): Observable<Quote[]> {
    return this.http.get<Quote[]>(`${this.baseUrl}/quotes`);
  }

  getLoveBomb(sessionId: string): Observable<LoveBomb> {
    return this.http.get<LoveBomb>(`${this.baseUrl}/love-bombs/random`, {
      params: { sessionId }
    });
  }

  getReasons(): Observable<Reason[]> {
    return this.http.get<Reason[]>(`${this.baseUrl}/reasons`);
  }

  getOpenWhenMessages(): Observable<OpenWhenMessage[]> {
    return this.http.get<OpenWhenMessage[]>(`${this.baseUrl}/open-when`);
  }

  verifyEntry(answer: string): Observable<{ valid: boolean }> {
    return this.http.post<{ valid: boolean }>(`${this.baseUrl}/auth/verify`, { answer });
  }
}
