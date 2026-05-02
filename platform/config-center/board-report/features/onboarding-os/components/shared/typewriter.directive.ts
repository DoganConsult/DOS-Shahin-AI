import { Directive, Input, ElementRef, OnChanges, SimpleChanges, inject, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appTypewriter]',
  standalone: true,
})
export class TypewriterDirective implements OnChanges, OnDestroy {
  @Input('appTypewriter') text = '';
  @Input() typeSpeed = 35;

  private el = inject(ElementRef);
  private timeout?: ReturnType<typeof setTimeout>;
  private currentIndex = 0;
  private lastText = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['text'] && this.text && this.text !== this.lastText) {
      this.lastText = this.text;
      this.startTyping();
    }
  }

  ngOnDestroy(): void {
    if (this.timeout) clearTimeout(this.timeout);
  }

  private startTyping(): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.currentIndex = 0;
    this.el.nativeElement.textContent = '';
    this.el.nativeElement.classList.add('typewriter-active');
    this.typeNext();
  }

  private typeNext(): void {
    const textBuffer = this.text || '';
    if (this.currentIndex <= textBuffer.length) {
      this.el.nativeElement.textContent = textBuffer.slice(0, this.currentIndex);
      this.currentIndex++;
      this.timeout = setTimeout(() => this.typeNext(), this.typeSpeed);
    } else {
      this.el.nativeElement.classList.remove('typewriter-active');
    }
  }
}
