import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
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
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzModalModule, NzModalService, NzModalRef } from 'ng-zorro-antd/modal';
import { NzMessageModule, NzMessageService } from 'ng-zorro-antd/message';
import { GlobalService } from '../../service/global.service';
import { OrderService } from '../../service/order.service';
// Removed TablePaginationComponent - using nz-pagination instead
import { ProductListService } from '../../service/master-data/Product-List.service';
import { CustomerService } from '../../service/master-data/customer.service';
import { TransportVehicleService } from '../../service/master-data/transport-vehicle.service';
import { TransportTypeService } from '../../service/master-data/transport-type.service';
import { TransportUnitService } from '../../service/master-data/transport-unit.service';
import { StorageService } from '../../service/master-data/Storage.service';
import { StoreService } from '../../service/master-data/store.service';
import { AccountCustomerService } from '../../service/master-data/account-customer.service';
import { AccountStoreService } from '../../service/master-data/account-store.service';
import { ReturnService } from '../../service/return.service';
import { Observable, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { NzRadioModule } from 'ng-zorro-antd/radio';

interface OrderItem {
  name: string;
  quantity: number;
  approveQuantity: number;
  unit: string;
  basicUnit: string;
  unitProductName: string;
  basicUnitProductName?: string;
  price: number;
}

interface MasterItem {
  code: string;
  name: string;
  unit: string;
  basicUnit: string;
  unitProductName: string;
  basicUnitProductName?: string;  
  price: number;
  isAdded?: boolean;
}

interface VehicleTypes {
  label: string;
  value: string;
  code?: string;
  name?: string;
  // type?: string; 
  // transportTypeCode?: string;
  driver?: string;
  // transportTypeName?: string;
}

interface CustomerLists {
  label: string;
  value: string;
  fullName?: string;
  email?: string;
  phone?: string;
  customerCode?: string;
}

interface Storages {
  label: string;
  value: string;
}


// interface TransportTypes {
//   label: string;
//   value: string;
// }

@Component({
  selector: 'app-order-create',
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
    NzPaginationModule,
    NzMessageModule,
    NzRadioModule,
    
  ],
  templateUrl: './order-create.component.html',
  styleUrls: ['./order-create.component.scss'],
})
export class OrderCreateComponent implements OnInit {
  @ViewChild('itemSearchTpl', { static: false })
  itemSearchTpl!: TemplateRef<any>;

  orderForm: FormGroup;
  customerForm : FormGroup;
  orderItems: OrderItem[] = [];
  formatterVND = (value: number | null): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return `${value.toLocaleString('vi-VN')} đ`;
};

/**
 * Hàm chuyển đổi chuỗi tiền tệ VNĐ về lại kiểu số.
 */
