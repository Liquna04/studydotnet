import {
  Component,
  ViewChild,
  Input,
  ElementRef,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ShareModule } from '../../shared/share-module';
import { GlobalService } from '../../service/global.service';
import { PaginationResult } from '../../models/base.model';
import { CustomerService } from '../../service/master-data/customer.service';
import { AccountCustomerService } from '../../service/master-data/account-customer.service';
import { AccountService } from '../../service/system-manager/account.service';
import { BaseFilter } from '../../models/base.model';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TablePaginationComponent } from '../../shared/components/table-pagination/table-pagination.component';
import {
  NonNullableFormBuilder,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { NzFormatEmitEvent } from 'ng-zorro-antd/tree';
import { NzUploadChangeParam, NzUploadFile } from 'ng-zorro-antd/upload';

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [ShareModule],
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.scss'],
})
export class CustomerComponent implements OnInit, OnDestroy {
  selectedFileObj: File | null = null;
  selectedFile: File | null = null;
  hasSelectedFile = false;
  selectedFileName: string | null = null;
  selectedFileUrl: string | null = null;
  paginationResult = new PaginationResult();
  loading = false;
  filter = new BaseFilter();
  visibleCustomer = false;
  isEdit = false;
  isEditCustomer = false;
  isEditAccount = false;
  item: any = this.initItem();
  importVisible = false; // Thêm cho dialog import
  fileList: NzUploadFile[] = []; // Danh sách file được chọn
  importMessage: string = '';
  customers: Array<{
    customerCode?: string;
    fullName?: string;
    shortName?: string;
    vatNumber?: string;
  }> = [];

  accountCustomerList: any[] = [];

  // Properties for organization filtering
  filteredCustomers: any[] = [];
  rightTableData: any[] = [];
  // Table properties
  tableScrollX: string | null = '100%';
  tableScrollY: string | null = null;
  private resizeHandler = () => this.updateTableScrollHeight();
  // Responsive drawer width for popup
  drawerWidth: string | number = '720px';
  private _resizeDrawerListener: any;

  private updateTableScrollHeight(): void {
    try {
      // Handle responsive scroll widths like storage component
      if (window.innerWidth <= 768) {
        this.tableScrollY = null;
        this.tableScrollX = '600px';
      } else if (window.innerWidth <= 1024) {
        this.tableScrollY = null;
        this.tableScrollX = '800px';
      } else {
        this.tableScrollY = null;
        this.tableScrollX = '100%';
      }
    } catch (e) {
      // On any error, fall back to defaults
      this.tableScrollY = null;
      this.tableScrollX = '100%';
    }
  }

  customerItem: any = {
    id: '',
    customerCode: '',
    fullName: '',
    shortName: '',
    vatNumber: '',
    email: '',
    phone: '',
    address: '',
    giaoCHXD: '',
    isActive: true,
    customerOrg: [],
  };

  // Properties for organize-like layout
  @ViewChild('fileInput') fileInput!: ElementRef;

  @Input() readonly: boolean = false; // Khi true, chỉ cho phép select, không edit
  @Output() selectCustomer: EventEmitter<any> = new EventEmitter<any>();
  @Output() resetCustomer: EventEmitter<void> = new EventEmitter<void>(); // Event để reset selection

  searchValue = '';
  nodes: any = [];
  originalNodes: any[] = [];
  visible: boolean = false;
  edit: boolean = false;
  nodeCurrent!: any;
  titleParent: string = '';

  // Forms
  customerForm: FormGroup;
  accountForm: FormGroup;

