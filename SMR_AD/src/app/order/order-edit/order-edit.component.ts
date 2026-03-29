import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule, NzModalService, NzModalRef } from 'ng-zorro-antd/modal';
import { NzMessageModule, NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { forkJoin } from 'rxjs';
import { GlobalService } from '../../service/global.service';
import { OrderService } from '../../service/order.service';
import { TablePaginationComponent } from '../../shared/components/table-pagination/table-pagination.component';
import { ProductListService } from '../../service/master-data/Product-List.service';
import { CustomerService } from '../../service/master-data/customer.service';
import { TransportVehicleService } from '../../service/master-data/transport-vehicle.service';
import { TransportTypeService } from '../../service/master-data/transport-type.service';
import { TransportUnitService } from '../../service/master-data/transport-unit.service';
import { StorageService } from '../../service/master-data/Storage.service';
import { UnitProductService } from '../../service/master-data/Unit-Product.service';
import { AccountCustomerService } from '../../service/master-data/account-customer.service';
import { AccountStoreService } from '../../service/master-data/account-store.service';
import { StoreService } from '../../service/master-data/store.service';

interface OrderItem {
  name: string;
  quantity: number;
  approveQuantity?: number;
  unit: string;
  basicUnit : string;
  unitProductName?: string;
  basicUnitProductName?: string;
  price?: number;
}

interface MasterItem {
  code: string;
  name: string;
  unit: string;
  basicUnit: string;
  unitProductName?: string;
  basicUnitProductName: string;
  price?: number;
  isAdded?: boolean;
}

interface VehicleTypes {
  label: string;
  value: string;
  code: string;
  name: string;
  type: string;
  transportType?: string;
  driver: string;
  transportTypeName?: string;
}

interface CustomerLists {
  label: string;
  value: string;
  fullName: string;
  email: string;
  phone: string;
  customerCode: string;
}

interface Storages {
  label: string;
  value: string;
}

interface TransportTypes {
  label: string;
  value: string;
}

@Component({
  selector: 'app-order-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzButtonModule,
    NzSelectModule,
    NzDatePickerModule,
    NzPageHeaderModule,
    NzCardModule,
    NzIconModule,
    NzGridModule,
    NzSpaceModule,
    NzTableModule,
    NzTagModule,
    NzModalModule,
    NzMessageModule,
    NzPaginationModule,
  ],
  templateUrl: './order-edit.component.html',
  styleUrls: ['./order-edit.component.scss'],
})
export class OrderEditComponent implements OnInit {
  @ViewChild('itemSearchTpl', { static: false })
  itemSearchTpl!: TemplateRef<any>;

  orderForm: FormGroup;
  customerForm: FormGroup;
  orderId: string | null = null;
  orderItems: OrderItem[] = [];
  isProcessing = false;
currentUserStoreCode: string = '';
currentStoreName: string = '';
  // Item search modal
  private modalRef: NzModalRef | null = null;
  searchKey: string = '';
  searchResults: MasterItem[] = [];
  
  formatterVND = (value: number | null): string => {
    if (value === null || value === undefined) {
      return '';
    }
    return `${value.toLocaleString('vi-VN')} đ`;
  };

