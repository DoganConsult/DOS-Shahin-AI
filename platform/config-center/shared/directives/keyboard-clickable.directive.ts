/**
 * Keyboard Clickable Directive
 * 
 * Makes clickable elements keyboard accessible by adding Enter and Space key handlers.
 * 
 * Usage:
 *   <div (click)="doSomething()" appKeyboardClickable>Click me</div>
 * 
 * This automatically adds:
 *   - tabindex="0" (if not already present)
 *   - role="button" (if element is not a button/link)
 *   - (keyup.enter) and (keyup.space) handlers that call the same function as (click)
 * 
 * Requirements: ui-ux-a1
 */

import { Directive, ElementRef, HostListener, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appKeyboardClickable]',
  standalone: true,
})
export class KeyboardClickableDirective implements OnInit {
  @Input() appKeyboardClickable?: () => void; // Optional: if provided, this function is called instead of click event

  private clickHandler?: () => void;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    const element = this.el.nativeElement;
    const tagName = element.tagName.toLowerCase();

    // Only apply to non-interactive elements (buttons, links, inputs already have keyboard support)
    if (tagName === 'button' || tagName === 'a' || tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return;
    }

    // Add tabindex if not present
    if (!element.hasAttribute('tabindex')) {
      this.renderer.setAttribute(element, 'tabindex', '0');
    }

    // Add role="button" if not already a button/link and no role is set
    if (!element.hasAttribute('role') && tagName !== 'button' && tagName !== 'a') {
      this.renderer.setAttribute(element, 'role', 'button');
    }

    // Find the click handler from the element's event listeners
    // Note: Angular doesn't expose event listeners directly, so we'll use a different approach
    // We'll rely on the HostListener decorators to handle the keyboard events
  }

  @HostListener('keyup.enter', ['$event'])
  @HostListener('keyup.space', ['$event'])
  onKeyboardActivate(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // If a custom handler is provided, use it
    if (this.appKeyboardClickable) {
      this.appKeyboardClickable();
      return;
    }

    // Otherwise, trigger a click event programmatically
    // This will fire any (click) handlers attached to the element
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    this.el.nativeElement.dispatchEvent(clickEvent);
  }

  @HostListener('keydown.space', ['$event'])
  onSpaceKeydown(event: KeyboardEvent): void {
    // Prevent default scrolling behavior when Space is pressed
    event.preventDefault();
  }
}
