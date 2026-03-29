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
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
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
import { GlobalService } from '../../service/global.service';
import { TablePaginationComponent } from '../../shared/components/table-pagination/table-pagination.component';
import { ProductListService } from '../../service/master-data/Product-List.service';
import { CustomerService } from '../../service/master-data/customer.service';
import { TransportVehicleService } from '../../service/master-data/transport-vehicle.service';
import { TransportTypeService } from '../../service/master-data/transport-type.service';
import { TransportUnitService } from '../../service/master-data/transport-unit.service';
import { StorageService } from '../../service/master-data/Storage.service';
import { AccountCustomerService } from '../../service/master-data/account-customer.service';
import { ReturnService } from '../../service/return.service';
import { forkJoin, switchMap, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AccountStoreService } from '../../service/master-data/account-store.service';
import { StoreService } from '../../service/master-data/store.service';

interface ReturnItem {
  name: string;
  quantity: number;
  approveQuantity: number;
  price: number;
  unit: string;
  basicUnit: string;

}
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
  unitProductName?: string;
  basicUnitProductName?: string;
  isAdded?: boolean;
}

interface VehicleTypes {
  label: string;
  value: string;
  code: string;
  name: string;
  transportType: string;
  driver: string;
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
interface TransportUnits {
  label: string;
  value: string;
}
@Component({
  selector: 'app-Return-edit',
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
    NzAutocompleteModule,
  ],
  templateUrl: './return-detail.component.html',
  styleUrls: ['./return-detail.component.scss'],
})
export class ReturnDetailComponent implements OnInit {
  @ViewChild('itemSearchTpl', { static: false })
  itemSearchTpl!: TemplateRef<any>;

  isKD = false;
  isKH = false;
  isKT = false;
  isCH = false;
  isReadOnly = true;
  isLocked = true;
  isViewMode = false; // Giữ false ban đầu
  isProcessing = false; // Thêm: Để disable button khi processing
  returnHistory: Array<{
    user: string;
    date: string;
    action: string;
    color?: string;
    note?: string;
  }> = [];
  ReturnId: string | null = null;
  ReturnForm: FormGroup;

  ReturnItems: ReturnDetailItem[] = [];

  // Item search modal
  private modalRef: NzModalRef | null = null;
  searchKey: string = '';
  searchResults: MasterItem[] = [];

  // Pagination for item search modal
  itemsCurrentPage: number = 1;
  itemsPageSize: number = 10;

  get pagedSearchResults(): MasterItem[] {
    const start = (this.itemsCurrentPage - 1) * this.itemsPageSize;
    return this.searchResults.slice(start, start + this.itemsPageSize);
  }
 get grandTotal(): number {
  if (!this.ReturnItems || this.ReturnItems.length === 0) {
    return 0;
  }

  // Tính tổng (quantity * price) của mỗi item
  return this.ReturnItems.reduce((acc, item) => {
    const returnQuantity = item.returnQuantity || 0;
    const price = item.price || 0;
    return acc + returnQuantity * price;
  }, 0);
}
get grandApproveTotal(): number {
  if (!this.ReturnItems || this.ReturnItems.length === 0) {
    return 0;
  }

  // Tính tổng (approvedQuantity * price) của mỗi item
  return this.ReturnItems.reduce((acc, item) => {
    const approveQuantity = item.approveQuantity || 0; // <-- THAY ĐỔI Ở ĐÂY
    const price = item.price || 0;
    return acc + approveQuantity * price; // <-- VÀ Ở ĐÂY
  }, 0);
}
get isOutProvince(): boolean {
  return this.ReturnForm.get('poType')?.value === 'OUT_PROVINCE';
}
  // Master data
  masterItems: MasterItem[] = [];
  customers: CustomerLists[] = [];
  storages: Storages[] = [];
  transportVehicles: VehicleTypes[] = [];
  filteredVehicles: VehicleTypes[] = []; // <--- THÊM DÒNG NÀY
  transportTypes: TransportTypes[] = [];
  transportUnits: TransportUnits[] = [];
  unitProducts: any[] = [];
  currentUserStoreCode: string = '';
currentStoreName: string = '';
  get currentAccountType(): string {
    if (this.isKD) return 'KD';
    if (this.isKH) return 'KH';
    if(this.isKT) return 'KT';
    if(this.isCH) return 'CH';
    return '';
  }

