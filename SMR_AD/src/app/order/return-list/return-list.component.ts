import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { PaginationResult, BaseFilter } from '../../models/base.model';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { FormsModule } from '@angular/forms';
import { GlobalService } from '../../service/global.service';
import { ReturnService, ReturnOrder } from '../../service/return.service';
import { TransportVehicleService } from '../../service/master-data/transport-vehicle.service';
import { forkJoin } from 'rxjs';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { StoreService } from '../../service/master-data/store.service';
interface TransportVehicles {
  code: string;
  name: string;
}
@Component({
  selector: 'app-return-list',
  standalone: true,
  imports: [
    CommonModule,
    NzTableModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzTabsModule,
    NzTagModule,
    NzPageHeaderModule,
    NzSpaceModule,
    NzPaginationModule,
    NzMessageModule,
    NzModalModule,
    FormsModule,
    NzSelectModule,
  ],
  templateUrl: './return-list.component.html',
  styleUrls: ['./return-list.component.scss'],
})
export class ReturnListComponent implements OnInit {
  isKH = false;
  isKD = false;
  isCH = false;
  storeMap: Map<string, string> = new Map();
  paginationResult = new PaginationResult();
  filter = new BaseFilter();
  selectedStatusFilters: string[] = [];
  selectedCustomerFilters: string[] = [];
  selectedVehicleFilters: string[] = [];
  searchText: string = '';
  returnList: ReturnOrder[] = [];
  selectedReturns: ReturnOrder[] = [];
  transportVehicles: TransportVehicles[] = [];
  allChecked = false;
  indeterminate = false;
  viewMode: 'STORE' | 'CUSTOMER' = 'STORE';
  // Pagination properties
  currentPage = 1;
  pageSize = 50;
  total = 0;
  paginatedReturnList: ReturnOrder[] = [];
  // Sample fallback data for UI while rebuilding
  returnListData: any[] = [];

  get itemsToShow(): any[] {
    return this.paginatedReturnList && this.paginatedReturnList.length
      ? this.paginatedReturnList
      : this.returnListData;
  }
  get currentAccountType(): string {
    if (this.isKD) return 'KD';
    if (this.isKH) return 'KH';
    if(this.isCH) return 'CH';
    return '';
  }
  constructor(
    private _sTransportVehicle: TransportVehicleService,
    private globalService: GlobalService,
    private router: Router,
    private message: NzMessageService,
    private modal: NzModalService,
    private _sStore: StoreService,
    private returnService: ReturnService
  ) {}

  ngOnInit(): void {
    this.globalService.setBreadcrumb([
      { name: 'Danh sách đơn trả hàng', path: '/order/return-list' },
    ]);

    this.loadUserInfo();
    this.loadAllStores();
    this.loadReturnData();
    this.loadTransportVehicle();
  }
  private loadAllStores(): void {
    this._sStore.search({ currentPage: 1, pageSize: 1000 }).subscribe({
      next: (res) => {
        if (res.data) {
          res.data.forEach((store: any) => {
            if (store.code) {
              this.storeMap.set(store.code, store.name);
            }
          });
        }
      },
      error: (err) => console.error('Không tải được danh sách cửa hàng:', err)
    });
  }
  private loadTransportVehicle(): void {
    // Load transport types
    this.returnService.getTransportVehicles().subscribe({
      next: (data) => {
        this.transportVehicles = data.map((item: any) => ({
          name: item.name,
          code: item.code,
        }));
      },
      error: (err) => {
        console.error('Lỗi khi tải loại hình vận tải:', err);
        this.message.error('Không thể tải danh sách loại hình vận tải!');
      },
    });
  }
  private loadReturnData(): void {
    this.returnService.getReturns().subscribe({
      next: (returns) => {
        this.returnList = returns;
        this.total = this.returnList.length;
        this.updatePaginatedData();
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách đơn trả hàng:', err);
        this.returnList = [];
        this.message.error('Không thể tải danh sách đơn trả hàng');
      },
    });
  }