  parserVND = (value: string): number => {
    if (!value) {
      return 0;
    }
    // Xóa " đ" và tất cả dấu chấm (dấu phân cách ngàn)
    const cleanValue = value.replace(/ đ/g, '').replace(/\./g, '');
    return Number(cleanValue) || 0;
  };
  // Pagination for item search modal
  itemsCurrentPage: number = 1;
  itemsPageSize: number = 10;
    orderHistory: Array<{
    user: string;
    date: string;
    action: string;
    color?: string;
    note?: string;
  }> = [];
  get grandTotal(): number {
    if (!this.orderItems || this.orderItems.length === 0) {
      return 0;
    }
    // Tính tổng (quantity * price) của mỗi item
    return this.orderItems.reduce((acc, item) => {
      const quantity = item.quantity || 0;
      const price = item.price || 0; // Đảm bảo price tồn tại
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
  get pagedSearchResults(): MasterItem[] {
    const start = (this.itemsCurrentPage - 1) * this.itemsPageSize;
    return this.searchResults.slice(start, start + this.itemsPageSize);
  }

  // Confirmation action state
  private _pendingAction: 'send' | 'cancel' |'approve_quantity'| 'approve' | 'reject' | null = null;

  confirmProceed(): void {
    if (this._pendingAction === 'send') {
      if (!this.orderId) {
        this.message.error('Không tìm thấy mã đơn hàng!');
        return;
      }
      this.orderService.submitOrder(this.orderId!).subscribe({
        next: (response) => {
          if (response.status) {
            this.message.success('Gửi đơn hàng chờ duyệt thành công!');
            setTimeout(() => this.router.navigate(['/order/list']), 800);
          } else {
            this.message.error('Gửi đơn hàng thất bại!');
          }
        },
        error: (err) => {
          console.error('Error submitting order:', err);
          this.message.error('Lỗi khi gửi đơn hàng!');
        },
      });
    } else if (this._pendingAction === 'cancel') {
      if (!this.orderId) {
        this.message.error('Không tìm thấy mã đơn hàng!');
        return;
      }
      this.orderService.cancelOrders([this.orderId]).subscribe({
        next: (response) => {
          if (response.status) {
            this.message.success('Hủy đơn hàng thành công!');
            setTimeout(() => this.router.navigate(['/order/list']), 800);
          } else {
            this.message.error('Hủy đơn hàng thất bại!');
          }
        },
        error: (err) => {
          console.error('Error canceling order:', err);
          this.message.error('Lỗi khi hủy đơn hàng!');
        },
      });
    }
    else if (this._pendingAction === 'approve_quantity') {
      if (!this.orderId) {
        this.message.error('Không tìm thấy mã đơn hàng!');
        return;
      }
      this.orderService.approveQuantityOrder(this.orderId).subscribe({
        next: (response) => {
          if (response.status) {
            this.message.success('Phê duyệt lượng thành công!');
            setTimeout(() => this.router.navigate(['/order/list']), 800);
          } else {
            this.message.error('Phê duyệt lượng thất bại!');
          }
        },
        error: (err) => {
          console.error('Error approving quantity:', err);
          this.message.error('Lỗi khi phê duyệt lượng!');
        },
      });
    // ^^ KẾT THÚC KHỐI MỚI ^^

    } else if (this._pendingAction === 'approve') {
      if (!this.orderId) {
        this.message.error('Không tìm thấy mã đơn hàng!');
        return;
      }
      this.orderService.approveOrder(this.orderId).subscribe({
        next: (response) => {
          if (response.status) {
            this.message.success('Phê duyệt đơn hàng thành công!');
            setTimeout(() => this.router.navigate(['/order/list']), 800);
          } else {
            this.message.error('Phê duyệt đơn hàng thất bại!');
          }
        },
        error: (err) => {
          console.error('Error approving order:', err);
          this.message.error('Lỗi khi phê duyệt đơn hàng!');
        },
      });
    } else if (this._pendingAction === 'reject') {
      if (!this.orderId) {
        this.message.error('Không tìm thấy mã đơn hàng!');
        return;
      }
      this.orderService.rejectOrder(this.orderId).subscribe({
        next: (response) => {
          if (response.status) {
            this.message.success('Từ chối đơn hàng thành công!');
            setTimeout(() => this.router.navigate(['/order/list']), 800);
          } else {
            this.message.error('Từ chối đơn hàng thất bại!');
          }
        },
        error: (err) => {
          console.error('Error rejecting order:', err);
          this.message.error('Lỗi khi từ chối đơn hàng!');
        },
      });
    }
    this._pendingAction = null;
  }

  // Get filtered vehicle list based on selected transport type
  get filteredTransportVehicles(): VehicleTypes[] {
    const selectedOrderType = this.orderForm.get('orderType')?.value;
    if (!selectedOrderType) {
      return this.transportVehicles;
    }
    return this.transportVehicles.filter(
      (vehicle) => vehicle.type === selectedOrderType
    );
  }

  // Master data
  masterItems: MasterItem[] = [];
  customers: CustomerLists[] = [];
  storages: Storages[] = [];
  transportVehicles: VehicleTypes[] = [];
  transportTypes: TransportTypes[] = [];
  transportUnits: any[] = [];
  units: Map<string, string> = new Map(); // Map unitCode to unitName

  isKD = false;
  isKH = false;
  isKT = false;
  isCH = false;
  isLoadingOrderData = false;
  currentOrderStatus: any = null;

  constructor(
    private _sAccountCustomer: AccountCustomerService,
    private _sAccountStore: AccountStoreService,
    private _sStorage: StorageService,
    private _sTransportVehicle: TransportVehicleService,
    private _sTransportType: TransportTypeService,
    private _sTransportUnit: TransportUnitService,
    private _sCustomer: CustomerService,
    private _sProductList: ProductListService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private globalService: GlobalService,
    private modal: NzModalService,
    private message: NzMessageService,
    private _sStore: StoreService,
    private orderService: OrderService
  ) {
    this.orderForm = this.fb.group({
      poNumber: [''], // Mã đơn hàng (không thể thay đổi)
      poType: ['', [Validators.required]],
      customerCode: ['', [Validators.required]], // Bắt buộc
      orderDate: [new Date(), [Validators.required]],
      receiveDate: ['', [Validators.required]],
      orderType: ['', [Validators.required]],
      transportMethod: [''],
      vehicleMethod: [''], // Không bắt buộc - remove [Validators.required]
      customerInfo: [''], // Người vận tải - không bắt buộc
      representative: [''], // Người đại diện - không bắt buộc
      unitPrice: [''],
      orderNote: [''],
      orderAddress: [''],
      email: ['', [Validators.email]],
      phone: [''],
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

    this.globalService.setBreadcrumb([
      { name: 'Chỉnh sửa đơn hàng', path: `/order/edit/${this.orderId}` },
    ]);

    this.loadUserInfo();
    this.setupFormListeners();

    // Load master data first, then load order data once master data is ready
    this.loadMasterDataAndOrder();
  }

  private loadUserInfo(): void {
    const userInfoRaw = localStorage.getItem('UserInfo');
    let userName = null;
    let accountType = null;

    if (userInfoRaw) {
      try {
        const userInfo = JSON.parse(userInfoRaw);
        userName = userInfo.userName;
        accountType = userInfo.accountType;
      } catch (error) {
        console.error('❌ Lỗi parse UserInfo:', error);
      }
    }

    this.isKD = accountType === 'KD';
    this.isKH = accountType === 'KH';
    this.isKT = accountType === 'KT';
    this.isCH = accountType === 'CH';

 if (this.isCH && userName) {
      // Loại bỏ Validators (như bạn đã sửa)
      const customerControl = this.orderForm.get('customerCode');
      customerControl?.clearValidators();
      customerControl?.updateValueAndValidity();
      
      // 1. Lấy StoreCode từ UserName
      this._sAccountStore.GetByUserName(userName).subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res[0] : (res.data ? res.data[0] : res);
          
          if (data && (data.storeCode || data.code)) {
            this.currentUserStoreCode = data.storeCode || data.code;
            
            // 💥 BƯỚC THÊM MỚI QUAN TRỌNG: Patch storeCode vào form
            this.orderForm.patchValue({
                storeCode: this.currentUserStoreCode
            });

            // 2. ✅ LẤY TÊN CỬA HÀNG TỪ STORE CODE
            this._sStore.GetByStoreCode(this.currentUserStoreCode).subscribe({
                next: (storeRes: any) => {
                    const store = Array.isArray(storeRes) ? storeRes[0] : (storeRes.data ? storeRes.data[0] : storeRes);
                    if (store) {
                        this.currentStoreName = store.name;
                        // Tên đã được set, HTML sẽ hiển thị.
                    }
                },
                error: (err) => console.error('Lỗi lấy tên cửa hàng:', err)
            });
          }
        },
        error: (err) => console.error('Không lấy được thông tin Store:', err)
      });
    }
    if (this.isKH && userName) {
      this.loadCustomerByUserName(userName);
    }
  }

  private loadCustomerByUserName(userName: string): void {
    this._sAccountCustomer.GetByUserName(userName).subscribe({
      next: (res1: any) => {
        const accountData =
          Array.isArray(res1) && res1.length > 0 ? res1[0] : null;

        if (accountData?.customerCode) {
          const customerCode = accountData.customerCode;

          this._sCustomer.GetByCustomerCode(customerCode).subscribe({
            next: (res2: any) => {
              const customer =
                Array.isArray(res2) && res2.length > 0 ? res2[0] : null;

              if (customer) {
                const formattedCustomer = {
                  label: customer.fullName,
                  value: customer.customerCode,
                  email: customer.email,
                  phone: customer.phone,
                  fullName: customer.fullName,
                  customerCode: customer.customerCode,
                };

                this.customers = [formattedCustomer];
              }
            },
            error: (err) => console.error('❌ Lỗi getByCustomerCode:', err),
          });
        }
      },
      error: (err) => console.error('❌ Lỗi getByUserName:', err),
    });
  }

  private loadMasterDataAndOrder(): void {
    // Use forkJoin to wait for all master data to load
    // Use OrderService methods to ensure KH accounts get proper data with permissions
    forkJoin({
      storages: this.orderService.getStorages(),
      transportTypes: this.orderService.getTransportTypes(),
      transportUnits: this.orderService.getTransportUnits(),
      transportVehicles: this.orderService.getTransportVehicles(),
      products: this.orderService.getProductLists(),
      units: this.orderService.getUnitProducts(),
      customers: (this.isKD || this.isCH)
        ? this.orderService.getCustomers()
        : Promise.resolve([]),
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

        // Process transport vehicles - this is critical for driver info
        this.transportVehicles = result.transportVehicles.map((item: any) => ({
          code: item.code,
          name: item.name,
          label: item.name,
          value: item.code,
          type: item.type,
          driver: item.driver,
          transportTypeName: item.transportTypeName,
        }));

        // Process master items (products)
        this.masterItems = result.products.map((item: any) => ({
          code: item.code,
          name: item.name,
          unit: item.unit,
          basicUnit : item.basicUnit,
          unitProductName: item.unitProductName,
          basicUnitProductName: item.basicUnitProductName,
          price: item.price,
          isAdded: false,
        }));

        // Build unit map for later lookup
        if (result.units && Array.isArray(result.units)) {
          result.units.forEach((unit: any) => {
            this.units.set(unit.code, unit.name);
          });
        }

        // Process customers if applicable
        if ((this.isKD || this.isCH) && result.customers) {
          this.customers = result.customers.map((item: any) => ({
            label: item.fullName,
            value: item.customerCode,
            customerCode: item.customerCode,
            fullName: item.fullName,
            email: item.email,
            phone: item.phone,
          }));
        }

        // Now that master data is loaded, load the order
        this.loadOrderData();
      },
      error: (err) => {
        console.error('Error loading master data:', err);
        this.message.error('Không thể tải dữ liệu cơ bản!');
      },
    });
  }

  onPriceChange(item: OrderItem, newPrice: number): void {
    // 1. Cập nhật giá trị 'price' trên item chính
    // 'grandTotal' và 'grandApproveTotal' sẽ tự động tính toán lại.
    item.price = newPrice;

    // 2. Cập nhật giá trị này vào cache (masterItems và searchResults)
    // để nếu xóa đi thêm lại, nó sẽ giữ giá mới.
    const code = item.name.split(' - ')[0].trim();
    if (!code) return;

    // Cập nhật giá trong danh sách masterItems
    const masterItem = this.masterItems.find((m) => m.code === code);
    if (masterItem) {
      masterItem.price = newPrice;
    }

    // Cập nhật giá trong danh sách searchResults (để đồng bộ)
    const searchItem = this.searchResults.find((s) => s.code === code);
    if (searchItem) {
      searchItem.price = newPrice;
    }
  }
  private setupFormListeners(): void {
    // Listen to order type (transport type) selection - reset vehicle when type changes
    this.orderForm.get('orderType')?.valueChanges.subscribe((selectedType) => {
      // Skip auto-fill if we're currently loading order data from backend
      if (this.isLoadingOrderData) {
        return;
      }

      // Reset vehicle selection when order type changes
      this.orderForm.patchValue({
        vehicleMethod: '',
        customerInfo: '',
      });
    });

    // Listen to customer selection
    this.orderForm
      .get('customerCode')
      ?.valueChanges.subscribe((selectedCode) => {
        // Skip auto-fill if we're currently loading order data from backend
        if (this.isLoadingOrderData) {
          return;
        }

        const selectedCustomer = this.customers.find(
          (c) => c.value === selectedCode || c.customerCode === selectedCode
        );

        if (selectedCustomer) {
          this.orderForm.patchValue({
            email: selectedCustomer.email || '',
            phone: selectedCustomer.phone || '',
          });
        }
      });

    // Listen to vehicle selection
    this.orderForm.get('vehicleMethod')?.valueChanges.subscribe((selected) => {
      // Skip auto-fill if we're currently loading order data from backend
      if (this.isLoadingOrderData) {
        return;
      }

      if (!selected) return;

      const selectedVehicle = this.transportVehicles.find(
        (v) => v.code === selected
      );

      if (selectedVehicle) {
        this.orderForm.patchValue({
          // Do NOT auto-fill orderType from vehicle - user should select it manually
          // Do NOT auto-fill unitPrice from vehicle - user should select from dropdown
          // ALWAYS update customerInfo (driver) when vehicle changes
          customerInfo: selectedVehicle.driver || '',
        });
      } else {
        this.orderForm.patchValue({
          // Clear customerInfo when no vehicle is selected
          customerInfo: '',
        });
      }
    });
  }

  private loadOrderData(): void {
    if (!this.orderId) return;

    // Set flag to prevent auto-fill logic while loading from backend
    this.isLoadingOrderData = true;

    // Call backend API to get order by code
    this.orderService.getOrderByCode(this.orderId).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          const orderData = response.data;
         
          this.currentOrderStatus = orderData.status;
          // Parse dates from backend
          const orderDate = orderData.orderDate
            ? new Date(orderData.orderDate)
            : new Date();
          const receiptDate = orderData.receiptDate
            ? new Date(orderData.receiptDate)
            : null;

          // Extract vehicle code from VEHICLE_INFO if exists
          let vehicleCode = orderData.vehicleCode || '';
          if (!vehicleCode && orderData.vehicleInfo) {
            const parts = orderData.vehicleInfo.split('-');
            vehicleCode = parts.length > 0 ? parts[0].trim() : '';
          }

          // Get driver info from vehicle master data
          let driverInfo = '';
          if (vehicleCode && this.transportVehicles.length > 0) {
            const vehicle = this.transportVehicles.find(
              (v) => v.code === vehicleCode
            );
            if (vehicle) {
              driverInfo = vehicle.driver || '';
            }
          }

          // Extract transport unit code from vehicleInfo (which stores the unit code directly)
          // vehicleInfo stores the unitPrice (transport unit code) from form submission
          let transportUnitCode = orderData.vehicleInfo || '';

          

          // Patch form values from backend data
          this.orderForm.patchValue({
            poNumber: this.orderId || '', // Set mã đơn hàng
            poType: orderData.poType || '',
            customerCode: orderData.customerCode || '',
            orderDate: orderDate,
            receiveDate: receiptDate,
            orderType: orderData.transportType || '',
            transportMethod: orderData.transportMethod || '',
            vehicleMethod: vehicleCode,
            customerInfo: driverInfo, // People transporting/driver info from vehicle master
            representative:
              orderData.representative || orderData.Representative || '',
            unitPrice: transportUnitCode, // Đơn vị vận tải (from vehicleInfo field)
            orderNote: orderData.note || orderData.Note || '',
            orderAddress: orderData.storageCode || '',
            email: orderData.email || orderData.Email || '',
            phone: orderData.phone || orderData.Phone || '',
          });
          if (orderData.customerCode) {
          this._sCustomer
            .GetByCustomerCode(orderData.customerCode)
            .subscribe({
              next: (res: any) => {
                const customer =
                  Array.isArray(res) && res.length > 0 ? res[0] : null;
                if (customer) {
                  this.customerForm.patchValue(customer); // <-- Lưu trữ ID và data
                }
              },
              error: (err) =>
                console.error(
                  'Failed to load customer details for form',
                  err
                ),
            });
        }
          // Disable poNumber and customerCode fields
          this.orderForm.get('poNumber')?.disable();
          this.orderForm.get('customerCode')?.disable();
          if ((this.isKD && this.currentOrderStatus === '2') || (this.isKH && this.currentOrderStatus ==='1')) {
          // Cho phép KD sửa
          this.orderForm.get('email')?.enable();
          this.orderForm.get('phone')?.enable();
        } else {
          this.orderForm.get('email')?.disable();
          this.orderForm.get('phone')?.disable();
        }

          // Load order details (items)
          if (this.orderId) {
            this.loadOrderDetails(this.orderId);
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
          

          // Reset flag after loading is complete
          this.isLoadingOrderData = false;
        } else {
          this.isLoadingOrderData = false;
          this.message.error('Không tìm thấy đơn hàng!');
          this.router.navigate(['/order/list']);
        }
      },
      error: (err) => {
        this.isLoadingOrderData = false;
        console.error('Error loading order:', err);
        this.message.error('Lỗi khi tải dữ liệu đơn hàng!');
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

  private loadOrderDetails(headerCode: string): void {
    this.orderService.getOrderDetails(headerCode).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          const details = response.data;

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
                const unitCode =
                  detail.unitCode || (product ? product.unit : '');
                const basicUnitCode = detail.basicUnitCode || (product ? product.basicUnit : '');
                const basicUnitName = this.units.get(basicUnitCode) || basicUnitCode;

                // Get unit name from map, fallback to code
                const unitName = this.units.get(unitCode) || unitCode;
                const quantity = detail.quantity || 0;
                const approveQty = detail.approveQuantity;
                let finalApproveQty;

                if (this.currentOrderStatus === '2' && (this.isKD || this.isKT)) {
                  finalApproveQty = (approveQty !== null && approveQty !== undefined)
                                    ? approveQty 
                                    : quantity;
                } else {
                 
                  finalApproveQty = approveQty;
                }
                return {
                  name: productName,
                  quantity: quantity,
                  approveQuantity: finalApproveQty,
                  unit: unitName,
                  basicUnit : basicUnitName,
                  unitProductName: product?.unitProductName,
                  basicUnitProductName: product?.basicUnitProductName,
                  price: detail.price,
                };
              });

              // Mark items as added in masterItems
              this.orderItems.forEach((orderItem) => {
                const code = orderItem.name.split(' - ')[0].trim();
                const masterItem = this.masterItems.find(
                  (m) => m.code === code
                );
                if (masterItem) {
                  masterItem.isAdded = true;
                }
              });
            },
            error: (err) => {
              console.error('Error loading products:', err);
              // Still show items even if product names can't be loaded
              this.orderItems = details.map((detail: any) => ({
                name: detail.materialCode,
                quantity: detail.quantity || 0,
                approveQuantity: (detail.approveQuantity !== null && detail.approveQuantity !== undefined)
                               ? detail.approveQuantity
                               : (detail.quantity || 0),
                unit: detail.unitCode || '',
                basicUnit: detail.basicUnitCode || '',
                unitProductName: undefined,
                basicUnitProductName: undefined,
                price: detail.price || 0,
              }));
            },
          });
        }
      },
      error: (err) => {
        console.error('Error loading order details:', err);
        this.message.warning('Không thể tải chi tiết đơn hàng');
      },
    });
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

    if (hasInvalidApproveQty && !(this.isKH && this.currentOrderStatus === '1')) {
      this.message.error('Lượng phê duyệt không được lớn hơn số lượng đặt!');
      return; 
    }
  this.isProcessing = true; // Bật cờ xử lý

  try {
    // Dùng getRawValue() để lấy cả các trường bị disable (như customerCode) và enable (như email)
    const formValue = this.orderForm.getRawValue();
    const approveTotal = this.grandApproveTotal;
    const orderTotal = this.grandTotal;
    const finalTotalPrice = approveTotal > 0 ? approveTotal : orderTotal;
    
    // DTO cho update đơn hàng (giữ nguyên logic gốc của order-edit)
    const updateDto = {
      poType: formValue.poType || null,
      totalPrice: finalTotalPrice,
      receiptDate: formValue.receiveDate
        ? new Date(formValue.receiveDate)
        : null,
      transportType: formValue.orderType || null,
      transportMethod: formValue.transportMethod || null,
      vehicleCode: formValue.vehicleMethod || null,
      vehicleInfo: formValue.unitPrice || null,
      driver: null, // Logic gốc của bạn là null
      storageCode: formValue.orderAddress || null,
      storageName: null,
      representative: formValue.representative || null,
      email: formValue.email || null, // Lấy email (đã enable cho KT)
      phone: formValue.phone || null, // Lấy phone (đã enable cho KT)
      note: formValue.orderNote || null,
      storeCode: !this.isKH
            ? (formValue.customerCode ? null : this.currentUserStoreCode) 
            : null,
      items: this.orderItems.map((item) => {
        const parts = item.name.split(' - ');
        const materialCode = parts.length > 0 ? parts[0].trim() : item.name;
        const finalApproveQuantity = (this.isKH && this.currentOrderStatus === '1')
                                     ? item.quantity
                                     : item.approveQuantity;
        return {
          materialCode: materialCode,
          numberItem: null,
          quantity: item.quantity,
          approveQuantity: finalApproveQuantity,
          unitCode: item.unit || null,
          basicUnit: item.basicUnit || null,
          price: item.price,
        };
      }),
    };

    // 1. Gọi update đơn hàng trước
    this.orderService
      .updateOrderWithHistory(this.orderId!, updateDto)
      .subscribe({
        next: (orderResponse) => {
          if (orderResponse.status) {
            this.message.success('Cập nhật đơn hàng thành công!');
             const customerData = this.customerForm.getRawValue();
              
              // Chỉ update khách hàng nếu có ID và không phải là CH đang tạo đơn không khách
              if (customerData.id && (!this.isCH || formValue.customerCode)) { 
                customerData.email = formValue.email;
                customerData.phone = formValue.phone;

                this.orderService.updateCustomer(customerData).subscribe({
                  next: (customerResponse: any) => {
                    if (!customerResponse.status) {
                      this.message.error(
                        'Cập nhật khách hàng thất bại: ' +
                        (customerResponse.messageObject?.message || '')
                      );
                    }
                    this.isProcessing = false;
                  },
                  error: (err) => {
                    this.message.error('Lỗi khi cập nhật thông tin khách hàng!');
                    this.isProcessing = false;
                  }
                });
              } else {
                // Trường hợp CH không chọn khách hàng -> Bỏ qua update KH
                this.isProcessing = false;
              }

          } else {
            // Update đơn hàng thất bại
            this.message.error(
              'Cập nhật thất bại: ' + (orderResponse.messageObject?.message || '')
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
      // --- KẾT THÚC SỬA ĐỔI ---

  } catch (error) {
    console.error('Error preparing update data:', error);
    this.message.error('Có lỗi xảy ra khi chuẩn bị dữ liệu cập nhật!');
    this.isProcessing = false; // Tắt cờ xử lý
  }
}

  onCopyOrder(): void {
    if (!this.orderId) {
      this.message.error('Không tìm thấy mã đơn hàng!');
      return;
    }

    // Get current form data to copy (use getRawValue to include disabled fields like email, phone, customerCode)
    const formValue = this.orderForm.getRawValue();

    // Prepare data for navigation to create page
    const state = {
      poType: formValue.poType,
      customerCode: formValue.customerCode,
      orderDate: formValue.orderDate,
      receiveDate: formValue.receiveDate,
      orderType: formValue.orderType,
      transportMethod: formValue.transportMethod,
      vehicleMethod: formValue.vehicleMethod,
      customerInfo: formValue.customerInfo, // người vận tải
      representative: formValue.representative, // người đại diện
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

  onSendOrder(): void {
    // Use browser confirm dialog
    if (!confirm('Bạn có chắc chắn muốn gửi đơn hàng này để chờ duyệt?')) {
      return;
    }

    this._pendingAction = 'send';
    this.confirmProceed();
  }

  onCancelOrder(): void {
    // Use browser confirm dialog
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
      return;
    }

    this._pendingAction = 'cancel';
    this.confirmProceed();
  }
  onApproveQuantityOrder(): void {
    // Chỉ cho phép khi trạng thái là '2' (Chờ phê duyệt)
    if (this.currentOrderStatus !== '2') {
      this.message.warning('Đơn hàng không ở trạng thái chờ duyệt.');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn phê duyệt lượng cho đơn hàng này?')) {
      return;
    }

    this._pendingAction = 'approve_quantity'; // Đặt action mới
    this.confirmProceed();
  }
 onApproveOrder(): void {
    // Sử dụng mã trạng thái bạn đã cung cấp
    const STATUS_CHODUYET = '2'; 
    const STATUS_DA_DUYET_SL = '-3';

    const isOutProvince = this.orderForm.get('poType')?.value === 'OUT_PROVINCE';
    let confirmMessage = '';

    // Trường hợp 1: KD & Đơn nội tỉnh
    if (this.isKD && !isOutProvince) {
      if (this.currentOrderStatus !== STATUS_CHODUYET) {
        this.message.warning('Đơn hàng không ở trạng thái chờ duyệt.');
        return;
      }
      confirmMessage = 'Bạn có chắc chắn muốn phê duyệt đơn hàng này?';
    } 
    // Trường hợp 2: KT & Đơn ngoại tỉnh
    else if (this.isKT && isOutProvince) {
      if (this.currentOrderStatus !== STATUS_DA_DUYET_SL) {
        this.message.warning('Đơn hàng chưa được phòng KDTH duyệt số lượng.');
        return;
      }
      confirmMessage = 'Bạn có chắc chắn muốn PHÊ DUYỆT đơn hàng này?';
    }
    // Trường hợp khác (bảo vệ)
    else {
      this.message.error('Bạn không có quyền thực hiện hành động này.');
      return;
    }

    // Hiển thị dialog xác nhận
    if (confirm(confirmMessage)) {
      this._pendingAction = 'approve'; // Dùng lại action 'approve' gốc
      this.confirmProceed();
    }
  }
  onRejectOrder(): void {
    // Use browser confirm dialog
    if (!confirm('Bạn có chắc chắn muốn từ chối đơn hàng này?')) {
      return;
    }

    this._pendingAction = 'reject';
    this.confirmProceed();
  }
  

  addItem(): void {
    this.searchResults = [...this.masterItems];
    this.modalRef = this.modal.create({
      nzContent: this.itemSearchTpl,
      nzFooter: null,
      nzWidth: 900,
      nzZIndex: 1000,
      nzClosable: false,
      nzMaskClosable: true,
      nzBodyStyle: {
        padding: '24px',
        overflow: 'visible',
      },
      nzStyle: {
        top: '80px',
      },
    });
  }

  closeModal(): void {
    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
    }
  }

  onSearchItems(): void {
    const key = (this.searchKey || '').trim().toLowerCase();
    if (!key) {
      this.searchResults = [...this.masterItems];
      return;
    }
    this.searchResults = this.masterItems.filter((it) =>
      `${it.code} ${it.name}`.toLowerCase().includes(key)
    );
    this.itemsCurrentPage = 1;
  }

  resetSearch(): void {
    this.searchKey = '';
    this.searchResults = [...this.masterItems];
    this.itemsCurrentPage = 1;
  }

  selectItem(it: MasterItem): void {
    const displayName = `${it.code} - ${it.name}`;
    const existing = this.orderItems.find((oi) => oi.name === displayName);

    if (existing) {
      existing.quantity = (existing.quantity || 0) + 1;
      existing.approveQuantity = existing.quantity;
    } else {
      this.orderItems.push({
        name: displayName,
        quantity: 1,
        approveQuantity: 1,
        unit: it.unit,
        basicUnit: it.basicUnit,
        unitProductName: it.unitProductName,
        basicUnitProductName: it.basicUnitProductName,
        price: it.price,
        
      });
    }

    const masterItem = this.masterItems.find((m) => m.code === it.code);
    if (masterItem) {
      masterItem.isAdded = true;
    }
    const searchItem = this.searchResults.find((s) => s.code === it.code);
    if (searchItem) {
      searchItem.isAdded = true;
    }

    this.message.success(`Đã thêm "${it.name}" vào đơn hàng`);
  }

  onItemsPageChange(page: number): void {
    this.itemsCurrentPage = page;
  }

  onItemsPageSizeChange(pageSize: number): void {
    this.itemsPageSize = pageSize;
    this.itemsCurrentPage = 1;
  }

  removeItem(index: number): void {
    const removedItem = this.orderItems[index];
    this.orderItems.splice(index, 1);

    const code = removedItem.name.split(' - ')[0].trim();

    const masterItem = this.masterItems.find((m) => m.code === code);
    if (masterItem) {
      masterItem.isAdded = false;
    }

    const searchItem = this.searchResults.find((s) => s.code === code);
    if (searchItem) {
      searchItem.isAdded = false;
    }
  }

  getDisabledReceiveDateFn(): (current: Date) => boolean {
    return (current: Date) => {
      const orderDate = this.orderForm.get('orderDate')?.value;
      if (!orderDate) {
        return false;
      }
      // Disable dates before the order date
      const orderDateObj = new Date(orderDate);
      orderDateObj.setHours(0, 0, 0, 0);
      const currentDateObj = new Date(current);
      currentDateObj.setHours(0, 0, 0, 0);
      return currentDateObj < orderDateObj;
    };
  }
  onQuantityChange(newQuantity: number, item: OrderItem): void {
    // Tự động cập nhật Lượng phê duyệt = Số lượng
    if (this.currentOrderStatus === '1') {
      item.approveQuantity = newQuantity;
    }
  }
}
