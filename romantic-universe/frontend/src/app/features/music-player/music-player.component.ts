import { Component, effect, inject, input } from '@angular/core';
import { MusicalChoreographyService } from '../../core/audio/musical-choreography.service';

@Component({
  selector: 'app-music-player',
  standalone: true,
  templateUrl: './music-player.component.html',
  styleUrl: './music-player.component.scss'
})
export class MusicPlayerComponent {
  readonly musicUrl = input('/assets/audio/background.mp3');

  readonly music = inject(MusicalChoreographyService);

  constructor() {
    effect(() => {
      const url = this.musicUrl();
      if (url) this.music.setBackgroundUrl(url);
    });
  }

  onSoundToggle(): void {
    if (!this.music.enabled()) {
      this.music.enable();
      this.music.onFirstInteraction();
      return;
    }
    this.music.toggleMute();
  }
}
