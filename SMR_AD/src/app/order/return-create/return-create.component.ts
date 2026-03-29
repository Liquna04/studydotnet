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
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzModalModule, NzModalService, NzModalRef } from 'ng-zorro-antd/modal';
import { NzMessageModule, NzMessageService } from 'ng-zorro-antd/message';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { GlobalService } from '../../service/global.service';
import { OrderService } from '../../service/order.service';
import { TransportTypeService } from '../../service/master-data/transport-type.service';
import { ProductListService } from '../../service/master-data/Product-List.service';
import { TransportVehicleService } from '../../service/master-data/transport-vehicle.service';
import { TransportUnitService } from '../../service/master-data/transport-unit.service';
import { StorageService } from '../../service/master-data/Storage.service';
import { CustomerService } from '../../service/master-data/customer.service';
import { AccountStoreService } from '../../service/master-data/account-store.service';
import { StoreService } from '../../service/master-data/store.service';
import { ReturnService, Order } from '../../service/return.service';
import { forkJoin, switchMap, of, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AccountCustomerService } from '../../service/master-data/account-customer.service';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';



// ✅ Simplified interfaces - loại bỏ các interface thừa
interface ReturnDetailItem {
  pkid: string;
  headerCode: string;
  materialCode: string;
  numberItem: number;
  returnQuantity: number;
  approveQuantity: number;
  realQuantity: number;
  unitCode: string;
  basicUnit: string;
  price: number;
  materialName?: string;
  unitProductName?: string;
  basicUnitProductName?: string;
  orderQuantity?: number;
}

interface MasterItem {
  code: string;
  name: string;
  unit: string;
  basicUnit: string;
  price: number;
  unitProductName: string;
  basicUnitProductName: string;
  isAdded?: boolean;
}

interface SelectOption {
  label: string;
  value: string;
  email?: string;
  phone?: string;
}
interface TransportVehicleOption extends SelectOption {
  code: string;
  name: string;
  driver?: string; // tên tài xế hoặc thông tin tài xế
  transportTypeCode?: string; // loại hình vận tải code
}
@Component({
  selector: 'app-return-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    NzSpaceModule,
    NzTableModule,
    NzModalModule,
    NzMessageModule,
    NzInputNumberModule,
    NzPaginationModule,
    NzAutocompleteModule,
  ],
  templateUrl: './return-create.component.html',
  styleUrls: ['./return-create.component.scss'],
})
export class ReturnCreateComponent implements OnInit {
  @ViewChild('itemSearchTpl', { static: false })
  itemSearchTpl!: TemplateRef<any>;
  isSubmitting = false;
  returnForm: FormGroup;
  customerForm: FormGroup;
  returnItems: ReturnDetailItem[] = [];
  latestOrders: Order[] = [];
  currentUserStoreCode: string = '';
  currentStoreName: string = '';
  // Item search modal
  private modalRef: NzModalRef | null = null;
  searchKey: string = '';
  searchResults: MasterItem[] = [];

  // Pagination
  itemsCurrentPage: number = 1;
  itemsPageSize: number = 10;
 get grandTotal(): number {
  if (!this.returnItems || this.returnItems.length === 0) {
    return 0;
  }

  // Tính tổng (quantity * price) của mỗi item
  return this.returnItems.reduce((acc, item) => {
    const returnQuantity = item.returnQuantity || 0;
    const price = item.price || 0;
    return acc + returnQuantity * price;
  }, 0);
}
get isOutProvince(): boolean {
  return this.returnForm.get('poType')?.value === 'OUT_PROVINCE';
}
  // ===== Role-style confirmation (replace items) =====
  @ViewChild('confirmReplaceItemsTpl', { static: false })
  confirmReplaceItemsTpl!: TemplateRef<any>;
  private _confirmModalRef: NzModalRef | null = null;
  private _pendingNewItems: any[] | null = null;

  disableBeforeReturnDate = (current: Date): boolean => {
    const returnDate = this.returnForm.get('returnDate')?.value;
    return returnDate ? current < new Date(returnDate) : false;
  };
  private openConfirmReplaceItems(newItems: any[]): void {
    this._pendingNewItems = newItems;
    this._confirmModalRef = this.modal.create({
      nzContent: this.confirmReplaceItemsTpl,
      nzFooter: null,
      nzClosable: false,
      nzMaskClosable: true,
      nzWidth: 520,
      nzBodyStyle: { padding: '24px 32px' },
    });
  }