  constructor(
    private fb: NonNullableFormBuilder,
    private _service: CustomerService,
    private _sAccountCustomer: AccountCustomerService,
    private _sAccount: AccountService,
    private globalService: GlobalService,
    private messageService: NzMessageService
  ) {
    this.globalService.setBreadcrumb([
      { name: 'Danh sách khách hàng', path: 'master-data/customer' },
    ]);

    this.customerForm = this.fb.group({
      id: [''],
      customerCode: ['', [Validators.required]],
      fullName: ['', [Validators.required]],
      shortName: [''],
      vatNumber: [''],
      email: ['', [Validators.email]],
      phone: [''],
      address: [''],
      giaoCHXD: [''],
      isActive: [true],
    });

    this.accountForm = this.fb.group({
      id: [''],
      customerCode: [''],
      userName: ['', [Validators.required]],
      fullName: ['', [Validators.required]],
      passWord: ['', [Validators.required]],
      phoneNumber: [''],
      email: ['', [Validators.email]],
      address: [''],
      isActive: [true],
    });
  }
  ngOnInit(): void {
    this.loadAccountCustomerList();
    this.search();
    this.updateTableScrollHeight();
    window.addEventListener('resize', this.resizeHandler);
    // init drawer width and listen for resize
    this.updateDrawerWidth();
    this._resizeDrawerListener = () => this.updateDrawerWidth();
    window.addEventListener('resize', this._resizeDrawerListener);
  }
  ngOnDestroy() {
    this.globalService.setBreadcrumb([]);
    try {
      window.removeEventListener('resize', this.resizeHandler);
      if (this._resizeDrawerListener) {
        window.removeEventListener('resize', this._resizeDrawerListener);
      }
    } catch (e) {}
  }
  private updateDrawerWidth() {
    const w = window.innerWidth;
    if (w <= 480) {
      this.drawerWidth = '96%';
    } else if (w <= 768) {
      this.drawerWidth = '80%';
    } else if (w <= 1024) {
      this.drawerWidth = '720px';
    } else {
      this.drawerWidth = '720px';
    }
  }
  private initItem() {
    return {
      id: '',
      customerCode: '',
      userName: '',
      fullName: '',
      shortName: '',
      address: '',
      vatNumber: '',
      email: '',
      phone: '',
      giaoCHXD: '',
      isActive: true,
    };
  }
  nzEvent(event: NzFormatEmitEvent): void {}
  onDrop(event: any) {}
  onDragStart(event: any) {}
  onPageChange(page: number): void {
    this.filter.currentPage = page;
    this.search();
  }
  onPageSizeChange(pageSize: number): void {
    this.filter.currentPage = 1;
    this.filter.pageSize = pageSize;
    this.search();
  }
  reset() {
    this.filter = new BaseFilter();
    this.search();
  }

