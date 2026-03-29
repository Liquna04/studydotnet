import { Component, ViewChild } from '@angular/core';
import { ShareModule } from '../../../shared/share-module';
import { AccountGroupFilter } from '../../../models/system-manager/account-group.model';
import { GlobalService } from '../../../service/global.service';
import { AccountGroupService } from '../../../service/system-manager/account-group.service';
import { PaginationResult } from '../../../models/base.model';
import { AccountGroupCreateComponent } from '../account-group-create/account-group-create.component';
import { AccountGroupEditComponent } from '../account-group-edit/account-group-edit.component';
import { ADMIN_RIGHTS } from '../../../shared/constants';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';

@Component({
  selector: 'app-account-group-index',
  standalone: true,
  imports: [
    ShareModule,
    AccountGroupCreateComponent,
    AccountGroupEditComponent
  ],
  templateUrl: './account-group-index.component.html',
  styleUrl: './account-group-index.component.scss',
})
export class AccountGroupIndexComponent {
  @ViewChild(AccountGroupEditComponent)
  accountGroupEditComponent!: AccountGroupEditComponent;

  filter = new AccountGroupFilter();
  paginationResult = new PaginationResult();
  tableScrollY: string | null = null;
  tableScrollX: string | null = '100%';
  private resizeHandler = () => this.updateTableScrollHeight();
  showCreate: boolean = false;
  showEdit: boolean = false;
  idDetail: number | string = 0;
  loading: boolean = false;
  ADMIN_RIGHTS = ADMIN_RIGHTS;
  constructor(
    private _service: AccountGroupService,
    private globalService: GlobalService
  ) {
    this.globalService.setBreadcrumb([
      {
        name: 'Danh sách nhóm tài khoản',
        path: 'system-manager/account-group',
      },
    ]);
    this.globalService.getLoading().subscribe((value) => {
      this.loading = value;
    });
  }

  ngOnDestroy() {
    this.globalService.setBreadcrumb([]);
    // remove resize listener if added
    try {
      window.removeEventListener('resize', this.resizeHandler);
    } catch (e) {
      // ignore
    }
  }

  ngOnInit(): void {
    this.loadInit();
    // setup responsive table scroll sizing
    this.updateTableScrollHeight();
    window.addEventListener('resize', this.resizeHandler);
  }

  loadInit() {
    this.search();
  }

  openCreate() {
    this.showCreate = true;
  }

  onSortChange(name: string, value: any) {
    this.filter = {
      ...this.filter,
      SortColumn: name,
      IsDescending: value === 'descend',
    };
    this.search();
  }
  openEdit(id: number | string) {
    this.idDetail = id;
    this.showEdit = true;
    this.accountGroupEditComponent.loadDetail(this.idDetail);
  }

  close() {
    this.showCreate = false;
    this.showEdit = false;
  }

  search() {
    this._service.search(this.filter).subscribe({
      next: (data) => {
        this.paginationResult = data;
      },
      error: (response) => {
        console.log(response);
      },
    });
  }

  updateTableScrollHeight() {
    if (window.innerWidth <= 768) {
      // Mobile
      this.tableScrollY = null; // disable vertical scroll
      this.tableScrollX = '600px';
    } else if (window.innerWidth <= 1024) {
      // Tablet
      this.tableScrollY = null;
      this.tableScrollX = '800px';
    } else {
      // Desktop
      this.tableScrollY = null;
      this.tableScrollX = '100%';
    }
  }

  exportExcel() {}

  reset() {
    this.filter = new AccountGroupFilter();
    this.loadInit();
  }

  pageSizeChange(size: number): void {
    this.filter.currentPage = 1;
    this.filter.pageSize = size;
    this.search();
  }

  pageIndexChange(index: number): void {
    this.filter.currentPage = index;
    this.search();
  }

  // Wrapper methods for shared pagination component
  onPageChange(page: number): void {
    this.pageIndexChange(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSizeChange(size);
  }

  deleteItem(id: string | number) {
    this._service.delete(id).subscribe({
      next: (data) => {
        this.search();
      },
      error: (response) => {
        console.log(response);
      },
    });
  }
}
