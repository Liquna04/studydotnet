import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzMessageModule, NzMessageService } from 'ng-zorro-antd/message';
import { GlobalService } from '../../service/global.service';
import { OrderService, Order, OrderDetail } from '../../service/order.service';
import { forkJoin , of } from 'rxjs';
import { CustomerService } from '../../service/master-data/customer.service';
import { TransportVehicleService } from '../../service/master-data/transport-vehicle.service';
import { TransportTypeService } from '../../service/master-data/transport-type.service';
import { TransportUnitService } from '../../service/master-data/transport-unit.service';
import { StorageService } from '../../service/master-data/Storage.service';
import { ProductListService } from '../../service/master-data/Product-List.service';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { AccountCustomerService } from '../../service/master-data/account-customer.service';
import { AccountStoreService } from '../../service/master-data/account-store.service';
import { StoreService } from '../../service/master-data/store.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzSelectModule,
    NzDatePickerModule,
    NzPageHeaderModule,
    NzCardModule,
    NzIconModule,
    NzGridModule,
    NzTableModule,
    NzTagModule,
    NzMessageModule,
    NzAutocompleteModule,
  ],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
})
export class OrderDetailComponent implements OnInit {
  currentUserStoreCode: string = '';
  currentStoreName: string = '';
  orderForm: FormGroup;
  customerForm: FormGroup;
  orderId: string | null = null;
  orderItems: OrderDetail[] = [];
  isViewMode = false;
  orderStatus: string = ''; // Store order status for conditional button display
  currentAccountType: string = ''; // Store current user's account type (KD or KH)
  isProcessing = false; // Loading state for action buttons
  orderHistory: Array<{
    user: string;
    date: string;
    action: string;
    color?: string;
    note?: string;
  }> = [];

  // Master data properties
  customers: any[] = [];
  storages: any[] = [];
  transportVehicles: any[] = [];
  filteredVehicles: any[] = []; // <--- THÊM DÒNG NÀY
  transportTypes: any[] = [];
  transportUnits: any[] = [];
  units: Map<string, string> = new Map(); // Map unitCode to unitName for display
get grandTotal(): number {
  if (!this.orderItems || this.orderItems.length === 0) {
    return 0;
  }
  // Tính tổng (quantity * price) của mỗi item
  return this.orderItems.reduce((acc, item) => {
    const quantity = item.quantity || 0;
    const price = item.price || 0; // Lấy price trực tiếp từ item
    return acc + quantity * price;
  }, 0);
}
get grandApproveTotal(): number {
  if (!this.orderItems || this.orderItems.length === 0) {
    return 0;
  }
  // Tính tổng (quantity * price) của mỗi item
  return this.orderItems.reduce((acc, item) => {
    const approveQuantity = item.approveQuantity || 0;
    const price = item.price || 0;
    return acc + approveQuantity * price;
  }, 0);
}
get isOutProvince(): boolean {
  return this.orderForm.get('poType')?.value === 'OUT_PROVINCE';
}
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private globalService: GlobalService,
    private message: NzMessageService,
    private orderService: OrderService,
    private _sStorage: StorageService,
    private _sTransportVehicle: TransportVehicleService,
    private _sTransportType: TransportTypeService,
    private _sTransportUnit: TransportUnitService,
    private _sCustomer: CustomerService,
    private _sAccountCustomer: AccountCustomerService, 
    private _sAccountStore: AccountStoreService, 
    private _sStore: StoreService,
    private _sProductList: ProductListService
  ) {
    this.orderForm = this.fb.group({
      poNumber: [''],
      poType: [''],
      totalPrice: [''],
      customerCode: [''],
      orderDate: [''],
      receiveDate: [''],
      orderType: [''],
      transportMethod: [''],
      vehicleMethod: [''],
      customerInfo: [''],
      unitPrice: [''],
      orderAddress: [''],
      representative: [''],
      email: [''],
      phone: [''],
      orderNote: [''],
    });
    this.customerForm = this.fb.group({      
          id: [''],
          customerCode: ['', [Validators.required]],
          fullName: [''],
          shortName: [''],
          vatNumber: [''],
          email: ['', [Validators.required, Validators.email]],
          phone: ['', [Validators.required, Validators.pattern(/^\+?\d{10,15}$/)]],
          address: [''],
          isActive: [true],
        });
  }

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id');
    if (!this.orderId) {
      this.message.error('Không tìm thấy mã đơn hàng!');
      this.router.navigate(['/order/list']);
      return;
    }

    // Get current user's account type
    const userInfo = this.globalService.getUserInfo();
    this.currentAccountType = userInfo?.accountType || 'KH';
    if (this.currentAccountType === 'CH' && userInfo?.userName) {
      this.loadStoreInfo(userInfo.userName);
    }

    this.globalService.setBreadcrumb([
      { name: 'Chi tiết đơn hàng', path: `/order/view/${this.orderId}` },
    ]);

    // Load master data first, then order data
    this.loadMasterDataThenOrderData();
  }
