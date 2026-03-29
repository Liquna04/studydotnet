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
import { GlobalService } from '../../service/global.service';
import { TablePaginationComponent } from '../../shared/components/table-pagination/table-pagination.component';
import { ProductListService } from '../../service/master-data/Product-List.service';
import { CustomerService } from '../../service/master-data/customer.service';
import { TransportVehicleService } from '../../service/master-data/transport-vehicle.service';
import { TransportTypeService } from '../../service/master-data/transport-type.service';
import { TransportUnitService } from '../../service/master-data/transport-unit.service';
import { StorageService } from '../../service/master-data/Storage.service';
import { AccountCustomerService } from '../../service/master-data/account-customer.service';
import { AccountStoreService } from '../../service/master-data/account-store.service';
import { StoreService } from '../../service/master-data/store.service';
import { ReturnService } from '../../service/return.service';
import { forkJoin, switchMap, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
interface ReturnItem {
  name: string;
  quantity: number;
  approveQuantity: number;
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
  templateUrl: './return-edit.component.html',
  styleUrls: ['./return-edit.component.scss'],
})
export class ReturnEditComponent implements OnInit {
  @ViewChild('itemSearchTpl', { static: false })
  itemSearchTpl!: TemplateRef<any>;

  ReturnForm: FormGroup;
  CustomerForm: FormGroup;
  ReturnId: string | null = null;
  ReturnItems: ReturnDetailItem[] = [];
  deletedItemIds: string[] = [];
  // Item search modal
  private modalRef: NzModalRef | null = null;
  searchKey: string = '';
  searchResults: MasterItem[] = [];
    returnHistory: Array<{
    user: string;
    date: string;
    action: string;
    color?: string;
    note?: string;
  }> = [];
  // Pagination for item search modal
  itemsCurrentPage: number = 1;
  itemsPageSize: number = 10;
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
  get pagedSearchResults(): MasterItem[] {
    const start = (this.itemsCurrentPage - 1) * this.itemsPageSize;
    return this.searchResults.slice(start, start + this.itemsPageSize);
  }
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

  // Get filtered vehicle list based on selected transport type
  get filteredTransportVehicles(): VehicleTypes[] {
    const selectedTransportType = this.ReturnForm.get('transportType')?.value;

    if (!selectedTransportType) {
      return this.transportVehicles;
    }

    // Filter vehicles by matching transportType field
    return this.transportVehicles.filter(
      (vehicle) => vehicle.transportType === selectedTransportType
    );
  }

  // Master data
  masterItems: MasterItem[] = [];
  customers: CustomerLists[] = [];
  storages: Storages[] = [];
  transportVehicles: VehicleTypes[] = [];
  filteredVehicles: VehicleTypes[] = [];
  transportTypes: TransportTypes[] = [];
  transportUnits: TransportUnits[] = [];
  currentUserStoreCode: string = '';
currentStoreName: string = '';
  unitProducts: any[] = [];
  isKD = false;
  isKH = false;
  isKT = false;
  isCH = false;
  isProcessing = false;

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
      storeCode: [''],
      returnDate: [''],
      expectedReturnDate: ['', [Validators.required]],
      transportType: ['', [Validators.required]],
      vehicleCode: [''],
      driver: [''],
      transportUnit: [''],
      storageCode: [''],
      representative: [''],
      email: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      note: [''],
      returnNote: [''],
      status: [''],
    });
    this.CustomerForm = this.fb.group({      
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
    this.ReturnId = this.route.snapshot.paramMap.get('code');

    if (!this.ReturnId) {
      this.message.error('Không tìm thấy mã đơn hàng!');
      this.router.navigate(['/order/return-list']);
      return;
    }

    this.globalService.setBreadcrumb([
      {
        name: 'Chỉnh sửa đơn trả hàng',
        path: `/order/return-edit/${this.ReturnId}`,
      },
    ]);

    this.loadUserInfo();
    this.setupFormListeners();
    this.loadMasterDataAndReturn();
  }


  private loadMasterDataAndReturn(): void {
    if (!this.ReturnId) {
      console.warn('⚠️ Không có ReturnId — bỏ qua loadMasterDataAndReturn');
      return;
    }

    // Gọi đồng thời các master data khác
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
            unit: item.unit,
            basicUnit: item.basicUnit,
            price: item.price,
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
          }, { emitEvent: false });

          this.loadCustomerData(found.customerCode);
          const selectedType = found.transportType;
      if (selectedType) {
        this.filteredVehicles = this.transportVehicles.filter(
            (v) => v.transportType === selectedType
        );
      } else {
        this.filteredVehicles = [...this.transportVehicles];
      }
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
              price: matched?.price || 0,
            };
          });
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
          // ✅ Apply KH restrictions - only disable customer info fields, NOT transport fields
          if (this.isKH) {
            this.ReturnForm.get('customerCode')?.disable();
            
          }
          if (this.isCH) {
            this.ReturnForm.get('storeCode')?.disable();
            
          }
        },
        error: (err) => {
          console.error('❌ Lỗi loadReturnData:', err);
          this.message.error('Không thể tải thông tin đơn trả hàng!');
        },
      });
  }
