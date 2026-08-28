import { TestBed } from '@angular/core/testing';
import { ExperienceStateService } from './experience-state.service';

describe('ExperienceStateService', () => {
  let service: ExperienceStateService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExperienceStateService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('persists experienceStarted on set', () => {
    service.setExperienceStarted(true);
    const raw = sessionStorage.getItem('ru_experience_v3');
    expect(raw).toBeTruthy();
    const data = JSON.parse(raw!);
    expect(data.experienceStarted).toBe(true);
  });

  it('persists experienceCompleted on set', () => {
    service.setExperienceCompleted(true);
    const raw = sessionStorage.getItem('ru_experience_v3');
    const data = JSON.parse(raw!);
    expect(data.experienceCompleted).toBe(true);
  });

  it('serialize reflects actual started/completed values', () => {
    service.setExperienceStarted(true);
    service.setExperienceCompleted(true);
    const data = service.exportForShare();
    expect(data.experienceStarted).toBe(true);
    expect(data.experienceCompleted).toBe(true);
  });

  it('restores from sessionStorage on init', () => {
    sessionStorage.setItem(
      'ru_experience_v3',
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
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(ExperienceStateService);
    expect(fresh.experienceStarted()).toBe(true);
    expect(fresh.experienceCompleted()).toBe(true);
  });

  it('resets session clears persistence', () => {
    service.setExperienceStarted(true);
    service.resetSession();
    expect(service.experienceStarted()).toBe(false);
    expect(sessionStorage.getItem('ru_experience_v3')).toBeNull();
  });
});