private loadStoreInfo(userName: string): void {
    // 1. Lấy StoreCode từ UserName
    this._sAccountStore.GetByUserName(userName).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res[0] : (res.data ? res.data[0] : res);
        if (data && (data.storeCode || data.code)) {
          this.currentUserStoreCode = data.storeCode || data.code;
          
          // 2. Lấy StoreName từ StoreCode
          this._sStore.GetByStoreCode(this.currentUserStoreCode).subscribe({
            next: (storeRes: any) => {
              const store = Array.isArray(storeRes) ? storeRes[0] : (storeRes.data ? storeRes.data[0] : storeRes);
              if (store) {
                this.currentStoreName = store.name;
              }
            },
            error: (err) => console.error('Lỗi lấy chi tiết Store:', err)
          });
        }
      },
      error: (err) => console.error('Lỗi lấy Account Store:', err)
    });
  }
  private loadMasterDataThenOrderData(): void {
    // Load all master data needed for dropdowns using OrderService
    // This ensures KH accounts get the correct data with proper permissions
    forkJoin({
      storages: this.orderService.getStorages(),
      transportTypes: this.orderService.getTransportTypes(),
      transportUnits: this.orderService.getTransportUnits(),
      transportVehicles: this.orderService.getTransportVehicles(),
      units: this.orderService.getUnitProducts(),
    }).subscribe({
      next: (result) => {
        // Process storages
        this.storages = result.storages.map((item: any) => ({
          label: item.name,
          value: item.code,
        }));

        // Process transport types
        this.transportTypes = result.transportTypes.map((item: any) => ({
          label: item.name,
          value: item.code,
        }));

        // Process transport units (đơn vị vận tải)
        this.transportUnits = result.transportUnits.map((item: any) => ({
          label: item.name,
          value: item.code,
        }));

        // Process transport vehicles - INCLUDING driver info
        this.transportVehicles = result.transportVehicles.map((item: any) => ({
          label: item.name,
          value: item.code,
          code: item.code,
          driver: item.driver,
        }));
        this.filteredVehicles = [...this.transportVehicles]; 
        // Build unit map for later lookup
        if (result.units && Array.isArray(result.units)) {
          result.units.forEach((unit: any) => {
            this.units.set(unit.code, unit.name);
          });
        }

        // Now load order data after master data is ready
        this.loadOrderData();
      },
      error: (err) => {
        console.error('Error loading master data:', err);
      },
    });
  }

  private loadMasterData(): void {
    // Load all master data needed for dropdowns
    forkJoin({
      storages: this._sStorage.getAll(),
      transportTypes: this._sTransportType.getAll(),
      transportVehicles: this._sTransportVehicle.getAll(),
      units: this.orderService.getUnitProducts(),
    }).subscribe({
      next: (result) => {
        // Process storages
        this.storages = result.storages.map((item: any) => ({
          label: item.name,
          value: item.code,
        }));

        // Process transport types
        this.transportTypes = result.transportTypes.map((item: any) => ({
          label: item.name,
          value: item.code,
        }));

        // Process transport vehicles
        this.transportVehicles = result.transportVehicles.map((item: any) => ({
          label: item.name,
          value: item.code,
        }));
      },
      error: (err) => {
        console.error('Error loading master data:', err);
      },
    });
  }

  private loadOrderData(): void {
    if (!this.orderId) return;
    this.currentStoreName = '';
  this.currentUserStoreCode = '';
    // Load order data from API
    this.orderService.getOrderByCode(this.orderId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          const orderData = response.data;

          // Store the order status for button visibility control
          this.orderStatus = orderData.status
            ? orderData.status.toString()
            : '1';

          // Extract transport unit code from vehicleInfo (which stores the unit code directly)
          // vehicleInfo stores the unitPrice (transport unit code) from form submission
          let transportUnitCode = orderData.vehicleInfo || '';
          if (orderData.storeCode) {
          this.currentUserStoreCode = orderData.storeCode;
          
          // Gọi StoreService để lấy tên
          this._sStore.GetByStoreCode(orderData.storeCode).subscribe({
            next: (res: any) => {
              // Xử lý response linh hoạt (array hoặc object)
              const store = Array.isArray(res) ? res[0] : (res.data ? res.data[0] : res);
              if (store) {
                this.currentStoreName = store.name;
              }
            },
            error: (err) => console.error('Lỗi lấy tên cửa hàng:', err)
          });
        }
          // Patch form with order info
          this.orderForm.patchValue({
            poNumber: orderData.code,
            poType: orderData.poType,
            totalPrice: orderData.totalPrice,
            customerCode: orderData.customerCode,
            orderDate: orderData.orderDate,
            receiveDate: orderData.receiptDate,
            orderType: orderData.transportType,
            transportMethod: orderData.transportMethod || '',
            vehicleMethod: orderData.vehicleCode,
            customerInfo: orderData.driver || '', // Will be filled from vehicle master data
            unitPrice: transportUnitCode, // Đơn vị vận tải (from vehicleInfo field)
            orderAddress: orderData.storageCode,
            representative: orderData.representative,
            email: orderData.email || orderData.Email,
            phone: orderData.phone,
            orderNote: orderData.note,
          });
          
          // Get driver info from vehicle master data
          if (orderData.vehicleCode && this.transportVehicles.length > 0) {
            const vehicle = this.transportVehicles.find(
              (v: any) => v.code === orderData.vehicleCode
            );
            if (vehicle) {
              this.orderForm.patchValue({
                customerInfo: vehicle.driver || '',
              });
            }
          }

          // Load customer by customerCode to get full name for dropdown
          if (orderData.customerCode) {
            this._sCustomer
              .GetByCustomerCode(orderData.customerCode)
              .subscribe({
                next: (res: any) => {
                  const customer =
                    Array.isArray(res) && res.length > 0 ? res[0] : null;

                  if (customer) {
                    this.customerForm.patchValue(customer);
                    this.customers = [
                      {
                        label: customer.fullName,
                        value: customer.customerCode,
                      },
                    ];
                  }
                },
                error: (err) => {
                  console.error('Error loading customer:', err);
                  // Fallback: show customer code if load fails
                  this.customers = [
                    {
                      label: orderData.customerCode,
                      value: orderData.customerCode,
                    },
                  ];
                },
              });
          }

          // Disable form to ensure read-only
          this.orderForm.disable({ emitEvent: false });
          if (this.currentAccountType === 'KT' && this.orderStatus === '-3') {
            this.orderForm.get('email')?.enable();
            this.orderForm.get('phone')?.enable();
          }
          // Mark view mode
          this.isViewMode = true;

          // Load order details/items from API
          if (this.orderId) {
            this.orderService.getOrderDetails(this.orderId).subscribe({
              next: (detailResponse) => {
                if (detailResponse.status && detailResponse.data) {
                  const details = detailResponse.data;

                  // Get all products to map material codes to names
                  this.orderService.getProductLists().subscribe({
                    next: (productsResponse: any) => {
                      const products = productsResponse || [];

                      // Map backend detail items to frontend OrderItem format
                      this.orderItems = details.map((detail: any) => {
                        // Find product by materialCode
                        const product = products.find(
                          (p: any) => p.code === detail.materialCode
                        );
                        const productName = product
                          ? `${product.code} - ${product.name}`
                          : detail.materialCode;

                        // Get unit name from map, fallback to code
                        const unitName =
                          this.units.get(detail.unitCode) || detail.unitCode;
                        const basicUnitCode = detail.basicUnitCode || (product ? product.basicUnit : '');
                        const basicUnitName = this.units.get(basicUnitCode) || basicUnitCode;

                        return {
                          name: productName,
                          quantity: detail.quantity,
                          approveQuantity: detail.approveQuantity,
                          unit: unitName,
                          basicUnit: basicUnitName,
                          basicUnitProductName: product?.basicUnitProductName,
                          price: detail.price,
                        };
                      });
                    },
                    error: (err) => {
                      console.error('Error loading products:', err);
                      // Fallback: use materialCode only, but still try to get unit name
                      this.orderItems = details.map((detail: any) => {
                        const unitName =
                          this.units.get(detail.unitCode) || detail.unitCode;
                        return {
                          name: detail.materialCode,
                          quantity: detail.quantity,
                          approveQuantity: detail.approveQuantity !== undefined && detail.approveQuantity !== null
                                           ? detail.approveQuantity
                                           : detail.quantity,
                          unit: unitName,
                          basicUnit: detail.basicUnitCode || '',
                          unitProductName: undefined,
                          basicUnitProductName: undefined,
                          price: detail.price || 0,
                        };
                      });
                    },
                  });
                }
              },
              error: (err) => {
                console.error('Error loading order details:', err);
              },
            });

            // Load order history with user info from API
            this.orderService.getOrderHistory(this.orderId).subscribe({
              next: (historyResponse) => {
                if (historyResponse.status && historyResponse.data) {
                  this.orderHistory = historyResponse.data.map((h: any) => ({
                    user: h.userFullName || h.createBy || 'Unknown',
                    date: h.statusDate
                      ? new Date(h.statusDate).toLocaleString('vi-VN')
                      : '',
                    action: this.mapHistoryStatus(h.status),
                    color: this.getHistoryColor(h.status),
                    note: h.notes || '',
                  }));
                }
              },
              error: (err) => {
                console.error('Error loading order history:', err);
              },
            });
          }
        } else {
          this.message.error('Không tìm thấy đơn hàng!');
          this.router.navigate(['/order/list']);
        }
      },
      error: (err) => {
        console.error('Error loading order:', err);
        this.message.error('Lỗi khi tải đơn hàng!');
        this.router.navigate(['/order/list']);
      },
    });
  }

  private mapHistoryStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      '1': 'Khởi tạo',
      '2': 'Chờ phê duyệt',
      '3': 'Đã phê duyệt',
      '4': 'Từ chối',
      '5': 'Đã xác nhận thực nhận',
      '0': 'Chỉnh sửa thông tin',
      '-1': 'Hủy đơn hàng',
      '-3': 'Đã phê duyệt lượng'
    };
    return statusMap[status] || status;
  }

  private getHistoryColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      '1': 'red', // Khởi tạo
      '2': 'orange', // Chờ phê duyệt
      '3': 'green', // Đã phê duyệt
      '4': 'red', // Từ chối
      '5': 'blue', // Đã xác nhận thực nhận
      '0': 'orange', // Chỉnh sửa thông tin
      '-1': 'red', // Hủy đơn hàng
      '-3': 'green', //Đã phê duyệt số lượng
    };
    return colorMap[status] || 'default';
  }

  onBack(): void {
    this.router.navigate(['/order/list']);
  }

  /**
   * Approve order - change status to 3 (Đã phê duyệt)
   * Only available for KD account type when status is 2 (Chờ phê duyệt)
   */
  onApproveOrder(): void {
    if (!this.orderId) {
      this.message.error('Không tìm thấy mã đơn hàng!');
      return;
    }

    // Confirm action
    if (!confirm('Bạn có chắc chắn muốn phê duyệt đơn hàng này?')) {
      return;
    }

    this.isProcessing = true;
    this.orderService.approveOrder(this.orderId).subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response.status) {
          this.message.success('Phê duyệt đơn hàng thành công');
          this.orderStatus = '3'; // Update local status
          // Reload order data to reflect changes
          this.loadOrderData();
        } else {
          this.message.error(
            response.messageObject?.message || 'Phê duyệt đơn hàng thất bại'
          );
        }
      },
      error: (err) => {
        this.isProcessing = false;
        console.error('Error approving order:', err);
        this.message.error('Lỗi khi phê duyệt đơn hàng');
      },
    });
  }

  /**
   * Reject order - change status to 4 (Từ chối)
   * Only available for KD account type when status is 2 (Chờ phê duyệt)
   */
  onRejectOrder(): void {
    if (!this.orderId) {
      this.message.error('Không tìm thấy mã đơn hàng!');
      return;
    }

    // Confirm action
    if (!confirm('Bạn có chắc chắn muốn từ chối đơn hàng này?')) {
      return;
    }

    this.isProcessing = true;
    this.orderService.rejectOrder(this.orderId).subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response.status) {
          this.message.success('Từ chối đơn hàng thành công');
          this.orderStatus = '4'; // Update local status
          // Reload order data to reflect changes
          this.loadOrderData();
        } else {
          this.message.error(
            response.messageObject?.message || 'Từ chối đơn hàng thất bại'
          );
        }
      },
      error: (err) => {
        this.isProcessing = false;
        console.error('Error rejecting order:', err);
        this.message.error('Lỗi khi từ chối đơn hàng');
      },
    });
  }

  onConfirmReceived(): void {
    if (!this.orderId) {
      this.message.error('Không tìm thấy mã đơn hàng!');
      return;
    }

    // Confirm action
    if (!confirm('Bạn có chắc chắn xác nhận thực nhận đơn hàng này?')) {
      return;
    }

    this.isProcessing = true;
    this.orderService.confirmReceived(this.orderId).subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response.status) {
          this.message.success('Xác nhận thực nhận đơn hàng thành công');
          this.orderStatus = '5'; 
          this.router.navigate(['/order/list']);
        } else {
          this.message.error(
            response.messageObject?.message ||
              'Xác nhận thực nhận đơn hàng thất bại'
          );
        }
      },
      error: (err) => {
        this.isProcessing = false;
        console.error('Error confirming received:', err);
        this.message.error('Lỗi khi xác nhận thực nhận đơn hàng');
      },
    });
  }

  /**
   * Cancel order - change STATUS to -1 (Hủy đơn hàng)
   * Only available for KH account type when status is 2 (Chờ phê duyệt)
   */
  onCancelOrder(): void {
    if (!this.orderId) {
      this.message.error('Không tìm thấy mã đơn hàng!');
      return;
    }

    // Confirm action
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
      return;
    }

    this.isProcessing = true;
    this.orderService.cancelOrders([this.orderId]).subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response.status && response.data && response.data.length > 0) {
          this.message.success('Hủy đơn hàng thành công');
          this.orderStatus = '-1'; // Update local status
          // Reload order data to reflect changes
          this.loadOrderData();
        } else {
          this.message.error(
            response.messageObject?.message || 'Hủy đơn hàng thất bại'
          );
        }
      },
      error: (err) => {
        this.isProcessing = false;
        console.error('Error cancelling order:', err);
        this.message.error('Lỗi khi hủy đơn hàng');
      },
    });
  }

  onCopyOrder(): void {
    // Navigate to create with state from current form
    if (!this.orderId) {
      this.message.error('Không tìm thấy mã đơn hàng!');
      return;
    }

    const formValue = this.orderForm.getRawValue(); // getRawValue to include disabled controls

    const state = {
      poType: formValue.poType,
      totalPrice: formValue.totalPrice,
      customerCode: formValue.customerCode,
      orderDate: formValue.orderDate,
      receiveDate: formValue.receiveDate,
      orderType: formValue.orderType,
      transportMethod: formValue.transportMethod || '',
      vehicleMethod: formValue.vehicleMethod,
      customerInfo: formValue.customerInfo, // người vận tải
      representative: formValue.representative || '', // người đại diện
      unitPrice: formValue.unitPrice,
      orderNote: formValue.orderNote,
      orderAddress: formValue.orderAddress,
      email: formValue.email,
      phone: formValue.phone,
      items: this.orderItems,
    };

    this.router.navigate(['/order/create'], { state });
    this.message.success('Đã copy đơn hàng');
  }
  /**
   * Xử lý khi người dùng CHỌN một phương tiện từ danh sách gợi ý
   * (Tự động điền tên người vận tải)
   */
  onVehicleInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  if (!value) {
    // Nếu ô input trống, hiển thị lại toàn bộ danh sách
    this.filteredVehicles = [...this.transportVehicles];
  } else {
    // Ngược lại, lọc danh sách dựa trên tên (label) hoặc mã (value)
    const filter = value.toLowerCase();
    this.filteredVehicles = this.transportVehicles.filter(
      (v) =>
        v.label.toLowerCase().includes(filter) ||
        v.value.toLowerCase().includes(filter)
    );
  }
}
  onVehicleSelect(event: any): void { // <-- 1. Sửa (selectedValue: string) thành (event: any)
    
    const selectedValue = event?.option?.nzValue; // <-- 2. Thêm dòng này để lấy giá trị

    if (!selectedValue) return;

    // 3. Code bên dưới giữ nguyên
    const selectedVehicle = this.transportVehicles.find(
      (v) => v.code === selectedValue || v.value === selectedValue
    );

    if (selectedVehicle) {
      this.orderForm.patchValue({
        driver: selectedVehicle.driver || '',
      });
    }
  }
  onSubmit(): void {
    if (!this.orderForm.valid) {
      this.message.error('Vui lòng điền đầy đủ thông tin bắt buộc!');
      Object.values(this.orderForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    if (this.orderItems.length === 0) {
      this.message.error('Vui lòng thêm ít nhất một mặt hàng!');
      return;
    }

    const hasZeroQuantity = this.orderItems.some(
      (item) => !item.quantity || item.quantity <= 0
    );
    if (hasZeroQuantity) {
      this.message.error('Vui lòng nhập số lượng cho tất cả mặt hàng!');
      return;
    }
const hasInvalidApproveQty = this.orderItems.some(item => {
      const quantity = item.quantity || 0;
      // Dùng ?? (Nullish coalescing) để xử lý null/undefined an toàn
      const approveQuantity = item.approveQuantity ?? 0; 
      
      return approveQuantity > quantity;
    });

    if (hasInvalidApproveQty) {
      this.message.error('Lượng phê duyệt không được lớn hơn số lượng đặt!');
      return; // Dừng lại
    }

    // Bật cờ xử lý
    this.isProcessing = true;

    try {
      // Dùng getRawValue() để lấy giá trị từ các trường bị disable
      const formValue = this.orderForm.getRawValue(); 
      const approveTotal = this.grandApproveTotal;
      const orderTotal = this.grandTotal;
      const finalTotalPrice = approveTotal > 0 ? approveTotal : orderTotal;

      // DTO cho việc update đơn hàng
      const updateDto = {
        poType:formValue.poType || null,
        totalPrice: finalTotalPrice,
        receiptDate: formValue.receiveDate
          ? new Date(formValue.receiveDate)
          : null,
        transportType: formValue.orderType || null,
        transportMethod: formValue.transportMethod || null,
        vehicleCode: formValue.vehicleMethod || null,
        vehicleInfo: formValue.unitPrice || null,
        driver: formValue.customerInfo || null, 
        storageCode: formValue.orderAddress || null,
        storageName: null,
        representative: formValue.representative || null,
        email: formValue.email || null, // Lấy giá trị email đã được enable
        phone: formValue.phone || null, // Lấy giá trị phone đã được enable
        note: formValue.orderNote || null,
        items: this.orderItems.map((item) => {
          const parts = item.name.split(' - ');
          const materialCode = parts.length > 0 ? parts[0].trim() : item.name;

          return {
            materialCode: materialCode,
            numberItem: null, 
            quantity: item.quantity,
            approveQuantity: item.approveQuantity,
            unitCode: item.unit || null,
            basicUnit: item.basicUnit || null, 
            price: item.price || 0,
          };
        }),
      };

      // --- BẮT ĐẦU PHẦN SỬA ĐỔI ---
      // 1. Gọi update đơn hàng trước
      this.orderService
        .updateOrderWithHistory(this.orderId!, updateDto)
        .subscribe({
          next: (orderResponse) => {
            if (orderResponse.status) {
              this.message.success('Cập nhật đơn hàng thành công!');
                
                // 2. Nếu update đơn hàng thành công VÀ user là KT...
                if (this.currentAccountType === 'KT' ) {
                  const customerData = this.customerForm.getRawValue();
                  if (customerData.id) {
                    // Cập nhật DTO khách hàng với email/phone mới
                    customerData.email = formValue.email;
                    customerData.phone = formValue.phone;

                    // ...thì gọi update khách hàng
                    this.orderService.updateCustomer(customerData).subscribe({
                      next: (customerResponse: any) => {
                        if (customerResponse.status) {
                        } else {
                          this.message.error(
                            'Cập nhật khách hàng thất bại: ' +
                            (customerResponse.messageObject?.message || '')
                          );
                        }
                        // Dù update KH thành công hay thất bại, cũng tắt loading và chuyển trang
                        this.isProcessing = false;
                      },
                      error: (err) => {
                        this.message.error('Lỗi khi cập nhật thông tin khách hàng!');
                        console.error('Customer update error:', err);
                        this.isProcessing = false;
                      }
                    });
                  } else {
                    // Không có customerId, không cần update KH
                    console.warn('Không tìm thấy Customer ID, bỏ qua update khách hàng.');
                    this.isProcessing = false;
                  }
                } else {
                  // User không phải KT, chỉ cần update đơn hàng là xong
                  this.isProcessing = false;
                }

            } else {
              // Update đơn hàng thất bại
              this.message.error(
                'Cập nhật đơn hàng thất bại: ' + (orderResponse.messageObject?.message || '')
              );
              this.isProcessing = false; // Tắt cờ xử lý
            }
          },
          error: (err) => {
            console.error('Error updating order:', err);
            this.message.error('Có lỗi xảy ra khi cập nhật đơn hàng!');
            this.isProcessing = false; // Tắt cờ xử lý
          },
        });
    } catch (error) {
      console.error('Error preparing update data:', error);
      this.message.error('Có lỗi xảy ra khi chuẩn bị dữ liệu cập nhật!');
      this.isProcessing = false; // Tắt cờ xử lý
    }
  }



}
