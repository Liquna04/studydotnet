import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzMessageService, NzMessageModule } from 'ng-zorro-antd/message';
import { NzTableModule } from 'ng-zorro-antd/table';
import { 
  ReportService, 
  ReportFilterDto, 
  ReportPoHhkReturnGroupedDto 
} from '../../service/report.service';

@Component({
  selector: 'app-return-report',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzPageHeaderModule,
    NzButtonModule,
    NzIconModule,
    NzGridModule,
    NzSelectModule,
    NzDatePickerModule,
    NzInputModule,
    NzRadioModule,
    NzMessageModule,
    NzTableModule
  ],
  templateUrl: './return-report.component.html',
  styleUrls: ['./return-report.component.scss']
})
export class ReturnReportComponent implements OnInit {

  pageIndex = 1;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50, 100];

  // Filter Model
  filterData = {
    storeOrCustomer: null,               
    itemType: null,                       
    status: null,
    dateRange: [] as Date[],                        
    shift: 'day'                          
  };

  appliedStoreOrCustomer: string | null = null;
  
  // Data để hiển thị xem trước
  returnPreviewData: ReportPoHhkReturnGroupedDto[] = [];
  isLoadingPreview = false;
  showPreviewTable = false;

  // Mock Data cho Dropdown
  listStoreCustomer: any[] = [];
  listItemTypes: any[] = [];  

  constructor(
    private router: Router,
    private message: NzMessageService,
    private reportService: ReportService
  ) {}

  ngOnInit(): void {
    this.listStoreCustomer = [
      { label: 'Cửa hàng', value: 'Store' },
      { label: 'Khách hàng', value: 'Customer' }
    ];
    this.getAllProducts();
  }

  getAllProducts(): void {
    const params = {}; 

    this.reportService.getProductList(params).subscribe({
      next: (data) => {
        if (data && Array.isArray(data)) {
          this.listItemTypes = data.map((item: any) => ({
            label: item.name,
            value: item.name
          }));
        }
      },
   
    });
  }

  private buildFilterDto(): ReportFilterDto {
    const dto: ReportFilterDto = {};

    if (this.filterData.dateRange && this.filterData.dateRange.length === 2) {
      dto.fromDate = this.formatDateToISO(this.filterData.dateRange[0]);
      dto.toDate = this.formatDateToISO(this.filterData.dateRange[1]);
    }

    if (this.filterData.storeOrCustomer) {
      dto.storeOrCustomer = this.filterData.storeOrCustomer;
    }

    if (this.filterData.status) {
      dto.status = this.filterData.status;
    }

    if (this.filterData.itemType) {
      dto.productName = this.filterData.itemType;
    }

    return dto;
  }

  private formatDateToISO(date: Date): string {
    return date.toISOString();
  }

  onBack(): void {
    this.router.navigate(['/order/list']);
  }


  onPreview(): void {
    if (!this.filterData.storeOrCustomer) {
      this.message.warning('Vui lòng chọn Cửa hàng hoặc Khách hàng!');
      return;
    }

    this.isLoadingPreview = true;
    this.pageIndex = 1;
    const filterDto = this.buildFilterDto();

    this.reportService.getReturnReport(filterDto).subscribe({
      next: (data) => {
        this.isLoadingPreview = false;
        
        if (data && Array.isArray(data)) {
          this.returnPreviewData = data;
          this.appliedStoreOrCustomer = this.filterData.storeOrCustomer;
          this.showPreviewTable = true;
          this.message.success('Tải dữ liệu báo cáo thành công!');
        } else {
          this.message.warning('Không có dữ liệu');
          this.returnPreviewData = [];
          this.showPreviewTable = false;
        }
      },
      error: (error) => {
        this.isLoadingPreview = false;
        console.error('Lỗi khi tải báo cáo:', error);
        this.message.error('Có lỗi xảy ra khi tải báo cáo!');
        this.returnPreviewData = [];
        this.showPreviewTable = false;
      }
    });
  }

  onExportExcel(): void {
    if (!this.filterData.storeOrCustomer) {
      this.message.warning('Vui lòng chọn Cửa hàng hoặc Khách hàng!');
      return;
    }

    const loadingMessageId = this.message.loading('Đang xuất file Excel...', { nzDuration: 0 }).messageId;
    const filterDto = this.buildFilterDto();

    this.reportService.generateReturnReport(filterDto).subscribe({
      next: (blob) => {
        this.message.remove(loadingMessageId);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const fileName = `BaoCaoTraHang_${timestamp}.xlsx`;
        
        this.reportService.downloadFile(blob, fileName);
        this.message.success('Xuất file Excel thành công!');
      },
      error: (error) => {
        this.message.remove(loadingMessageId);
        console.error('Lỗi khi xuất Excel:', error);
        this.message.error('Có lỗi xảy ra khi xuất file Excel!');
      }
    });
  }

  getProductList(data: any): string {
    if (!data.danhSachMatHang || data.danhSachMatHang.length === 0) {
      return '-';
    }
    return data.danhSachMatHang.map((item: any) => item.matHang).join(', ');
  }
}