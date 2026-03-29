import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { ShareModule } from '../../../shared/share-module';
import { FormGroup, Validators, NonNullableFormBuilder } from '@angular/forms';
import { DropdownService } from '../../../service/dropdown/dropdown.service';
import { AccountService } from '../../../service/system-manager/account.service';
import { ActivatedRoute } from '@angular/router';
import { AccountCustomerService } from '../../../service/master-data/account-customer.service';
import { AccountStoreService } from '../../../service/master-data/account-store.service';
import { CustomerService } from '../../../service/master-data/customer.service';
import { StoreService } from '../../../service/master-data/store.service';
import {
  NzUploadFile,
  NzUploadModule,
  NzUploadXHRArgs,
} from 'ng-zorro-antd/upload';
import { Observable, Observer, Subscription } from 'rxjs';

@Component({
  selector: 'app-account-create',
  standalone: true,
  imports: [ShareModule],
  templateUrl: './account-create.component.html',
  styleUrl: './account-create.component.scss',
})
export class AccountCreateComponent {
  @Input() reset: () => void = () => {};
  @Input() visible: boolean = false;
  @Input() close: () => void = () => {};
  @ViewChild('fileInput') fileInput!: ElementRef;

  validateForm: FormGroup;
  avatarBase64: string = '';
  passwordVisible: boolean = false;
  accountType: any[] = [];
  accountTypeOptions = [
  { label: 'Kinh doanh', value: 'KD' },
  { label: 'Khách hàng', value: 'KH' },
  { label: 'Kế toán' ,value: 'KT'},
  {label: 'Cửa hàng', value: 'CH' }
];
customerList: any[] = [];
storeList: any[] = [];
referenceOptions: { label: string, value: any }[] = []; 
  isShowReferenceSelect: boolean = false;
  referenceLabel: string = '';
  orgList: any[] = [];
  warehouseList: any[] = [];
  positionList: any[] = [];
  selectedOrg = '';
  loading: boolean = false;
  // Responsive drawer width (can be px or percentage)
  drawerWidth: string | number = '720px';
  private resizeObserver: any;

  constructor(
    private _service: AccountService,
    private fb: NonNullableFormBuilder,
    private dropdownService: DropdownService,
    private route: ActivatedRoute,
    private _sAccountCustomerService: AccountCustomerService,
    private _sAccountStoreService: AccountStoreService,
    private _sCustomer: CustomerService,
    private _sStore: StoreService,
  ) {
    this.validateForm = this.fb.group({
      userName: ['', [Validators.required]],
      password: [''],
      fullName: ['', [Validators.required]],
      address: [''],
      phoneNumber: ['', [Validators.pattern('^[0-9]*$')]],
      email: ['', [Validators.email]],
      organizeCode: [''], // Thêm organizeCode vào form
      isActive: [true],
      accountType: ['KD', [Validators.required]],
      referenceCode: [''],
    });
  }

  ngOnInit(): void {
    this.loadInit();
    this.setAccountType();
    this.getAllOrg();
    this.updateDrawerWidth();
    // listen for resize to update drawer width on the fly
    this.resizeObserver = () => this.updateDrawerWidth();
    window.addEventListener('resize', this.resizeObserver);
    this.validateForm.get('accountType')?.valueChanges.subscribe(val => {
       this.handleAccountTypeChange(val);
    });
    
    // Gọi lần đầu để init trạng thái (ví dụ đang là KD thì ẩn đi)
    const currentType = this.validateForm.get('accountType')?.value;
    this.handleAccountTypeChange(currentType);
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      window.removeEventListener('resize', this.resizeObserver);
    }
  }

  handleAccountTypeChange(type: string) {
    // 1. Reset giá trị cũ của ô chọn
    this.validateForm.get('referenceCode')?.setValue(null); 
    this.referenceOptions = []; // Xóa danh sách cũ

    // 2. Xử lý logic hiển thị và load data
    if (type === 'KH') {
      this.isShowReferenceSelect = true;
      this.referenceLabel = 'Chọn Khách hàng';
      this.getCustomers(); // Gọi hàm lấy khách hàng
    } 
    else if (type === 'CH') {
      this.isShowReferenceSelect = true;
      this.referenceLabel = 'Chọn Cửa hàng';
      this.getStores(); // Gọi hàm lấy cửa hàng
    } 
    else {
      // Nếu là KD, KT... thì ẩn đi
      this.isShowReferenceSelect = false;
      this.validateForm.get('referenceCode')?.clearValidators();
    }
    
    // Cập nhật lại trạng thái validate
    this.validateForm.get('referenceCode')?.updateValueAndValidity();
  }

  getCustomers() {
    // Giả sử service trả về list object
    this._sCustomer.getAll().subscribe(res => {
      
      // Map dữ liệu về dạng chuẩn { label, value } cho dropdown
      this.referenceOptions = res.map((item: any) => ({
      label: item.fullName,     
      value: item.customerCode  
    }));
  });

    
    // Set require cho form control
    this.validateForm.get('referenceCode')?.setValidators([Validators.required]);
  }

  getStores() {
    this._sStore.getAll().subscribe(res => {
      
      this.referenceOptions = res.map((item: any) => ({
        label: item.name,
        value: item.code 
      }));
    });

    // Set require cho form control
    this.validateForm.get('referenceCode')?.setValidators([Validators.required]);
  }

  // ... submitForm logic (xem phần 3)

  // Gọi hàm này trong ngOnInit hoặc bind vào sự kiện (ngModelChange) của dropdown AccountType
