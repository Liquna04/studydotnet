import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzMessageService, NzMessageModule } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService, NzModalRef } from 'ng-zorro-antd/modal';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { FormsModule } from '@angular/forms';
import { TablePaginationComponent } from '../../shared/components/table-pagination/table-pagination.component';
import { GlobalService } from '../../service/global.service';
import { OrderService, Order } from '../../service/order.service';
import { StoreService } from '../../service/master-data/store.service';
import { NzSelectModule } from 'ng-zorro-antd/select';

interface OrderItem {
  id: string;
  orderCode: string;
  customer: string;
  storeCode?: string;
  vehicle?: string;
  status: string;
  orderDate: string;
  receiveDate: string;
  expireDate: string;
  shipmentCount: string;
  note?: string;
  creator: string;
}

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzTableModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzTabsModule,
    NzTagModule,
    NzPageHeaderModule,
    NzSpaceModule,
    NzMessageModule,
    NzModalModule,
    NzPaginationModule,
    NzPopoverModule,
    FormsModule,
    NzSelectModule,
  ],
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.scss'],
})
export class OrderListComponent implements OnInit {
  searchText: string = '';
  orderList: Order[] = [];
  selectedOrders: Order[] = [];
  allChecked = false;
  indeterminate = false;
  currentAccountType: string = ''; // KD or KH or KT or CH
  loading = false;
  storeMap: Map<string, string> = new Map();
  // Filter properties
  selectedStatusFilters: string[] = [];
  availableStatuses: string[] = [];

  selectedCustomerFilters: string[] = [];
  availableCustomers: string[] = [];

  selectedVehicleFilters: string[] = [];
  availableVehicles: string[] = [];

  viewMode: 'STORE' | 'CUSTOMER'='STORE';
  // Pagination properties
  currentPage = 1;
  pageSize = 20;
  total = 0;
  paginatedOrderList: Order[] = [];
  // Sample fallback data used while UI is being rebuilt
  listOfData: OrderItem[] = [];

  // Modal handling
  private pendingOrderCodes: string[] = [];
  private pendingAction: 'send' | 'cancel' | 'confirmreceived'|null = null;

  // Items to render in the table: prefer paginatedOrderList (from service) otherwise show local sample data.
  get itemsToShow(): any[] {
    return this.paginatedOrderList && this.paginatedOrderList.length
      ? this.paginatedOrderList
      : this.listOfData;
  }

  constructor(
    private globalService: GlobalService,
    private router: Router,
    private orderService: OrderService,
    private message: NzMessageService,
    private _sStore: StoreService,
    private modal: NzModalService
  ) {}