parserVND = (value: string): number => {
  if (!value) {
    return 0;
  }
  // Xóa " đ" và tất cả dấu chấm (dấu phân cách ngàn)
  const cleanValue = value.replace(/ đ/g, '').replace(/\./g, '');
  return Number(cleanValue) || 0;
};
  // Item search modal
  private modalRef: NzModalRef | null = null;
  searchKey: string = '';
  searchResults: MasterItem[] = [];

  // Pagination for item search modal
  itemsCurrentPage: number = 1;
  itemsPageSize: number = 10;
  get grandTotal(): number {
  if (!this.orderItems || this.orderItems.length === 0) {
    return 0;
  }

  // Tính tổng (quantity * price) của mỗi item
  return this.orderItems.reduce((acc, item) => {
    const quantity = item.quantity || 0;
    const price = item.price || 0;
    return acc + quantity * price;
  }, 0);
}
get isOutProvince(): boolean {
  return this.orderForm.get('poType')?.value === 'OUT_PROVINCE';
}
  get pagedSearchResults(): MasterItem[] {
    const start = (this.itemsCurrentPage - 1) * this.itemsPageSize;
    return this.searchResults.slice(start, start + this.itemsPageSize);
  }

  // Get filtered vehicle list based on selected transport type
  get filteredTransportVehicles(): VehicleTypes[] {
    const selectedOrderType = this.orderForm.get('orderType')?.value;
    if (!selectedOrderType) {
      return this.transportVehicles;
    }
    // filter by known properties (transportTypeCode or type or value)
    return this.transportVehicles.filter(
      (vehicle) =>
        // vehicle.transportTypeCode === selectedOrderType ||
        // vehicle.type === selectedOrderType ||
        vehicle.value === selectedOrderType
    );
  }

  // Master data
  masterItems: MasterItem[] = [];
  customers: CustomerLists[] = [];
  storages: Storages[] = [];
  transportVehicles: VehicleTypes[] = [];
  // transportTypes: TransportTypes[] = [];
  transportUnits: any[] = [];
  currentUserStoreCode: string = '';
  currentStoreName: string = '';
  isKD = false;
  isKH = false;
  isKT = false;
  isCH = false;
  targetType: 'STORE' | 'CUSTOMER' = 'STORE';
  copiedOrderState: any = null; // Store state from copied order
  storesList: any[] = [];
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
    private globalService: GlobalService,
    private modal: NzModalService,
    private message: NzMessageService,
    private orderService: OrderService,
    private _sStore: StoreService,
    private returnService: ReturnService
  ) {
    this.orderForm = this.fb.group({
      poType:['', [Validators.required]],
      customerCode: ['', [Validators.required]], // Bắt buộc
      orderDate: [new Date(), [Validators.required]],
      receiveDate: ['', [Validators.required]], // Bắt buộc
      // orderType: ['', [Validators.required]],
      // transportMethod: [''], // Hình thức vận chuyển - không bắt buộc
      vehicleMethod: [''], // Không bắt buộc
      customerInfo: [''], // Người vận tải - không bắt buộc
      representative: [''], // Người đại diện - không bắt buộc
      unitPrice: [''],
      orderNote: [''],
      orderAddress: [''], // Không bắt buộc
      email: ['', [Validators.email]], // Email không bắt buộc nhưng nếu có thì phải đúng format
      phone: [''],
      additionalNotes: [''],
      storeCode: [''],
    });
    this.customerForm = this.fb.group({      
          id: [''],
          customerCode: ['', [Validators.required]],
          fullName: ['', [Validators.required]],
          shortName: [''],
          vatNumber: [''],
          email: ['', [Validators.required, Validators.email]],
          phone: ['', [Validators.required, Validators.pattern(/^\+?\d{10,15}$/)]],
          address: [''],
          isActive: [true],
        });
  }

  ngOnInit(): void {
    this.globalService.setBreadcrumb([
      { name: 'Tạo đơn hàng mới', path: '/order/create' },
    ]);

    // Get state from router (if navigated from copy order)
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.copiedOrderState = navigation.extras.state;
    }

    this.loadUserInfo();
    this.loadMasterData();
    this.setupFormListeners();

    // After master data is loaded, populate form with copied data (if exists)
    // avoid relying on setTimeout if possible; keep but it's defensive here
    setTimeout(() => {
      if (this.copiedOrderState) {
        this.populateFormFromCopiedOrder();
      }
    }, 500);
  }

  /**
   * Populate form fields from copied order state
   * Note: customerCode, email, phone should NOT be disabled
   */
  private populateFormFromCopiedOrder(): void {
    if (!this.copiedOrderState) return;

    const state = this.copiedOrderState;

    // Patch form values - include email and phone from copied state
    this.orderForm.patchValue({
      poType : state.poType || '',
      customerCode: state.customerCode || '',
      orderDate: state.orderDate ? new Date(state.orderDate) : new Date(),
      receiveDate: state.receiveDate ? new Date(state.receiveDate) : null,
      // orderType: state.orderType || '',
      // transportMethod: state.transportMethod || '',
      vehicleMethod: state.vehicleMethod || '',
      customerInfo: state.customerInfo || '',
      representative: state.representative || '',
      unitPrice: state.unitPrice || '',
      orderNote: state.orderNote || '',
      orderAddress: state.orderAddress || '',
      email: state.email || '',
      phone: state.phone || '',
      additionalNotes: '',
    });

    // Populate order items
    if (state.items && Array.isArray(state.items)) {
      this.orderItems = [...state.items];
    }

    this.message.info('Dữ liệu đơn hàng đã được copy');
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
      // 1. Gọi API lấy StoreCode từ UserName
      this._sAccountStore.GetByUserName(userName).subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res[0] : (res.data ? res.data[0] : res);
          
          if (data && (data.storeCode || data.code)) {
            this.currentUserStoreCode = data.storeCode || data.code;
            
            // Patch code vào form (ẩn)
            this.orderForm.patchValue({
              storeCode: this.currentUserStoreCode
            });

            // 2. ✅ GỌI TIẾP API LẤY CHI TIẾT CỬA HÀNG ĐỂ HIỂN THỊ TÊN
            this.loadStoreDetails(this.currentUserStoreCode);
          }
        },
        error: (err) => console.error('Không lấy được liên kết Account-Store:', err)
      });

      // Bỏ validate bắt buộc cho customerCode
      this.orderForm.get('customerCode')?.clearValidators();
      this.orderForm.get('customerCode')?.updateValueAndValidity();
    }
    if (this.isKH && userName) {
      this.loadCustomerByUserName(userName);
    }
  }
