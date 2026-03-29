import { Component, OnInit, OnDestroy, TemplateRef } from '@angular/core';
import { ShareModule } from '../../shared/share-module';
import { BaseFilter, PaginationResult } from '../../models/base.model';
import { StoreService } from '../../service/master-data/store.service';
import { GlobalService } from '../../service/global.service';
import { TablePaginationComponent } from '../../shared/components/table-pagination/table-pagination.component';
import { NzUploadFile, NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AccountStoreService } from '../../service/master-data/account-store.service';
import { AccountService } from '../../service/system-manager/account.service';
import { NonNullableFormBuilder } from '@angular/forms';
@Component({
  selector: 'app-store',
  standalone: true,
  imports: [ShareModule],
  templateUrl: './store.component.html',
  styleUrl: './store.component.scss',
})
export class StoreComponent implements OnInit, OnDestroy {
  paginationResult = new PaginationResult();
  loading = false;
  tableScrollY: string | null = null;
  tableScrollX: string | null = '100%';
  private resizeHandler = () => this.updateTableScrollHeight();
  filter = new BaseFilter();
  visible = false;
  isEdit = false;
  item: any = this.initItem();

  // Import properties
  importVisible = false;
  fileList: NzUploadFile[] = [];
  selectedFileObj: any;
  importMessage = '';
  importTitleTpl!: TemplateRef<any>;
  // Drawer responsive width
  drawerWidth: string | number = '720px';
  private _resizeDrawerListener: any;
  isEditAccount = false;
  visibleAccount = false;
  // Form
  form: FormGroup;
  accountForm: FormGroup;