  loadCustomers(orgCode: string) {
    this.loading = true;
    this._service
      .search({ pageSize: 10000, currentPage: 1 })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          const allCustomers = response.data?.data || response.data || [];
          this.rightTableData = allCustomers;
          // Load accounts for each customer
          this.rightTableData.forEach((customer) => {
            this.loadAccountCustomer(customer.customerCode);
          });
          
        },
        error: (err) => {
          console.error('Error loading all customers:', err);
          this.rightTableData = [];
        },
      });
    return;
  }
  loadAccountCustomer(customerCode: string) {
    this.loading = true;
    this._sAccountCustomer
      .GetByCustomerCode(customerCode)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          const accounts = response.data || response || [];
          // Tìm customer trong rightTableData và set accounts
          const customer = this.rightTableData.find(
            (c) => c.customerCode === customerCode
          );
          if (customer) {
            customer.accounts = accounts.map((acc: any) => ({
              customerCode: acc.customerCode || '',
              userName: acc.userName || '',
              isActive: acc.isActive !== undefined ? acc.isActive : true,
            }));
          }
        },
        error: (err) => {
          console.error('Error loading account customer:', err);
          // Set empty accounts nếu lỗi
          const customer = this.rightTableData.find(
            (c) => c.customerCode === customerCode
          );
          if (customer) {
            customer.accounts = [];
          }
        },
      });
  }
  loadAccountCustomerList() {
    this._sAccountCustomer.getAll().subscribe({
      next: (accounts: any[]) => {
        this.accountCustomerList = accounts || [];
      },
      error: (error) => {
        console.error('Error loading account customer list:', error);
        this.accountCustomerList = [];
      },
    });
  }

  search() {
    this._service.search(this.filter).subscribe({
      next: (data) => {
        this.paginationResult = data;
        this.rightTableData = data.data || [];
        // Load accounts for each customer
        this.rightTableData.forEach((customer) => {
          this.loadAccountCustomer(customer.customerCode);
          if (customer.giaoCHXD && typeof customer.giaoCHXD === 'string') {
            customer.giaoCHXD_List = customer.giaoCHXD.split(', ');
          } else {
            customer.giaoCHXD_List = [];
          }
        });
      },
      error: (err) => console.error(err),
    });
  }

  resetSelection(): void {
    this.resetCustomer.emit();
    this.searchValue = '';
    this.nodes = [...this.originalNodes];
  }

  openCreateCustomer() {
    this.isEdit = false;
    this.visibleCustomer = true;
    this.customerForm.reset({
      id: '',
      customerCode: '',
      fullName: '',
      shortName: '',
      vatNumber: '',
      email: '',
      phone: '',
      address: '',
      giaoCHXD: [],
      isActive: true,
    });
     this.customerForm.get('customerCode')?.enable();
  
  // ✅ Set lại required cho password khi tạo mới
  this.accountForm.get('passWord')?.setValidators([Validators.required]);
  this.accountForm.get('passWord')?.updateValueAndValidity();
}
  
  openEdit(item: any) {
    this.isEdit = true;
    this.isEditAccount = false;
    this.visible = false;
    this.visibleCustomer = true;
    let chxdList: string[] = [];
    if (item.giaoCHXD && typeof item.giaoCHXD === 'string') {
        // Tách chuỗi bằng ", " và lọc bỏ các giá trị rỗng
        chxdList = item.giaoCHXD.split(', ').filter((tag: string) => tag.trim() !== '');
    }
    this.customerForm.patchValue({
      id: item.id,
      customerCode: item.customerCode,
      fullName: item.fullName,
      shortName: item.shortName,
      vatNumber: item.vatNumber,
      email: item.email,
      phone: item.phone,
      address: item.address,
      giaoCHXD: chxdList,
      isActive: item.isActive !== undefined ? item.isActive : true,
    });
    this.customerForm.get('customerCode')?.disable();
  }
  closeCustomer() {
    this.visibleCustomer = false;
    this.customerForm.reset();
  }
  submitCustomer() {
    Object.values(this.customerForm.controls).forEach((control) => {
      if (control.invalid) {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      }
    });

    if (!this.customerForm.valid) {
      return;
    }

    // const formValue = this.customerForm.value;
    const formValue = this.customerForm.getRawValue();
    let chxdString: string | null = null;
    if (Array.isArray(formValue.giaoCHXD) && formValue.giaoCHXD.length > 0) {
        // Dùng .join() để nối các phần tử mảng lại
        chxdString = formValue.giaoCHXD.join(', ');
    }

    if (this.isEdit) {
      // Update customer
      const customerPayload = {
        id: formValue.id,
        customerCode: formValue.customerCode,
        fullName: formValue.fullName,
        shortName: formValue.shortName,
        vatNumber: formValue.vatNumber,
        email: formValue.email,
        phone: formValue.phone,
        address: formValue.address,
        giaoCHXD: chxdString,
        isActive: formValue.isActive,
      };

      this._service.update(customerPayload).subscribe({
       next: (response: any) => {
          if (response.status === true) {
            this.messageService.success('Cập nhật khách hàng thành công!');
            this.search();
            this.loadAccountCustomerList();
            this.closeCustomer();
          } else {
            const errorMessage = response.messageObject?.messageDetail || 'Cập nhật thất bại';
            this.messageService.error(errorMessage);
          }
        },
        error: (err) => {
          const errorMessage = err.error?.messageObject?.messageDetail || 'Lỗi hệ thống khi cập nhật';
          this.messageService.error(errorMessage);
        },
      });
    } else {
      // Create customer
      const customerPayload = {
        id: formValue.id,
        customerCode: formValue.customerCode,
        fullName: formValue.fullName,
        shortName: formValue.shortName,
        vatNumber: formValue.vatNumber,
        email: formValue.email,
        phone: formValue.phone,
        address: formValue.address,
        giaoCHXD: chxdString,
        isActive: formValue.isActive,
      };

      this._service.create(customerPayload).subscribe({
       next: (response: any) => {
          if (response.status === true) {
            this.messageService.success('Tạo khách hàng thành công!');
            const createdCustomer = response.data; // Giả định data trả về trong { status: true, data: {...} }
            this.customerItem.customerCode =
              createdCustomer?.customerCode || formValue.customerCode;
            this.finishCreate(false);
          } else {
            const errorMessage = response.messageObject?.messageDetail || 'Tạo khách hàng thất bại';
            this.messageService.error(errorMessage);
          }
        },
        error: (err) => {
          const errorMessage = err.error?.messageObject?.messageDetail || 'Lỗi hệ thống khi tạo mới';
          this.messageService.error(errorMessage);
        },
      });
    }
  }
  // Hàm tổng kết
  private finishCreate(hasError: boolean) {
    if (hasError) {
      this.messageService.warning(
        'Tạo Customer thành công, nhưng tạo org thất bại'
      );
    } else {
    }
    this.search();
    this.loadAccountCustomerList();

    this.closeCustomer();
  }

  openCreateAccount(customerCode: string) {
    this.isEditAccount = false;
    this.visible = true;
    this.accountForm.reset({
      id: '',
      customerCode: customerCode,
      userName: '',
      fullName: '',
      passWord: '',
      phoneNumber: '',
      email: '',
      address: '',
      accountType: '',
      organizeCode: '',
      isActive: true,
    });
    this.accountForm.get('customerCode')?.disable();
    this.accountForm.get('userName')?.enable();
  }
