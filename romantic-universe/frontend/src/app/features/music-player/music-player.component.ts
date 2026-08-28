import { Component, inject, input, OnInit } from '@angular/core';
import { AudioService } from '../../core/services/audio.service';

@Component({
  selector: 'app-music-player',
  standalone: true,
  templateUrl: './music-player.component.html',
  styleUrl: './music-player.component.scss'
})
export class MusicPlayerComponent implements OnInit {
  readonly musicUrl = input('/assets/audio/background.mp3');

  readonly audio = inject(AudioService);
  expanded = false;

  ngOnInit(): void {
    this.audio.init(this.musicUrl());
  }

  togglePlay(): void {
    this.audio.toggle();
  }

  toggleMute(): void {
    this.audio.toggleMute();
  }

  onVolumeChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.audio.setVolume(value);
  }
}