  closeReplaceItemsModal(): void {
    if (this._confirmModalRef) {
      this._confirmModalRef.destroy();
      this._confirmModalRef = null;
    }
  }

  confirmReplaceProceed(replaceAll: boolean): void {
    if (!this._pendingNewItems) {
      this.closeReplaceItemsModal();
      return;
    }
    const newItems = this._pendingNewItems;
    if (replaceAll) {
      this.returnItems = newItems;
      this.updateMasterItemsAddedState();
      this.message.success('Đã thay thế bằng mặt hàng từ đơn được chọn');
      this.isLoadingOrder = false;  // Thêm dòng này
  this.isLoadingOrderData = false;
    } else {
      newItems.forEach((newItem: any) => {
        const exists = this.returnItems.some(
          (it: any) => it.materialCode === newItem.materialCode
        );
        if (!exists) {
          this.returnItems.push(newItem);
        }
      });
      this.updateMasterItemsAddedState();
      this.message.success('Đã thêm mặt hàng từ đơn được chọn');
    }
    this._pendingNewItems = null;
    this.closeReplaceItemsModal();
  }
  get pagedSearchResults(): MasterItem[] {
    const start = (this.itemsCurrentPage - 1) * this.itemsPageSize;
    return this.searchResults.slice(start, start + this.itemsPageSize);
  }

  // Master data
  masterItems: MasterItem[] = [];
  customers: SelectOption[] = [];
  storages: SelectOption[] = [];
  transportVehicles: TransportVehicleOption[] = [];
  filteredVehicles: TransportVehicleOption[] = [];
  transportTypes: SelectOption[] = [];
  transportUnits: SelectOption[] = [];

  // Get filtered vehicle list based on selected transport type
  get filteredTransportVehicles(): TransportVehicleOption[] {
    const selectedTransportType = this.returnForm.get('transportType')?.value;
    if (!selectedTransportType) {
      return this.transportVehicles;
    }
    // Filter vehicles by matching type field (API returns 'type', we map to 'transportType')
    return this.transportVehicles.filter(
      (vehicle) => vehicle.transportTypeCode === selectedTransportType
    );
  }

