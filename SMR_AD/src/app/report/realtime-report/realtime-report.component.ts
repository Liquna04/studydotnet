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
import { NzMessageService, NzMessageModule } from 'ng-zorro-antd/message';
import { NzTableModule } from 'ng-zorro-antd/table';
import { RealtimeReportDto, ReportFilterDto, ReportService } from '../../service/report.service';


@Component({
  selector: 'app-realtime-report',
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
    NzMessageModule,
    NzTableModule
  ],
  templateUrl: './realtime-report.component.html',
  styleUrls: ['./realtime-report.component.scss']
})
export class RealtimeReportComponent implements OnInit {

  // Filter Model
  filterData = {
    storeOrCustomer: null as string | null,               
    itemType: null as string | null,                       
    status: null as string | null,
    dateRange: [] as Date[]
  };

  appliedStoreOrCustomer: string | null = null;

  realtimePreviewData: RealtimeReportDto[] = [];
  isLoadingPreview = false;
  showPreviewTable = false;

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
    const filterDto = this.buildFilterDto();
    console.log(filterDto);

    this.reportService.getRealtimeReport(filterDto).subscribe({
      next: (data) => {
        this.isLoadingPreview = false;
        
        if (data && Array.isArray(data)) {
          this.realtimePreviewData = data;
          this.appliedStoreOrCustomer = this.filterData.storeOrCustomer;
          this.showPreviewTable = true;
          this.message.success('Tải dữ liệu báo cáo thành công!');
        } else {
          this.message.warning('Không có dữ liệu');
          this.realtimePreviewData = [];
          this.showPreviewTable = false;
        }
      },
      error: (error) => {
        this.isLoadingPreview = false;
        console.error('Lỗi khi tải báo cáo:', error);
        this.message.error('Có lỗi xảy ra khi tải báo cáo!');
        this.realtimePreviewData = [];
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

  this.reportService.exportRealtimeExcel(filterDto).subscribe({
    next: (blob) => {
      this.message.remove(loadingMessageId);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = `BaoCaoThoiGianThuc_${timestamp}.xlsx`;
      
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
}