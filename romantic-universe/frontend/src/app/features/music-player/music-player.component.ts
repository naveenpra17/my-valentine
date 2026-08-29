import { Component, inject, input } from '@angular/core';
import { MusicalChoreographyService } from '../../core/audio/musical-choreography.service';

@Component({
  selector: 'app-music-player',
  standalone: true,
  templateUrl: './music-player.component.html',
  styleUrl: './music-player.component.scss'
})
export class MusicPlayerComponent {
  /** Legacy config key — procedural layers are used; file optional for future stems. */
  readonly musicUrl = input('/assets/audio/background.mp3');

  readonly music = inject(MusicalChoreographyService);

  onSoundToggle(): void {
    if (!this.music.enabled()) {
      this.music.enable();
      this.music.onFirstInteraction();
      return;
    }
    this.music.toggleMute();
  }
}
