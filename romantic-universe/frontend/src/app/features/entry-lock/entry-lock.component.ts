import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SessionService } from '../../core/services/session.service';
import { StarfieldComponent } from '../../shared/components/starfield/starfield.component';

@Component({
  selector: 'app-entry-lock',
  standalone: true,
  imports: [FormsModule, StarfieldComponent],
  templateUrl: './entry-lock.component.html',
  styleUrl: './entry-lock.component.scss'
})
export class EntryLockComponent {
  readonly question = input('What\'s the nickname only I call you? ❤️');
  readonly unlocked = output<void>();

  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);

  answer = '';
  readonly error = signal<string | null>(null);
  readonly verifying = signal(false);
  readonly shake = signal(false);

  async submit(): Promise<void> {
    if (!this.answer.trim()) {
      this.triggerShake();
      return;
    }

    this.verifying.set(true);
    this.error.set(null);

    try {
      const result = await firstValueFrom(this.api.verifyEntry(this.answer));
      if (result.valid) {
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