private loadCustomerData(customerCode: string): void {
  // ------------------------------------------------------------------
  // 1. XỬ LÝ TRƯỜNG HỢP ĐẦU VÀO RỖNG
  // ------------------------------------------------------------------
  if (!customerCode || customerCode.trim() === '') {
    
    // ✅ LOGIC MỚI CHO ACCOUNT TYPE = CH
    // Kiểm tra: Nếu là CH và có StoreCode (nghĩa là đơn nội bộ cửa hàng, không có khách lẻ)
    const currentStoreCode = this.ReturnForm.get('storeCode')?.value;
    
    if (this.isCH && currentStoreCode) {
      // 🛑 DỪNG LẠI: Không reset form.
      // Giữ nguyên Email/Phone đã được load từ đơn hàng ở bước trước (loadMasterDataAndReturn).
      return; 
    }

    // 🔻 LOGIC CŨ (Áp dụng cho các trường hợp còn lại):
    // Nếu không có mã khách hàng thì reset các trường thông tin liên hệ
    this.CustomerForm.reset();
    this.ReturnForm.patchValue(
      { email: '', phone: '', customerName: '' },
      { emitEvent: false }
    );
    return;
  }

  // ------------------------------------------------------------------
  // 2. XỬ LÝ KHI CÓ MÃ KHÁCH HÀNG (GỌI API)
  // ------------------------------------------------------------------
  this._sReturn.getCustomerByCode(customerCode).subscribe({
    next: (res: any) => {
      let customer = null;
      if (Array.isArray(res) && res.length > 0) {
        customer = res[0];
      } else if (res && res.status === true && res.data && res.data.length > 0) {
        customer = res.data[0];
      }

      if (customer) {
        // Lưu vào form ẩn
        this.CustomerForm.patchValue(
          {
            id: customer.id || '',
            customerCode: customer.customerCode || customerCode,
            fullName: customer.fullName || '',
            shortName: customer.shortName || '',
            address: customer.address || '',
            vatNumber: customer.vatNumber || '',
            email: customer.email || '',
            phone: customer.phone || '',
            isActive: customer.isActive !== undefined ? customer.isActive : true,
          },
          { emitEvent: false }
        );

        // ✅ LOGIC "CÁC TRƯỜNG HỢP CÒN LẠI":
        // Ưu tiên Email/Phone của đơn hàng trước, nếu rỗng mới lấy của khách hàng
        
        const currentEmail = this.ReturnForm.get('email')?.value;
        const currentPhone = this.ReturnForm.get('phone')?.value;

        // Nếu form đang có dữ liệu (từ đơn hàng) thì giữ nguyên, ngược lại lấy từ customer
        const finalEmail = (currentEmail && currentEmail.toString().trim() !== '') 
                           ? currentEmail 
                           : (customer.email || '');
                           
        const finalPhone = (currentPhone && currentPhone.toString().trim() !== '') 
                           ? currentPhone 
                           : (customer.phone || '');

        this.ReturnForm.patchValue(
          {
            customerName: customer.fullName || '',
            customerCode: customer.customerCode || customerCode,
            email: finalEmail,
            phone: finalPhone,
          },
          { emitEvent: false }
        );

      } else {
        // Không tìm thấy khách hàng trong DB
        this.message.warning(`Không tìm thấy khách hàng với mã "${customerCode}"`);
        this.CustomerForm.reset();
        
        // Reset hiển thị (hoặc bạn có thể chọn giữ nguyên nếu muốn)
        this.ReturnForm.patchValue(
          { email: '', phone: '', customerName: '' },
          { emitEvent: false }
        );
      }
    },
    error: (err) => {
      console.error('❌ Lỗi API getCustomerByCode:', err);
      // Xử lý lỗi...
      this.CustomerForm.reset();
      this.ReturnForm.patchValue(
        { email: '', phone: '', customerName: '' },
        { emitEvent: false }
      );
    },
  });
}
// private loadCustomerData(customerCode: string): void {
//   if (!customerCode || customerCode.trim() === '') {
//     this.CustomerForm.reset();
//     this.ReturnForm.patchValue(
//       { email: '', phone: '', customerName: '' },
//       { emitEvent: false }
//     );
//     return;
//   }

