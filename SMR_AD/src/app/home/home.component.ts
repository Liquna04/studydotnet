import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  NgZone,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { GlobalService } from '../service/global.service';
import { Router } from '@angular/router';
import { OrderService, Order } from '../service/order.service';
import { StoreService } from '../service/master-data/store.service';
import { AccountStoreService } from '../service/master-data/account-store.service';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';

interface DashboardCard {
  title: string;
  // Dashboard card colors update
  // New color palette

  value: number;
  color: string;
  icon: string;
  change?: string;
}

interface OrderData {
  orderId: string;
  orderDate: string;
  createdDate: string;
  status: string;
  amount: number;
  supplier: string;
  // Optional fields to match order-list table columns when embedded in Home
  vehicle?: string;
  expireDate?: string;
  shipmentCount?: number;
  creator?: string;
}

interface DeliveryData {
  orderId: string;
  destination: string;
  status: string;
  estimatedDate: string;
}

interface OrdersFilterModel {
  dateFrom: Date | null;
  dateTo: Date | null;
  statuses: string[];
  timeRange: 'today' | 'threeDays' | 'sevenDays' | 'custom' | null;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzCardModule,
    NzStatisticModule,
    NzGridModule,
    NzTableModule,
    NzTagModule,
    NzIconModule,
    NzButtonModule,
    NzSpaceModule,
    NzDividerModule,
    NzDropDownModule,
    NzMenuModule,
    NzDatePickerModule,
    NzSelectModule,
    NzSegmentedModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  storeMap: Map<string, string> = new Map();
  viewMode: 'STORE' | 'CUSTOMER' = 'STORE';
  currentAccountType: string = '';
  dashboardCards: DashboardCard[] = [
    {
      title: 'Tổng đơn hàng',
      value: 3278,
      color: '#207ce5',
      icon: 'shopping-cart',
      change: '12',
    },
    {
      title: 'Đơn hàng chờ duyệt',
      value: 327,
      color: '#f37021',
      icon: 'clock-circle',
      change: '5',
    },
    {
      title: 'Đơn hàng đã duyệt',
      value: 73665,
      // Proposed color (teal) to harmonize with blue and orange
      color: '#17a2b8',
      icon: 'check-circle',
      change: '18',
    },
    {
      title: 'Đơn hàng hoàn thành',
      value: 78,
      // Proposed color (green) to indicate completed/success
      color: '#28a745',
      icon: 'trophy',
      change: '3',
    },
  ];

  recentOrders: OrderData[] = [];
  allOrders: Order[] = [];
  viewOptions = [
  { label: 'Khách hàng', value: 'CUSTOMER', icon: 'user' },
  { label: 'Cửa hàng', value: 'STORE', icon: 'shop' }
];
  // Filter properties for orders
  ordersFilter: OrdersFilterModel = {
    dateFrom: null,
    dateTo: null,
    statuses: [],
    timeRange: null,
  };

  availableStatuses: string[] = [
    'Khởi tạo',
    'Chờ phê duyệt',
    'Đã phê duyệt',
    'Từ chối',
    'Đã xác nhận thực nhận',
    'Hủy đơn hàng',
  ];

  deliveryData: DeliveryData[] = [
    {
      orderId: '#LM120001',
      destination: 'Hà Nội',
      status: 'Đang giao',
      estimatedDate: '16/12/2024',
    },
    {
      orderId: '#LM120002',
      destination: 'Hồ Chí Minh',
      status: 'Đã giao',
      estimatedDate: '15/12/2024',
    },
    {
      orderId: '#LM120003',
      destination: 'Đà Nẵng',
      status: 'Chuẩn bị',
      estimatedDate: '17/12/2024',
    },
  ];

  // Chart data simulation
  chartData = {
    thisYear: [65, 72, 78, 85, 90, 88, 95, 102, 108, 115, 125, 132],
    lastYear: [45, 52, 58, 65, 70, 68, 75, 82, 88, 95, 105, 112],
  };

