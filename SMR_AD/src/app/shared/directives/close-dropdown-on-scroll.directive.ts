import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: 'nz-select, nz-date-picker',
  standalone: true,
})
export class CloseDropdownOnScrollDirective {
  constructor(private elementRef: ElementRef) {}

  @HostListener('window:wheel', ['$event'])
  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    // Find the nz-select or nz-date-picker component
    const nzSelectElement =
      this.elementRef.nativeElement.querySelector('nz-select');
    const nzDatePickerElement =
      this.elementRef.nativeElement.querySelector('nz-date-picker');

    if (nzSelectElement) {
      // Close dropdown by triggering blur
      const input = nzSelectElement.querySelector('input');
      if (input) {
        input.blur();
      }
    }

    if (nzDatePickerElement) {
      // Close date picker by triggering blur
      const input = nzDatePickerElement.querySelector('input');
      if (input) {
        input.blur();
      }
    }

    // Also try to close any visible dropdown/picker overlays
    const dropdowns = document.querySelectorAll(
      '.ant-dropdown, .ant-picker-dropdown, .ant-select-dropdown'
    );
    dropdowns.forEach((dropdown) => {
      const element = dropdown as HTMLElement;
      if (element.offsetParent !== null) {
        // Element is visible, hide it by removing from DOM or adding hidden class
        element.setAttribute('style', 'display: none !important');
      }
    });
  }
}
