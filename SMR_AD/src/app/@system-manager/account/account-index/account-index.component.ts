import { Component, ViewChild } from '@angular/core';
import { ShareModule } from '../../../shared/share-module';
import { GlobalService } from '../../../service/global.service';
import { DropdownService } from '../../../service/dropdown/dropdown.service';
import { PaginationResult } from '../../../models/base.model';
import { AccountService } from '../../../service/system-manager/account.service';
import { AccountCreateComponent } from '../account-create/account-create.component';
import { AccountFilter } from '../../../models/system-manager/account.model';
import { AccountEditComponent } from '../account-edit/account-edit.component';
import { AccountGroupEditComponent } from '../../account-group/account-group-edit/account-group-edit.component';
import { OrganizeComponent } from '../../organize/organize.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ADMIN_RIGHTS } from '../../../shared/constants';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';

@Component({
  selector: 'app-account-index',
  standalone: true,
  imports: [
    ShareModule,
    // include Organize component so its selector can be used in this template
    // OrganizeComponent is a standalone component located at @system-manager/organize
    AccountCreateComponent,
    AccountEditComponent,
    AccountGroupEditComponent
  ],
  templateUrl: './account-index.component.html',
  styleUrl: './account-index.component.scss',
})
export class AccountIndexComponent {
  filter = new AccountFilter();
  paginationResult = new PaginationResult();
  showCreate: boolean = false;
  showEdit: boolean = false;
  userName: string = '';
  selectedOrgName: string = ''; // Thêm để hiển thị tên tổ chức đã chọn

  listAccountGroup: any[] = [];
  //listPartner: any[] = []
  accountType: any[] = [];
  positionList: any[] = [];
  listStatus: any[] = [
    { id: 'true', name: 'Kích hoạt' },
    { id: 'false', name: 'Khoá' },
  ];

  showEditAcg: boolean = false;
  idDetail: number | string = 0;
  tableScrollY: string | null = null; // let CSS/flex control vertical scroll
  tableScrollX: string | null = '1000px'; // keep horizontal scroll width
  // UserTypeCodes = UserTypeCodes
  // UserTypeCodes = UserTypeCodes

  @ViewChild(AccountEditComponent) accountEditComponent!: AccountEditComponent;
  @ViewChild(AccountGroupEditComponent)
  accountGroupEditComponent!: AccountGroupEditComponent;
  ADMIN_RIGHTS = ADMIN_RIGHTS;
  constructor(
    private dropdownService: DropdownService,
    // private _service: PartnerManagementService,
    private _as: AccountService,
    private globalService: GlobalService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.globalService.setBreadcrumb([
      {
        name: 'Danh sách tài khoản',
        path: 'system-manager/account',
      },
    ]);
  }

  onSelectOrg(orgData: any) {
    // set organizeCode in filter and search
    console.log('Selected organization data:', orgData); // Debug log

    if (orgData && orgData.allCodes && orgData.allCodes.length > 0) {
      // Nối tất cả codes thành một chuỗi, cách nhau bằng dấu phẩy
      const codesString = orgData.allCodes.join(',');
      this.filter = {
        ...this.filter,
        organizeCode: codesString, // Gửi dạng "CODE1,CODE2,CODE3"
        currentPage: 1,
      };
      this.selectedOrgName = orgData.selectedName || orgData.selectedCode || '';
    } else {
      // Fallback cho trường hợp cũ
      const code =
        typeof orgData === 'string' ? orgData : orgData?.selectedCode || '';
      this.filter = {
        ...this.filter,
        organizeCode: code,
        currentPage: 1,
      };
      this.selectedOrgName = orgData?.selectedName || code;
    }

    console.log('Filter after update:', this.filter); // Debug log
    console.log('OrganizeCode being sent:', this.filter.organizeCode); // Debug specific field
    this.search();
  }

  onResetOrg() {
    // Clear organization selection
    this.selectedOrgName = '';
    this.filter = {
      ...this.filter,
      organizeCode: '',
      currentPage: 1,
    };
    this.search();
  }