openEditAccount(account: any) {
  this.isEditAccount = true;
  this.visible = true;
  
  
  this.loading = true;
  this._service.GetByUserName(account.userName).subscribe({
    next: (response: any) => {
      this.loading = false;
      
      
      // ✅ FIX: Lấy phần tử đầu tiên của array
      let accountDetail;
      
      if (Array.isArray(response)) {
        // Nếu response trực tiếp là array
        accountDetail = response[0];
      } else if (response.data && Array.isArray(response.data)) {
        // Nếu response.data là array
        accountDetail = response.data[0];
      } else if (response.data) {
        accountDetail = response.data;
      } else {
        accountDetail = response;
      }
      
      
      // ✅ Kiểm tra accountDetail phải là object, không phải array
      if (!accountDetail || Array.isArray(accountDetail)) {
        console.error('❌ Invalid accountDetail structure:', accountDetail);
        this.messageService.error('Dữ liệu không hợp lệ');
        return;
      }
      
      // ✅ Kiểm tra userName có khớp không
      if (accountDetail.userName !== account.userName) {
        console.error('❌ Mismatch!', {
          expected: account.userName,
          received: accountDetail.userName
        });
        this.messageService.error('Lỗi: Dữ liệu không khớp');
        return;
      }
      
      // ✅ Patch dữ liệu
      this.accountForm.patchValue({
        id: accountDetail.userId || '',
        customerCode: account.customerCode,
        userName: accountDetail.userName || '',
        fullName: accountDetail.fullName || '',
        passWord: '',
        phoneNumber: accountDetail.phoneNumber || '',
        email: accountDetail.email || '',
        address: accountDetail.address || '',
        isActive: accountDetail.isActive !== undefined ? accountDetail.isActive : true
      });
      
   
      // Disable fields
      this.accountForm.get('customerCode')?.disable();
      this.accountForm.get('userName')?.disable();
      
      // Bỏ required cho password
      this.accountForm.get('passWord')?.clearValidators();
      this.accountForm.get('passWord')?.updateValueAndValidity();
      
      // Update email validity
      this.accountForm.get('email')?.updateValueAndValidity();
    },
    error: (err) => {
      this.loading = false;
      console.error('❌ Error loading account:', err);
      this.messageService.error('Không thể tải thông tin tài khoản');
    }
  });
}
  close() {
    this.visible = false;
  }

submit() {
  // Validate form
  Object.values(this.accountForm.controls).forEach((control) => {
    if (control.invalid) {
      control.markAsDirty();
      control.updateValueAndValidity({ onlySelf: true });
    }
  });

  if (!this.accountForm.valid) {
    this.messageService.warning('Vui lòng điền đầy đủ thông tin bắt buộc');
    return;
  }

  const formValue = this.accountForm.getRawValue();

  if (this.isEditAccount) {
    // ✅ UPDATE ACCOUNT
    const updatePayload = {
      userId: formValue.customerCode, // hoặc formValue.id nếu API dùng id
      userName: formValue.userName,
      fullName: formValue.fullName,
      password: formValue.passWord || null, // null = không đổi mật khẩu
      email: formValue.email,
      phoneNumber: formValue.phoneNumber,
      address: formValue.address,
      accountType: 'KH',
      isActive: formValue.isActive
    };


    this.loading = true;
    this._service.updateInformation(updatePayload).subscribe({
      next: (res: any) => {
        this.loading = false;
        
        // Kiểm tra response có success = false không
        if (res && typeof res === 'object' && 'success' in res && res.success === false) {
          console.error('❌ Update failed:', res);
          this.messageService.error(res.message || 'Cập nhật tài khoản thất bại');
          return;
        }

       
        
        // Close drawer và refresh data
        this.close();
        this.loadAccountCustomerList();
        this.search();
      },
      error: (err) => {
        this.loading = false;
        console.error('❌ Error updating account:', err);
        this.messageService.error('Cập nhật tài khoản thất bại');
      }
    });

  } else {
    // ✅ CREATE ACCOUNT (giữ nguyên logic cũ)
    
    // API 1: Tạo AccountCustomer
    const accountCustomerPayload = {
      id: '',
      customerCode: formValue.customerCode,
      userName: formValue.userName,
      isActive: true,
    };


    this.loading = true;
    this._sAccountCustomer.create(accountCustomerPayload).subscribe({
      next: (res: any) => {
        if (res && typeof res === 'object' && 'success' in res && res.success === false) {
          console.error('❌ Create accountCustomer failed:', res);
          this.loading = false;
          return;
        }
        
        
        // Tiếp tục tạo Account
        this.createAccount(formValue);
      },
      error: (err) => {
        this.loading = false;
    
      }
    });
  }
}