  // Loading states
  private isLoadingOrder = false;
  isLoadingOrderData = false;
  isKD = false;
  isKH = false;
  isKT = false;
  isCH = false;
  constructor(
    private _sAccountCustomer: AccountCustomerService,
    private _sTransportUnit: TransportUnitService,
    private _sTransportVehicle: TransportVehicleService,
    private _sProductList: ProductListService,
    private _sTransportType: TransportTypeService,
    private _sStorage: StorageService,
    private _sCustomer: CustomerService,
    private _sAccountStore: AccountStoreService, // ✅ THÊM
    private _sStore: StoreService,
    private _sOrder: OrderService,
    private fb: FormBuilder,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private globalService: GlobalService,
    private modal: NzModalService,
    private message: NzMessageService,
    private returnService: ReturnService
  ) {
    this.returnForm = this.fb.group({
      code: [''],
      poType:['', [Validators.required]],
      returnReason: ['', [Validators.required]],
      orderCode: ['', [Validators.required]],
      customerCode: ['', [Validators.required]],
      customerName: [''],
      returnDate: [new Date(), [Validators.required]],
      expectedReturnDate: ['', [Validators.required]],
      transportType: ['', [Validators.required]],
      vehicleCode: [''],
      driver: [''],
      transportUnit: [''],
      storageCode: [''],
      storageName:[''],
      representative: [''],
      email: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      note: [''],
      returnNote: [''],
      status: ['1'],
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
    { name: 'Tạo đơn trả hàng mới', path: '/order/return-create' },
  ]);
  this.loadUserInfo();
  this.returnForm.get('orderCode')?.valueChanges.subscribe((orderCode: string) => {
    this.onOrderSelected(orderCode);
  });
 this.returnForm.get('customerCode')?.valueChanges.subscribe((customerCode: string) => {
    if (customerCode && customerCode.trim()) {
      this.loadCustomerData(customerCode.trim());
    } else {
      this.customerForm.reset();
    }
  });

  const navigation = this.router.getCurrentNavigation();
const state = navigation?.extras.state as { 
    orderData: any, 
    returnOrderCode: string 
  };
this.loadMasterData()
    .pipe(
      tap(() => this.loadLatestOrders()),
      switchMap(() => {
        
        // ✅ TRƯỜNG HỢP 1: Sao chép từ đơn trả hàng (DÙNG API)
        if (state?.returnOrderCode) {
          // Gọi hàm mới để tải dữ liệu đơn trả hàng
          this.loadReturnOrderForCopying(state.returnOrderCode);
        
        // TRƯỜNG HỢP 2: Tạo từ đơn hàng (Logic cũ của bạn)
        } else if (state?.orderData) {
          this.loadOrderDataFromState(state.orderData);

        // TRƯỜNG HỢP 3: Tạo mới (Logic cũ của bạn)
        } else {
          const orderCode = this.activatedRoute.snapshot.queryParamMap.get('orderCode');
          if (orderCode) {
            this.returnForm.patchValue({ orderCode });
          }
        }
        return of(true);
      })
    )
    .subscribe();
}
private loadCustomerData(customerCode: string): void {
  if (!customerCode || customerCode.trim() === '') {
    this.customerForm.reset();
    this.returnForm.patchValue(
      { email: '', phone: '', customerName: '' },
      { emitEvent: false }
    );
    return;
  }

  this.returnService.getCustomerByCode(customerCode).subscribe({
    next: (res: any) => {
      
      // ✅ Sửa: Xử lý cả 2 trường hợp API response
      let customer = null;
      
      // Trường hợp 1: API trả về mảng trực tiếp [{...}]
      if (Array.isArray(res) && res.length > 0) {
        customer = res[0];
      }
      // Trường hợp 2: API trả về { status: true, data: [...] }
      else if (res && res.status === true && res.data && res.data.length > 0) {
        customer = res.data[0];
      }
      
      if (customer) {
        
        // ✅ Sửa: Xử lý null/undefined cho email và các trường khác
        this.customerForm.patchValue(
          {
            id: customer.id || '',
            customerCode: customer.customerCode || customerCode,
            fullName: customer.fullName || '',
            shortName: customer.shortName || '',
            address: customer.address || '',
            vatNumber: customer.vatNumber || '',
            email: customer.email || '', // ✅ Xử lý null
            phone: customer.phone || '',
            isActive: customer.isActive !== undefined ? customer.isActive : true,
          },
          { emitEvent: false }
        );
        
        // Đồng bộ với returnForm
        this.returnForm.patchValue(
          {
            email: customer.email || '',
            phone: customer.phone || '',
            customerName: customer.fullName || '',
            customerCode: customer.customerCode || customerCode,
          },
          { emitEvent: false }
        );
        
      } else {
        // ✅ Sửa: Thông báo rõ ràng hơn
        this.message.warning(`Không tìm thấy khách hàng với mã "${customerCode}"`);
        this.customerForm.reset();
        this.returnForm.patchValue(
          { email: '', phone: '', customerName: '' },
          { emitEvent: false }
        );
      }
    },
    error: (err) => {
      console.error('❌ Lỗi API getCustomerByCode:', err);
      
      // ✅ Sửa: Xử lý lỗi cụ thể hơn
      if (err.status === 404) {
        this.message.error(`Không tìm thấy khách hàng với mã "${customerCode}"`);
      } else if (err.status === 0) {
        this.message.error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      } else {
        this.message.error('Không thể tải thông tin khách hàng. Vui lòng thử lại.');
      }
      
      this.customerForm.reset();
      this.returnForm.patchValue(
        { email: '', phone: '', customerName: '' },
        { emitEvent: false }
      );
    },
  });
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
    this._sAccountStore.GetByUserName(userName).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res[0] : (res.data ? res.data[0] : res);
        if (data && (data.storeCode || data.code)) {
          this.currentUserStoreCode = data.storeCode || data.code;
          
          // Lấy tên cửa hàng
          this._sStore.GetByStoreCode(this.currentUserStoreCode).subscribe({
            next: (storeRes: any) => {
                const store = Array.isArray(storeRes) ? storeRes[0] : (storeRes.data ? storeRes.data[0] : storeRes);
                if (store) {
                    this.currentStoreName = store.name;
                }
            },
            error: (err) => console.error('Lỗi lấy tên cửa hàng:', err)
          });
        }
      },
      error: (err) => console.error('Lỗi lấy StoreCode:', err)
    });

    // Bỏ validate bắt buộc cho customerCode (nếu cần)
    // Tuy nhiên Return Order thường cần Customer để trả hàng,
    // nhưng nếu bạn cho phép trả hàng nội bộ thì thêm dòng dưới:
    this.returnForm.get('customerCode')?.clearValidators();
    this.returnForm.get('customerCode')?.updateValueAndValidity();
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

          this.returnService.GetByCustomerCode(customerCode).subscribe({
            next: (res2: any) => {
              const customer =
                Array.isArray(res2) && res2.length > 0 ? res2[0] : null;

              if (customer) {
                // First, update customers list so dropdown has the data
                this.customers = [
                  {
                    label: customer.fullName,
                    value: customer.customerCode,
                  },
                ];

                // Auto-fill customer info for KH account type
                this.returnForm.patchValue({
                  customerCode: customer.customerCode,
                  email: customer.email || '',
                  phone: customer.phone || '',
                });

                // Disable these fields for KH account type - use setTimeout to ensure form is ready
                setTimeout(() => {
                  this.returnForm
                    .get('customerCode')
                    ?.disable({ emitEvent: false });
                
                }, 0);
              }
            },
            error: (err) => console.error('❌ Lỗi GetByCustomerCode:', err),
          });
        }
      },
      error: (err) => console.error('❌ Lỗi GetByUserName:', err),
    });
  }
  private loadMasterData(): Observable<any> {
    
    const masterItems$ = this.returnService.getProductLists().pipe(
      tap((data) => {
        this.masterItems = data.map((item: any) => ({
          code: item.code,
          name: item.name,
          unit: item.unit,
          basicUnit: item.basicUnit,
          unitProductName: item.unitProductName,
          basicUnitProductName: item.basicUnitProductName,
          price: item.price,
          isAdded: false,
        }));
      }),
      catchError((err) => {
        console.error('Lỗi khi tải danh sách sản phẩm:', err);
        this.message.error('Không thể tải danh sách sản phẩm!');
        return of([]);
      })
    );
    const transportTypes$ = this.returnService.getTransportTypes().pipe(
      tap((data) => {
        this.transportTypes = data.map((item: any) => ({
          label: item.name,
          value: item.code,
        }));
      }),
      catchError((err) => {
        console.error('Lỗi khi tải loại hình vận tải:', err);
        this.message.error('Không thể tải danh sách loại hình vận tải!');
        return of([]);
      })
    );

    const transportUnits$ = this.returnService.getTransportUnits().pipe(
      tap((data) => {
        this.transportUnits = data.map((item: any) => ({
          label: item.name,
          value: item.code,
        }));
      }),
      catchError((err) => {
        console.error('Lỗi khi tải đơn vị vận tải:', err);
        this.message.error('Không thể tải danh sách đơn vị vận tải!');
        return of([]);
      })
    );

    const storages$ = this.returnService.getStorages().pipe(
      tap((data) => {
        this.storages = data.map((item: any) => ({
          label: item.name,
          value: item.code,
        }));
      }),
      catchError((err) => {
        console.error('Lỗi khi tải danh sách kho:', err);
        this.message.error('Không thể tải danh sách kho!');
        return of([]);
      })
    );

    const customers$ = this.returnService.getCustomers().pipe(
      tap((data) => {
        this.customers = data.map((item: any) => ({
          label: item.fullName,
          value: item.customerCode,
          email: item.email,
          phone: item.phone,
        }));
      }),
      catchError((err) => {
        console.error('Lỗi khi tải danh sách khách hàng:', err);
        this.message.error('Không thể tải danh sách khách hàng!');
        return of([]);
      })
    );

    const transportVehicles$ = this.returnService.getTransportVehicles().pipe(
      tap((data) => {
        this.transportVehicles = data.map((item: any) => ({
          label: item.name,
          value: item.code,
          driver: item.driver,
          transportTypeCode: item.type || item.Type, // API returns 'type', map to transportTypeCode
        }));
      }),
      catchError((err) => {
        console.error('Lỗi khi tải danh sách phương tiện:', err);
        this.message.error('Không thể tải danh sách phương tiện!');
        return of([]);
      })
    );


    return forkJoin([ masterItems$,transportTypes$, transportUnits$, storages$, customers$, transportVehicles$]);
  }

  loadLatestOrders(): void {
    if (this.isKT || this.isKD) {
      this.message.error('Bạn không có quyền gửi đơn trả hàng');
      return;
    }
    this._sOrder.getOrders().subscribe({
      next: (orders: Order[]) => {
        if (orders && Array.isArray(orders)) {
        
          this.latestOrders = orders
            .filter(
              (order) => order.orderDate && order.orderCode && order.status === "Đã xác nhận thực nhận"            )
            .sort((a: Order, b: Order) => {
              const dateA = new Date(a.orderDate);
              const dateB = new Date(b.orderDate);
              return isNaN(dateA.getTime()) || isNaN(dateB.getTime())
                ? 0
                : dateB.getTime() - dateA.getTime();
            })
            .slice(0, 10); // Lấy 10 đơn gần nhất
        }
      },
      error: () => {
        this.message.error('Không thể tải danh sách đơn hàng gần nhất');
      },
    });
  }