  ngOnDestroy() {
    this.globalService.setBreadcrumb([]);
    // Remove resize event listener
    window.removeEventListener('resize', () => {
      this.updateTableScrollHeight();
    });
  }

  ngOnInit(): void {
    this.updateTableScrollHeight();
    this.loadInit();

    // Add window resize listener for responsive table height
    window.addEventListener('resize', () => {
      this.updateTableScrollHeight();
    });
  }

  updateTableScrollHeight() {
    if (window.innerWidth <= 768) {
      // Mobile
      this.tableScrollY = null; // Disable vertical table scroll
      this.tableScrollX = '600px'; // Keep horizontal scroll
    } else if (window.innerWidth <= 1024) {
      // Tablet
      this.tableScrollY = null;
      this.tableScrollX = '800px';
    } else {
      // Desktop
      this.tableScrollY = null;
      this.tableScrollX = '1000px';
    }
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['user_name']) {
        this.openEdit(params['user_name']);
      }
      if (params['create_nmtv']) {
        this.openCreate();
      }
    });
  }

  onSortChange(key: string, value: string | null) {
    this.filter = {
      ...this.filter,
      SortColumn: key,
      IsDescending: value === 'descend',
    };
    this.search();
  }

  loadInit() {
    this.getAllAccountGroup();
    this.getAllAccountType();
    this.search();
  }

  openCreate() {
    this.showCreate = true;
  }

  openEdit(userName: string) {
    this.userName = userName;
    this.showEdit = true;
    this.accountEditComponent?.getDetail(this.userName);
    const params = { user_name: userName };
    this.router.navigate(['/system-manager/account'], { queryParams: params });
  }

  close() {
    this.showCreate = false;
    this.showEdit = false;
    this.showEditAcg = false;
    this.loadInit();
    // this.router.navigate([], {
    //   queryParams: {},
    // });
  }

  // getUserTypeText(type: string) {
  //   if (type === 'KH') return 'Khách hàng'
  //   else if (type === 'NM') return 'Nhà máy'
  //   else if (type === 'LX') return 'Lái xe'
  //   else if (type === 'NM_TV') return 'Nhân viên thương vụ'
  //   return ''
  // }

  search() {
    console.log('Starting search with filter:', this.filter);
    this._as
      .search({
        ...this.filter,
      })
      .subscribe({
        next: (data) => {
          console.log('Search results received:', data);
          this.paginationResult = data;
        },
        error: (response) => {
          console.error('Search error:', response);
        },
      });
  }
  getAllAccountGroup() {
    this.dropdownService.getAllAccountGroup().subscribe({
      next: (data) => {
        this.listAccountGroup = data;
      },
      error: (response) => {
        console.log(response);
      },
    });
  }

  getAllAccountType() {
    this.dropdownService.getAllAccountType().subscribe({
      next: (data) => {
        this.accountType = data;
      },
      error: (response) => {
        console.log(response);
      },
    });
  }

  getAccountTypeNameById(id: string | number): string {
    const accountType = this.accountType.find((item) => item.id === id);
    return accountType ? accountType.name : 'N/A';
  }

  getPositionCodeNameById(positionCode: string | number): string {
    const positionName = this.positionList.find(
      (item) => item.code === positionCode
    );
    return positionName ? positionName.name : 'N/A';
  }

  reset() {
    this.filter = new AccountFilter();
    this.loadInit();
  }

  pageSizeChange(size: number): void {
    this.filter.currentPage = 1;
    this.filter.pageSize = size;
    this.loadInit();
  }

  pageIndexChange(index: number): void {
    this.filter.currentPage = index;
    this.loadInit();
  }

  // Methods for shared pagination component
  onPageChange(page: number): void {
    this.pageIndexChange(page);
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSizeChange(pageSize);
  }

  handleAccountGroup(id: number | string) {
    this.idDetail = id;
    this.showEditAcg = true;
    this.accountGroupEditComponent.loadDetail(this.idDetail);
  }
}