  private loadUserInfo(): void {
    const userInfoRaw = localStorage.getItem('UserInfo');
    if (userInfoRaw) {
      try {
        const userInfo = JSON.parse(userInfoRaw);
        const accountType = userInfo.accountType;
        this.isKH = accountType === 'KH';
        this.isKD = accountType === 'KD';
        this.isCH = accountType === 'CH';
        if (this.isKH) {
          this.viewMode = 'CUSTOMER';
        }
      } catch (error) {
        console.error('❌ Lỗi parse UserInfo:', error);
      }
    }
  }
  getVehicleName(vehicleCode: string): string {
    if (!vehicleCode) return '-';
    const vehicle = this.transportVehicles.find((v) => v.code === vehicleCode);
    return vehicle ? vehicle.code : vehicleCode;
  }
  formatDate(dateString: string): string {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString; // Fallback trả về giá trị gốc nếu lỗi
    }
  }
 onViewModeChange(mode: 'CUSTOMER' | 'STORE'): void {
    this.viewMode = mode;
    
    // Reset về trang 1 khi chuyển tab
    this.currentPage = 1; 

    // (Tuỳ chọn) Reset các bộ lọc phụ để tránh nhầm lẫn dữ liệu giữa 2 tab
    this.selectedStatusFilters = [];
    this.selectedCustomerFilters = [];
    this.selectedVehicleFilters = [];
    
    this.updatePaginatedData();
  }
 updatePaginatedData(): void {
    let filteredList = this.returnList;

    // 1. Lọc theo View Mode (Chỉ áp dụng nếu KHÔNG phải là Khách Hàng)
    // Vì Khách hàng chỉ nhìn thấy đơn của chính họ, không cần chia tab
    if (!this.isKH) {
        if (this.viewMode === 'CUSTOMER') {
            // ✅ Tab Đơn khách hàng: Lấy các đơn CÓ mã khách hàng
            filteredList = filteredList.filter(item => 
                item.customerCode && item.customerCode.trim() !== ''
            );
        } else {
            // ✅ Tab Đơn cửa hàng (Nội bộ): Lấy các đơn KHÔNG CÓ mã khách hàng
            // (Bất kể có storeCode hay không, nếu không có khách thì là đơn nội bộ)
            filteredList = filteredList.filter(item => 
                !item.customerCode || item.customerCode.trim() === ''
            );
        }
    }

    // 2. Lọc theo Status
    if (this.selectedStatusFilters.length > 0) {
        filteredList = filteredList.filter(item => this.selectedStatusFilters.includes(item.status));
    }

    // 3. Lọc theo Customer (Dropdown filter) - Dựa trên tên
    if (this.selectedCustomerFilters.length > 0) {
        filteredList = filteredList.filter(item => this.selectedCustomerFilters.includes(item.customerName));
    }

    // 4. Lọc theo Vehicle - Dựa trên mã phương tiện
    if (this.selectedVehicleFilters.length > 0) {
        filteredList = filteredList.filter(item => this.selectedVehicleFilters.includes(item.vehicleCode));
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    this.paginatedReturnList = filteredList.slice(startIndex, endIndex);
    
    // Cập nhật total dựa trên list đã lọc (quan trọng để phân trang đúng)
    this.total = filteredList.length; 
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedData();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.updatePaginatedData();
  }
  onSearch(): void {
    debugger;
    this.filter.pageSize = this.pageSize;

    this.returnService.search(this.filter).subscribe({
      next: (data) => {
        this.returnList = data;
        this.total = data.length; // vì service trả về array, không có totalRecord
        this.currentPage = 1;
        this.updatePaginatedData();
      },
      error: (err) => {
        console.error('Search error:', err);
        this.returnList = [];
        this.total = 0;
        this.updatePaginatedData();
      },
    });
  }

  onReset(): void {
    this.filter.keyWord = '';
    this.onSearch();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Khởi tạo':
        return 'red';
      case 'Chờ phê duyệt':
        return 'orange';
      case 'Đã phê duyệt':
        return 'green';
      case 'Từ chối':
        return 'red';
      case 'Hủy yêu cầu':
        return 'red';
      case 'Trả hàng thành công':
        return 'blue';
      default:
        return 'default';
    }
  }

  getReturnReasonText(returnReason: string): string {
    const reasonMap: { [key: string]: string } = {
      defective: 'Hàng bị lỗi',
      wrong_order: 'Sai đơn',
      wrong_spec: 'Không đúng quy cách',
      expired: 'Quá hạn sử dụng',
      damaged: 'Hư hỏng',
      other: 'Lý do khác',
    };
    return reasonMap[returnReason];
  }

  onCreateNew(): void {
    this.router.navigate(['/order/return-create']);
  }

  onBack(): void {
    this.router.navigate(['/home']);
  }

  onSendReturn(): void {
    if (this.isKD) {
      this.message.error('Bạn không có quyền gửi đơn trả hàng');
      return;
    }

    if (this.selectedReturns.length === 0) {
      this.message.warning('Vui lòng chọn ít nhất một đơn trả hàng để gửi đi');
      return;
    }

    const cancellableReturns = this.selectedReturns.filter(
      (returnOrder) => returnOrder.status === 'Khởi tạo'
    );

    if (cancellableReturns.length === 0) {
      this.message.error(
        'Chỉ có thể gửi các đơn trả hàng có trạng thái "Khởi tạo"'
      );
      return;
    }

    if (confirm('Bạn có chắc chắn muốn gửi đơn hàng này?')) {
      const returnCodes = cancellableReturns.map((r) => r.code);

      const submitRequests = returnCodes.map((code) =>
        this.returnService.submitReturn(code)
      );

      forkJoin(submitRequests).subscribe({
        next: (responses) => {
          this.message.success('Gửi đơn trả hàng thành công!');
          this.loadReturnData();
          this.selectedReturns = [];
          this.updateAllCheckedStatus();
        },
        error: (err) => {
          console.error('Lỗi khi gửi đơn trả hàng:', err);
          this.message.error('Không thể gửi đơn trả hàng. Vui lòng thử lại!');
        },
      });
    }
  }

  onApproveReturn(): void {
     if (!this.isKD) {
      this.message.error('Bạn không có quyền phê duyệt đơn trả hàng');
      return;
    }

    if (this.selectedReturns.length === 0) {
      this.message.warning('Vui lòng chọn ít nhất một đơn trả hàng để phê duyệt');
      return;
    }

    const approveableReturns = this.selectedReturns.filter(
      (returnOrder) => returnOrder.status === 'Chờ phê duyệt'
    );

    if (approveableReturns.length === 0) {
      this.message.error(
        'Chỉ có thể gửi các đơn trả hàng có trạng thái "Chờ phê duyệt"'
      );
      return;
    }

    if (confirm('Bạn có chắc chắn muốn phê duyệt đơn hàng này?')) {
      const returnCodes = approveableReturns.map((r) => r.code);

      const submitRequests = returnCodes.map((code) =>
        this.returnService.approveReturn(code)
      );

      forkJoin(submitRequests).subscribe({
        next: (responses) => {
          this.message.success('Phê duyệt đơn trả hàng thành công!');
          this.loadReturnData();
          this.selectedReturns = [];
          this.updateAllCheckedStatus();
        },
        error: (err) => {
          console.error('Lỗi khi phê duyệt đơn trả hàng:', err);
          this.message.error('Không thể phê duyệt đơn trả hàng. Vui lòng thử lại!');
        },
      });
    }
  }
    onRejectReturn(): void {
     if (!this.isKD) {
      this.message.error('Bạn không có quyền từ chối đơn trả hàng');
      return;
    }

    if (this.selectedReturns.length === 0) {
      this.message.warning('Vui lòng chọn ít nhất một đơn trả hàng để từ chối');
      return;
    }

    const rejectableReturns = this.selectedReturns.filter(
      (returnOrder) => returnOrder.status === 'Chờ phê duyệt'
    );

    if (rejectableReturns.length === 0) {
      this.message.error(
        'Chỉ có thể gửi các đơn trả hàng có trạng thái "Chờ phê duyệt"'
      );
      return;
    }

    if (confirm('Bạn có chắc chắn muốn phê duyệt đơn hàng này?')) {
      const returnCodes = rejectableReturns.map((r) => r.code);

      const submitRequests = returnCodes.map((code) =>
        this.returnService.rejectReturn(code)
      );

      forkJoin(submitRequests).subscribe({
        next: (responses) => {
          this.message.success('Từ chối đơn trả hàng thành công!');
          this.loadReturnData();
          this.selectedReturns = [];
          this.updateAllCheckedStatus();
        },
        error: (err) => {
          console.error('Lỗi khi từ chối đơn trả hàng:', err);
          this.message.error('Không thể từ chối đơn trả hàng. Vui lòng thử lại!');
        },
      });
    }
  }

  onCancelReturn(): void {
    if (this.isKD) {
      this.message.error('Bạn không có quyền hủy đơn trả hàng');
      return;
    }

    if (this.selectedReturns.length === 0) {
      this.message.warning('Vui lòng chọn ít nhất một đơn trả hàng để hủy');
      return;
    }

    const cancellableReturns = this.selectedReturns.filter(
      (returnOrder) =>
        returnOrder.status === 'Chờ phê duyệt' ||
        returnOrder.status === 'Khởi tạo'
    );

    if (cancellableReturns.length === 0) {
      this.message.error(
        'Chỉ có thể hủy các đơn trả hàng có trạng thái "Chờ phê duyệt" hoặc "Khởi tạo"'
      );
      return;
    }

    if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
      const returnCodes = cancellableReturns.map((r) => r.code);

      this.returnService.cancelReturns(returnCodes).subscribe({
        next: (res) => {
          this.message.success('Hủy đơn trả hàng thành công!');
          this.loadReturnData();
          this.selectedReturns = [];
          this.updateAllCheckedStatus();
        },
        error: (err) => {
          console.error('Lỗi khi hủy đơn trả hàng:', err);
          this.message.error('Không thể hủy đơn trả hàng. Vui lòng thử lại!');
        },
      });
    }
  }

  openReturn(item: ReturnOrder): void {
    // Navigate to the order detail or open modal. For now just log and show a message.
    const status = 'status' in item ? (item as any).status : '';
    const code = 'code' in item ? (item as any).code : null;
    if (code) {
      if (status === 'Khởi tạo') {
        this.router.navigate(['/order/return-edit', code]);
        return;
      } else {
        // Navigate to view-only detail page
        this.router.navigate(['/order/return-view', code]);
        return;
      }
    }

    this.message.info(
      `Mở đơn ${'orderCode' in item ? (item as any).orderCode : ''}`
    );
  }

  isReturnSelected(returnOrder: ReturnOrder): boolean {
    return this.selectedReturns.some(
      (selected) => selected.code === returnOrder.code
    );
  }

  onReturnChecked(returnOrder: ReturnOrder, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedReturns.push(returnOrder);
    } else {
      this.selectedReturns = this.selectedReturns.filter(
        (selected) => selected.code !== returnOrder.code
      );
    }
    this.updateAllCheckedStatus();
  }

  onAllChecked(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedReturns = [...this.returnList];
    } else {
      this.selectedReturns = [];
    }
    this.updateAllCheckedStatus();
  }

  private updateAllCheckedStatus(): void {
    this.allChecked =
      this.selectedReturns.length === this.returnList.length &&
      this.returnList.length > 0;
    this.indeterminate =
      this.selectedReturns.length > 0 &&
      this.selectedReturns.length < this.returnList.length;
  }

  // ===== Role-style modal state & handlers =====
  private _confirmModalRef: any = null;
  private _pendingAction: 'approve' | 'cancel' | null = null;

  closeConfirmModal(): void {
    if (this._confirmModalRef) {
      this._confirmModalRef.destroy();
      this._confirmModalRef = null;
      this._pendingAction = null;
    }
  }

  confirmProceed(): void {
    if (this._pendingAction === 'approve') {
      const pendingReturns = this.selectedReturns.filter(
        (returnOrder) => returnOrder.status === 'Chờ duyệt'
      );
      pendingReturns.forEach((returnOrder) => {
        returnOrder.status = 'Đã duyệt';
      });
      this.message.success(`Đã duyệt ${pendingReturns.length} đơn trả hàng`);
    } else if (this._pendingAction === 'cancel') {
      const cancellableReturns = this.selectedReturns.filter(
        (returnOrder) => returnOrder.status === 'Chờ duyệt'
      );
      cancellableReturns.forEach((returnOrder) => {
        returnOrder.status = 'Đã hủy';
      });
      this.message.success(`Đã hủy ${cancellableReturns.length} đơn trả hàng`);
    }

    // Reset selection and UI
    this.selectedReturns = [];
    this.updateAllCheckedStatus();
    this.closeConfirmModal();
  }
}
