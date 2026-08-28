import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfigService } from './core/services/config.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styles: [':host { display: block; min-height: 100vh; }']
})
export class AppComponent implements OnInit {
  private readonly configService = inject(ConfigService);

  ngOnInit(): void {
    void this.configService.load();
  }
}