onAccountTypeChange(type: string) {
  const refControl = this.validateForm.controls['referenceCode'];
  
  // Reset giá trị cũ
  refControl.setValue('');
  refControl.clearValidators();
  
  this.isShowReferenceSelect = false;

  if (type === 'KH') {
    this.isShowReferenceSelect = true;
    this.referenceLabel = 'Chọn Khách hàng';
    refControl.setValidators([Validators.required]); // Bắt buộc chọn
    this.getCustomers(); // Gọi API lấy list khách hàng
  } 
  else if (type === 'CH') {
    this.isShowReferenceSelect = true;
    this.referenceLabel = 'Chọn Cửa hàng';
    refControl.setValidators([Validators.required]); // Bắt buộc chọn
    this.getStores(); // Gọi API lấy list cửa hàng
  }

  refControl.updateValueAndValidity();
}


  // Set drawer width based on viewport width
  updateDrawerWidth() {
    const w = window.innerWidth;
    // For very small screens use nearly full width, on tablets use 70%, on desktop keep fixed large
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

  loadInit() {
    const organizeCode =
      JSON.parse(localStorage.getItem('companyCode') || 'null') || '';
    const warehouseCode = localStorage.getItem('warehouseCode') || '';
    this.validateForm.patchValue({
      organizeCode: organizeCode,
    });
    if (organizeCode) {
      this.selectedOrg = organizeCode;
    }
  }

  changeSaleType(value: string) {}

  setAccountType() {
  this.accountType = [
    { id: 'KD', name: 'Kinh doanh' },
    { id: 'KH', name: 'Khách hàng' },
    { id: 'KT', name: 'Kế toán' },
    { id: 'CH', name: 'Cửa hàng' }
  ];

  // Set mặc định là KD
  this.validateForm.patchValue({
    accountType: 'KD',
  });
}
  getAllOrg() {
    this.dropdownService.getAllOrg().subscribe({
      next: (data) => {
        this.orgList = data;
      },
      error: (response) => {
        console.log(response);
      },
    });
  }

  submitForm(): void {
    if (this.validateForm.valid) {
      const formValue = this.validateForm.value;
      if (this.avatarBase64 != '' && this.isBase64Image(this.avatarBase64)) {
        formValue.imageBase64 = this.avatarBase64;
      }

      // Log để debug

     this._service.create(formValue).subscribe({
      next: (res) => {
        // Lấy các giá trị cần thiết
        const userName = formValue.userName;
        const refCode = formValue.referenceCode; // Đây là mã KH hoặc mã CH tùy vào dropdown
        const type = formValue.accountType;

        // 2. Logic gọi service phụ
        if (type === 'KH' && refCode) {
            // Mapping: referenceCode chính là customerCode
            const payload = { id:'', userName: userName, customerCode: refCode, isActive: true};
            this._sAccountCustomerService.create(payload).subscribe(/* handle success */);
        } 
        else if (type === 'CH' && refCode) {
            // Mapping: referenceCode chính là storeCode
            const payload = { id:'', userName: userName, storeCode: refCode , isActive: true};
            this._sAccountStoreService.create(payload).subscribe(/* handle success */);
        }
        
        // Reset và đóng form
        this.reset();
        this.closeDrawer();
      },
      error: (err) => console.log(err)
    });
  } else {
    // Validate form
    Object.values(this.validateForm.controls).forEach(control => {
      if (control.invalid) {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      }
    });
  }
}

  isBase64Image(str: string): boolean {
    const dataUriPattern = /^data:image\/(png|jpg|jpeg|gif|bmp|webp);base64,/;
    if (!dataUriPattern.test(str)) return false;
    const base64String = str.split(',')[1];
    if (!base64String || base64String.length % 4 !== 0) return false;
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(base64String);
  }

  closeDrawer() {
    this.close();
    this.resetForm();
    this.clearImage();
  }

  resetForm() {
    this.validateForm.reset();
  }
  clearImage() {
    this.avatarBase64 = '';
    this.fileInput.nativeElement.value = '';
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarBase64 = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
}