  get orderStatus(): string {
    return this.ReturnForm.get('status')?.value || '';
  }

  constructor(
    private _sTransportUnit: TransportUnitService,
    private _sAccountCustomer: AccountCustomerService,
    private _sStorage: StorageService,
    private _sTransportVehicle: TransportVehicleService,
    private _sTransportType: TransportTypeService,
    private _sCustomer: CustomerService,
    private _sProductList: ProductListService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private globalService: GlobalService,
    private modal: NzModalService,
    private message: NzMessageService,
    private _sReturn: ReturnService,
    private _sAccountStore: AccountStoreService,
    private _sStore: StoreService,
  ) {
    this.ReturnForm = this.fb.group({
      code: [''],
      poType: ['', [Validators.required]],
      returnReason: ['', [Validators.required]],
      orderCode: ['', [Validators.required]],
      customerCode: ['', [Validators.required]],
      customerName: [''],
      storeCode:[''],
      returnDate: [''],
      expectedReturnDate: ['', [Validators.required]],
      transportType: ['', [Validators.required]],
      vehicleCode: [''],
      driver: [''],
      transportUnit: [''],
      storageCode: [''],
      representative: [''],
      email: [''],
      phone: [''],
      note: [''],
      returnNote: [''],
      status: [''],
    });
      this.ReturnForm.disable({ emitEvent: false });
     
  
  }

  ngOnInit(): void {
    this.ReturnId = this.route.snapshot.paramMap.get('code');

    if (!this.ReturnId) {
      this.message.error('Không tìm thấy mã đơn hàng!');
      this.router.navigate(['/order/return-list']);
      return;
    }

    this.globalService.setBreadcrumb([
      {
        name: 'Chỉnh sửa đơn trả hàng',
        path: `/order/return-view/${this.ReturnId}`,
      },
    ]);

    this.loadUserInfo();
    this.setupFormListeners();
    this.loadMasterDataAndReturn();
  }

  // private loadReturnData(): void {
  //   if (!this.ReturnId) return;

  //   this._sReturn.getReturnByCode(this.ReturnId).subscribe({
  //     next: (res: any) => {
  //       const found = res?.data || res;
  //       if (!found) {
  //         this.message.error('Không tìm thấy đơn trả hàng!');
  //         this.router.navigate(['/order/return-list']);
  //         return;
  //       }

  //       this.ReturnForm.patchValue({
  //         code: found.code,
  //         returnReason: found.returnReason,
  //         orderCode: found.orderCode,
  //         customerCode: found.customerCode,
  //         customerName: found.customerName,
  //         returnDate: found.returnDate,
  //         expectedReturnDate: found.expectedReturnDate,
  //         approvedDate: found.approvedDate,
  //         transportType: found.transportType,
  //         vehicleCode: found.vehicleCode,
  //         driver: found.driver,
  //         transportUnit: found.transportUnit,
  //         storageCode: found.storageCode,
  //         representative: found.representative,
  //         email: found.email,
  //         phone: found.phone,
  //         note: found.note,
  //         returnNote: found.returnNote,
  //         status: found.status,
  //       });

  //       // ✅ Nạp chi tiết hàng
  //       const detail = found.poHhkDetailReturn;
  //       if (Array.isArray(detail)) {

  //         this.ReturnItems = detail.map((d: any, i: number) => ({

  //           ...d,
  //           numberItem: i + 1,
  //         }));
  //       } else if (detail) {
  //         this.ReturnItems = [{ ...detail, numberItem: 1 }];
  //       } else {
  //         this.ReturnItems = [];
  //       }
  //     },
  //     error: (err) => {
  //       console.error('Lỗi loadReturnData:', err);
  //       this.message.error('Không thể tải thông tin đơn trả hàng!');
  //     },
  //   });
  // }

