import { Component, Input, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';

type StateType = 'loading' | 'empty' | 'success' | 'error' | 'onboarding';

const ANIMATION_PATHS: Record<StateType, string> = {
  loading: 'assets/animations/loading.json',
  empty: 'assets/animations/empty-state.json',
  success: 'assets/animations/success.json',
  error: 'assets/animations/error.json',
  onboarding: 'assets/animations/onboarding.json',
};

const FALLBACK_DATA: Record<StateType, object> = {
  loading: { v: '5.5.7', fr: 30, ip: 0, op: 60, w: 200, h: 200, nm: 'loading', ddd: 0, assets: [], layers: [{ ddd: 0, ind: 0, ty: 4, nm: 'circle', sr: 1, ks: { o: { a: 0, k: 100 }, r: { a: 1, k: [{ t: 0, s: [0], e: [360] }, { t: 60, s: [360] }] }, p: { a: 0, k: [100, 100] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] } }, ao: 0, shapes: [{ ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [40, 40] } }, { ty: 'st', c: { a: 0, k: [0.2, 0.4, 0.8, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 4 } }], ip: 0, op: 60, st: 0 }] },
  empty: { v: '5.5.7', fr: 30, ip: 0, op: 60, w: 200, h: 200, nm: 'empty', ddd: 0, assets: [], layers: [] },
  success: { v: '5.5.7', fr: 30, ip: 0, op: 60, w: 200, h: 200, nm: 'success', ddd: 0, assets: [], layers: [] },
  error: { v: '5.5.7', fr: 30, ip: 0, op: 60, w: 200, h: 200, nm: 'error', ddd: 0, assets: [], layers: [] },
  onboarding: { v: '5.5.7', fr: 30, ip: 0, op: 60, w: 200, h: 200, nm: 'onboarding', ddd: 0, assets: [], layers: [] },
};

@Component({
  selector: 'app-lottie-state',
  standalone: true,
  template: `
    <div class="lottie-state-container" [class]="'lottie-' + state">
      <div #animationContainer class="lottie-animation"
           [style.width.px]="width" [style.height.px]="height"></div>
      @if (message) {
        <p class="lottie-message">{{ message }}</p>
      }
      @if (messageAr) {
        <p class="lottie-message-ar" dir="rtl">{{ messageAr }}</p>
      }
    </div>
  `,
  styles: [`
    .lottie-state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 2rem;
    }
    .lottie-message {
      font-size: var(--font-size-base);
      color: var(--text-02, #525252);
      text-align: center;
      margin: 0;
    }
    .lottie-message-ar {
      font-family: 'IBM Plex Sans Arabic', 'Tajawal', sans-serif;
      font-size: var(--font-size-base);
      color: var(--text-02, #525252);
      text-align: center;
      margin: 0;
    }
  `],
})
export class LottieStateComponent implements OnInit, OnDestroy {
  @Input() state: StateType = 'loading';
  @Input() message = '';
  @Input() messageAr = '';
  @Input() width = 200;
  @Input() height = 200;
  @Input() loop = true;
  @Input() autoplay = true;
  @Input() animationPath?: string;

  @ViewChild('animationContainer', { static: true }) containerRef!: ElementRef<HTMLElement>;

  private animationInstance: any = null;

  async ngOnInit(): Promise<void> {
    try {
      const lottie = (await import('lottie-web')).default;
      const path = this.animationPath || ANIMATION_PATHS[this.state];

      this.animationInstance = lottie.loadAnimation({
        container: this.containerRef.nativeElement,
        renderer: 'svg',
        loop: this.loop,
        autoplay: this.autoplay,
        path,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid slice',
        },
      });

      this.animationInstance.addEventListener('data_failed', () => {
        this.animationInstance?.destroy();
        this.animationInstance = lottie.loadAnimation({
          container: this.containerRef.nativeElement,
          renderer: 'svg',
          loop: this.loop,
          autoplay: this.autoplay,
          animationData: FALLBACK_DATA[this.state],
        });
      });
    } catch {
      this.containerRef.nativeElement.innerHTML = `<div style="width:${this.width}px;height:${this.height}px;display:flex;align-items:center;justify-content:center;color:var(--text-03)">
        <span>${this.state === 'loading' ? '...' : ''}</span>
      </div>`;
    }
  }

  ngOnDestroy(): void {
    this.animationInstance?.destroy();
  }
}
