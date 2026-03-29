import { APP_INITIALIZER, Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GlobalScrollService {
  private scrollTimeout: any;
  private isScrolling$ = new Subject<boolean>();

  constructor() {
    // Disabled: scroll-based dropdown hiding removed
    // this.initializeScrollListener();
  }

  // Disabled: scroll-based dropdown hiding removed
  // private initializeScrollListener(): void {
  //   window.addEventListener('wheel', () => this.handleScroll(), { passive: true });
  //   window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
  // }

  // Disabled: scroll-based dropdown hiding removed
  // private handleScroll(): void {
  //   this.closeAllDropdowns();
  //   this.isScrolling$.next(true);
  //   clearTimeout(this.scrollTimeout);
  //   this.scrollTimeout = setTimeout(() => {
  //     this.isScrolling$.next(false);
  //   }, 150);
  // }

  // Disabled: scroll-based dropdown hiding removed
  // private closeAllDropdowns(): void {
  //   const dropdowns = document.querySelectorAll(
  //     '.ant-dropdown, .ant-dropdown-menu, .ant-picker-dropdown, .ant-select-dropdown, .ant-popover'
  //   );
  //   dropdowns.forEach((dropdown) => {
  //     const element = dropdown as HTMLElement;
  //     if (element.style.display !== 'none') {
  //       element.style.display = 'none !important';
  //       element.style.visibility = 'hidden !important';
  //       element.style.opacity = '0 !important';
  //       element.style.pointerEvents = 'none !important';
  //     }
  //   });
  //   window.dispatchEvent(new CustomEvent('dropdownsClosed'));
  // }

  getScrolling$ = this.isScrolling$.asObservable();
}

export const globalScrollInitializer = () => {
  return () => {
    // Disabled: scroll-based dropdown hiding removed
    // new GlobalScrollService();
  };
};