// Trong return-create.component.ts

/**
 * Tải dữ liệu của một đơn trả hàng có sẵn (bao gồm header và details)
 * để sao chép.
 */
private loadReturnOrderForCopying(returnCode: string): void {
  this.isLoadingOrderData = true; // Bật loading
  this.message.info('Đang tải dữ liệu đơn trả hàng để sao chép...');

  // ✅ Chỉ gọi 1 API duy nhất
  this.returnService.getReturnByCode(returnCode).subscribe({
    next: (res) => {
      
      if (res.status && res.data) {
        const copyData = res.data;

        // ✅ 1. Điền dữ liệu Header (Form)
        this.returnForm.patchValue({
          // --- KHÔNG copy 'code' ---
          poType: copyData.poType,
          returnReason: copyData.returnReason,
          orderCode: copyData.orderCode,
          customerCode: copyData.customerCode,
          customerName: copyData.customerName,
          storeCode: copyData.storeCode,
          
          // --- Lấy ngày hiện tại ---
          returnDate: new Date(), 
          expectedReturnDate: copyData.expectedReturnDate,
          
          transportType: copyData.transportType,
          vehicleCode: copyData.vehicleCode,
          driver: copyData.driver,
          transportUnit: copyData.transportUnit,
          storageCode: copyData.storageCode,
          representative: copyData.representative,
          email: copyData.email,
          phone: copyData.phone,
          note: copyData.note,
          returnNote: copyData.returnNote,
          
          // --- Set status về '1' (Mới) ---
          status: '1', 
        });

        // ✅ 2. Điền dữ liệu Details (Bảng)
        // !!! THAY THẾ 'copyData.details' BẰNG TÊN CHÍNH XÁC
        const itemsToCopy = copyData.details || copyData.returnItems; 

        if (itemsToCopy && Array.isArray(itemsToCopy)) {
          
          this.returnItems = itemsToCopy.map((item: any) => {
            // Tìm thông tin bổ sung từ master data
            const productInfo = this.masterItems.find(
              (p) => p.code === item.materialCode
            );
            
            return {
              ...item,
               pkid: '',
              headerCode: '',
              materialCode:  productInfo?.name || '',
              price: productInfo?.price,
              unitCode: productInfo?.unit,
              basicUnit: productInfo?.basicUnit,
              materialName: productInfo?.name || '',
              unitProductName: productInfo?.unitProductName || '',
              basicUnitProductName: productInfo?.basicUnitProductName || '',
            };
          });

          this.updateMasterItemsAddedState();
        }

        this.message.success('Đã sao chép dữ liệu thành công!');
        
      } else {
        this.message.error('Không tìm thấy dữ liệu đơn trả hàng.');
      }
      
      this.isLoadingOrderData = false;
    },
    error: (err) => {
      console.error('Lỗi khi tải dữ liệu đơn trả hàng:', err);
      this.message.error('Không thể tải dữ liệu đơn trả hàng để sao chép.');
      this.isLoadingOrderData = false;
    }
  });
}
  private loadOrderDataFromState(orderData: any): void {
    

    // Fill form data
    this.returnForm.patchValue(
      {
        poType: orderData.poType,
        orderCode: orderData.code,
        customerCode: orderData.customerCode,
        customerName: orderData.customerName,
        storeCode: orderData.storeCode,
        email: orderData.email,
        phone: orderData.phone,
        storageCode: orderData.storageCode,
        storageName: orderData.storageName,
        transportType: orderData.transportType,
        vehicleCode: orderData.vehicleCode,
        driver: orderData.driver,
        transportUnit: orderData.vehicleInfo,
        representative: orderData.representative,
        note: orderData.note,
      },
      { emitEvent: false }
    );

    // Load order details to populate returnItems
    this._sOrder.getOrderDetails(orderData.code).subscribe({
      next: (detailRes) => {
        if (detailRes.status && detailRes.data) {
          const newItems = detailRes.data.map((item: any) => {
            const productInfo = this.masterItems.find(
              (p) => p.code === item.materialCode
            );
            return {
              pkid: '',
              headerCode: orderData.code,
              materialCode: item.materialCode,
              numberItem: item.numberItem || 0,
              approveQuantity: item.approveQuantity,
              realQuantity: item.quantity,
              returnQuantity: item.approveQuantity,
              price: item.price,
              unitCode: item.unitCode,
              basicUnit: item.basicUnit,
              materialName: productInfo?.name || '',
              unitProductName: productInfo?.unitProductName || '',
              basicUnitProductName: productInfo?.basicUnitProductName || '',
              orderQuantity: item.quantity,
            };
          });

          this.returnItems = newItems;
          this.updateMasterItemsAddedState();
          this.message.success(`Đã thêm dữ liệu đơn hàng ${orderData.code}`);
        }
      },
      error: () => {
        this.message.error('Lỗi khi tải chi tiết đơn hàng.');
      },
    });
  }