// ✅ Tách riêng hàm tạo Account để code sạch hơn
private createAccount(formValue: any) {
  const accountPayload = {
    userId: formValue.customerCode,
    userName: formValue.userName,
    fullName: formValue.fullName,
    password: formValue.passWord,
    email: formValue.email,
    phoneNumber: formValue.phoneNumber,
    address: formValue.address,
    orgCode: null,
    urlImage: null,
    accountType: 'KH',
    faceId: null,
    isActive: true,
  };


  this._sAccount.create(accountPayload).subscribe({
    next: (accountRes: any) => {
      this.loading = false;
      
      if (accountRes && typeof accountRes === 'object' && 'success' in accountRes && accountRes.success === false) {
        console.error('❌ Create account failed:', accountRes);
        this.messageService.error(accountRes.message || 'Tạo tài khoản thất bại');
        return;
      }


      // Close drawer và refresh data
      this.close();
      this.loadAccountCustomerList();
      this.search();
    },
    error: (err) => {
      this.loading = false;
      console.error('❌ Error creating account:', err);
      this.messageService.error('Tạo tài khoản thất bại');
    }
  });
}
  openImportExcel() {
    this.importVisible = true;
    this.fileList = []; // Reset file list
    this.importMessage = ''; // Reset thông báo
  }
  submitImport() {
    if (this.fileList.length === 0) {
      this.importMessage = 'Vui lòng chọn file!';
      return;
    }

    if (!this.selectedFileObj) {
      this.importMessage = 'File không hợp lệ!';
      return;
    }

    // ✅ Tạo FormData riêng cho Customer
    const customerFormData = new FormData();
    customerFormData.append('file', this.selectedFileObj as File);

    this.loading = true;
    this._service.importExcel(customerFormData).subscribe({
      next: (response) => {
        this.loading = false;
         if (response.status === true) {
         
          this.messageService.success('Thêm mới thông tin thành công!');
          this.search();
          this.closeImport();
        
      } else {
          // 2. THẤT BẠI DO LOGIC (status: false)
          const errorMessage = 
            response.messageObject?.message || 'Import thất bại (lỗi không xác định)';
          
          // ⚠️ Hiển thị lỗi cụ thể từ backend
          this.messageService.error(errorMessage); 
        }
        
        // Luôn tắt loading sau khi 'next' xử lý xong
        this.loading = false;
      },
      error: (err) => {
        this.messageService.error('Thêm mới thông tin thất bại!');
        this.loading = false;
      },
    });
  }

  beforeUpload = (file: NzUploadFile): boolean => {
    const isExcel =
      file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name?.toLowerCase().endsWith('.xlsx') ||
      file.name?.toLowerCase().endsWith('.xls');

    if (!isExcel) {
      this.messageService.error('Vui lòng chọn file Excel (.xlsx, .xls)');

      return false;
    }

    this.fileList = [file];
    // ✅ Safe conversion
    this.selectedFileObj = file.originFileObj || (file as any);

    return false;
  };
  handleFileChange({ file, fileList }: NzUploadChangeParam): void {
    if (file.status === 'removed') {
      this.fileList = [];
      this.selectedFileObj = null;
      this.importMessage = '';
    } else if (file.status === 'error') {
      this.messageService.error('Lỗi tải file. Vui lòng thử lại');
    }

    // ✅ Update fileList
    this.fileList = [...fileList];
  }
  resetImport() {
    this.loading = false;
    this.importVisible = false;
    this.fileList = [];
    this.selectedFileObj = null;
    this.importMessage = '';
  }
  closeImport() {
    this.importVisible = false;
    this.fileList = [];
    this.selectedFileObj = null; // ✅ Reset file object
    this.importMessage = '';
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.hasSelectedFile = true;
      this.selectedFileName = file.name;
      this.selectedFileUrl = URL.createObjectURL(file);
    }
  }
}
