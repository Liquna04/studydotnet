import { Directive, ElementRef, HostListener, Input } from '@angular/core';

/**
 * Directive to hide dropdown/filter elements when user scrolls
 * Usage: <div appHideOnScroll>...</div>
 */
@Directive({
  selector: '[appHideOnScroll]',
  standalone: true,
})
export class HideOnScrollDirective {
  constructor(private elementRef: ElementRef) {}

  @HostListener('window:wheel', ['$event'])
  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    // Hide the element by adding a class or hiding it directly
    const element = this.elementRef.nativeElement;
    if (element) {
      element.style.display = 'none';
    }
  }
}