  ngOnInit(): void {
    this.globalService.setBreadcrumb([
      { name: 'Danh sách đơn hàng', path: '/order/list' },
    ]);

    // Get current account type from user info
    const userInfo = this.globalService.getUserInfo();
    this.currentAccountType = userInfo?.accountType || '';
    if (this.currentAccountType === 'KH') {
      this.viewMode = 'CUSTOMER';
    }
    this.loadAllStores();
    // Subscribe to orders from service
    this.orderService.getOrders().subscribe((orders) => {
      // Apply priority sorting to orders
      this.orderList = this.sortOrdersByPriority(orders);
      // Update available filters
      this.updateAvailableStatuses();
      this.updateAvailableCustomers();
      this.updateAvailableVehicles();
      this.total = this.orderList.length;
      this.updatePaginatedData();
    });
  }
  onViewModeChange(mode: 'CUSTOMER' | 'STORE'): void {
    this.viewMode = mode;
    this.currentPage = 1;
    
    // Reset filter phụ khi chuyển tab để tránh lỗi logic
    this.selectedCustomerFilters = [];
    this.selectedVehicleFilters = [];
    this.selectedStatusFilters = [];

    this.updatePaginatedData(); 
  }
  private loadAllStores(): void {
    // Gọi search với pageSize lớn để lấy hết danh sách cửa hàng
    // Hoặc nếu bạn có hàm getAll() thì dùng getAll()
    this._sStore.search({ currentPage: 1, pageSize: 1000 }).subscribe({
      next: (res) => {
        if (res.data) {
          // Tạo Map: storeCode -> storeName
          res.data.forEach((store: any) => {
            if (store.code) {
              this.storeMap.set(store.code, store.name);
            }
          });
        }
      },
      error: (err) => console.error('Không tải được danh sách cửa hàng:', err)
    });
  }
  updatePaginatedData(): void {
    let filteredList = this.orderList;

    // 1. Lọc theo Tab (Chỉ áp dụng nếu KHÔNG phải là KH)
    if (this.currentAccountType !== 'KH') {
        if (this.viewMode === 'CUSTOMER') {
            // Đơn khách hàng: Phải có CustomerCode
            filteredList = filteredList.filter(order => order.customerCode && order.customerCode.trim() !== '');
        } else {
            // Đơn cửa hàng (Nội bộ): Không có CustomerCode
            filteredList = filteredList.filter(order => !order.customerCode || order.customerCode.trim() === '');
        }
    }
    // Apply status filters
    if (this.selectedStatusFilters.length > 0) {
      filteredList = filteredList.filter((order) =>
        this.selectedStatusFilters.includes(order.status)
      );
    }

    // Apply customer filters
    if (this.selectedCustomerFilters.length > 0) {
      filteredList = filteredList.filter((order) =>
        this.selectedCustomerFilters.includes(order.customer)
      );
    }

    // Apply vehicle filters
    if (this.selectedVehicleFilters.length > 0) {
      filteredList = filteredList.filter((order) =>
        this.selectedVehicleFilters.includes(order.vehicle)
      );
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedOrderList = filteredList.slice(startIndex, endIndex);
    this.total = filteredList.length;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedData();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.updatePaginatedData();
  }

  onSearch(): void {
    if (!this.searchText.trim()) {
      this.message.warning('Vui lòng nhập từ khóa tìm kiếm!');
      return;
    }

    this.loading = true;
    this.orderService.search(this.searchText).subscribe({
      next: (orders) => {
        // Filter orders based on keyword (since API may not filter properly)
        const keyword = this.searchText.toLowerCase().trim();
        const filteredOrders = orders.filter((order) => {
          return (
            order.orderCode?.toLowerCase().includes(keyword) ||
            order.customer?.toLowerCase().includes(keyword) ||
            order.customerCode?.toLowerCase().includes(keyword) ||
            order.email?.toLowerCase().includes(keyword) ||
            order.phone?.toLowerCase().includes(keyword)
          );
        });

        // Apply priority sorting to filtered orders
        const sortedOrders = this.sortOrdersByPriority(filteredOrders);
        this.paginatedOrderList = sortedOrders;
        this.orderList = sortedOrders;
        this.total = sortedOrders.length;
        this.currentPage = 1;
        this.updatePaginatedData();
        this.loading = false;

        if (sortedOrders.length === 0) {
          this.message.info('Không tìm thấy đơn hàng nào!');
        } else {
          this.message.success(`Tìm thấy ${sortedOrders.length} đơn hàng`);
        }
      },
      error: (err) => {
        console.error('Lỗi tìm kiếm:', err);
        this.loading = false;
        this.message.error('Lỗi khi tìm kiếm đơn hàng!');
      },
    });
  }

  onReset(): void {
    this.searchText = '';
    this.loadOrders();
  }

  private loadOrders(): void {
    this.loading = true;
    this.orderService.getOrders().subscribe({
      next: (orders) => {
        // Apply priority sorting to orders
        this.orderList = this.sortOrdersByPriority(orders);
        this.total = this.orderList.length;
        this.currentPage = 1;
        this.updatePaginatedData();
        this.loading = false;
      },
      error: (err) => {
        console.error('Lỗi tải danh sách:', err);
        this.loading = false;
        this.message.error('Lỗi khi tải danh sách đơn hàng!');
      },
    });
  }

  /**
   * Sort orders by priority status
   * Priority order:
   * 1. Chờ phê duyệt
   * 2. Đã phê duyệt
   * 3. Khởi tạo
   * 4. Đã xác nhận thực nhận
   * 5. Từ chối
   * 6. Hủy đơn hàng
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
   * Update available statuses based on current order list
   */
  private updateAvailableStatuses(): void {
    // Get unique statuses from orderList
    const statuses = [...new Set(this.orderList.map((order) => order.status))];
    // Sort statuses by priority
    const priorityMap: { [key: string]: number } = {
      'Chờ phê duyệt': 2,
      'Đã phê duyệt lượng': 3,
      'Đã phê duyệt': 4,
      'Khởi tạo': 1,
      'Đã xác nhận thực nhận': 5,
      'Từ chối': 6,
      'Hủy đơn hàng': 7,
    };
    this.availableStatuses = statuses.sort(
      (a, b) => (priorityMap[a] ?? 999) - (priorityMap[b] ?? 999)
    );
  }

  /**
   * Update available customers based on current order list
   */
  private updateAvailableCustomers(): void {
    // Get unique customers from orderList
    const customers = [
      ...new Set(this.orderList.map((order) => order.customer)),
    ];
    // Sort customers alphabetically
    this.availableCustomers = customers.sort((a, b) => a.localeCompare(b));
  }

  /**
   * Update available vehicles based on current order list
   */
  private updateAvailableVehicles(): void {
    // Get unique vehicles from orderList, filter out empty/dash values
    const vehicles = [
      ...new Set(
        this.orderList
          .map((order) => order.vehicle)
          .filter((v) => v && v !== '-')
      ),
    ];
    // Sort vehicles alphabetically
    this.availableVehicles = vehicles.sort((a, b) => a.localeCompare(b));
  }

  /**
   * Toggle status filter selection
   */
  onStatusFilterChange(status: string, isChecked: boolean): void {
    if (isChecked) {
      if (!this.selectedStatusFilters.includes(status)) {
        this.selectedStatusFilters.push(status);
      }
    } else {
      this.selectedStatusFilters = this.selectedStatusFilters.filter(
        (s) => s !== status
      );
    }
    this.applyFilters();
  }

  /**
   * Clear all status filters
   */
  clearStatusFilters(): void {
    this.selectedStatusFilters = [];
    this.applyFilters();
  }

  /**
   * Toggle customer filter selection
   */
  onCustomerFilterChange(customer: string, isChecked: boolean): void {
    if (isChecked) {
      if (!this.selectedCustomerFilters.includes(customer)) {
        this.selectedCustomerFilters.push(customer);
      }
    } else {
      this.selectedCustomerFilters = this.selectedCustomerFilters.filter(
        (c) => c !== customer
      );
    }
    this.applyFilters();
  }

  /**
   * Clear all customer filters
   */
  clearCustomerFilters(): void {
    this.selectedCustomerFilters = [];
    this.applyFilters();
  }

  /**
   * Toggle vehicle filter selection
   */
  onVehicleFilterChange(vehicle: string, isChecked: boolean): void {
    if (isChecked) {
      if (!this.selectedVehicleFilters.includes(vehicle)) {
        this.selectedVehicleFilters.push(vehicle);
      }
    } else {
      this.selectedVehicleFilters = this.selectedVehicleFilters.filter(
        (v) => v !== vehicle
      );
    }
    this.applyFilters();
  }

  /**
   * Clear all vehicle filters
   */
  clearVehicleFilters(): void {
    this.selectedVehicleFilters = [];
    this.applyFilters();
  }

  /**
   * Apply all filters to the order list
   */
  private applyFilters(): void {
    this.currentPage = 1;
    this.updatePaginatedData();
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

  onCreateNew(): void {
    this.router.navigate(['/order/create']);
  }

  onBack(): void {
    // Navigate to parent or dashboard - keep it simple and return to home
    this.router.navigate(['/home']);
  }

  onSendOrder(): void {
    // Validate selection
    if (this.selectedOrders.length === 0) {
      this.message.warning('Vui lòng chọn ít nhất 1 đơn hàng để gửi!');
      return;
    }
    const invalidOrders = this.selectedOrders.filter(
      (order) => order.status !== 'Khởi tạo'
    );
    if (invalidOrders.length > 0) {
      const invalidStatuses = [...new Set(invalidOrders.map((o) => o.status))];
      const statusText = invalidStatuses.join(', ');
      this.message.error(
        `Không thể gửi đơn hàng có trạng thái: "${statusText}"`
      );
      return;
    }

    // Use browser confirm dialog
    if (
      !confirm(
        `Bạn có chắc chắn muốn gửi ${this.selectedOrders.length} đơn hàng đã chọn?`
      )
    ) {
      return;
    }

    // Proceed with sending
    this.pendingOrderCodes = this.selectedOrders.map((o) => o.orderCode);
    this.pendingAction = 'send';
    this.confirmProceed();
  }
onConfirmReceived(): void {
    if (this.selectedOrders.length === 0) {
      this.message.warning('Vui lòng chọn ít nhất 1 đơn hàng để xác nhận thực nhận!');
      return;
    }

    const invalidOrders = this.selectedOrders.filter((order) => {
      if (this.currentAccountType === 'KH' || this.currentAccountType === 'CH') {
        return order.status !== 'Đã phê duyệt';
      }
      return false;
    });

    if (invalidOrders.length > 0) {
      const invalidStatuses = [...new Set(invalidOrders.map((o) => o.status))];
      const statusText = invalidStatuses.join(', ');
      this.message.error(
        `Không thể xác nhận thực nhận đơn hàng có trạng thái: "${statusText}"`
      );
      return;
    }
    if (this.currentAccountType === 'CH') {
      const invalidStoreOrders = this.selectedOrders.filter(order => {
        const isCustomerEmpty = !order.customerCode || order.customerCode.trim() === '';
        const isStoreHasValue = order.storeCode && order.storeCode.trim() !== '';

        // Đơn hàng KHÔNG hợp lệ nếu: Có khách hàng HOẶC Không có mã cửa hàng
        // Tức là: return true (là invalid) nếu điều kiện trên KHÔNG thỏa mãn
        return !(isCustomerEmpty && isStoreHasValue);
      });

      if (invalidStoreOrders.length > 0) {
        this.message.error(
          'Cửa hàng chỉ được phép xác nhận thực nhận cho các đơn hàng nội bộ (Có mã cửa hàng và không có khách hàng)!'
        );
        return;
      }
    }
    // Use browser confirm dialog
    if (
      !confirm(
        `Bạn có chắc chắn muốn xác nhận thực nhận ${this.selectedOrders.length} đơn hàng đã chọn?`
      )
    ) {
      return;
    }

    // Proceed with cancellation
    this.pendingOrderCodes = this.selectedOrders.map((o) => o.orderCode);
    this.pendingAction = 'confirmreceived';
    this.confirmProceed();
  }
  onCancelOrder(): void {
    if (this.selectedOrders.length === 0) {
      this.message.warning('Vui lòng chọn ít nhất 1 đơn hàng để hủy!');
      return;
    }

    const invalidOrders = this.selectedOrders.filter((order) => {
      if (this.currentAccountType === 'KD') {
        return order.status !== 'Khởi tạo';
      } else if (this.currentAccountType === 'KH' || this.currentAccountType === 'CH') {
        return order.status !== 'Khởi tạo' && order.status !== 'Chờ phê duyệt';
      }
      return false;
    });

    if (invalidOrders.length > 0) {
      const invalidStatuses = [...new Set(invalidOrders.map((o) => o.status))];
      const statusText = invalidStatuses.join(', ');
      this.message.error(
        `Không thể hủy đơn hàng có trạng thái: "${statusText}"`
      );
      return;
    }

    // Use browser confirm dialog
    if (
      !confirm(
        `Bạn có chắc chắn muốn hủy ${this.selectedOrders.length} đơn hàng đã chọn?`
      )
    ) {
      return;
    }

    // Proceed with cancellation
    this.pendingOrderCodes = this.selectedOrders.map((o) => o.orderCode);
    this.pendingAction = 'cancel';
    this.confirmProceed();
  }

  openOrder(item: OrderItem | Order): void {
    // Navigate to the order detail or open modal. For now just log and show a message.
   
    const status = 'status' in item ? (item as any).status : '';
    const id = 'id' in item ? (item as any).id : null;
    if (id) {
      if (status === 'Khởi tạo' || status ==='Chờ phê duyệt') {
        // Navigate to edit page
        this.router.navigate(['/order/edit', id]);
        return;
      } else {
        // Navigate to view-only detail page
        this.router.navigate(['/order/view', id]);
        return;
      }
    }

    this.message.info(
      `Mở đơn ${'orderCode' in item ? (item as any).orderCode : ''}`
    );
  }

  onReturnOrder(): void {
    // Kiểm tra loại tài khoản
    if (this.currentAccountType === 'KD') {
      this.message.error('Bạn không có quyền gửi đơn trả hàng');
      return;
    }

    // Kiểm tra xem có đúng một đơn hàng được chọn không
    if (this.selectedOrders.length !== 1) {
      this.message.warning('Vui lòng chọn đúng một đơn hàng để trả hàng');
      return;
    }

    // Kiểm tra trạng thái đơn hàng
    const selectedOrder = this.selectedOrders[0];
    if (selectedOrder.status !== 'Đã xác nhận thực nhận') {
      this.message.error(
        'Chỉ có thể trả hàng các đơn hàng có trạng thái "Đã xác nhận thực nhận"'
      );
      return;
    }

    // Gọi API để lấy dữ liệu đơn hàng
    this.orderService.getOrderByCode(selectedOrder.orderCode).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          // Điều hướng đến return-create với dữ liệu đơn hàng
          this.router.navigate(['/order/return-create'], {
            state: { orderData: res.data },
          });
        } else {
          this.message.error('Không tìm thấy đơn hàng');
        }
      },
      error: (err) => {
        console.error('Lỗi khi tải đơn hàng:', err);
        this.message.error('Không thể tải thông tin đơn hàng');
      },
    });
  }

  isOrderSelected(order: Order): boolean {
    return this.selectedOrders.some((selected) => selected.id === order.id);
  }

  onOrderChecked(order: Order, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedOrders.push(order);
    } else {
      this.selectedOrders = this.selectedOrders.filter(
        (selected) => selected.id !== order.id
      );
    }
    this.updateAllCheckedStatus();
  }

  onAllChecked(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedOrders = [...this.orderList];
    } else {
      this.selectedOrders = [];
    }
    this.updateAllCheckedStatus();
  }

  private updateAllCheckedStatus(): void {
    this.allChecked =
      this.selectedOrders.length === this.orderList.length &&
      this.orderList.length > 0;
    this.indeterminate =
      this.selectedOrders.length > 0 &&
      this.selectedOrders.length < this.orderList.length;
  }

  confirmProceed(): void {
    if (!this.pendingAction || this.pendingOrderCodes.length === 0) {
      return;
    }
    if (this.pendingAction === 'confirmreceived') {
      this.orderService.confirmReceiveds(this.pendingOrderCodes).subscribe({
        next: (response) => {
          if (response.status) {
            this.message.success(
              `Xác nhận thực nhận đơn hàng thành công!`
            );
            this.afterMutationRefresh();
          } else {
            this.message.error('Xác nhận thực nhận đơn hàng thất bại!');
          }
        },
        error: (err) => {
          console.error('Error confirm orders:', err);
          this.message.error('Lỗi khi xác nhận thực nhận đơn hàng!');
        },
      });
    }
    else if (this.pendingAction === 'send') {
      this.orderService.submitOrders(this.pendingOrderCodes).subscribe({
        next: (response) => {
          if (response.status) {
            this.message.success(
              `Gửi đơn hàng chờ duyệt thành công!`
            );
            this.afterMutationRefresh();
          } else {
            this.message.error('Gửi đơn hàng thất bại!');
          }
        },
        error: (err) => {
          console.error('Error submitting orders:', err);
          this.message.error('Lỗi khi gửi đơn hàng!');
        },
      });
    } else if (this.pendingAction === 'cancel') {
      this.orderService.cancelOrders(this.pendingOrderCodes).subscribe({
        next: (response) => {
          if (response.status) {
            this.message.success(
              `Hủy đơn hàng thành công!`
            );
            this.afterMutationRefresh();
          } else {
            this.message.error('Hủy đơn hàng thất bại!');
          }
        },
        error: (err) => {
          console.error('Error canceling orders:', err);
          this.message.error('Lỗi khi hủy đơn hàng!');
        },
      });
    }

    this.pendingAction = null;
    this.pendingOrderCodes = [];
  }

  private afterMutationRefresh(): void {
    // Refresh list
    this.selectedOrders = [];
    this.allChecked = false;
    this.indeterminate = false;
    this.orderService.getOrders().subscribe((orders) => {
      // Apply priority sorting to orders
      this.orderList = this.sortOrdersByPriority(orders);
      this.total = this.orderList.length;
      this.updatePaginatedData();
    });
  }
}
