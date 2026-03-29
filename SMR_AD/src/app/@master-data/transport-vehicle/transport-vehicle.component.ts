import { Component, OnInit, OnDestroy } from '@angular/core';
import { ShareModule } from '../../shared/share-module';
import { BaseFilter, PaginationResult } from '../../models/base.model';
import { TransportVehicleService } from '../../service/master-data/transport-vehicle.service';
import { GlobalService } from '../../service/global.service';
import { NzUploadChangeParam, NzUploadFile } from 'ng-zorro-antd/upload';
import { FormsModule } from '@angular/forms';
import { TablePaginationComponent } from '../../shared/components/table-pagination/table-pagination.component';
import { TransportTypeService } from '../../service/master-data/transport-type.service';
import { NgForm } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
@Component({
  selector: 'app-transport-vehicle',
  standalone: true,
  imports: [ShareModule, NzFormModule, NzSelectModule],
  templateUrl: './transport-vehicle.component.html',
  styleUrls: ['./transport-vehicle.component.scss'],
})
export class TransportVehicleComponent implements OnInit, OnDestroy {
  selectedFileObj: File | null = null;

  paginationResult = new PaginationResult();
  loading = false;
  tableScrollY: string | null = null;
  tableScrollX: string | null = '100%';
  private resizeHandler = () => this.updateTableScrollHeight();
  filter = new BaseFilter();
  visible = false;
  isEdit = false;
  item: any = this.initItem();
  importVisible = false; // Thêm cho dialog import
  fileList: NzUploadFile[] = []; // Danh sách file được chọn
  importMessage: string = '';
  selectedFile: File | null = null;
  hasSelectedFile = false;
  transportTypes: any[] = [];

  // Drawer responsive width
  drawerWidth: string | number = '720px';
  private _resizeDrawerListener: any;

  // Form
  form: FormGroup;

  constructor(
    private _sTransportType: TransportTypeService,
    private _service: TransportVehicleService,
    private globalService: GlobalService,
    private fb: FormBuilder,
    private message: NzMessageService,
  ) {
    this.globalService.setBreadcrumb([
      {
        name: 'Danh sách phương tiện vận chuyển',
        path: 'master-data/transport-vehicle',
      },
    ]);

    this.form = this.fb.group({
      id: [''],
      code: ['', [Validators.required]],
      name: ['', [Validators.required]],
      type: ['', [Validators.required]],
      capacity: ['', [Validators.required]],
      driver: ['', [Validators.required]],
      isActive: [true],
    });
  }

  ngOnInit() {
    this.loadTransportTypes();
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
    return {
      id: '',
      code: '',
      name: '',
      type: '',
      capacity: '',
      driver: '',
      isActive: true,
    };
  }

  search() {
    this._service.search(this.filter).subscribe({
      next: (data) => (this.paginationResult = data),
      error: (err) => console.error(err),
    });
  }

  updateTableScrollHeight() {
    if (window.innerWidth <= 768) {
      this.tableScrollX = '600px';
    } else if (window.innerWidth <= 1024) {
      this.tableScrollX = '800px';
    } else {
      // allow the inner table to size to its content on wide screens
      // using 'max-content' makes the nz-table horizontal scroll adapt to cell contents
      this.tableScrollX = 'max-content';
    }
    this.tableScrollY = null; // Set to null to avoid calc
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
  loadTransportTypes() {
    this._sTransportType.getAll().subscribe({
      next: (res) => {
        // Nếu API trả về dạng mảng
        this.transportTypes = res || [];

        // Nếu trả về { data: [...] }
        // this.transportUnits = res.data || [];
      },
      error: (err) => {
        console.error('Lỗi khi load loại hình vận tải:', err);
      },
    });
  }
  reset() {
    this.filter = new BaseFilter();
    this.search();
  }

  openCreate() {
    this.isEdit = false;
    this.visible = true;
    this.form.reset({
      id: '',
      code: '',
      name: '',
      type: '',
      capacity: '',
      driver: '',
      isActive: true,
    });
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
    this.form.reset({
      id: '',
      code: '',
      name: '',
      type: '',
      capacity: '',
      driver: '',
      isActive: true,
    });
    this.loading = false;
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

    this.loading = true;
 request.subscribe({
      next: (response: any) => {
        
        if (response.status === true) {
          const successMessage = this.isEdit 
            ? 'Cập nhật thông tin thành công!' 
            : 'Thêm mới thông tin thành công!';
          this.message.success(successMessage);
          
          this.search();
          this.close();
          this.loading= false;
        } else {
          const errorMessage = response.messageObject?.messageDetail || 'Thao tác thất bại';
          this.message.error(errorMessage);
          this.loading = false;
        }
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      },
    });
  }

  openImport() {
    this.importVisible = true;
    this.fileList = []; // Reset file list
    this.importMessage = ''; // Reset thông báo
  }

  // Đóng dialog import
  closeImport() {
    this.importVisible = false;
    this.fileList = [];
    this.selectedFileObj = null; // ✅ Reset file object
    this.importMessage = '';
  }

  beforeUpload = (file: NzUploadFile): boolean => {
    const isExcel =
      file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name!.toLowerCase().endsWith('.xlsx') ||
      file.name!.toLowerCase().endsWith('.xls');

    if (!isExcel) {
      this.importMessage = 'Vui lòng chọn file Excel (.xlsx, .xls)';
      return false;
    }

    // ✅ Reset file list, chỉ giữ 1 file
    this.fileList = [file];
    this.selectedFileObj = file as any as File;

    return false; // Ngăn auto-upload
  };

  // Xử lý thay đổi file (khi chọn file)
  handleFileChange({ file }: NzUploadChangeParam): void {
    if (file.status === 'removed') {
      this.fileList = [];
    }
  }

  submitImport() {
  if (this.fileList.length === 0) {
      this.message.warning('Vui lòng chọn file!');
      return;
    }

    if (!this.selectedFileObj) {
      this.message.warning('File không hợp lệ!');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFileObj); 
    this.loading = true;
    this._service.importExcel(formData).subscribe({
      next: (response: any) => {
        
        
        if (response.status === true) {
         
          this.message.success('Thêm mới thông tin thành công!');
          this.search();
          this.closeImport();
        
        } else {
          // 2. THẤT BẠI DO LOGIC (status: false)
          const errorMessage = 
            response.messageObject?.message || 'Import thất bại (lỗi không xác định)';
          
          // ⚠️ Hiển thị lỗi cụ thể từ backend
          this.message.error(errorMessage); 
        }
        
        // Luôn tắt loading sau khi 'next' xử lý xong
        this.loading = false;
      },
      error: (err) => {
        console.error('API error full details:', err);
        this.message.error('Thêm mới thông tin thất bại!');
        this.loading = false;
      },
    });
  }
}