//   this._sReturn.getCustomerByCode(customerCode).subscribe({
//     next: (res: any) => {
      
//       // ✅ Sửa: Xử lý cả 2 trường hợp API response
//       let customer = null;
      
//       // Trường hợp 1: API trả về mảng trực tiếp [{...}]
//       if (Array.isArray(res) && res.length > 0) {
//         customer = res[0];
//       }
//       // Trường hợp 2: API trả về { status: true, data: [...] }
//       else if (res && res.status === true && res.data && res.data.length > 0) {
//         customer = res.data[0];
//       }
      
//       if (customer) {
        
//         // ✅ Sửa: Xử lý null/undefined cho email và các trường khác
//         this.CustomerForm.patchValue(
//           {
//             id: customer.id || '',
//             customerCode: customer.customerCode || customerCode,
//             fullName: customer.fullName || '',
//             shortName: customer.shortName || '',
//             address: customer.address || '',
//             vatNumber: customer.vatNumber || '',
//             email: customer.email || '', // ✅ Xử lý null
//             phone: customer.phone || '',
//             isActive: customer.isActive !== undefined ? customer.isActive : true,
//           },
//           { emitEvent: false }
//         );
        
//         // Đồng bộ với returnForm
//         this.ReturnForm.patchValue(
//           {
//             email: customer.email || '',
//             phone: customer.phone || '',
//             customerName: customer.fullName || '',
//             customerCode: customer.customerCode || customerCode,
//           },
//           { emitEvent: false }
//         );
        
//       } else {
//         // ✅ Sửa: Thông báo rõ ràng hơn
//         this.message.warning(`Không tìm thấy khách hàng với mã "${customerCode}"`);
//         this.CustomerForm.reset();
//         this.ReturnForm.patchValue(
//           { email: '', phone: '', customerName: '' },
//           { emitEvent: false }
//         );
//       }
//     },
//     error: (err) => {
//       console.error('❌ Lỗi API getCustomerByCode:', err);
      
//       // ✅ Sửa: Xử lý lỗi cụ thể hơn
//       if (err.status === 404) {
//         this.message.error(`Không tìm thấy khách hàng với mã "${customerCode}"`);
//       } else if (err.status === 0) {
//         this.message.error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
//       } else {
//         this.message.error('Không thể tải thông tin khách hàng. Vui lòng thử lại.');
//       }
      
