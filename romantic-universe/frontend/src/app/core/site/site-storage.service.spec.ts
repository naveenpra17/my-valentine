import { TestBed } from '@angular/core/testing';
import { SiteStorageService } from './site-storage.service';
import { SiteContextService } from './site-context.service';
import { signal } from '@angular/core';

describe('SiteStorageService', () => {
  let storage: SiteStorageService;
  const slugSignal = signal<string | null>('kavi');

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        SiteStorageService,
        {
          provide: SiteContextService,
          useValue: { slug: slugSignal }
        }
      ]
    });
    storage = TestBed.inject(SiteStorageService);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('namespaces keys per site slug', () => {
    storage.setItem(sessionStorage, 'ru_experience_v3', '{"ok":true}');
    expect(sessionStorage.getItem('romantic-universe:kavi:ru_experience_v3')).toBe('{"ok":true}');
  });

  it('migrates legacy global Kavi keys on read', () => {
    sessionStorage.setItem('ru_experience_v3', '{"legacy":true}');
    const value = storage.getItem(sessionStorage, 'ru_experience_v3');
    expect(value).toBe('{"legacy":true}');
    expect(sessionStorage.getItem('romantic-universe:kavi:ru_experience_v3')).toBe('{"legacy":true}');
    expect(sessionStorage.getItem('ru_experience_v3')).toBeNull();
  });

  it('isolates keys between sites', () => {
    storage.setItem(sessionStorage, 'ru_experience_v3', '{"site":"kavi"}');
    slugSignal.set('test-site');
    expect(storage.getItem(sessionStorage, 'ru_experience_v3')).toBeNull();
    storage.setItem(sessionStorage, 'ru_experience_v3', '{"site":"test-site"}');
    expect(sessionStorage.getItem('romantic-universe:test-site:ru_experience_v3')).toBe('{"site":"test-site"}');
  });
});