  private loadMasterDataAndReturn(): void {
    if (!this.ReturnId) {
      console.warn('⚠️ Không có ReturnId — bỏ qua loadMasterDataAndReturn');
      return;
    }

    // Gọi đồng thời các master data khác (via ReturnService để tránh permission error R2.2.1, R2.3.1 cho KH)
    forkJoin({
      storages: this._sReturn.getStorages(),
      vehicles: this._sReturn.getTransportVehicles(),
      transportTypes: this._sReturn.getTransportTypes(),
      transportUnits: this._sReturn.getTransportUnits(),
      masterItems: this._sReturn.getProductLists(),
      unitProducts: this._sReturn.getUnitProducts(),
      customers: this._sReturn.getCustomers(),
    })
      .pipe(
        switchMap((data) => {
          // ✅ Gán master data
          this.masterItems = data.masterItems.map((item: any) => ({
            code: item.code?.toString(),
            name: item.name,
            price: item.price,
            unit: item.unit,
            basicUnit: item.basicUnit,
            unitProductName: item.unitProductName || item.unit,
            basicUnitProductName: item.basicUnitProductName,
            isAdded: false,
          }));

          this.unitProducts = data.unitProducts;

          this.storages = data.storages.map((s: any) => ({
            label: s.name,
            value: s.code,
          }));
          this.transportVehicles = data.vehicles.map((v: any) => ({
            code: v.code,
            name: v.name,
            driver: v.driver,
            transportType: v.type || v.Type || v.transportType, // Map from API 'Type' field to 'transportType'
            label: v.name,
            value: v.code,
          }));
          this.filteredVehicles = [...this.transportVehicles];
          this.transportTypes = data.transportTypes.map((t: any) => ({
            name: t.name,
            code: t.code,
            label: t.name,
            value: t.code,
          }));
          this.transportUnits = data.transportUnits.map((t: any) => ({
            label: t.name,
            value: t.code,
          }));

          this.customers = data.customers.map((item: any) => ({
            label: item.fullName,
            value: item.customerCode,
            customerCode: item.customerCode,
            fullName: item.fullName,
            email: item.email,
            phone: item.phone,
          }));

          // ✅ Gọi tiếp API Return
          return this._sReturn.getReturnByCode(this.ReturnId!);
        })
      )
      .subscribe({
        next: (res: any) => {
          const found = res?.data || res;
          if (!found) {
            this.message.error('Không tìm thấy đơn trả hàng!');
            this.router.navigate(['/order/return-list']);
            return;
          }

          // ✅ Patch form dữ liệu header
          this.ReturnForm.patchValue({
            code: found.code,
            poType: found.poType,
            returnReason: found.returnReason,
            orderCode: found.orderCode,
            customerCode: found.customerCode,
            customerName: found.customerName,
            storeCode: found.storeCode,
            returnDate: found.returnDate,
            expectedReturnDate: found.expectedReturnDate,
            transportType: found.transportType,
            vehicleCode: found.vehicleCode,
            driver: found.driver,
            transportUnit: found.transportUnit,
            storageCode: found.storageCode,
            representative: found.representative,
            email: found.email,
            phone: found.phone,
            note: found.note,
            returnNote: found.returnNote,
            status: found.status,
          });

          // ✅ Nạp chi tiết hàng
          const detail = found.poHhkDetailReturn;
          const detailArray = Array.isArray(detail)
            ? detail
            : detail
            ? [detail]
            : [];

          this.ReturnItems = detailArray.map((d: any, i: number) => {
            const matched = this.masterItems.find(
              (m) => m.code.toString() === d.materialCode?.toString()
            );

            return {
              ...d,
              numberItem: i + 1,
              materialName: matched?.name || '(Không tìm thấy)',
              unitProductName: matched?.unitProductName || matched?.unit || '',
              basicUnitProductName: matched?.basicUnitProductName || '',
            };
          });
          this.ReturnForm.disable({ emitEvent: false });
          //  Load return history with user info from API
          this._sReturn.getReturnHistory(this.ReturnId!).subscribe({
            next: (res) => {
              const historyResponse = res?.body ?? res;
              

              // ✅ Response đã là array [{...}], map trực tiếp
              if (
                Array.isArray(historyResponse) &&
                historyResponse.length > 0
              ) {
                this.returnHistory = historyResponse.map((h: any) => ({
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
          });

         
        },

        error: (err) => {
          console.error('❌ Lỗi loadReturnData:', err);
          this.message.error('Không thể tải thông tin đơn trả hàng!');
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

      const customerControl = this.ReturnForm.get('customerCode');
        customerControl?.clearValidators();
        customerControl?.updateValueAndValidity();
      // 1. Lấy StoreCode từ UserName
      this._sAccountStore.GetByUserName(userName).subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res[0] : (res.data ? res.data[0] : res);
          
          if (data && (data.storeCode || data.code)) {
    this.currentUserStoreCode = data.storeCode || data.code;
    
    // 💥 BƯỚC MỚI: Cập nhật giá trị mã cửa hàng vào Form Control
    this.ReturnForm.patchValue({
        storeCode: this.currentUserStoreCode
    }, { emitEvent: false });
            // 2. ✅ LẤY TÊN CỬA HÀNG TỪ STORE CODE
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

  //   private loadMasterData(): void {
  //     // Load storages
  //     this._sStorage.getAll().subscribe({
  //       next: (data) => {
  //         this.storages = data.map((item: any) => ({
  //           label: item.name,
  //           value: item.code,
  //         }));
  //       },
  //       error: (err) => {
  //         console.error('Lỗi khi tải danh sách kho:', err);
  //         this.message.error('Không thể tải danh sách kho!');
  //       },
  //     });

  //     // Load transport types
  //     this._sTransportType.getAll().subscribe({
  //       next: (data) => {
  //         this.transportTypes = data.map((item: any) => ({
  //           name: item.name,
  //           code: item.code,
  //           label: item.name,
  //           value: item.code,
  //         }));
  //       },
  //       error: (err) => {
  //         console.error('Lỗi khi tải loại hình vận tải:', err);
  //         this.message.error('Không thể tải danh sách loại hình vận tải!');
  //       },
  //     });
  //  // Load transport units
  //     this._sTransportUnit.getAll().subscribe({
  //       next: (data) => {
  //         this.transportUnits = data.map((item: any) => ({
  //           name: item.name,
  //           code: item.code,
  //           label: item.name,
  //           value: item.code,
  //         }));
  //       },
  //       error: (err) => {
  //         console.error('Lỗi khi tải đơn vị vận tải:', err);
  //         this.message.error('Không thể tải danh sách đơn vị vận tải!');
  //       },
  //     });
  //     // Load customers (only for KD)
  //     if (this.isKD) {
  //       this._sCustomer.getAll().subscribe({
  //         next: (data) => {
  //           this.customers = data.map((item: any) => ({
  //             label: item.fullName,
  //             value: item.customerCode,
  //             customerCode: item.customerCode,
  //             fullName: item.fullName,
  //             email: item.email,
  //             phone: item.phone,
  //           }));
  //         },
  //         error: (err) => {
  //           console.error('Lỗi khi tải danh sách khách hàng:', err);
  //           this.message.error('Không thể tải danh sách khách hàng!');
  //         },
  //       });
  //     }

  //     // Load transport vehicles
  //     this._sTransportVehicle.getAll().subscribe({
  //       next: (data) => {
  //         this.transportVehicles = data.map((item: any) => ({
  //           code: item.code,
  //           name: item.name,
  //           label: item.name,
  //           value: item.code,
  //           transportType: item.transportType,
  //           driver: item.driver,
  //         }));
  //       },
  //       error: (err) => {
  //         console.error('Lỗi khi tải danh sách phương tiện:', err);
  //         this.message.error('Không thể tải danh sách phương tiện!');
  //       },
  //     });

  //     // Load product list
  //     this._sProductList.getAll().subscribe({
  //       next: (data) => {
  //         this.masterItems = data.map((item: any) => ({
  //           code: item.code,
  //           name: item.name,
  //           unit: item.unit,
  //           unitProductName: item.unitProductName,
  //           isAdded: false,
  //         }));
  //       },
  //       error: (err) => {
  //         console.error('Lỗi khi tải danh sách sản phẩm:', err);
  //         this.message.error('Không thể tải danh sách sản phẩm!');
  //       },
  //     });
  //     this.loadReturnData();
  //   }

  private setupFormListeners(): void {
    // Listen to customer selection
    this.ReturnForm.get('customerCode')?.valueChanges.subscribe(
      (selectedCode) => {
        const selectedCustomer = this.customers.find(
          (c) => c.value === selectedCode || c.customerCode === selectedCode
        );

        if (selectedCustomer) {
          this.ReturnForm.patchValue({
            email: selectedCustomer.email || '',
            phone: selectedCustomer.phone || '',
          });
        }
      }
    );

    // Listen to vehicle selection
    // this.ReturnForm.get('vehicleCode')?.valueChanges.subscribe((selected) => {
    //   if (!selected) return;

    //   const selectedVehicle = this.transportVehicles.find(
    //     (v) => v.code === selected
    //   );

    //   if (selectedVehicle) {
    //     this.ReturnForm.patchValue({
    //       driver: selectedVehicle.driver || '',
    //     });
    //   }
    // });
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

/**
 * Xử lý khi người dùng CHỌN một phương tiện từ danh sách gợi ý
 * (Tự động điền tên người vận tải)
 */
onVehicleSelect(event: any): void { // <-- 1. Sửa (selectedValue: string) thành (event: any)
    
    const selectedValue = event?.option?.nzValue; // <-- 2. Thêm dòng này để lấy giá trị

    if (!selectedValue) return;

    // 3. Code bên dưới giữ nguyên
    const selectedVehicle = this.transportVehicles.find(
      (v) => v.code === selectedValue || v.value === selectedValue
    );

    if (selectedVehicle) {
      this.ReturnForm.patchValue({
        driver: selectedVehicle.driver || '',
      });
    }
  }
  onSubmit(): void {
    if (!this.ReturnForm.valid) {
      this.message.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      this.markFormGroupTouched();
      return;
    }

    if (this.ReturnItems.length === 0) {
      this.message.warning('Vui lòng thêm ít nhất một mặt hàng để trả');
      return;
    }

    const hasInvalidQuantity = this.ReturnItems.some(
      (item) => !item.returnQuantity || item.returnQuantity <= 0
    );
    if (hasInvalidQuantity) {
      this.message.warning(
        'Vui lòng nhập số lượng trả hàng hợp lệ cho tất cả mặt hàng'
      );
      return;
    }

    const returnRequest = this.ReturnForm.getRawValue();
    const approveTotal = this.grandApproveTotal; // Lấy tổng tiền phê duyệt
    const returnTotal = this.grandTotal;
    returnRequest.totalPrice = approveTotal > 0 ? approveTotal : returnTotal;
    this._sReturn.updateReturn(returnRequest).subscribe({
      next: (res: any) => {
        const updateCalls = this.ReturnItems.map((item) => {
          if (item.pkid && item.pkid !== '') {
            // ✅ Item cũ → update
            return this._sReturn.updateDetailReturn(item);
          } else {
            // ✅ Item mới → tạo mới
            const payload = {
              ...item,
              headerCode: returnRequest.code,
            };
            return this._sReturn.createDetailReturn(payload);
          }
        });

        if (updateCalls.length === 0) {
          this.message.warning('Không có chi tiết hàng nào để cập nhật!');
          return;
        }

        forkJoin(updateCalls).subscribe({
          next: () => {
            this.message.success('Cập nhật đơn trả hàng thành công!');
          },
          error: (err) => {
            console.error('❌ Lỗi khi cập nhật chi tiết:', err);
            this.message.error('Cập nhật chi tiết thất bại!');
          },
        });
      },

      error: (error) => {
        console.error('❌ Lỗi không mong muốn:', error);
      },
    });
  }

  onCopyReturn(): void {
    if (!this.ReturnId) return;



    const formValue = this.ReturnForm.getRawValue(); // getRawValue to include disabled controls

    const state = {
     code : formValue.code,
     poType: formValue.poType,
      returnReason: formValue.returnReason,
      orderCode: formValue.orderCode,
      customerCode: formValue.customerCode,
      customerName: formValue.customerName,
      returnDate: formValue.returnDate,
      expectedReturnDate: formValue.expectedReturnDate,
      transportType: formValue.transportType,
      vehicleCode: formValue.vehicleCode,
      driver: formValue.driver,
      transportUnit: formValue.transportUnit,
      storageCode: formValue.storageCode,
      representative: formValue.representative,
      email: formValue.email,
      phone: formValue.phone,
      note: formValue.note,
      returnNote: formValue.returnNote,
      status: formValue.status,
    };

    this.router.navigate(['/return-create'], { state });
    this.message.success('Đã copy đơn trả hàng');
  
  }

  onSendReturn(): void {
    if (this.isKD || this.isKT) {
      this.message.error('Bạn không có quyền gửi đơn trả hàng');
      return;
    }

    if (confirm('Bạn có chắc chắn muốn gửi đơn hàng này?')) {
      if (!this.ReturnId) return;

      this.isProcessing = true;
      this._sReturn.submitReturn(this.ReturnId).subscribe({
        next: (response) => {
          this.isProcessing = false;
          if (response.status) {
            this.message.success('Gửi đơn trả hàng thành công');
            // Reload order data to reflect changes
            this.loadMasterDataAndReturn();
          } else {
            this.message.error(
              response.messageObject?.message || 'Gửi đơn trả hàng thất bại'
            );
          }
        },
        error: (err) => {
          this.isProcessing = false;
          console.error('Error submit return:', err);
          this.message.error('Lỗi khi gửi đơn trả hàng');
        },
      });
    }
  }

  onCancelReturn(): void {
    if (this.isKD || this.isKT) {
      this.message.error('Bạn không có quyền hủy đơn trả hàng');
      return;
    }

    if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
      if (!this.ReturnId) return;

      this.isProcessing = true;
      this._sReturn.cancelReturns([this.ReturnId]).subscribe({
        next: (response) => {
          this.isProcessing = false;
          if (response.status) {
            this.message.success('Hủy đơn trả hàng thành công');
            this.router.navigate(['/order/return-list']);
          } else {
            this.message.error(
              response.messageObject?.message || 'Hủy đơn trả hàng thất bại'
            );
          }
        },
        error: (err) => {
          this.isProcessing = false;
          console.error('Error cancel return:', err);
          this.message.error('Lỗi khi hủy đơn trả hàng');
        },
      });
    }
  }

  onApproveReturn(): void {
    if (!this.isKD) {
      this.message.error('Bạn không có quyền phê duyệt đơn trả hàng');
      return;
    }

    if (confirm('Bạn có chắc chắn muốn phê duyệt đơn hàng này?')) {
      if (!this.ReturnId) return;

      this.isProcessing = true;
      this._sReturn.approveReturn(this.ReturnId).subscribe({
        next: (response) => {
          this.isProcessing = false;
          if (response.status) {
            this.message.success('Phê duyệt đơn trả hàng thành công');
            // Reload order data to reflect changes
            this.router.navigate(['/order/return-list']);
          } else {
            this.message.error(
              response.messageObject?.message ||
                'Phê duyệt đơn trả hàng thất bại'
            );
          }
        },
        error: (err) => {
          this.isProcessing = false;
          console.error('Error approving return:', err);
          this.message.error('Lỗi khi phê duyệt đơn trả hàng');
        },
      });
    }
  }

  onRejectReturn(): void {
    if (!this.isKD) {
      this.message.error('Bạn không có quyền từ chối đơn trả hàng');
      return;
    }

    if (confirm('Bạn có chắc chắn muốn từ chối đơn hàng này?')) {
      if (!this.ReturnId) return;

      this.isProcessing = true;
      this._sReturn.rejectReturn(this.ReturnId).subscribe({
        next: (response) => {
          this.isProcessing = false;
          if (response.status) {
            this.message.success('Từ chối đơn trả hàng thành công');
            // Reload order data to reflect changes
            this.router.navigate(['/order/return-list']);
          } else {
            this.message.error(
              response.messageObject?.message || 'Từ chối đơn trả hàng thất bại'
            );
          }
        },
        error: (err) => {
          this.isProcessing = false;
          console.error('Error rejecting return:', err);
          this.message.error('Lỗi khi từ chối đơn trả hàng');
        },
      });
    }
  }

  onConfirmReturn(): void {
    if (!this.isKD) {
      this.message.error('Bạn không có quyền xác nhận trả hàng');
      return;
    }

    if (confirm('Bạn có chắc chắn muốn xác nhận trả hàng thành công?')) {
      if (!this.ReturnId) return;

      this.isProcessing = true;
      this._sReturn.confirmReturn(this.ReturnId).subscribe({
        next: (response) => {
          this.isProcessing = false;
          if (response.status) {
            this.message.success('Xác nhận trả hàng thành công');
            // Reload order data to reflect changes
            this.router.navigate(['/order/return-list']);
          } else {
            this.message.error(
              response.messageObject?.message || 'Xác nhận trả hàng thất bại'
            );
          }
        },
        error: (err) => {
          this.isProcessing = false;
          console.error('Error confirming return:', err);
          this.message.error('Lỗi khi xác nhận trả hàng');
        },
      });
    }
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

  selectItem(item: MasterItem): void {
    const existing = this.ReturnItems.find(
      (ri) => ri.materialCode === item.code
    );

    if (existing) {
      existing.returnQuantity += 1;
    } else {
      this.ReturnItems.push({
        pkid: '',
        headerCode: this.ReturnForm.getRawValue().orderCode || '',
        materialCode: item.code,
        numberItem: this.ReturnItems.length + 1,
        approveQuantity: 0,
        realQuantity: 0,
        returnQuantity: 1,
        unitCode: item.unit,
        basicUnit: item.basicUnit,
        price: item.price,
        materialName: item.name, // ✅ thêm
        unitProductName: item.unitProductName,
        basicUnitProductName: item.basicUnitProductName,
        orderQuantity: 0,
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

  onItemsPageChange(page: number): void {
    this.itemsCurrentPage = page;
  }

  onItemsPageSizeChange(pageSize: number): void {
    this.itemsPageSize = pageSize;
    this.itemsCurrentPage = 1;
  }

  removeItem(index: number): void {
    const removedItem = this.ReturnItems[index];
    this.ReturnItems.splice(index, 1);

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
  private mapHistoryStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      '0': 'Chỉnh sửa thông tin',
      '1': 'Khởi tạo',
      '2': 'Chờ phê duyệt',
      '3': 'Đã phê duyệt',
      '4': 'Từ chối',
      '5': 'Hủy yêu cầu',
      '6': 'Trả hàng thành công',
    };
    return statusMap[status] || status;
  }

  private getHistoryColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      '0': 'orange',
      '1': 'red', // Khởi tạo
      '2': 'orange', // Chờ phê duyệt
      '3': 'green', // Đã phê duyệt
      '4': 'red', // Từ chối
      '5': 'red', // Hủy yêu cầu
      '6': 'blue', // Trả hàng thành công
    };
    return colorMap[status] || 'default';
  }
  private markFormGroupTouched(): void {
    Object.keys(this.ReturnForm.controls).forEach((key) => {
      const control = this.ReturnForm.get(key);
      if (control) {
        control.markAsTouched();
        control.updateValueAndValidity();
      }
    });
  }
}
