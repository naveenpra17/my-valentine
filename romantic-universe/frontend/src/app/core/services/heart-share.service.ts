import { Injectable, inject } from '@angular/core';
import { ExperienceStateService } from '../experience/experience-state.service';
import { ConfigService } from './config.service';

@Injectable({ providedIn: 'root' })
export class HeartShareService {
  private readonly state = inject(ExperienceStateService);
  private readonly config = inject(ConfigService);

  async generateShareImage(): Promise<Blob | null> {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const herName = this.config.get('HER_NAME', 'you');
    const objects = this.state.selectedHeartObjects();
    const discoveries = this.state.totalDiscoveries();

    ctx.fillStyle = '#050308';
    ctx.fillRect(0, 0, 800, 800);

    const grad = ctx.createRadialGradient(400, 360, 0, 400, 360, 320);
    grad.addColorStop(0, 'rgba(201, 160, 168, 0.25)');
    grad.addColorStop(1, 'rgba(5, 3, 8, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 800);

    this.drawHeart(ctx, 400, 380, 120);

    ctx.fillStyle = '#f5f0e8';
    ctx.font = 'italic 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Our Little Heart', 400, 580);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(245, 240, 232, 0.6)';
    ctx.fillText(`${objects.length} treasures · ${discoveries} discoveries`, 400, 620);
    ctx.fillText(`Made for ${herName}`, 400, 660);

    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/png', 0.92);
    });
  }

  async share(): Promise<boolean> {
    const blob = await this.generateShareImage();
    if (!blob) return false;

    const herName = this.config.get('HER_NAME', 'you');
    const file = new File([blob], 'our-little-heart.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: 'Our Little Heart',
        text: `A little universe made for ${herName}`,
        files: [file]
      });
      return true;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'our-little-heart.png';
    link.click();
    URL.revokeObjectURL(url);
    return true;
  }

  private drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale / 16, scale / 16);
    ctx.beginPath();
    for (let t = 0; t <= Math.PI * 2; t += 0.08) {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(201, 160, 168, 0.8)';
    ctx.lineWidth = 0.15;
    ctx.stroke();
    ctx.fillStyle = 'rgba(201, 160, 168, 0.12)';
    ctx.fill();
    ctx.restore();
  }
}
