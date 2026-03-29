import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { ShareModule } from '../../shared/share-module';
import { GlobalService } from '../../service/global.service';
import { SidebarMenuService } from '../../service/sidebar-menu.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    NzLayoutModule,
    RouterModule,
    NzMenuModule,
    NzIconModule,
    NzSpinModule,
    CommonModule,
    NzDropDownModule,
    NzAvatarModule,
    NzBreadCrumbModule,
    ShareModule,
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  animations: [],
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  // Start collapsed by default to avoid sidebar briefly flashing open on page load
  isCollapsed: boolean = true;
  isMobile: boolean = false;
  // track whether mobile sidebar was opened by user interaction
  private mobileOpenedByUser: boolean = false;
  loading: boolean = false;
  user: any = {};
  userAvatar: string = '/img/profile.png';
  hasAvatar: boolean = true;
  displayName: string = '';
  rawSidebarMenu: any[] = [];
  dataSidebarMenu: any[] = [];
  breadcrumbs: any = [];
  currentUrl: string = '';
  private resizeListener!: () => void;
  // Prevent rendering the sider until layout is initialized to avoid flash/overlay on load
  layoutReady: boolean = false;

  constructor(
    private sidebarMenuService: SidebarMenuService,
    private globalService: GlobalService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.user = this.globalService.getUserInfo();
    this.displayName =
      (this.user && (this.user.fullName || this.user.userName)) || '';
    this.globalService.breadcrumbSubject.subscribe((value) => {
      this.breadcrumbs = value;
    });
    this.globalService.getLoading().subscribe((value) => {
      this.loading = value;
    });
    this.router.events.subscribe(() => {
      const newUrl = this.router.url?.split('?')[0] || '';
      // Only rebuild menus if URL actually changed to prevent unnecessary side effects
      if (newUrl !== this.currentUrl) {
        this.currentUrl = newUrl;
        this.rebuildMenus();
      }
    });
  }

  ngOnInit(): void {
    if (this.user.urlImage != null && this.user.urlImage != '') {
      this.userAvatar = environment.urlFiles + this.user.urlImage;
    }
    this.hasAvatar = !!this.userAvatar;
    this.checkScreenSize();
    this.getSidebarMenu();

    // Defer making the sider visible in the DOM until after initial checks complete
    setTimeout(() => {
      this.layoutReady = true;
      this.cdr.detectChanges();
    }, 0);

    // Create and store the resize listener
    this.resizeListener = () => this.checkScreenSize();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  /**
   * Check if screen is mobile size and auto-collapse sidebar accordingly
   */
  private checkScreenSize(): void {
    const screenWidth = window.innerWidth;

    // Treat widths 1024px and below as 'mobile/tablet' where the sider should start collapsed.
    // This avoids the previous heuristic (screenWidth - siderWidth < 768) which could leave the
    // sider in an open state after refresh on certain tablet widths and cause the overlay issue.
    this.isMobile = screenWidth <= 1024;

    // Explicitly set collapsed state based on device type. This avoids leaving the sider
    // open on small screens after refresh which caused the overlay to cover content.
    this.isCollapsed = this.isMobile ? true : false;

    this.updateOverlayClass();
    this.cdr.detectChanges();
  }

  /**
   * Toggle sidebar collapse state
   */
  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    // If user toggled the sidebar open on mobile, remember that to show overlay
    if (this.isMobile && !this.isCollapsed) {
      this.mobileOpenedByUser = true;
    }
    // If user closed the sidebar, reset the flag
    if (this.isMobile && this.isCollapsed) {
      this.mobileOpenedByUser = false;
    }
    this.updateOverlayClass();
  }

  /**
   * Update CSS class for mobile overlay
   */
  private updateOverlayClass(): void {
    const layoutElement = document.querySelector('.full-layout');
    if (layoutElement) {
      // Only show the overlay when the user explicitly opened the sidebar on mobile.
      if (this.isMobile && !this.isCollapsed && this.mobileOpenedByUser) {
        layoutElement.classList.add('mobile-sidebar-open');
      } else {
        layoutElement.classList.remove('mobile-sidebar-open');
      }
    }
  }

  /**
   * Handle overlay click to close sidebar on mobile
   */
  onOverlayClick(event: Event): void {
    // Only close sidebar if clicking on the overlay (not sidebar content)
    if (this.isMobile && !this.isCollapsed) {
      const target = event.target as HTMLElement;
      const sider = document.querySelector('.ant-layout-sider');

      // Check if click is outside sidebar
      if (sider && !sider.contains(target)) {
        this.isCollapsed = true;
        // reset the user-opened flag when overlay is clicked to close
        this.mobileOpenedByUser = false;
        this.updateOverlayClass();
        this.cdr.detectChanges();
      }
    }
  }

  onAvatarError(): void {
    this.hasAvatar = false;
    this.cdr.detectChanges();
  }
  getSidebarMenu() {
    this.sidebarMenuService
      .getMenuOfUser({ userName: this.user.userName })
      .subscribe((res) => {
        this.rawSidebarMenu = res?.children || [];
        console.log(
          '📋 Sidebar menu items:',
          this.rawSidebarMenu.map((m) => m.name)
        );
        this.rebuildMenus();
      });
  }

  /**
   * Rebuild the sidebar menu from raw data and ensure custom 'Đơn hàng hàng hóa khác' menu exists.
   */
  private rebuildMenus(): void {
    this.dataSidebarMenu = this.transformMenuList(this.rawSidebarMenu);
    this.ensureOrderMenu();
    this.cdr.detectChanges();
  }

  /**
   * Ensure 'Đơn hàng HHK' menu is available - use backend data when possible,
   * fallback to synthetic when user doesn't have permission.
   *
   * Note: MNU3 'Đơn hàng HHK' exists in database but may not be accessible
   * to all users due to permission settings. This fallback ensures the
   * functionality remains available during development/testing.
   */
  private ensureOrderMenu(): void {
    const hasOrderMenu = this.dataSidebarMenu.some((m: any) => {
      if ((m.title || '').trim() === 'Đơn hàng HHK') return true;
      if (m.children) {
        return m.children.some((c: any) => (c.url || '').startsWith('order/'));
      }
      return false;
    });

    // If menu exists from backend (user has permission), use it
    if (hasOrderMenu) return;

    // Fallback: create synthetic menu when user doesn't have DB permission
    // This matches the structure in database MNU3 with children MNU3.1-MNU3.4
    const childDefs = [
      { title: 'Danh sách', url: 'order/list' },
      { title: 'Tạo đơn hàng mới', url: 'order/create' },
      { title: 'Danh sách trả hàng', url: 'order/return-list' },
      { title: 'Tạo đơn trả hàng', url: 'order/return-create' },
    ];

    const syntheticChildren = childDefs.map((def) => ({
      level: 2,
      title: def.title,
      icon: '',
      open: false,
      url: def.url,
      selected: `/${def.url}` === this.currentUrl,
      disabled: false,
      children: undefined,
    }));

    const syntheticMenu = {
      level: 1,
      title: 'Đơn hàng HHK',
      icon: 'shopping-cart',
      open: this.currentUrl.startsWith('/order/'),
      url: undefined, // Parent menu, no direct URL (matches DB structure)
      selected: false,
      disabled: false,
      children: syntheticChildren,
    } as any;

    // Insert near top (after first item) or at end if empty
    if (this.dataSidebarMenu.length > 0) {
      this.dataSidebarMenu.splice(1, 0, syntheticMenu);
    } else {
      this.dataSidebarMenu.push(syntheticMenu);
    }
  }
  transformMenuList(data: any[], level = 1): any[] {
    if (!data) {
      return [];
    }
    // Recursively filter out 'Người dùng'
    // Also filter out 'Quản trị hệ thống' (R1 permission) for KH (customer) users
    const filteredData = data.filter((item) => {
      if (item.name === 'Người dùng') {
        return false;
      }
      // Hide "Quản trị hệ thống" for KH (customer) account type
      // Check by name or by ID starting with 'R' (R1, R2, etc for admin rights)
      const isAdminMenu =
        item.name === 'Quản trị hệ thống' || item.id?.startsWith('R');
      if (isAdminMenu && this.user.accountType === 'KH') {
        return false;
      }
      return true;
    });
    return filteredData.map((menu) => this.transformMenu(menu, level));
  }

  transformMenu(data: any, level = 0): any {
    const hasMatchingChild = (menu: any, url: string): boolean => {
      if (menu.url && `/${menu.url}` === url) {
        return true;
      }
      if (menu.children) {
        return menu.children.some((child: any) => hasMatchingChild(child, url));
      }
      return false;
    };

    // Build transformed children
    const transformedChildren = data.children
      ? this.transformMenuList(data.children, level + 1)
      : undefined;

    // Normalize common capitalization issues (e.g., 'Trang Chủ' -> 'Trang chủ')
    let rawTitle = (data.name || data.title || '').toString().trim();
    if (rawTitle === 'Trang Chủ') {
      rawTitle = 'Trang chủ';
    }

    return {
      level: level,
      title: rawTitle,
      icon: data.icon || '',
      open: hasMatchingChild(data, this.currentUrl),
      url: data.url,
      selected: `/${data.url}` === this.currentUrl,
      disabled: false,
      children: transformedChildren,
    };
  }
  navigateTo(url: string): void {
    if (url && !this.loading) {
      this.router.navigate([url]);
    }
  }
  changePass(): void {
    this.router.navigate(['/system-manager/profile']);
  }
  logOut() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