onOrderSelected(orderCode: string): void {


  // ✅ Chỉ load nếu orderCode thực sự thay đổi và có giá trị mới
  if (!orderCode || !orderCode.trim()) {
    this.resetOrderData();
    return;
  }

  // ✅ Kiểm tra xem đã load order này chưa
  const currentLoadedOrder = this.returnItems.length > 0 ? 
    this.returnItems[0]?.headerCode : null;
  
  if (currentLoadedOrder === orderCode.trim()) {
   
    return; // Đã load rồi, không cần load lại
  }

  this.loadOrderByCode(orderCode.trim());
}

 
private loadOrderByCode(code: string): void {
  this.isLoadingOrder = true;
  this.isLoadingOrderData = true;

  this._sOrder.getOrderByCode(code).subscribe({
    next: (res) => {
      if (!res.status || !res.data) {
        this.message.error(`Không tìm thấy đơn hàng mã "${code}".`);
        this.isLoadingOrder = false;
        this.isLoadingOrderData = false;
        return;
      }

      const order = res.data;
      
      // ✅ Fill form data with all required fields
      const returnDate = new Date(); // Use current date or order's returnDate if available

      this.returnForm.patchValue(
        {
          poType: order.poType,
          orderCode: order.code,
          customerCode: order.customerCode,
          customerName: order.customerName,
          storeCode: order.storeCode,
          email: order.email,
          phone: order.phone,
          storageCode: order.storageCode,
          storageName: order.storageName,
          transportType: order.transportType,
          vehicleCode: order.vehicleCode,
          driver: order.driver,
          transportUnit: order.vehicleInfo,
          representative: order.representative,
          note: order.note,
          returnDate: returnDate, // Ensure returnDate is set
        },
        { emitEvent: false }
      );

      // ✅ Option 2: Hỏi user trước khi ghi đè
      this._sOrder.getOrderDetails(order.code).subscribe({
        next: (detailRes: any) => {
          if (detailRes.status && detailRes.data) {
            const newItems: ReturnDetailItem[] = detailRes.data.map((item: any) => {
              const productInfo = this.masterItems.find(
                (p) => p.code === item.materialCode
              );

              return {
                pkid: '',
                headerCode: order.code,
                materialCode: item.materialCode,
                numberItem: item.numberItem || 0,
                approveQuantity: item.approveQuantity,
                realQuantity: item.quantity,
                returnQuantity: item.approveQuantity,
                price: item.price,
                unitCode: item.unitCode,
                basicUnit: item.basicUnit,
                materialName: productInfo?.name || '',
                unitProductName: productInfo?.unitProductName || '',
                basicUnitProductName: productInfo?.basicUnitProductName || '',
                orderQuantity: item.quantity,
              };
            });

            if (this.returnItems.length > 0) {
              this.modal.confirm({
                nzTitle: 'Xác nhận',
                nzContent:
                  'Bạn đã có mặt hàng trong danh sách. Bạn có muốn thay thế tất cả bằng mặt hàng từ đơn hàng này?',
                nzOkText: 'Thay thế',
                nzCancelText: 'Giữ lại và thêm',
                nzOnOk: () => {
                  this.returnItems = newItems;
                  this.updateMasterItemsAddedState();
                  this.message.success(
                    `Đã thay thế bằng mặt hàng từ đơn ${order.code}`
                  );
                },
                nzOnCancel: () => {
                  const uniqueNewItems = newItems.filter(
                    (newItem: ReturnDetailItem) => !this.returnItems.some(
                      (existing: ReturnDetailItem) => existing.materialCode === newItem.materialCode
                    )
                  );
                  this.returnItems = this.returnItems.concat(uniqueNewItems);
                  this.updateMasterItemsAddedState();
                  this.message.success(
                    `Đã thêm mặt hàng từ đơn ${order.code}`
                  );
                  this.isLoadingOrder = false;
                  this.isLoadingOrderData = false;
                },
              });
            } else {
              this.returnItems = newItems;
              this.updateMasterItemsAddedState();
              this.message.success(`Đã thêm dữ liệu đơn hàng ${order.code}`);
              this.isLoadingOrder = false;
              this.isLoadingOrderData = false;
            }
          }

          this.isLoadingOrder = false;
          this.isLoadingOrderData = false;
        },
        error: () => {
          this.isLoadingOrder = false;
          this.isLoadingOrderData = false;
          this.message.error('Lỗi khi tải chi tiết đơn hàng.');
        },
      });
    },
    error: () => {
      this.isLoadingOrder = false;
      this.isLoadingOrderData = false;
      this.message.error('Không thể kết nối máy chủ.');
    },
  });
}
  // ✅ Reset form khi bỏ chọn đơn hàng
  private resetOrderData(): void {
    this.returnForm.patchValue(
      {
        poType: '',
        code: '',
        returnReason: '',
        orderCode: '',
        customerCode: '',
        customerName: '',
        storeCode: '',
        email: '',
        phone: '',
        storageCode: '',
        storageName:'',
        transportType: '',
        vehicleCode: '',
        driver: '',
        transportUnit: '',
        representative: '',
        note: '',
        returnNote: '',
        expectedReturnDate: '',
      },
      { emitEvent: false }
    );
    this.returnItems = [];
    this.resetMasterItemsAddedState();
  }

  // ✅ Update isAdded flag based on returnItems
  private updateMasterItemsAddedState(): void {
    this.masterItems.forEach((master) => {
      master.isAdded = this.returnItems.some(
        (returnItem) => returnItem.materialCode === master.code
      );
    });

    // Update search results if modal is open
    if (this.searchResults.length > 0) {
      this.searchResults.forEach((result) => {
        result.isAdded = this.returnItems.some(
          (returnItem) => returnItem.materialCode === result.code
        );
      });
    }
  }

  // ✅ Reset all isAdded flags
  private resetMasterItemsAddedState(): void {
    this.masterItems.forEach((item) => (item.isAdded = false));
    this.searchResults.forEach((item) => (item.isAdded = false));
  }

  // ====== MODAL FUNCTIONS ======
  addItem(): void {
    this.searchResults = [...this.masterItems];
    this.updateMasterItemsAddedState(); // Sync isAdded state

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

  searchItems(): void {
    if (!this.searchKey.trim()) {
      this.searchResults = [...this.masterItems];
      this.updateMasterItemsAddedState();
      return;
    }

    this.searchResults = this.masterItems.filter(
      (item) =>
        item.code.toLowerCase().includes(this.searchKey.toLowerCase()) ||
        item.name.toLowerCase().includes(this.searchKey.toLowerCase())
    );
    this.updateMasterItemsAddedState();
    this.itemsCurrentPage = 1;
  }

  resetSearch(): void {
    this.searchKey = '';
    this.searchResults = [...this.masterItems];
    this.updateMasterItemsAddedState();
  }

  selectItem(item: MasterItem): void {
    const existing = this.returnItems.find(
      (ri) => ri.materialCode === item.code
    );

    if (existing) {
      existing.returnQuantity += 1;
    } else {
      this.returnItems.push({
        pkid: '',
        headerCode: this.returnForm.value.code || null,
        materialCode: item.code,
        numberItem: this.returnItems.length + 1,
        approveQuantity: 0,
        realQuantity: 0,
        returnQuantity: 1,
        unitCode: item.unit,
        basicUnit: item.basicUnit,
        materialName: item.name, // ✅ thêm
        unitProductName: item.unitProductName,
        basicUnitProductName: item.basicUnitProductName,
        orderQuantity: 0,
        price: item.price,
      });
    }

    // Update isAdded flag
    item.isAdded = true;
    const searchItem = this.searchResults.find((s) => s.code === item.code);
    if (searchItem) {
      searchItem.isAdded = true;
    }

    this.message.success(`Đã thêm "${item.name}" vào đơn trả hàng`);
  }

  removeItem(index: number): void {
    const removedItem = this.returnItems[index];
    this.returnItems.splice(index, 1);

    // Reset isAdded flag
    const masterItem = this.masterItems.find(
      (item) => item.code === removedItem.materialCode
    );
    if (masterItem) {
      masterItem.isAdded = false;
    }

    const searchItem = this.searchResults.find(
      (item) => item.code === removedItem.materialCode
    );
    if (searchItem) {
      searchItem.isAdded = false;
    }

    this.message.success('Đã xóa mặt hàng khỏi đơn trả hàng');
  }

  onItemsPageChange(page: number): void {
    this.itemsCurrentPage = page;
  }

  onItemsPageSizeChange(pageSize: number): void {
    this.itemsPageSize = pageSize;
    this.itemsCurrentPage = 1;
  }

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
      this.returnForm.patchValue({
        driver: selectedVehicle.driver || '',
      });
    }
  }
