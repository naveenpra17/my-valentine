import { TestBed } from '@angular/core/testing';
import { ExperienceStateService } from './experience-state.service';
import { SiteContextService } from '../site/site-context.service';
import { signal } from '@angular/core';

describe('ExperienceStateService', () => {
  let service: ExperienceStateService;
  const slugSignal = signal<string | null>('kavi');

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ExperienceStateService,
        {
          provide: SiteContextService,
          useValue: { slug: slugSignal }
        }
      ]
    });
    service = TestBed.inject(ExperienceStateService);
    service.initializeForSite();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('persists experienceStarted on set with site namespace', () => {
    service.setExperienceStarted(true);
    const raw = sessionStorage.getItem('romantic-universe:kavi:ru_experience_v3');
    expect(raw).toBeTruthy();
    const data = JSON.parse(raw!);
    expect(data.experienceStarted).toBe(true);
  });

  it('restores from namespaced sessionStorage on init', () => {
    sessionStorage.setItem(
      'romantic-universe:kavi:ru_experience_v3',
      JSON.stringify({
        discoveredPhotos: [],
        discoveredMemories: [],
        discoveredReasons: [],
        activatedQuotes: [],
        triggeredLoveBombs: [],
        discoveredFlowers: [],
        foundSecrets: [],
        openedEnvelopes: [],
        selectedHeartObjects: [],
        heartPool: [],
        constellationStars: [],
        currentChapter: 0,
        musicEnabled: false,
        experienceStarted: true,
        experienceCompleted: true
      })
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ExperienceStateService,
        {
          provide: SiteContextService,
          useValue: { slug: signal('kavi') }
        }
      ]
    });
    const fresh = TestBed.inject(ExperienceStateService);
    fresh.initializeForSite();
    expect(fresh.experienceStarted()).toBe(true);
    expect(fresh.experienceCompleted()).toBe(true);
  });

  it('resets session clears namespaced persistence', () => {
    service.setExperienceStarted(true);
    service.resetSession();
    expect(service.experienceStarted()).toBe(false);
    expect(sessionStorage.getItem('romantic-universe:kavi:ru_experience_v3')).toBeNull();
  });
});