  constructor(
    private _service: StoreService,
    private _sAccount: AccountService,
    private _sAccountStore: AccountStoreService,
    private globalService: GlobalService,
    private fb: NonNullableFormBuilder,
    private message: NzMessageService
    ) {
    this.globalService.setBreadcrumb([
      {
        name: 'Danh sách cửa hàng',
        path: 'master-data/store',
      },
    ]);
    this.accountForm = this.fb.group({
  id: [''],
  storeCode: [''], 
  userName: ['', [Validators.required]],
  fullName: ['', [Validators.required]],
  passWord: ['', [Validators.required]],
  phoneNumber: [''],
  email: ['', [Validators.email]],
  address: [''],
  isActive: [true],
});
    this.form = this.fb.group({
      id: [''],
      code: ['', [Validators.required]],
      name: ['', [Validators.required]],
      email: [''],
      phone: [''],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.search();
    this.updateTableScrollHeight();
    window.addEventListener('resize', this.resizeHandler);
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
  private initItem() {
    return {id:'', code: '', name: '', email: '',phone:'', isActive: true };
  }

search() {
    this._service.search(this.filter).subscribe({
        next: (data) => {
            this.paginationResult = data; // ✅ Gán dữ liệu chính trước
            
            // ✅ Kiểm tra nếu có dữ liệu thì mới đi load tài khoản con
            if (this.paginationResult.data && this.paginationResult.data.length > 0) {
                this.paginationResult.data.forEach((store: any) => {
                    // Khởi tạo mảng accounts rỗng để tránh lỗi null trên giao diện
                    store.accounts = []; 
                    this.loadAccountStore(store.code);
                });
            }
        },
        error: (err) => {
            console.error(err);
            this.loading = false;
        },
    });
}
  loadAccountStore(storeCode: string) {
    // Giả sử dùng AccountService hoặc AccountStoreService để lấy list account theo storeCode
    // Nếu chưa có API GetByStoreCode, bạn có thể dùng GetByUserName nếu logic cho phép, 
    // hoặc gọi API search account với filter orgCode = storeCode
    
    // Ví dụ mẫu (cần điều chỉnh theo API thực tế của bạn):
    this._sAccountStore.GetByStoreCode(storeCode).subscribe({
      next: (accounts: any) => {
         const store = this.paginationResult.data.find((s: any) => s.code === storeCode);
         if (store) {
           // Map dữ liệu trả về vào thuộc tính accounts của store để hiển thị ra bảng
           store.accounts = Array.isArray(accounts) ? accounts : (accounts.data || []);
         }
      },
      error: (err) => console.error(err)
    });
}

  updateTableScrollHeight() {
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

  onPageChange(index: number, size?: number): void {
    this.filter.currentPage = index;
    if (size !== undefined) this.filter.pageSize = size;
    this.search();
  }

  // Methods for shared pagination component
  onPageSizeChange(pageSize: number): void {
    this.filter.currentPage = 1;
    this.filter.pageSize = pageSize;
    this.search();
  }

  reset() {
    this.filter = new BaseFilter();
    this.search();
  }
openCreateAccount(storeCode: string) {
  this.isEditAccount = false; 
    this.visibleAccount = true;
    this.visible = false;
    this.accountForm.reset({
      id: '',
      storeCode: storeCode, // ✅ Gán storeCode
      userName: '',
      fullName: '',
      passWord: '',
      phoneNumber: '',
      email: '',
      address: '',
      isActive: true,
    });

    this.accountForm.get('storeCode')?.disable(); // Khóa mã cửa hàng
    this.accountForm.get('userName')?.enable();   // Cho phép nhập username
    this.accountForm.get('passWord')?.setValidators([Validators.required]); // Bắt buộc nhập pass khi tạo mới
    this.accountForm.get('passWord')?.updateValueAndValidity();
}

openEditAccount(account: any) {
   this.isEditAccount = true;
    this.visibleAccount = true; 
    this.visible = false; 
    
    this.loading = true;

    // ✅ Gọi service lấy thông tin chi tiết account (StoreService hoặc AccountService)
    this._service.GetByUserName(account.userName).subscribe({
      next: (response: any) => {
        this.loading = false;

        // Xử lý response đa dạng (array hoặc object) giống code mẫu
        let accountDetail;
        if (Array.isArray(response)) {
          accountDetail = response[0];
        } else if (response.data && Array.isArray(response.data)) {
          accountDetail = response.data[0];
        } else if (response.data) {
          accountDetail = response.data;
        } else {
          accountDetail = response;
        }

        if (!accountDetail) {
          this.message.error('Dữ liệu không hợp lệ');
          return;
        }

        // Patch dữ liệu vào form
        this.accountForm.patchValue({
          id: accountDetail.userId || '',
          storeCode: account.storeCode, // ✅ Dùng storeCode
          userName: accountDetail.userName || '',
          fullName: accountDetail.fullName || '',
          passWord: '', // Không patch password cũ
          phoneNumber: accountDetail.phoneNumber || '',
          email: accountDetail.email || '',
          address: accountDetail.address || '',
          isActive: accountDetail.isActive !== undefined ? accountDetail.isActive : true
        });

        // Disable fields không được sửa
        this.accountForm.get('storeCode')?.disable();
        this.accountForm.get('userName')?.disable();

        // Bỏ required password khi edit
        this.accountForm.get('passWord')?.clearValidators();
        this.accountForm.get('passWord')?.updateValueAndValidity();
        this.accountForm.get('email')?.updateValueAndValidity();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error:', err);
        this.message.error('Không thể tải thông tin tài khoản');
      }
    });
}
closeAccount() {
    this.visibleAccount = false;
    this.isEditAccount = false;
    this.accountForm.reset();
}
submitAccount() {
    // Validate form
    Object.values(this.accountForm.controls).forEach((control) => {
      if (control.invalid) {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      }
    });

    if (!this.accountForm.valid) {
      this.message.warning('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    const formValue = this.accountForm.getRawValue();

    if (this.isEditAccount) {
      // ✅ UPDATE ACCOUNT
      const updatePayload = {
        userId: formValue.storeCode, // Với Store có thể userId chính là storeCode hoặc id riêng
        userName: formValue.userName,
        fullName: formValue.fullName,
        password: formValue.passWord || null,
        email: formValue.email,
        phoneNumber: formValue.phoneNumber,
        address: formValue.address,
        accountType: 'CH', 
        isActive: formValue.isActive
      };

      this.loading = true;
      // Giả định StoreService có hàm updateInformation tương tự CustomerService
      this._service.updateInformation(updatePayload).subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res && res.success === false) {
            this.message.error(res.message || 'Cập nhật thất bại');
            return;
          }
          this.message.success('Cập nhật tài khoản thành công');
          this.closeAccount(); // ✅ Đóng form account
          this.search();
        },
        error: (err) => {
          this.loading = false;
          this.message.error('Cập nhật tài khoản thất bại');
        }
      });

    } else {
      // ✅ CREATE ACCOUNT
      
      // BƯỚC 1: Tạo liên kết Account - Store (Giống Account - Customer)
      const AccountStorePayload = {
        id: '',
        storeCode: formValue.storeCode, // ✅ storeCode
        userName: formValue.userName,
        isActive: true,
      };

      this.loading = true;
      this._sAccountStore.create(AccountStorePayload).subscribe({
        next: (res: any) => {
          if (res && res.success === false) {
             this.loading = false;
             this.message.error(res.message);
             return;
          }
          // BƯỚC 2: Gọi hàm tạo account hệ thống
          this.createAccount(formValue);
        this.closeAccount();
          this.search();
        },
        error: (err) => {
          this.loading = false;
          this.message.error('Lỗi khi tạo liên kết tài khoản');
        }
      });
    }
}


// ✅ Hàm helper để tạo account hệ thống
private createAccount(formValue: any) {
    const accountPayload = {
      userId: formValue.storeCode, // Map storeCode vào userId
      userName: formValue.userName,
      fullName: formValue.fullName,
      password: formValue.passWord,
      email: formValue.email,
      phoneNumber: formValue.phoneNumber,
      address: formValue.address,
      orgCode: null,
      urlImage: null,
      accountType: 'CH', // ✅ Quan trọng: Set loại tài khoản là Store/Cửa hàng
      faceId: null,
      isActive: true,
    };

    this._sAccount.create(accountPayload).subscribe({
      next: (accountRes: any) => {
        this.loading = false;
        if (accountRes && accountRes.success === false) {
          this.message.error(accountRes.message || 'Tạo tài khoản thất bại');
          return;
        }
        this.close();
        // this.loadAccountStoreList(); // Reload list nếu cần
      },
      error: (err) => {
        this.loading = false;
        this.message.error('Tạo tài khoản thất bại');
      }
    });
}
  openCreate() {
    this.isEdit = false;
    this.visible = true;
    this.form.reset({id:'', code: '', name: '', email: '',phone:'', isActive: true });
    this.form.get('code')?.enable();
  }

  openEdit(item: any) {
    this.isEdit = true;
    this.visible = true;
    this.form.patchValue(item);
    this.form.get('code')?.disable();
  }

  close() {
    this.visible = false;
    this.form.reset({id:'', code: '', name: '', email: '',phone:'', isActive: true });
  }

  submit() {
    Object.values(this.form.controls).forEach((control) => {
      if (control.invalid) {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      }
    });

    if (!this.form.valid) {
      return;
    }

    const formValue = this.form.getRawValue();
    const request = this.isEdit
      ? this._service.update(formValue)
      : this._service.create(formValue);

 request.subscribe({
      next: (response: any) => {
        
        if (response.status === true) {
          const successMessage = this.isEdit 
            ? 'Cập nhật thông tin thành công!' 
            : 'Thêm mới thông tin thành công!';
          this.message.success(successMessage);
          
          this.search();
          this.close();
        } else {
          const errorMessage = response.messageObject?.messageDetail || 'Thao tác thất bại';
          this.message.error(errorMessage);
        }
      },
      error: (err) => console.error(err),
    });
  }

  // Import methods
  openImport() {
    this.importVisible = true;
    this.fileList = [];
    this.selectedFileObj = null;
    this.importMessage = '';
  }

  closeImport() {
    this.importVisible = false;
    this.fileList = [];
    this.selectedFileObj = null;
    this.importMessage = '';
  }

  beforeUpload = (file: NzUploadFile): boolean => {
    this.fileList = [file];
    return false; // Prevent auto upload
  };

  handleFileChange(info: NzUploadChangeParam): void {
    if (info.file.status === 'removed') {
      this.fileList = [];
      this.selectedFileObj = null;
      this.importMessage = '';
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileObj = file;
      this.importMessage = `Đã chọn file: ${file.name}`;
    }
  }

  submitImport() {
    if (!this.selectedFileObj) return;

    // TODO: Implement import logic
    this.importMessage = 'Đang xử lý file...';
    // this._service.import(this.selectedFileObj).subscribe({
    //   next: () => {
    //     this.importMessage = 'Import thành công!';
    //     this.search();
    //     setTimeout(() => this.closeImport(), 2000);
    //   },
    //   error: (err) => {
    //     this.importMessage = 'Import thất bại!';
    //     console.error(err);
    //   }
    // });
  }
}