onSubmit(): void {
  if (!this.returnForm.valid) {
    this.message.error('Vui lòng điền đầy đủ thông tin bắt buộc');
    this.markFormGroupTouched();
    return;
  }

  if (this.returnItems.length === 0) {
    this.message.warning('Vui lòng thêm ít nhất một mặt hàng để trả');
    return;
  }

  const hasInvalidQuantity = this.returnItems.some(
    (item) => !item.returnQuantity || item.returnQuantity <= 0
  );
  if (hasInvalidQuantity) {
    this.message.warning(
      'Vui lòng nhập số lượng trả hàng hợp lệ cho tất cả mặt hàng'
    );
    return;
  }

  this.isSubmitting = true;
    const returnRequest = this.returnForm.getRawValue();
    returnRequest.storeCode = this.isCH 
      ? (returnRequest.customerCode ? null : this.currentUserStoreCode) 
      : null;
    const returnTotal = this.grandTotal;
    returnRequest.totalPrice = returnTotal;
    this.customerForm.patchValue({
    email: returnRequest.email,
    phone: returnRequest.phone
  });
  const customerData = this.customerForm.getRawValue();

  // ✅ Cập nhật thông tin khách hàng trước
  this.returnService.updateCustomer(customerData)
    .pipe(
      switchMap(() => {
        // Sau khi cập nhật khách hàng thành công, tạo đơn trả hàng
        return this.returnService.createReturn(returnRequest);
      }),
      switchMap((res: any) => {
        const headerCode = res?.data?.code ?? res?.code;
        if (!headerCode) {
          this.message.error('Đơn trả hàng đã tồn tại trong hệ thống.');
          return of(null);
        }

        // ✅ Patch lại vào form
        this.returnForm.patchValue(
          { code: headerCode },
          { emitEvent: false }
        );

        // ✅ Gán headerCode thật cho từng item trước khi gửi
        const detailRequests = this.returnItems.map((item) => {
          const payload = {
            pkid: item.pkid,
            headerCode: headerCode,
            materialCode: item.materialCode,
            numberItem: item.numberItem,
            returnQuantity: item.returnQuantity,
            approveQuantity: item.approveQuantity,
            realQuantity: item.realQuantity,
            unitCode: item.unitCode,
            basicUnit: item.basicUnit,
            price: item.price,
          };
          return this.returnService.createDetailReturn(payload);
        });

        if (detailRequests.length === 0) return of([]);
        return forkJoin(detailRequests);
      }),
      catchError((err) => {
        console.error(err);
        this.message.error('Không thể tạo đơn trả hàng, vui lòng thử lại!');
        return of(null);
      })
    )
    .subscribe({
      next: (detailResponses) => {
        this.isSubmitting = false;
        if (!detailResponses) return;
        this.message.success('Tạo đơn trả hàng thành công!');
        this.router.navigate(['/order/return-list']);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('❌ Lỗi không mong muốn:', error);
      },
    });
}
  private markFormGroupTouched(): void {
    Object.keys(this.returnForm.controls).forEach((key) => {
      const control = this.returnForm.get(key);
      if (control) {
        control.markAsTouched();
        control.updateValueAndValidity();
      }
    });
  }
}
