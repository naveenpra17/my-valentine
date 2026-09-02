import { TestBed } from '@angular/core/testing';
import { ConfigService } from './config.service';
import { SiteDataService } from '../site/site-data.service';
import { SiteContextService } from '../site/site-context.service';
import { signal } from '@angular/core';

describe('ConfigService', () => {
  let service: ConfigService;
  const bundleSignal = signal({
    site: { slug: 'test-site', name: 'Test Site' },
    config: { HER_NAME: 'TestHer' },
    entryLockEnabled: true,
    entryLockQuestion: 'What is the test password?',
    memories: [],
    photos: [],
    quotes: [],
    reasons: [],
    loveBombs: [],
    openWhenMessages: []
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ConfigService,
        {
          provide: SiteDataService,
          useValue: {
            bundle: bundleSignal,
            loading: signal(false),
            error: signal(null),
            config: signal({
              settings: { HER_NAME: 'TestHer' },
              entryLockEnabled: true,
              entryLockQuestion: 'What is the test password?'
            }),
            get: (key: string, fallback = '') =>
              (bundleSignal()?.config as Record<string, string>)[key] ?? fallback,
            load: jasmine.createSpy('load')
          }
        },
        {
          provide: SiteContextService,
          useValue: { slug: signal('test-site') }
        }
      ]
    });
    service = TestBed.inject(ConfigService);
  });

  it('exposes entry lock question from bundle config, not settings map', () => {
    expect(service.entryLockQuestion()).toBe('What is the test password?');
    expect(service.entryLockEnabled()).toBe(true);
  });
});