  // Dynamic chart settings
  chartWidth = 600; // base logical width (will scale with viewBox)
  chartHeight = 220; // includes padding for top/bottom
  chartPadding = { top: 20, right: 10, bottom: 30, left: 10 } as {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  @ViewChild('chartContainer', { static: false })
  chartContainer!: ElementRef<HTMLElement>;
  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;

  constructor(
    private globalService: GlobalService,
    private orderService: OrderService,
    private _sStore: StoreService,
    private _sAccountStore: AccountStoreService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.globalService.setBreadcrumb([{ name: 'Trang chủ', path: '/home' }]);
    const userInfo = this.globalService.getUserInfo();
    this.currentAccountType = userInfo?.accountType || '';
    if (this.currentAccountType === 'KH') {
      // Nếu là Khách hàng: Bắt buộc xem đơn khách hàng
      this.viewMode = 'CUSTOMER';
    } else {
      // Nếu là KD/CH/KT: Mặc định hiển thị đơn Cửa hàng trước
      this.viewMode = 'STORE';
    }
    this.loadAllStores();
    this.loadDashboardData();
  }
  private loadAllStores(): void {
    this._sStore.search({ currentPage: 1, pageSize: 2000 }).subscribe({
      next: (res: any) => {
        const stores = res.data?.data || res.data || [];
        if (Array.isArray(stores)) {
          stores.forEach((store: any) => {
            if (store.code) {
              this.storeMap.set(store.code, store.name);
            }
          });
          // Refresh lại bảng nếu dữ liệu store load chậm hơn order
          this.prepareRecentOrdersData(); 
        }
      },
    });
  }
 onViewChange(value: string | number): void {
    // nz-segmented trả về trực tiếp value ('CUSTOMER' hoặc 'STORE'), không phải index
    this.onViewModeChange(value as 'CUSTOMER' | 'STORE');
  }
  onViewModeChange(mode: 'CUSTOMER' | 'STORE'): void {
    this.viewMode = mode;
    this.prepareRecentOrdersData(); // Tính toán lại dữ liệu bảng
  }
  onOrdersFilterClick(event: { key: string } | any): void {
    // nz-menu emits an event with key property for clicked item
    const key = event && event.key ? event.key : event?.item?.properties?.nzKey;
    if (key) {
      this.filterByTime(key);
    }
  }

  onDeliveryFilterClick(event: { key: string } | any): void {
    const key = event && event.key ? event.key : event?.item?.properties?.nzKey;
    if (key) {
      this.filterByTime(key);
    }
  }

  ngAfterViewInit(): void {
    // Observe size changes and recompute chart dimensions on the UI thread
    if (this.chartContainer) {
      // Use NgZone.runOutsideAngular to avoid change detection loops
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const rect = entry.contentRect;
          this.updateChartSize(rect.width, rect.height || 220);
        }
      });
      this.resizeObserver.observe(this.chartContainer.nativeElement);
      // Initial measurement
      const rect = this.chartContainer.nativeElement.getBoundingClientRect();
      this.updateChartSize(rect.width, rect.height || 220);
      // Also observe sidebar class changes so we can recompute chart size when sider toggles
      try {
        const siderEl = document.querySelector('.ant-layout-sider');
        if (siderEl && 'MutationObserver' in window) {
          this.mutationObserver = new MutationObserver((mutations) => {
            // Debounce a bit to allow CSS transitions to finish
            setTimeout(() => {
              if (this.chartContainer) {
                const r =
                  this.chartContainer.nativeElement.getBoundingClientRect();
                this.updateChartSize(r.width, r.height || 220);
              }
            }, 120);
          });
          this.mutationObserver.observe(siderEl, {
            attributes: true,
            attributeFilter: ['class'],
          });
        }
      } catch (e) {
        // ignore if DOM not available or MutationObserver not supported
      }
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.chartContainer) {
      // small defer to batch multiple resize events
      setTimeout(() => {
        const rect = this.chartContainer.nativeElement.getBoundingClientRect();
        this.updateChartSize(rect.width, rect.height || 220);
      }, 50);
    }
  }

  private loadDashboardData(): void {
    // Get orders from service
    this.orderService.getOrders().subscribe((orders) => {
      this.allOrders = orders;
      this.updateDashboardStats();
      this.prepareRecentOrdersData();
    });
  }

  private updateDashboardStats(): void {
    const totalOrders = this.allOrders.length;
    const pendingOrders = this.allOrders.filter(
      (order) => order.status === 'Chờ phê duyệt'
    ).length;
    const approvedOrders = this.allOrders.filter(
      (order) => order.status === 'Đã phê duyệt'
    ).length;
    const completedOrders = this.allOrders.filter(
      (order) => order.status === 'Đã xác nhận thực nhận'
    ).length;

    this.dashboardCards = [
      {
        title: 'Tổng đơn hàng',
        value: totalOrders,
        color: '#E91E63',
        icon: 'shopping-cart',
        change: '12',
      },
      {
        title: 'Đơn hàng chờ duyệt',
        value: pendingOrders,
        color: '#00bcd4',
        icon: 'clock-circle',
        change: '5',
      },
      {
        title: 'Đơn hàng đã duyệt',
        value: approvedOrders,
        color: '#8bc34a',
        icon: 'check-circle',
        change: '18',
      },
      {
        title: 'Đơn hàng hoàn thành',
        value: completedOrders,
        color: '#ff9800',
        icon: 'trophy',
        change: '3',
      },
    ];
  }
  private prepareRecentOrdersData(): void {
    // 1. Lọc theo thời gian (Code cũ)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let filteredOrders = this.allOrders.filter((order) => {
      const orderDateStr = order.orderDate;
      if (!orderDateStr || orderDateStr === '-') return false;
      const [day, month, year] = orderDateStr.split('/').map(Number);
      const orderDate = new Date(year, month - 1, day);
      return orderDate >= sevenDaysAgo;
    });

    // ✅ 2. Lọc theo View Mode (Giống order-list)
    // Nếu không phải KH thì mới lọc (KH luôn thấy đơn của mình)
    if (this.currentAccountType !== 'KH') {
      if (this.viewMode === 'CUSTOMER') {
        // Mode Khách hàng: Chỉ lấy đơn có mã khách hàng
        filteredOrders = filteredOrders.filter(order => order.customerCode && order.customerCode.trim() !== '');
    } else {
        // Mode Cửa hàng: Chỉ lấy đơn nội bộ (không có mã khách hàng)
        filteredOrders = filteredOrders.filter(order => !order.customerCode || order.customerCode.trim() === '');
    }
    }

    // Sort by priority status (Code cũ)
    const sortedOrders = this.sortOrdersByPriority(filteredOrders);
    this.recentOrders = sortedOrders.map((order) => {
      const src: any = order as any;
      let displaySupplier = '';
      
      if (this.viewMode === 'STORE') {
          displaySupplier = this.storeMap.get(src.storeCode) || src.storeCode || '-';
      } else {
          displaySupplier = this.extractSupplierName(order.customer);
      }

      return {
        orderId: order.orderCode,
        orderDate: order.orderDate,
        createdDate: order.receiveDate,
        status: order.status,
        amount: this.generateRandomAmount(), // Demo amount
        supplier: displaySupplier, // ✅ Gán tên đã xử lý
        vehicle: src.vehicle || '-',
        expireDate: src.expireDate || '-',
        shipmentCount: Number(src.shipmentCount) || 0,
        creator: src.creator || '-',
      } as OrderData;
    });
  }
  // private prepareRecentOrdersData(): void {
  //   // Convert Order[] to OrderData[] for display
  //   // Filter orders from the last 7 days
  //   const sevenDaysAgo = new Date();
  //   sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  //   const filteredOrders = this.allOrders.filter((order) => {
  //     const orderDateStr = order.orderDate;
  //     if (!orderDateStr || orderDateStr === '-') return false;

  //     // Parse date string in format DD/MM/YYYY
  //     const [day, month, year] = orderDateStr.split('/').map(Number);
  //     const orderDate = new Date(year, month - 1, day);

  //     return orderDate >= sevenDaysAgo;
  //   });

  //   // Sort by priority status
  //   const sortedOrders = this.sortOrdersByPriority(filteredOrders);

  //   this.recentOrders = sortedOrders.map((order, index) => {
  //     const src: any = order as any;
  //     return {
  //       orderId: order.orderCode,
  //       orderDate: order.orderDate,
  //       createdDate: order.receiveDate,
  //       status: order.status,
  //       amount: this.generateRandomAmount(),
  //       supplier: this.extractSupplierName(order.customer),
  //       // Provide optional demo fields so the embedded table has columns
  //       vehicle: src.vehicle || '-',
  //       expireDate: src.expireDate || '-',
  //       shipmentCount: Number(src.shipmentCount) || 0,
  //       creator: src.creator || '-',
  //     } as OrderData;
  //   });
  // }

  // Open order from recent orders card: navigate to edit (Khởi tạo) or view (others)
  openOrder(item: any): void {
    const orderCode = item?.orderId;
    if (!orderCode) {
      return;
    }
    const all = this.orderService.getAllOrders();
    const found = all.find((o) => o.orderCode === orderCode);
    if (!found) {
      return;
    }
    if (found.status === 'Khởi tạo') {
      this.router.navigate(['/order/edit', found.id]);
    } else {
      this.router.navigate(['/order/view', found.id]);
    }
  }

  private generateRandomAmount(): number {
    return Math.floor(Math.random() * 900000) + 100000;
  }

  private extractSupplierName(customerInfo: string): string {
    // Extract a shorter name from the full customer info
    const parts = customerInfo.split(' - ');
    if (parts.length > 1) {
      const name = parts[1];
      // Shorten long names
      if (name.length > 30) {
        return name.substring(0, 27) + '...';
      }
      return name;
    }
    return customerInfo.length > 30
      ? customerInfo.substring(0, 27) + '...'
      : customerInfo;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Chờ phê duyệt':
        return 'orange';
      case 'Khởi tạo':
        return 'red';
      case 'Đã phê duyệt':
        return 'green';
      case 'Đã xác nhận thực nhận':
        return 'blue';
      case 'Từ chối':
        return 'red';
      case 'Hủy đơn hàng':
        return 'red';
      case 'Đã phê duyệt lượng':
        return 'green';
      default:
        return 'default';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  // Time filter methods
  filterByTime(period: string): void {
    // Placeholder for future real filtering logic
    // console.log for now but structure kept for quick integration
    console.log('Filtering by:', period);
    // Example approach (commented):
    // switch(period) {
    //   case 'today': ... break;
    //   case 'week': ... break;
    //   case 'month': ... break;
    //   default: ... break;
    // }
  }

  /**
   * Set the time range for orders filter and apply it
   */
  setOrdersTimeRange(
    range: 'today' | 'threeDays' | 'sevenDays' | 'custom'
  ): void {
    this.ordersFilter.timeRange = range;

    // Reset custom dates when switching time ranges
    if (range !== 'custom') {
      this.ordersFilter.dateFrom = null;
      this.ordersFilter.dateTo = null;
    }

    if (range !== 'custom') {
      this.applyOrdersFilter();
    }
  }

  /**
   * Apply the current filter to orders
   */
  applyOrdersFilter(): void {
    let filtered = this.allOrders;

    // Filter by date range
    if (this.ordersFilter.timeRange === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      filtered = filtered.filter((order) => {
        const orderDate = this.parseOrderDate(order.orderDate);
        return orderDate >= today && orderDate < tomorrow;
      });
    } else if (this.ordersFilter.timeRange === 'threeDays') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      filtered = filtered.filter((order) => {
        const orderDate = this.parseOrderDate(order.orderDate);
        return orderDate >= threeDaysAgo && orderDate <= today;
      });
    } else if (this.ordersFilter.timeRange === 'sevenDays') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      filtered = filtered.filter((order) => {
        const orderDate = this.parseOrderDate(order.orderDate);
        return orderDate >= sevenDaysAgo && orderDate <= today;
      });
    } else if (this.ordersFilter.timeRange === 'custom') {
      if (this.ordersFilter.dateFrom) {
        const dateFrom = new Date(this.ordersFilter.dateFrom);
        dateFrom.setHours(0, 0, 0, 0);

        filtered = filtered.filter((order) => {
          const orderDate = this.parseOrderDate(order.orderDate);
          return orderDate >= dateFrom;
        });
      }

      if (this.ordersFilter.dateTo) {
        const dateTo = new Date(this.ordersFilter.dateTo);
        dateTo.setHours(23, 59, 59, 999);

        filtered = filtered.filter((order) => {
          const orderDate = this.parseOrderDate(order.orderDate);
          return orderDate <= dateTo;
        });
      }
    }

    // Filter by status
    if (this.ordersFilter.statuses && this.ordersFilter.statuses.length > 0) {
      filtered = filtered.filter((order) =>
        this.ordersFilter.statuses.includes(order.status)
      );
    }

    // Sort by priority status
    filtered = this.sortOrdersByPriority(filtered);

    // Update the display
    this.recentOrders = filtered.map((order) => {
      const src: any = order as any;
      return {
        orderId: order.orderCode,
        orderDate: order.orderDate,
        createdDate: order.receiveDate,
        status: order.status,
        amount: this.generateRandomAmount(),
        supplier: this.extractSupplierName(order.customer),
        vehicle: src.vehicle || '-',
        expireDate: src.expireDate || '-',
        shipmentCount: Number(src.shipmentCount) || 0,
        creator: src.creator || '-',
      } as OrderData;
    });
  }

  /**
   * Reset the orders filter
   */
  resetOrdersFilter(): void {
    this.ordersFilter = {
      dateFrom: null,
      dateTo: null,
      statuses: [],
      timeRange: null,
    };
    this.prepareRecentOrdersData();
  }

  /**
   * Sort orders by priority status
   * Priority: Chờ phê duyệt > Đã phê duyệt > Khởi tạo > Đã xác nhận thực nhận > Từ chối > Hủy đơn hàng
   */
  private sortOrdersByPriority(orders: Order[]): Order[] {
    const priorityMap: { [key: string]: number } = {
      'Chờ phê duyệt': 2,
      'Đã phê duyệt lượng': 3,
      'Đã phê duyệt': 4,
      'Khởi tạo': 1,
      'Đã xác nhận thực nhận': 5,
      'Từ chối': 6,
      'Hủy đơn hàng': 7,
    };

    return [...orders].sort((a, b) => {
      const priorityA = priorityMap[a.status] ?? 999;
      const priorityB = priorityMap[b.status] ?? 999;
      return priorityA - priorityB;
    });
  }

  /**
   * Toggle status in filter
   */
  toggleStatus(status: string): void {
    const index = this.ordersFilter.statuses.indexOf(status);
    if (index > -1) {
      this.ordersFilter.statuses.splice(index, 1);
    } else {
      this.ordersFilter.statuses.push(status);
    }
  }

  /**
   * Parse date string in format DD/MM/YYYY to Date object
   */
  private parseOrderDate(dateStr: string): Date {
    if (!dateStr || dateStr === '-') {
      return new Date(0); // Return epoch date for invalid dates
    }

    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  exportData(): void {
    // Implementation for data export
    // You can implement actual export logic here
  }

  // --- Chart helpers for proper month alignment ---
  private getXPositions(): number[] {
    const months = 12;
    const usableWidth =
      this.chartWidth - this.chartPadding.left - this.chartPadding.right;
    const step = usableWidth / (months - 1);
    return Array.from(
      { length: months },
      (_, i) => this.chartPadding.left + step * i
    );
  }

  private normalizeSeries(series: number[]): number[] {
    const maxVal =
      Math.max(...this.chartData.thisYear, ...this.chartData.lastYear) * 1.05; // top padding
    const minVal =
      Math.min(...this.chartData.thisYear, ...this.chartData.lastYear) * 0.95; // bottom padding
    const usableHeight =
      this.chartHeight - this.chartPadding.top - this.chartPadding.bottom;
    return series.map((v) => {
      const ratio = (v - minVal) / (maxVal - minVal);
      // y coordinate (SVG origin top-left)
      return this.chartPadding.top + (1 - ratio) * usableHeight;
    });
  }

  getSeriesPoints(series: number[]): string {
    const xs = this.getXPositions();
    const ys = this.normalizeSeries(series);
    return xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  }

  getCirclePositions(series: number[]): { cx: number; cy: number }[] {
    const xs = this.getXPositions();
    const ys = this.normalizeSeries(series);
    // Only show some points (e.g., every other or last) -> keep all for clarity
    return xs.map((x, i) => ({ cx: x, cy: ys[i] }));
  }

  private updateChartSize(
    containerWidth: number,
    containerHeight: number
  ): void {
    // Keep some internal padding so grid lines and labels align
    const leftRightPadding = 12; // match CSS padding of .chart-labels
    const topPadding = 12;
    const bottomPadding = 30;

    // Use integer sizes for stable SVG rendering
    const width = Math.max(320, Math.round(containerWidth));
    const height = Math.max(120, Math.round(containerHeight));

    this.chartWidth = width;
    this.chartHeight = height;
    this.chartPadding.top = topPadding;
    this.chartPadding.left = leftRightPadding;
    this.chartPadding.right = leftRightPadding;
    this.chartPadding.bottom = bottomPadding;
  }

  ngOnDestroy(): void {
    if (this.resizeObserver && this.chartContainer) {
      this.resizeObserver.unobserve(this.chartContainer.nativeElement);
      this.resizeObserver.disconnect();
    }
    if (this.mutationObserver) {
      try {
        this.mutationObserver.disconnect();
      } catch (e) {
        // ignore
      }
    }
  }
}