//       this.CustomerForm.reset();
//       this.ReturnForm.patchValue(
//         { email: '', phone: '', customerName: '' },
//         { emitEvent: false }
//       );
//     },
//   });
// }
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

  private setupFormListeners(): void {
    // Listen to customer selection
    this.ReturnForm.get('customerCode')?.valueChanges.subscribe(
      (selectedCode) => {
        const selectedCustomer = this.customers.find(
          (c) => c.value === selectedCode || c.customerCode === selectedCode
        );

        if (selectedCustomer) {
        if (!this.isCH) {
            this.ReturnForm.patchValue({
                email: selectedCustomer.email || '',
                phone: selectedCustomer.phone || '',
            });
        }
    }
      }
    );
    this.ReturnForm.get('customerCode')?.valueChanges.subscribe((customerCode: string) => {
  if (customerCode && customerCode.trim()) {
    this.loadCustomerData(customerCode.trim());
  }
});
    // Listen to transport type selection - clear vehicle when type changes
  this.ReturnForm.get('transportType')?.valueChanges.subscribe((selectedType) => {
  // Chỉ clear vehicleCode nếu đây là do người dùng thay đổi (check logic nếu cần)
  // Nhưng code hiện tại patchValue({ vehicleCode: '' }) là đúng để bắt người dùng chọn lại.
  this.ReturnForm.patchValue({ vehicleCode: '' });

  if (!selectedType) {
    this.filteredVehicles = [...this.transportVehicles];
  } else {
    this.filteredVehicles = this.transportVehicles.filter(
      (v) => v.transportType === selectedType
    );
  }
});

    // Listen to vehicle selection
    this.ReturnForm.get('vehicleCode')?.valueChanges.subscribe((selected) => {
      if (!selected) return;

      const selectedVehicle = this.transportVehicles.find(
        (v) => v.code === selected
      );

      if (selectedVehicle) {
        this.ReturnForm.patchValue({
          driver: selectedVehicle.driver || '',
        });
      }
    });
  }
onVehicleInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  
  // Logic lọc danh sách (như đã sửa ở câu trả lời trước)
  const selectedTransportType = this.ReturnForm.get('transportType')?.value;
  let baseList = this.transportVehicles;
  
  if (selectedTransportType) {
    baseList = this.transportVehicles.filter(
      (v) => v.transportType === selectedTransportType
    );
  }

  if (!value || value.trim() === '') {
    // Nếu người dùng xóa hết chữ -> Set Form value về null
    this.ReturnForm.patchValue({ vehicleCode: null, driver: '' });
    this.filteredVehicles = baseList;
  } else {
    // Logic lọc hiển thị
    const filter = value.toLowerCase();
    this.filteredVehicles = baseList.filter(
      (v) =>
        (v.label && v.label.toLowerCase().includes(filter)) ||
        (v.value && v.value.toLowerCase().includes(filter))
    );
  }
}

