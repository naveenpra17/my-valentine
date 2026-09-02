import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ConfigService } from '../../core/services/config.service';
import { SessionService } from '../../core/services/session.service';
import { SiteContextService } from '../../core/site/site-context.service';
import { StarfieldComponent } from '../../shared/components/starfield/starfield.component';

@Component({
  selector: 'app-entry-lock',
  standalone: true,
  imports: [FormsModule, StarfieldComponent],
  templateUrl: './entry-lock.component.html',
  styleUrl: './entry-lock.component.scss'
})
export class EntryLockComponent {
  readonly question = input('');
  readonly unlocked = output<void>();

  private readonly api = inject(ApiService);
  private readonly config = inject(ConfigService);
  private readonly session = inject(SessionService);
  private readonly siteContext = inject(SiteContextService);

  answer = '';
  readonly error = signal<string | null>(null);
  readonly verifying = signal(false);
  readonly shake = signal(false);

  displayQuestion(): string {
    return this.question() || this.config.entryLockQuestion();
  }

  async submit(): Promise<void> {
    if (!this.answer.trim()) {
      this.triggerShake();
      return;
    }

    this.verifying.set(true);
    this.error.set(null);

    try {
      const slug = this.siteContext.requireSlug();
      const result = await firstValueFrom(this.api.unlockSite(slug, this.answer));
      if (result.unlocked) {
        this.session.markUnlocked();
        this.unlocked.emit();
      } else {
        this.error.set('Hmm, that\'s not quite right... try again? 💕');
        this.triggerShake();
      }
    } catch {
      this.error.set('Something went wrong. Please try again.');
    } finally {
      this.verifying.set(false);
    }
  }

  private triggerShake(): void {
    this.shake.set(true);
    setTimeout(() => this.shake.set(false), 500);
  }
}