private loadStoreDetails(storeCode: string): void {
    this._sStore.GetByStoreCode(storeCode).subscribe({
      next: (res: any) => {
        // Xử lý dữ liệu trả về từ StoreService
        const store = Array.isArray(res) ? res[0] : (res.data ? res.data[0] : res);
        if (store) {
          this.currentStoreName = store.name; // Lưu tên cửa hàng
          
          // (Tuỳ chọn) Nếu muốn hiển thị tên cửa hàng vào một control trong form
          // this.orderForm.patchValue({ storeName: store.name }); 
        }
      },
      error: (err) => console.error('Không lấy được thông tin chi tiết Cửa hàng:', err)
    });
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
                const formattedCustomer: CustomerLists = {
                  label: customer.fullName || customer.name || 'Khách hàng',
                  value: customer.customerCode || customer.code || '',
                  email: customer.email || '',
                  phone: customer.phone || '',
                  fullName: customer.fullName || customer.name || '',
                  customerCode: customer.customerCode || customer.code || '',
                };

                this.customers = [formattedCustomer];

                // Only set form values if not copying an order
                if (!this.copiedOrderState) {
                  this.orderForm.patchValue({
                    customerCode: formattedCustomer.value,
                    email: formattedCustomer.email,
                    phone: formattedCustomer.phone,
                  });
                }

                // Disable email and phone fields for KH account type
              
                this.orderForm.get('customerCode')?.disable();
              }
            },
            error: (err) => console.error('❌ Lỗi getByCustomerCode:', err),
          });
        }
      },
      error: (err) => console.error('❌ Lỗi getByUserName:', err),
    });
  }

  private loadMasterData(): void {
    // Load transport types
    // this.returnService.getTransportTypes().subscribe({
    //   next: (data) => {
    //     this.transportTypes = (data || []).map((item: any) => ({
    //       label: item.name || item.title || '',
    //       value: item.code || item.id || '',
    //     }));
    //   },
    //   error: (err) => {
    //     console.error('Lỗi khi tải loại hình vận tải:', err);
    //     this.message.error('Không thể tải danh sách loại hình vận tải!');
    //   },
    // });
    // Load transport units
    this.returnService.getTransportUnits().subscribe({
      next: (data) => {
        this.transportUnits = (data || []).map((item: any) => ({
          label: item.name,
          value: item.code,
        }));
      },
      error: (err) => {
        console.error('Lỗi khi tải đơn vị vận tải:', err);
        this.message.error('Không thể tải danh sách đơn vị vận tải!');
      },
    });
    // Load storages
    this.returnService.getStorages().subscribe({
      next: (data) => {
        this.storages = (data || []).map((item: any) => ({
          label: item.name,
          value: item.code,
        }));
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách kho:', err);
        this.message.error('Không thể tải danh sách kho!');
      },
    });

    // Load customers
    this.returnService.getCustomers().subscribe({
      next: (data) => {
        // map with full info so other logic can read email/phone/fullName/customerCode
        this.customers = (data || []).map((item: any) => ({
          label: item.fullName || item.name || item.displayName || '',
          value: item.customerCode || item.code || item.id || '',
          fullName: item.fullName || item.name || '',
          email: item.email || '',
          phone: item.phone || '',
          customerCode: item.customerCode || item.code || item.id || '',
        }));
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách khách hàng:', err);
        this.message.error('Không thể tải danh sách khách hàng!');
      },
    });

    // Load transport vehicles
    this.returnService.getTransportVehicles().subscribe({
      next: (data) => {
        // Ensure each vehicle has code, name, driver and transportTypeCode (if provided by API)
        this.transportVehicles = (data || []).map((item: any) => ({
          label: item.name || item.plate || item.displayName || '',
          value: item.code || item.id || item.plate || '',
          code: item.code || item.id || item.plate || '',
          name: item.name || item.plate || '',
          driver: item.driver || item.driverName || '',
          // try to detect transport type code from possible fields returned by API
          // transportTypeCode:
          //   item.transportTypeCode ||
          //   item.typeCode ||
          //   item.type ||
          //   item.transportType?.code ||
          //   '',
          // type: item.type || item.transportType || '',
          // transportTypeName:
          //   item.transportTypeName || item.transportType?.name || '',
        }));
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách phương tiện:', err);
        this.message.error('Không thể tải danh sách phương tiện!');
      },
    });

    // Load product list (for modal)
    this.returnService.getProductLists().subscribe({
      next: (data) => {
        this.masterItems = (data || []).map((item: any) => ({
          code: item.code || item.productCode || '',
          name: item.name || item.productName || '',
          unit: item.unit || item.unitCode || '',
          basicUnit: item.basicUnit || item.basicUnitCode || '',
          unitProductName: item.unitProductName || item.unitName || '',
          basicUnitProductName: item.basicUnitProductName || item.basicUnitName || '',
          price: item.price || 0,
          isAdded: false,
        }));
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách sản phẩm:', err);
        this.message.error('Không thể tải danh sách sản phẩm!');
      },
    });
    this.orderService.getStores().subscribe({ // Hoặc hàm API tương ứng của bạn
      next: (data) => {
        this.storesList = (data || []).map((item: any) => ({
          label: item.name || item.storeName,
          value: item.code || item.storeCode,
        }));
      },
      error: (err) => console.error('Lỗi load stores:', err)
    });
  }
  onTargetTypeChange(): void {
    const customerControl = this.orderForm.get('customerCode');
    const storeControl = this.orderForm.get('storeCode');

    if (this.targetType === 'CUSTOMER') {
      // Reset Store, Require Customer
      storeControl?.setValue(null);
      storeControl?.clearValidators();
      
      customerControl?.setValidators([Validators.required]);
    } else {
      // Reset Customer, Require Store
      customerControl?.setValue(null);
      customerControl?.clearValidators();

      storeControl?.setValidators([Validators.required]);
    }

    storeControl?.updateValueAndValidity();
    customerControl?.updateValueAndValidity();
  }
  private setupFormListeners(): void {
    this.orderForm
        .get('customerCode')
        ?.valueChanges.subscribe((selectedCode) => {
            // Gọi hàm load dữ liệu đầy đủ khách hàng vào customerForm
            this.loadCustomerData(selectedCode); 
            
            // Logic patch Email/Phone từ customers list có thể không cần thiết nữa
            // vì loadCustomerData đã làm điều đó.
            // Nếu bạn vẫn muốn giữ logic cũ để fallback:
            const selectedCustomer = this.customers.find(
                (c) => c.value === selectedCode || c.customerCode === selectedCode
            );

            if (selectedCustomer) {
              if (this.orderForm.get('email')?.enabled) {
                this.orderForm.patchValue({
                  email: selectedCustomer.email || '',
                });
              }
              if (this.orderForm.get('phone')?.enabled) {
                this.orderForm.patchValue({
                  phone: selectedCustomer.phone || '',
                });
              }
            } 
           
        });
    // Listen to order type (transport type) selection - reset vehicle when type changes
    this.orderForm.get('orderType')?.valueChanges.subscribe((selectedType) => {
      this.orderForm.patchValue({
        vehicleMethod: '',
        customerInfo: '',
      });
    });

  

    // Listen to vehicle selection
    this.orderForm.get('vehicleMethod')?.valueChanges.subscribe((selected) => {
      if (!selected) {
        this.orderForm.patchValue({ customerInfo: '' });
        return;
      }

      const selectedVehicle = this.transportVehicles.find(
        (v) => v.code === selected || v.value === selected
      );

      if (selectedVehicle) {
        this.orderForm.patchValue({
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
onPriceChange(item: OrderItem, newPrice: number): void {
  // 1. Cập nhật giá trị 'price' trên item chính
  // newPrice đã được parser xử lý (là kiểu số)
  // Khi dòng này chạy, 'grandTotal' sẽ tự động tính toán lại.
  item.price = newPrice;

  // 2. Cập nhật giá trị này vào cache (masterItems và searchResults)
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
// Trong OrderCreateComponent class
private loadCustomerData(customerCode: string): void {
    if (!customerCode) {
        this.customerForm.reset();
        return;
    }

    // Giả sử _sCustomer.GetByCustomerCode trả về Observable<any> với thông tin chi tiết
    this._sCustomer.GetByCustomerCode(customerCode).subscribe({
        next: (res: any) => {
            const customer = Array.isArray(res) && res.length > 0 ? res[0] : null;

            if (customer) {
                // Đảm bảo customerForm có đủ các trường cần thiết (bao gồm ID nếu API update cần)
                this.customerForm.patchValue({
                    id: customer.id || '', // Rất quan trọng: ID/PKID
                    customerCode: customer.customerCode || customerCode,
                    fullName: customer.fullName || customer.name || '',
                    shortName: customer.shortName || '',
                    vatNumber: customer.vatNumber || '',
                    email: customer.email || '',
                    phone: customer.phone || '',
                    address: customer.address || '',
                    isActive: customer.isActive !== undefined ? customer.isActive : true,
                }, { emitEvent: false });
                
                // Đồng bộ Email/Phone/Name về orderForm (nhưng không emitEvent để tránh loop)
                this.orderForm.patchValue({
                    email: customer.email || '',
                    phone: customer.phone || '',
                    // ... các trường khác có thể cần đồng bộ
                }, { emitEvent: false });

            } else {
                this.customerForm.reset();
            }
        },
        error: (err) => {
            console.error('❌ Lỗi load Customer Data:', err);
            this.customerForm.reset();
        },
    });
}

// onSubmit(): void {
//         if (!this.orderForm.valid) {
//       this.message.error('Vui lòng điền đầy đủ thông tin bắt buộc!');
//       Object.values(this.orderForm.controls).forEach((control) => {
//         if (control.invalid) {
//           control.markAsDirty();
//           control.updateValueAndValidity({ onlySelf: true });
//         }
//       });
//       return;
//     }

//     if (this.orderItems.length === 0) {
//       this.message.error('Vui lòng thêm ít nhất một mặt hàng!');
//       return;
//     }

//     const hasZeroQuantity = this.orderItems.some(
//       (item) => !item.quantity || item.quantity <= 0
//     );
//     if (hasZeroQuantity) {
//       this.message.error('Vui lòng nhập số lượng cho tất cả mặt hàng!');
//       return;
//     }
//     const formValue = this.orderForm.getRawValue();


    
//     // 1. CHUẨN BỊ PAYLOAD CẬP NHẬT KHÁCH HÀNG
    
//     // Lấy payload đầy đủ hiện tại từ customerForm (bao gồm ID, fullName, address,...)
//     const customerUpdatePayload = this.customerForm.getRawValue();

//     // GHI ĐÈ Email và Phone bằng giá trị mới nhất từ orderForm (người dùng nhập)
//     customerUpdatePayload.email = formValue.email;
//     customerUpdatePayload.phone = formValue.phone;
    
//     if (!customerUpdatePayload.customerCode) {
//         this.message.error('Không tìm thấy mã khách hàng để thực hiện giao dịch.');
//         return;
//     }
    
//     // Tìm thông tin khách hàng từ danh sách (chỉ để lấy tên/label cho DTO tạo đơn hàng)
//     const selectedCustomer = this.customers.find(
//         (c) => c.value === formValue.customerCode || c.customerCode === formValue.customerCode
//     );

//     // Bắt đầu chuỗi Observable: Cập nhật khách hàng -> Tạo đơn hàng
    
//     // 2. GỌI API CẬP NHẬT KHÁCH HÀNG TRƯỚC
//     this.orderService.updateCustomer(customerUpdatePayload)
//         .pipe(
//             switchMap(() => {  
//                 // --- LOGIC TẠO DTO ORDER (Giữ nguyên) ---
//                 const formatDateISO = (date: any): string => {
//                     if (!date) return '';
//                     const d = new Date(date);
//                     if (isNaN(d.getTime())) return '';
//                     return d.toISOString();
//                 };

//                 const selectedStorage = this.storages.find(
//                     (s) => s.value === formValue.orderAddress
//                 );

//                 const items = this.orderItems.map((item, index) => {
//                     const materialCode = item.name.split(' - ')[0].trim();
//                     return {
//                         materialCode: materialCode,
//                         numberItem: index + 1,
//                         quantity: item.quantity,
//                         approveQuantity: item.quantity,
//                         unitCode: item.unit,
//                         basicUnit: item.basicUnit,
//                         unitProductName: item.unitProductName,
//                         basicUnitProductName: item.basicUnitProductName,
//                         price: item.price,
//                     };
//                 });

//                 const orderDateIso = formatDateISO(formValue.orderDate);
//                 const receiptIso = formatDateISO(formValue.receiveDate);

//                 const createDto: any = {
//                     poType: formValue.poType,
//                     totalPrice: this.grandTotal,
//                     customerCode: formValue.customerCode,
//                     customerName:
//                         selectedCustomer?.fullName || selectedCustomer?.label || '',
//                     orderDate: orderDateIso,
//                     deliveryDate: receiptIso || orderDateIso,
//                     receiptDate: receiptIso || orderDateIso,
//                     vehicleCode: formValue.vehicleMethod || '',
//                     vehicleInfo: formValue.unitPrice || '',
//                     driver: formValue.customerInfo || '',
//                     storageCode: formValue.orderAddress || '',
//                     storageName: selectedStorage?.label || '',
//                     representative: formValue.representative || '',
//                     email: formValue.email || '',
//                     phone: formValue.phone || '',
//                     note: formValue.orderNote || '',
//                     storeCode: formValue.storeCode || '',
//                     items: items,
//                 };

//                 const payload = JSON.parse(
//                     JSON.stringify(createDto, (_key, value) =>
//                         value === undefined ? undefined : value
//                     )
//                 );

               

//                 // GỌI API TẠO ĐƠN HÀNG
//                 return this.orderService.createOrder(payload).pipe(
//                     catchError((error) => {
//                         let errorMsg = 'Có lỗi xảy ra khi tạo đơn hàng!';
//                         if (error?.error?.messageObject?.message) {
//                             errorMsg = error.error.messageObject.message;
//                         } else if (error?.message) {
//                             errorMsg = error.message;
//                         }
//                         this.message.error(errorMsg);
//                         return of(null); // Chặn luồng nếu tạo đơn hàng thất bại
//                     })
//                 );
//             })
//         )
//         .subscribe({
//             next: (response) => {
//                 if (response && response?.status) {
//                     this.message.success(
//                         `Tạo đơn hàng thành công! Mã đơn hàng: ${
//                             response.data?.code || 'N/A'
//                         }`
//                     );

//                     setTimeout(() => {
//                         this.router.navigate(['/order/list']);
//                     }, 1500);
//                 }
//             },
//             error: (error) => {
//                 // Lỗi không mong muốn
//                 console.error('Lỗi trong quá trình tạo đơn hàng:', error);
//                 this.message.error('Có lỗi không mong muốn xảy ra trong quá trình tạo đơn hàng!');
//             },
//         });
// }
 
onSubmit(): void {
    // 1. Validate Form cơ bản
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

    // 2. Validate Items
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

    const formValue = this.orderForm.getRawValue();

    // ✅ LOGIC MỚI: Kiểm tra CustomerCode
    if (!formValue.customerCode && !(this.isKD && this.targetType === 'STORE')) {
       // Logic check lỗi cũ...
       if (!this.isCH) {
          this.message.error('Không tìm thấy mã khách hàng...');
          return;
       }
      
      // Trường hợp 2: Là CH và không chọn khách -> Tạo đơn ngay (bỏ qua update customer)
      this.createOrderPayloadAndSubmit(formValue, null);
      return;
    }

    // Trường hợp 3: Có chọn khách hàng -> Logic cũ (Update Customer -> Create Order)
    const customerUpdatePayload = this.customerForm.getRawValue();
    customerUpdatePayload.email = formValue.email;
    customerUpdatePayload.phone = formValue.phone;
    
    // Tìm thông tin customer để lấy tên
    const selectedCustomer = this.customers.find(
       (c) => c.value === formValue.customerCode || c.customerCode === formValue.customerCode
    );
    if (this.isKD && this.targetType === 'STORE') {
        this.createOrderPayloadAndSubmit(formValue, null); // SelectedCustomer là null vì chọn Store
        return;
    }
    // Gọi API update customer trước
    this.orderService.updateCustomer(customerUpdatePayload).subscribe({
      next: () => {
         // Update xong thì tạo đơn
         this.createOrderPayloadAndSubmit(formValue, selectedCustomer);
      },
      error: (err) => {
         this.message.error('Lỗi cập nhật thông tin khách hàng, không thể tạo đơn.');
      }
    });
  }
  // ✅ THÊM HÀM MỚI NÀY
  private createOrderPayloadAndSubmit(formValue: any, selectedCustomer: any) {
    // Hàm format date
    const formatDateISO = (date: any): string => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toISOString();
    };

    // Tìm tên kho
    const selectedStorage = this.storages.find(
        (s) => s.value === formValue.orderAddress
    );

    // Map items
    const items = this.orderItems.map((item, index) => {
        const materialCode = item.name.split(' - ')[0].trim();
        return {
            materialCode: materialCode,
            numberItem: index + 1,
            quantity: item.quantity,
            approveQuantity: item.quantity,
            unitCode: item.unit,
            basicUnit: item.basicUnit,
            unitProductName: item.unitProductName,
            basicUnitProductName: item.basicUnitProductName,
            price: item.price,
        };
    });

    const orderDateIso = formatDateISO(formValue.orderDate);
    const receiptIso = formatDateISO(formValue.receiveDate);

    let finalStoreCode = '';
    if (this.isCH) {
        // Logic cũ của CH
        finalStoreCode = formValue.customerCode ? '' : (this.currentUserStoreCode || formValue.storeCode);
    } else if (this.isKD && this.targetType === 'STORE') {
        // Logic mới cho KD chọn Store
        finalStoreCode = formValue.storeCode;
    }

    // Tạo DTO
    const createDto: any = {
        poType: formValue.poType,
        totalPrice: this.grandTotal,
        customerCode: this.targetType === 'CUSTOMER' ? (formValue.customerCode || '') : '',
        customerName: selectedCustomer?.fullName || selectedCustomer?.label || '',
        orderDate: orderDateIso,
        deliveryDate: receiptIso || orderDateIso,
        receiptDate: receiptIso || orderDateIso,
        vehicleCode: formValue.vehicleMethod || '',
        vehicleInfo: formValue.unitPrice || '',
        driver: formValue.customerInfo || '',
        storageCode: formValue.orderAddress || '',
        storageName: selectedStorage?.label || '',
        representative: formValue.representative || '',
        email: formValue.email || '',
        phone: formValue.phone || '',
        note: formValue.orderNote || '',
        storeCode: finalStoreCode,
        items: items,
    };

    const payload = JSON.parse(
        JSON.stringify(createDto, (_key, value) =>
            value === undefined ? undefined : value
        )
    );

    // Gọi API
    this.orderService.createOrder(payload).subscribe({
        next: (response) => {
            if (response && response?.status) {
                this.message.success(
                    `Tạo đơn hàng thành công! Mã đơn hàng: ${
                        response.data?.code || 'N/A'
                    }`
                );
                setTimeout(() => {
                    this.router.navigate(['/order/list']);
                }, 1500);
            }
        },
        error: (error) => {
            let errorMsg = 'Có lỗi xảy ra khi tạo đơn hàng!';
            if (error?.error?.messageObject?.message) {
                errorMsg = error.error.messageObject.message;
            } else if (error?.message) {
                errorMsg = error.message;
            }
            this.message.error(errorMsg);
        },
    });
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
      existing.approveQuantity = (existing.approveQuantity || 0) +1;
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

  getDisabledReceiveDateFn(): (current: Date | null) => boolean {
    return (current: Date | null) => {
      if (!current) return false;
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
}