onVehicleSelect(event: any): void {
  // 1. Lấy giá trị chính xác bất kể phiên bản Ant Design
  // Nếu event là object có nzValue thì lấy, nếu không thì lấy chính event
  const selectedValue = event?.nzValue || event?.option?.nzValue || event;

  if (!selectedValue) return;

  // 2. Tìm phương tiện trong danh sách gốc (transportVehicles)
  const selectedVehicle = this.transportVehicles.find(
    (v) => v.code === selectedValue || v.value === selectedValue
  );

  if (selectedVehicle) {
    // 3. QUAN TRỌNG: Patch thủ công cả 'vehicleCode' để đảm bảo Form nhận dữ liệu
    // (Tránh trường hợp Input hiện chữ nhưng Form value vẫn null)
    this.ReturnForm.patchValue({
      vehicleCode: selectedVehicle.code, // Hoặc selectedVehicle.value tùy cấu trúc
      driver: selectedVehicle.driver || '',
    });
    

  }
}
onSubmit(): void {
  
  if (this.isKD || this.isKT) {
    this.message.error('Bạn không có quyền chỉnh sửa đơn trả hàng');
    return;
  }
  
  if (!this.ReturnForm.valid) {
    this.message.error('Vui lòng điền đầy đủ thông tin bắt buộc');
    this.markFormGroupTouched();
    return;
  }

  // ✅ Cho phép lưu ngay cả khi chỉ xóa hết item
  if (this.ReturnItems.length === 0 && this.deletedItemIds.length === 0) {
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

  // ✅ THÊM MỚI: Đồng bộ và cập nhật thông tin khách hàng
  this.CustomerForm.patchValue({
    email: returnRequest.email,
    phone: returnRequest.phone
  });
  
  const customerData = this.CustomerForm.getRawValue();

  // ✅ THÊM MỚI: Cập nhật customer trước khi update return
  this._sReturn.updateCustomer(customerData)
    .pipe(
      switchMap(() => this._sReturn.updateReturn(returnRequest))
    )
    .subscribe({
      next: (res: any) => {
        const apiCalls: any[] = [];

        // ✅ 1. GỌI API XÓA cho các item đã bị remove
        if (this.deletedItemIds.length > 0) {
          this.deletedItemIds.forEach((pkid) => {
            apiCalls.push(
              this._sReturn.deleteDetailReturn(pkid).pipe(
                tap(() => console.log('✅ Đã xóa pkid')),
                catchError((err) => {
                  console.error('❌ Lỗi xóa pkid:', pkid, err);
                  return of(null); // Tiếp tục dù có lỗi
                })
              )
            );
          });
        }

        // ✅ 2. UPDATE hoặc CREATE các item còn lại
        this.ReturnItems.forEach((item) => {
          if (item.pkid && item.pkid.trim() !== '') {
            // Update item đã tồn tại
            apiCalls.push(
              this._sReturn.updateDetailReturn(item).pipe(
                catchError((err) => {
                  console.error('❌ Lỗi update item:', item.pkid, err);
                  return of(null);
                })
              )
            );
          } else {
            // Tạo item mới
            const payload = {
              ...item,
              headerCode: returnRequest.code,
            };
            apiCalls.push(
              this._sReturn.createDetailReturn(payload).pipe(
                catchError((err) => {
                  console.error('❌ Lỗi tạo item mới:', err);
                  return of(null);
                })
              )
            );
          }
        });

        if (apiCalls.length === 0) {
          this.message.warning('Không có thay đổi nào để lưu!');
          return;
        }

        // ✅ 3. Gọi tất cả API song song
        forkJoin(apiCalls).subscribe({
          next: (results) => {
          
            this.deletedItemIds = []; // Reset danh sách đã xóa
            this.message.success('Cập nhật đơn trả hàng thành công!');
          },
          error: (err) => {
            console.error('❌ Lỗi khi cập nhật chi tiết:', err);
            this.message.error('Cập nhật chi tiết thất bại!');
          },
        });
      },
      error: (error) => {
        console.error('❌ Lỗi cập nhật header:', error);
        this.message.error('Cập nhật đơn hàng thất bại!');
      },
    });
}
 
onCopyReturn(): void {
  if (!this.ReturnId) return;


  const state = {
    returnOrderCode: this.ReturnId 
  };

  this.router.navigate(['/order/return-create'], { state });
  this.message.success('Đã copy đơn trả hàng');
}

  onSendReturn(): void {
    if (this.isKD || this.isKT) {
      this.message.error('Bạn không có quyền gửi đơn trả hàng');
      return;
    }
    if (!this.ReturnId) {
      this.message.error('Không tìm thấy mã đơn hàng!');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn gửi đơn trả hàng này?')) {
      this.isProcessing = true;
      this._sReturn.submitReturn(this.ReturnId!).subscribe({
        next: (res) => {
          this.isProcessing = false;
          this.message.success('Gửi đơn trả hàng thành công!');
          this.router.navigate(['/order/return-list']);
        },
        error: (err) => {
          this.isProcessing = false;
          this.message.error('Không thể gửi đơn trả hàng. Vui lòng thử lại!');
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
            // Reload order data to reflect changes
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

  // ===== Role-style confirmation (cancel) =====
  @ViewChild('confirmCancelTpl', { static: false })
  confirmCancelTpl!: TemplateRef<any>;
  private _confirmModalRef: NzModalRef | null = null;
  private _pendingAction: 'cancel' | null = null;

  closeConfirmModal(): void {
    if (this._confirmModalRef) {
      this._confirmModalRef.destroy();
      this._confirmModalRef = null;
      this._pendingAction = null;
    }
  }

  confirmProceed(): void {
    if (this._pendingAction === 'cancel') {
      // TODO: Implement cancel Return logic
      this.message.success('Đã hủy đơn hàng');
      setTimeout(() => this.router.navigate(['/Return/list']), 800);
    }
    this.closeConfirmModal();
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
        headerCode: this.ReturnForm.value.orderCode || '',
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

    // ✅ Nếu item có pkid (đã tồn tại trong DB), lưu vào danh sách xóa
    if (removedItem.pkid && removedItem.pkid.trim() !== '') {
      this.deletedItemIds.push(removedItem.pkid);
      
    }

    // Xóa khỏi mảng hiển thị
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
