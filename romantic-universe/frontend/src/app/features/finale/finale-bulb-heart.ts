/** Canvas heart made of spaced glowing bulbs — matches the original finale secret. */

interface BulbParticle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  arrived: boolean;
  isBurst: boolean;
}

const BULB_COLORS = ['#c9a0a8', '#9a8fa8', '#c4b08a', '#f5f0e8', '#d4b0b8'];
const OVERLAY_CLASS = 'finale-bulb-heart-overlay';

export class FinaleBulbHeartRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly overlay: HTMLElement | null;
  private readonly reducedMotion: boolean;
  private readonly mobile: boolean;
  private readonly onComplete?: () => void;
  private readonly onHoldStart?: () => void;
  private readonly holdMinMs: number;
  private holdStartFired = false;
  private dpr = 1;
  private cssWidth = 0;
  private cssHeight = 0;
  private particles: BulbParticle[] = [];
  private heartPoints: { x: number; y: number }[] = [];
  private animationId = 0;
  private pulsePhase = 0;
  private heartOutlineProgress = 0;
  private running = false;
  private phase: 'burst' | 'converge' | 'hold' = 'burst';
  private convergeStart = 0;
  private holdStartedAt = 0;
  private completeFired = false;
  private onResize = (): void => this.resize();

  static mount(
    reducedMotion = false,
    mobile = false,
    onComplete?: () => void,
    onHoldStart?: () => void
  ): FinaleBulbHeartRenderer {
    const overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;
    overlay.setAttribute('aria-hidden', 'true');

    const canvas = document.createElement('canvas');
    canvas.className = 'finale-bulb-heart-overlay__canvas';
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    const renderer = new FinaleBulbHeartRenderer(
      canvas,
      reducedMotion,
      mobile,
      overlay,
      onComplete,
      onHoldStart
    );
    renderer.start();
    return renderer;
  }

  constructor(
    canvas: HTMLCanvasElement,
    reducedMotion = false,
    mobile = false,
    overlay: HTMLElement | null = null,
    onComplete?: () => void,
    onHoldStart?: () => void
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2d unavailable');
    this.ctx = ctx;
    this.overlay = overlay;
    this.reducedMotion = reducedMotion;
    this.mobile = mobile;
    this.onComplete = onComplete;
    this.onHoldStart = onHoldStart;
    this.holdMinMs = reducedMotion ? 2200 : 3800;
    this.resize();
    window.addEventListener('resize', this.onResize);
  }

  start(): void {
    if (this.running) return;
    this.resize();
    if (this.cssWidth < 10 || this.cssHeight < 10) return;

    this.running = true;
    this.phase = 'burst';
    this.completeFired = false;
    this.holdStartFired = false;
    this.heartOutlineProgress = 0;
    this.generateHeartPoints();
    this.spawnBurst();
    this.convergeStart = performance.now() + (this.reducedMotion ? 700 : 1600);
    this.animate();
  }

  /** Already-formed glowing heart — for "stay in this moment". */
  startHoldGlow(): void {
    if (this.running) return;
    this.resize();
    if (this.cssWidth < 10 || this.cssHeight < 10) return;

    this.running = true;
    this.phase = 'hold';
    this.completeFired = false;
    this.holdStartFired = true;
    this.heartOutlineProgress = 1;
    this.holdStartedAt = performance.now();
    this.generateHeartPoints();
    this.particles = this.heartPoints.map((target, i) => ({
      x: target.x,
      y: target.y,
      targetX: target.x,
      targetY: target.y,
      vx: 0,
      vy: 0,
      size: 1.5 + Math.random() * 2.5,
      color: BULB_COLORS[i % BULB_COLORS.length],
      arrived: true,
      isBurst: false
    }));
    this.onHoldStart?.();
    this.animate();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationId);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.particles = [];
    this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    this.overlay?.remove();
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssWidth = window.innerWidth;
    this.cssHeight = window.innerHeight;
    this.canvas.width = Math.max(1, Math.round(this.cssWidth * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.cssHeight * this.dpr));
    this.canvas.style.width = `${this.cssWidth}px`;
    this.canvas.style.height = `${this.cssHeight}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.cssWidth > 10 && this.cssHeight > 10) {
      this.generateHeartPoints();
    }
  }

  private generateHeartPoints(): void {
    const cx = this.cssWidth / 2;
    const cy = this.cssHeight * 0.36;
    const scale = Math.min(this.cssWidth, this.cssHeight) * 0.013;

    this.heartPoints = [];
    for (let t = 0; t < Math.PI * 2; t += 0.12) {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      this.heartPoints.push({ x: cx + x * scale, y: cy + y * scale });
    }
  }

  private spawnBurst(): void {
    const cx = this.cssWidth / 2;
    const cy = this.cssHeight * 0.36;
    const count = this.reducedMotion ? 35 : this.mobile ? 100 : 160;

    this.particles = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      return {
        x: cx,
        y: cy,
        targetX: cx,
        targetY: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 2 + Math.random() * 4,
        color: BULB_COLORS[Math.floor(Math.random() * BULB_COLORS.length)],
        arrived: false,
        isBurst: true
      };
    });
  }

  private spawnConverge(): void {
    const count = this.heartPoints.length;

    this.particles = Array.from({ length: count }, (_, i) => {
      const edge = Math.floor(Math.random() * 4);
      let x = Math.random() * this.cssWidth;
      let y = Math.random() * this.cssHeight;
      if (edge === 0) y = -10;
      else if (edge === 1) y = this.cssHeight + 10;
      else if (edge === 2) x = -10;
      else x = this.cssWidth + 10;

      const target = this.heartPoints[i];
      return {
        x,
        y,
        targetX: target.x,
        targetY: target.y,
        vx: 0,
        vy: 0,
        size: 1.5 + Math.random() * 2.5,
        color: BULB_COLORS[Math.floor(Math.random() * BULB_COLORS.length)],
        arrived: false,
        isBurst: false
      };
    });
    this.phase = 'converge';
  }

  private animate = (): void => {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(this.animate);

    if (this.phase === 'burst' && performance.now() >= this.convergeStart) {
      this.spawnConverge();
    }

    this.updateParticles();
    this.draw();
    this.pulsePhase += 0.02;
    this.maybeComplete();
  };

  private maybeComplete(): void {
    if (this.completeFired || this.phase !== 'hold' || !this.holdStartedAt) return;
    if (performance.now() - this.holdStartedAt < this.holdMinMs) return;
    this.completeFired = true;
    this.onComplete?.();
  }

  private updateParticles(): void {
    let arrivedCount = 0;

    for (const p of this.particles) {
      if (p.isBurst) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.vx *= 0.98;
        continue;
      }

      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1.5) {
        const ease = 0.035 + (1 - Math.min(dist / 400, 1)) * 0.02;
        p.x += dx * ease;
        p.y += dy * ease;
      } else {
        p.arrived = true;
        p.x = p.targetX;
        p.y = p.targetY;
      }

      if (p.arrived) arrivedCount++;
    }

    const outlineParticles = this.particles.filter(p => !p.isBurst).length;
    if (outlineParticles > 0) {
      const targetProgress = arrivedCount / outlineParticles;
      this.heartOutlineProgress += (targetProgress - this.heartOutlineProgress) * 0.04;
    }

    if (this.phase === 'converge' && this.heartOutlineProgress > 0.88) {
      this.phase = 'hold';
      this.holdStartedAt = performance.now();
      if (!this.holdStartFired) {
        this.holdStartFired = true;
        this.onHoldStart?.();
      }
    }

    this.particles = this.particles.filter(p => {
      if (!p.isBurst) return true;
      return (
        p.y < this.cssHeight + 30 &&
        p.x > -30 &&
        p.x < this.cssWidth + 30
      );
    });
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    if (this.heartOutlineProgress > 0.05 || this.phase === 'hold') {
      this.drawHeartAura();
    }

    if (this.heartOutlineProgress > 0.05 && this.heartPoints.length > 1) {
      this.drawHeartOutline();
    }

    for (const p of this.particles) {
      this.drawBulb(p);
    }
  }

  private drawHeartAura(): void {
    const cx = this.cssWidth / 2;
    const cy = this.cssHeight * 0.36;
    const heldFor = this.holdStartedAt ? (performance.now() - this.holdStartedAt) / 1000 : 0;
    const pulse = this.phase === 'hold'
      ? 0.55 + Math.sin(heldFor * 2.2) * 0.2
      : 0.2 + this.heartOutlineProgress * 0.25;
    const radius = Math.min(this.cssWidth, this.cssHeight) * (0.14 + pulse * 0.04);

    const aura = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    aura.addColorStop(0, `rgba(255, 248, 240, ${pulse * 0.22})`);
    aura.addColorStop(0.35, `rgba(201, 160, 168, ${pulse * 0.14})`);
    aura.addColorStop(0.7, `rgba(154, 143, 168, ${pulse * 0.06})`);
    aura.addColorStop(1, 'rgba(5, 3, 8, 0)');

    this.ctx.fillStyle = aura;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawHeartOutline(): void {
    const visible = this.phase === 'hold'
      ? this.heartPoints.length
      : Math.floor(this.heartPoints.length * this.heartOutlineProgress);
    if (visible < 2) return;

    const heldFor = this.holdStartedAt ? (performance.now() - this.holdStartedAt) / 1000 : 0;
    const glow = this.phase === 'hold'
      ? 0.35 + Math.sin(heldFor * 2.8) * 0.15
      : 0.12 + this.heartOutlineProgress * 0.2;

    this.ctx.strokeStyle = `rgba(201, 160, 168, ${glow})`;
    this.ctx.lineWidth = this.phase === 'hold' ? 2.5 : 1.5;
    this.ctx.shadowColor = 'rgba(201, 160, 168, 0.45)';
    this.ctx.shadowBlur = this.phase === 'hold' ? 12 : 4;
    this.ctx.beginPath();
    this.ctx.moveTo(this.heartPoints[0].x, this.heartPoints[0].y);
    for (let i = 1; i < visible; i++) {
      this.ctx.lineTo(this.heartPoints[i].x, this.heartPoints[i].y);
    }
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  private drawBulb(p: BulbParticle): void {
    const pulse = p.arrived && !p.isBurst
      ? 1 + Math.sin(this.pulsePhase + p.x * 0.01) * 0.22
      : p.isBurst
        ? 1 + Math.sin(this.pulsePhase * 2.5) * 0.1
        : 1;
    const r = p.size * pulse;

    const glowR = r * (p.arrived ? 3.2 : 2.2);
    const glow = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
    glow.addColorStop(0, '#fffdf8');
    glow.addColorStop(0.25, p.color);
    glow.addColorStop(0.6, `${p.color}66`);
    glow.addColorStop(1, 'rgba(5, 3, 8, 0)');

    this.ctx.globalAlpha = p.arrived ? 0.92 : 0.6;
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.globalAlpha = p.arrived ? 0.95 : 0.7;
    this.ctx.fillStyle = p.color;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    this.ctx.fill();

    if (p.arrived && !p.isBurst) {
      this.ctx.globalAlpha = 0.85;
      this.ctx.fillStyle = '#fffdf8';
      this.ctx.beginPath();
      this.ctx.arc(p.x - r * 0.2, p.y - r * 0.2, r * 0.38, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
  }
}
