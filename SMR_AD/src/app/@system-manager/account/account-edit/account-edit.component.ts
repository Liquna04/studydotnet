import {
  Component,
  Input,
  HostListener,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { ShareModule } from '../../../shared/share-module';
import { FormGroup, Validators, NonNullableFormBuilder } from '@angular/forms';
import { DropdownService } from '../../../service/dropdown/dropdown.service';
import { AccountService } from '../../../service/system-manager/account.service';
import { RightService } from '../../../service/system-manager/right.service';
import { NzFormatEmitEvent, NzTreeNode } from 'ng-zorro-antd/tree';
import { UserTypeCodes } from '../../../shared/constants/account.constants';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../service/auth.service';
import { GlobalService } from '../../../service/global.service';
import { AccountGroupService } from '../../../service/system-manager/account-group.service';
import { environment } from '../../../../environments/environment';
import { AccountCustomerService } from '../../../service/master-data/account-customer.service';
import { AccountStoreService } from '../../../service/master-data/account-store.service';
import { StoreService } from '../../../service/master-data/store.service';
import { CustomerService } from '../../../service/master-data/customer.service';

@Component({
  selector: 'app-account-edit',
  standalone: true,
  imports: [ShareModule],
  templateUrl: './account-edit.component.html',
  styleUrl: './account-edit.component.scss',
})
export class AccountEditComponent {
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.widthDeault =
      window.innerWidth <= 767
        ? `${window.innerWidth}px`
        : `${window.innerWidth * 0.7}px`;
  }

  // drawer width responsive (match create behavior)
  drawerWidth: string | number = '720px';
  private _resizeListener: any;
  // flag to indicate small screens (<=768)
  isSmall: boolean = false;

  @Input() reset: () => void = () => {};
  @Input() visible: boolean = false;
  @Input() close: () => void = () => {};
  @Input() userName: string | number = '';
  @ViewChild('fileInput') fileInput!: ElementRef;

  optionsGroup: any[] = [];
  widthDeault: string = '0px';
  heightDeault: number = 0;

  validateForm: FormGroup;
  currentLinkId: string = '';
  nodes: any[] = [];
  nodesConstant: any[] = [];
  initialCheckedNodes: any[] = [];
  searchValue = '';
 referenceOptions: { label: string, value: any }[] = [];
  isShowReferenceSelect: boolean = false;
  referenceLabel: string = '';
  accountType: any[] = [];
  orgList: any[] = [];
  warehouseList: any[] = [];
  positionList: any[] = [];
  selectedOrg = '';
accountTypeOptions = [
  { label: 'Kinh doanh', value: 'KD' },
  { label: 'Khách hàng', value: 'KH' },
  { label: 'Kế toán', value: 'KT' },
  { label: 'Cửa hàng', value: 'CH' }
];
  avatarBase64: string = '';

  constructor(
    private _service: AccountService,
    private fb: NonNullableFormBuilder,
    private dropdownService: DropdownService,
    private rightService: RightService,
    private accountGroupService: AccountGroupService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private globalService: GlobalService,
    private _sAccountCustomer: AccountCustomerService,
    private _sAccountStore: AccountStoreService,
    private _sStore: StoreService,
    private _sCustomer: CustomerService
  ) {
    this.validateForm = this.fb.group({
      userName: ['', [Validators.required]],
      fullName: ['', [Validators.required]],
      address: [''],
      phoneNumber: ['', [Validators.pattern('^0\\d{8,9}$')]],
      email: ['', [Validators.email]],
      isActive: [true],
      accountType: ['', [Validators.required]],
      urlImage: [''],
      referenceCode: [''],
    });
    this.widthDeault =
      window.innerWidth <= 767
        ? `${window.innerWidth}px`
        : `${window.innerWidth * 0.7}px`;
    this.heightDeault = window.innerHeight - 200;
  }

  ngOnInit(): void {
    this.loadInit();
    this.selectedOrg = this.validateForm.getRawValue().organizeCode;
    this.updateDrawerWidth();
    this._resizeListener = () => this.updateDrawerWidth();
    window.addEventListener('resize', this._resizeListener);
    // set initial isSmall
    this.isSmall = window.innerWidth <= 768;
    this.validateForm.get('accountType')?.valueChanges.subscribe(val => {
       // Chỉ reset referenceCode khi người dùng thay đổi thủ công (form dirty)
       // Để tránh reset khi mới load dữ liệu detail
       if (this.validateForm.get('accountType')?.dirty) {
           this.handleAccountTypeChange(val);
       }
    });
  
  }
  ngOnDestroy(): void {
    if (this._resizeListener) {
      window.removeEventListener('resize', this._resizeListener);
    }
  }

  updateDrawerWidth() {
    const w = window.innerWidth;
    this.isSmall = w <= 768;
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
   this.getRight();
    this.getAllOrg();
  }

  handleAccountTypeChange(type: string, preselectedValue: any = null) {
    this.referenceOptions = [];
    this.validateForm.get('referenceCode')?.setValue(null);
    this.validateForm.get('referenceCode')?.clearValidators();
    this.isShowReferenceSelect = false;

    if (type === 'KH') {
      this.isShowReferenceSelect = true;
      this.referenceLabel = 'Chọn Khách hàng';
      this.getCustomers(preselectedValue); // Truyền giá trị cũ vào để bind
    } 
    else if (type === 'CH') {
      this.isShowReferenceSelect = true;
      this.referenceLabel = 'Chọn Cửa hàng';
      this.getStores(preselectedValue);
    } 
    else {
      this.validateForm.get('referenceCode')?.updateValueAndValidity();
    }
  }

  getCustomers(preselectedValue: any = null) {
    this._sCustomer.getAll().subscribe(res => {
      const data = Array.isArray(res) ? res : res.data;
      this.referenceOptions = data.map((item: any) => ({
        label:item.fullName, // Check đúng trường name
        value:item.customerCode  // Check đúng trường code
      }));
      
      this.validateForm.get('referenceCode')?.setValidators([Validators.required]);
      
      // Nếu có giá trị cũ (khi edit), set lại vào form
      if (preselectedValue) {
        this.validateForm.get('referenceCode')?.setValue(preselectedValue);
      }
      this.validateForm.get('referenceCode')?.updateValueAndValidity();
    });
  }

  getStores(preselectedValue: any = null) {
    this._sStore.getAll().subscribe(res => {
      const data = Array.isArray(res) ? res : res.data;
      this.referenceOptions = data.map((item: any) => ({
        label:item.name,
        value:item.code
      }));

      this.validateForm.get('referenceCode')?.setValidators([Validators.required]);

      if (preselectedValue) {
        this.validateForm.get('referenceCode')?.setValue(preselectedValue);
      }
      this.validateForm.get('referenceCode')?.updateValueAndValidity();
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

  changeSaleType(value: string) {}

  getRight() {
    this.rightService.GetRightTree().subscribe((res) => {
      this.nodes = this.mapTreeNodes(res);
    });
  }

  mapTreeNodes(data: any): any[] {
    return data.children
      ? data.children.map((node: any) => ({
          title: node.id + '-' + node.name,
          key: node.id,
          checked: node.isChecked,
          expanded: true,
          children: this.mapTreeNodes(node),
          origin: {
            // Add this line
            InChecked: false, // Initialize with a default value
            OutChecked: false, // Initialize with a default value
          },
        }))
      : [];
  }

  onCheckBoxChange(event: any): void {
    const checkedNode = event.node;
    const nodes = this.flattenKeys(this.nodesConstant);

    if (checkedNode.isChecked) {
      if (nodes.includes(checkedNode.key)) {
        checkedNode.origin.InChecked = false;
        checkedNode.origin.OutChecked = false;
      } else {
        checkedNode.origin.InChecked = true;
      }
      // Thêm logic mới: check parents và children
      this.checkParents(checkedNode);
      this.checkChildren(checkedNode);
    } else {
      if (nodes.includes(checkedNode.key)) {
        checkedNode.origin.OutChecked = true;
        checkedNode.origin.InChecked = false;
      } else {
        checkedNode.origin.OutChecked = false;
        checkedNode.origin.InChecked = false;
      }
      // Thêm logic mới: uncheck children
      this.uncheckChildren(checkedNode);
    }
  }

  flattenKeys(data: any) {
    return data.reduce((keys: any, item: any) => {
      if (item.checked) {
        keys.push(item.key);
      }
      if (item.children && item.children.length > 0) {
        keys.push(...this.flattenKeys(item.children));
      }
      return keys;
    }, []);
  }

  private checkParents(node: NzTreeNode): void {
    const parentNode = node.parentNode;
    if (parentNode) {
      parentNode.isChecked = true;
      this.checkParents(parentNode);
    }
  }

  private checkChildren(node: NzTreeNode): void {
    if (node.children) {
      node.children.forEach((child) => {
        child.isChecked = true;

        this.checkChildren(child);
      });
    }
  }

  private uncheckChildren(node: NzTreeNode): void {
    if (node.children) {
      node.children.forEach((child) => {
        child.isChecked = false;

        this.uncheckChildren(child);
      });
    }
  }

  onNodeCheckChange(node: any): void {
    node.checked = !node.checked;
  }

  getCheckedNodes(nodes: any[]): any[] {
    let checkedNodes: any[] = [];
    for (let node of nodes) {
      if (node.checked) {
        checkedNodes.push(node);
      }
      if (node.children) {
        checkedNodes = checkedNodes.concat(this.getCheckedNodes(node.children));
      }
    }
    return checkedNodes;
  }

  nzEvent(event: NzFormatEmitEvent): void {}

  getAllGroup(listGroup: any = []) {
    this.dropdownService.getAllAccountGroup().subscribe({
      next: (data) => {
        this.optionsGroup = data.map((item: any) => {
          return {
            ...item,
            title: item?.name,
            direction: listGroup.some(
              (group: any) => group?.groupId === item?.id
            )
              ? 'right'
              : 'left',
          };
        });
      },
      error: (response) => {
        console.log(response);
      },
    });
  }

getDetail(userName: string = '') {
  this._service.getDetail({ userName: userName }).subscribe({
    next: (data) => {
      // 1. Fill thông tin cơ bản
      this.getAllGroup(data?.account_AccountGroups);
      this.validateForm.patchValue({
        userName: data.userName,
        fullName: data.fullName,
        address: data.address,
        phoneNumber: data.phoneNumber,
        email: data.email,
        isActive: data.isActive,
        accountType: data.accountType,
        urlImage: data.urlImage,
      });

      this.avatarBase64 = environment.urlFiles + data.urlImage;
      this.initialCheckedNodes = data?.listAccountGroupRight?.map((node: any) => node.rightId);
      this.nodes = this.mapTreeNodes(data.treeRight);
      this.nodesConstant = [...this.mapTreeNodes(data.treeRight)];
      this.loadGroupRights(data.account_AccountGroups);

      // 2. XỬ LÝ LẤY MÃ LIÊN KẾT
      const type = data.accountType;
      
      const triggerHandle = (code: any) => {
       
          this.handleAccountTypeChange(type, code);
      };

      if (type === 'KH') {
          // Xử lý Khách hàng
          if (data.customerCode) {
              triggerHandle(data.customerCode);
          } else {
              this._sAccountCustomer.GetByUserName(userName).subscribe({
                  next: (res) => {
                     
                      
                      // Logic lấy code an toàn: Check cả Mảng và Object
                      let finalCode = null;
                      const rawData = Array.isArray(res) ? res[0] : (res?.data || res);
                      this.currentLinkId = rawData?.id || '';
                      
                      if (rawData) {
                          // Thử các tên trường có thể xảy ra
                          finalCode = rawData.customerCode || rawData.CustomerCode || rawData.code;
                      }
                      
                      triggerHandle(finalCode);
                  },
                  error: (err) => {
                    this.currentLinkId = '';
                      console.error(err);
                      triggerHandle(null);
                  }
              });
          }
      } 
      else if (type === 'CH') {
          // Xử lý Cửa hàng
           if (data.storeCode) {
              triggerHandle(data.storeCode);
          } else {
              this._sAccountStore.GetByUserName(userName).subscribe({
                  next: (res) => {
                 
                      
                      // Logic lấy code an toàn
                      let finalCode = null;
                      const rawData = Array.isArray(res) ? res[0] : (res?.data || res);
                      this.currentLinkId = rawData?.id || '';
                      if (rawData) {
                          // Thử các tên trường có thể xảy ra: storeCode, StoreCode, code, storeId
                          finalCode = rawData.storeCode || rawData.StoreCode || rawData.code || rawData.storeId;
                      }

                      triggerHandle(finalCode);
                  },
                  error: (err) => {
                    this.currentLinkId = '';
                      console.error(err);
                      triggerHandle(null);
                  }
              });
          }
      } 
      else {
          triggerHandle(null);
      }
    },
    error: (response) => {
      console.log(response);
    },
  });
}
  loadGroupRights(accountGroups: any[]) {
    const groupIds = accountGroups.map((group) => group.groupId);

    // Fetch rights for all groups
    Promise.all(
      groupIds.map((id) => this.accountGroupService.GetDetail(id).toPromise())
    )
      .then((groups) => {
        let allGroupRights: string[] = [];
        groups.forEach((group) => {
          if (group && group.listAccountGroupRight) {
            allGroupRights = [
              ...allGroupRights,
              ...group.listAccountGroupRight.map(
                (right: { rightId: any }) => right.rightId
              ),
            ];
          }
        });

        // Remove duplicates
        allGroupRights = [...new Set(allGroupRights)];

        // Update the tree with these rights
        this.updateTreeWithGroupRights(allGroupRights);
      })
      .catch((error) => {
        console.error('Error loading group rights:', error);
      });
  }

  updateTreeWithGroupRights(groupRights: string[]) {
    const updateNode = (node: any) => {
      if (groupRights.includes(node.key)) {
        node.checked = true;
        node.origin.InChecked = true; // This line is causing the error
        this.checkParents(node);
      }
      if (node.children) {
        node.children.forEach(updateNode);
      }
    };

    this.nodes.forEach(updateNode);
    this.nodesConstant = JSON.parse(JSON.stringify(this.nodes));
  }
  // onUserTypeChange(value: string) {
  //   let partnerIdControl = this.validateForm.get('partnerId')
  //   if (value === 'KH') {
  //     this.isShowSelectPartner = true
  //     partnerIdControl!.setValidators([Validators.required])
  //   } else {
  //     this.isShowSelectPartner = false
  //     partnerIdControl!.setValidators([])
  //   }
  //   partnerIdControl!.updateValueAndValidity()
  // }



  // submitForm(): void {
  //   const listAccountGroupRight = this.getCheckedNodes(this.nodes).map(
  //     (element: any) => ({
  //       rightId: element.key,
  //     })
  //   );
  //   const account_AccountGroups = this.optionsGroup?.reduce(
  //     (result: any, item: any) => {
  //       if (item?.direction == 'right') {
  //         return [
  //           ...result,
  //           {
  //             groupId: item?.id,
  //           },
  //         ];
  //       }
  //       return result;
  //     },
  //     []
  //   );
  //   if (this.validateForm.valid) {
  //     const formValue = this.validateForm.value;

  //     if (this.avatarBase64 != '' && this.isBase64Image(this.avatarBase64)) {
  //       formValue.imageBase64 = this.avatarBase64;
  //     }

  //     this._service
  //       .update({
  //         ...formValue,
  //         accountRights: listAccountGroupRight,
  //         account_AccountGroups,
  //       })
  //       .subscribe({
  //         next: (data) => {
  //           if (this.globalService.getUserInfo().userName) {
  //             this.authService
  //               .getRightOfUser({
  //                 userName: this.globalService.getUserInfo().userName,
  //               })
  //               .subscribe({
  //                 next: (rights) => {
  //                   this.globalService.setRightData(
  //                     JSON.stringify(rights || [])
  //                   );
  //                 },
  //                 error: (error) => {
  //                   console.error('Get right of user failed:', error);
  //                   console.log('formValue', formValue);
  //                   console.log('accountRights', listAccountGroupRight);
  //                   console.log('account_AccountGroups', account_AccountGroups);
  //                 },
  //               });
  //           }
  //           this.reset();
  //         },
  //         error: (response) => {
  //           console.log(response);
  //         },
  //       });
  //   } else {
  //     Object.values(this.validateForm.controls).forEach((control) => {
  //       if (control.invalid) {
  //         control.markAsDirty();
  //         control.updateValueAndValidity({ onlySelf: true });
  //       }
  //     });
  //   }
  // }
submitForm(): void {
  // 1. Chuẩn bị dữ liệu Quyền và Nhóm (Logic cũ)
  const listAccountGroupRight = this.getCheckedNodes(this.nodes).map(
    (element: any) => ({
      rightId: element.key,
    })
  );
  
  const account_AccountGroups = this.optionsGroup?.reduce(
    (result: any, item: any) => {
      if (item?.direction == 'right') {
        return [
          ...result,
          {
            groupId: item?.id,
          },
        ];
      }
      return result;
    },
    []
  );

  // 2. Kiểm tra Validate Form
  if (this.validateForm.valid) {
    const formValue = this.validateForm.value;

    // Xử lý ảnh (Logic cũ)
    if (this.avatarBase64 != '' && this.isBase64Image(this.avatarBase64)) {
      formValue.imageBase64 = this.avatarBase64;
    }

    // 3. Gọi API Update chính (Tài khoản)
    this._service
      .update({
        ...formValue,
        accountRights: listAccountGroupRight,
        account_AccountGroups,
      })
      .subscribe({
        next: (data) => {
          
          // =================================================================
          // PHẦN MỚI THÊM VÀO: GỌI API LƯU LIÊN KẾT KHÁCH HÀNG / CỬA HÀNG
          // =================================================================
          const type = formValue.accountType;
          const refCode = formValue.referenceCode; // Mã KH hoặc Mã Cửa hàng lấy từ form
          const userName = formValue.userName; // Tên tài khoản

          // Nếu là Khách hàng (KH) và có chọn mã -> Gọi API lưu liên kết
          if (type === 'KH' && refCode) {
            // Nếu đã có ID (tức là sửa liên kết cũ) -> Gọi UPDATE
            if (this.currentLinkId) {
                const payload = { 
                    id: this.currentLinkId, // <--- Dùng biến này 
                    userName: userName, 
                    customerCode: refCode, 
                    isActive: true 
                };
                this._sAccountCustomer.update(payload).subscribe();
            } 
            // Nếu chưa có ID (tức là trước đây chưa liên kết, giờ mới chọn) -> Gọi CREATE
            else {
                const payload = {id:'', userName: userName, customerCode: refCode,isActive: true, };
                this._sAccountCustomer.create(payload).subscribe();
            }
          }
          else if (type === 'CH' && refCode) {
            // Tương tự cho Cửa hàng
            if (this.currentLinkId) {
                const payload = { 
                    id: this.currentLinkId, // <--- Dùng biến này
                    userName: userName, 
                    storeCode: refCode, 
                    isActive: true 
                };
                this._sAccountStore.update(payload).subscribe();
            } else {
                const payload = {id:'', userName: userName, storeCode: refCode , isActive:true, };
                this._sAccountStore.create(payload).subscribe();
            }
          }
          // =================================================================


          // 4. Làm mới quyền người dùng (Logic cũ - giữ nguyên)
          if (this.globalService.getUserInfo().userName) {
            this.authService
              .getRightOfUser({
                userName: this.globalService.getUserInfo().userName,
              })
              .subscribe({
                next: (rights) => {
                  this.globalService.setRightData(
                    JSON.stringify(rights || [])
                  );
                },
                error: (error) => {
                  console.error('Get right of user failed:', error);
                },
              });
          }
          
          // 5. Reset form và đóng Drawer
          this.reset();
          this.closeDrawer(); 
        },
        error: (response) => {
          console.log(response);
        },
      });
  } else {
    // Xử lý khi Form không hợp lệ (Logic cũ)
    Object.values(this.validateForm.controls).forEach((control) => {
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

  onDrop(event: any): void {
    // Handle drop event
  }

  onClick(event: any): void {}

  closeDrawer() {
    this.close();
    this.resetForm();
    this.clearImage();
  }

  resetForm() {
    this.validateForm.reset();
  }

  resetPassword() {
    this._service.resetPassword(this.userName).subscribe({
      next: (data) => {},
    });
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
