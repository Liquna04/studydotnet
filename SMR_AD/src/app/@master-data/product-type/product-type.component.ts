import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  TemplateRef,
  Type,
  ViewChild,
} from '@angular/core';
import { ShareModule } from '../../shared/share-module';
import { PaginationResult, BaseFilter } from '../../models/base.model';
import { GlobalService } from '../../service/global.service';
import { ProductTypeService } from '../../service/master-data/product-type.service';
import { NzUploadFile, NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { TablePaginationComponent } from '../../shared/components/table-pagination/table-pagination.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-product-type',
  imports: [ShareModule],
  templateUrl: './product-type.component.html',
  styleUrls: ['./product-type.component.scss'],
})
export class ProductTypeComponent implements OnInit, OnDestroy {
  paginationResult = new PaginationResult();
  loading = false;
  tableScrollY: string | null = null;
  tableScrollX: string | null = '100%';
  private resizeHandler = () => this.updateTableScrollHeight();
  filter = new BaseFilter();
  visible = false;
  isEdit = false;
  item: any = this.initItem();
  lstTemplateTypeType: any[] = [];
  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  messageError: string | null = null;

  @ViewChild('fileInput', { static: false })
  fileInput!: ElementRef<HTMLInputElement>;
  // Drawer responsive width like account popups
  drawerWidth: string | number = '720px';
  private _resizeDrawerListener: any;

  // Form
  form: FormGroup;

  constructor(
    private _service: ProductTypeService,
    private globalService: GlobalService, // private modal: NzModalService
    private modal: NzModalService,
    private fb: FormBuilder,
    private message: NzMessageService
  ) {
    this.globalService.setBreadcrumb([
      { name: 'Danh sách loại hàng hóa', path: 'master-data/product-type' },
    ]);

    this.form = this.fb.group({
      id: [''],
      code: ['', [Validators.required]],
      name: ['', [Validators.required]],
      isActive: [true],
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
      code: '',
      name: '',
      isActive: true,
    };
  }
  openModal(tpl: TemplateRef<{}>, titleTpl: TemplateRef<{}>): void {
    // Removed modal logic
  }

  // Import modal helpers (canonical pattern)
  importVisible = false;
  fileList: NzUploadFile[] = [];
  selectedFileObj: any = null;
  importMessage: string = '';

  openImportExcel() {
    this.importVisible = true;
    this.fileList = [];
    this.importMessage = '';
  }

  submitImport() {
    
    const formData = new FormData();
    formData.append('file', this.selectedFileObj as File);

    this.loading = true;
    this._service.importExcel(formData)
    .pipe(finalize(() => (this.loading = false)))
    .subscribe({
      next: (response: any) => {
        

        this.importMessage = '';
        this.modal.success({
          nzTitle: 'Import thành công 🎉',
          nzContent: `
        <p>Dữ liệu Excel đã được import thành công vào hệ thống.</p>
      `,
          nzOkText: 'Đóng', // Ẩn nút OK
          nzClosable: false,
          nzMaskClosable: false,
          nzOnOk: () => this.closeImport(),
          nzStyle: {
            transition: 'all 0.4s ease-out',
            transform: 'translateY(0)',
          },
        });

        this.search();
        this.loading = false; // ✅ luôn reset
      },
      error: (err) => {
        this.importMessage = '';
        console.error('API error full details:', err);
        this.modal.error({
          nzTitle: 'Import thất bại ⚠️',
          nzContent: `
        <p>Dữ liệu của bạn bị trùng với dữ liệu cũ</p>
      `,
          nzOkText: 'Đóng',
          nzMaskClosable: false,
          nzClosable: false,
          nzOnOk: () => this.closeImport(),
        });
        this.loading = false; // ✅ luôn reset
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
      this.importMessage = 'Vui lòng chọn file Excel (.xlsx, .xls)';
      return false;
    }

    // check size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size && file.size > maxSize) {
      this.importMessage = 'File quá lớn. Vui lòng chọn file nhỏ hơn 10MB';
      return false;
    }

    this.fileList = [file];
    this.selectedFileObj = (file as any).originFileObj || (file as any);
    this.importMessage = `Đã chọn file: ${file.name}`;
    return false; // prevent auto upload
  };

  handleFileChange({ file, fileList }: NzUploadChangeParam): void {
    if (file.status === 'removed') {
      this.fileList = [];
      this.selectedFileObj = null;
      this.importMessage = '';
    } else if (file.status === 'error') {
      this.importMessage = 'Lỗi tải file. Vui lòng thử lại.';
    }

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
    this.selectedFileObj = null;
    this.importMessage = '';
  }

  search() {
    this._service.search(this.filter).subscribe({
      next: (data) => (this.paginationResult = data),
      error: (err) => console.error(err),
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

  openCreate() {
    this.isEdit = false;
    this.visible = true;
    this.form.reset({ id: '', code: '', name: '', isActive: true });
    this.form.get('code')?.enable();
  }
  openExcel() {
    console.log('1');
  }
  deleteFile() {
    this.selectedFile = null;
    this.selectedFileName = '';
    console.log('2');
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
  openFileDialog() {
    this.fileInput.nativeElement.click();
  }
  selectedFileUrl: string | null = null;
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.selectedFileName = this.selectedFile.name;
      this.selectedFileUrl = URL.createObjectURL(this.selectedFile);
    }
  }

  upLoadFile() {
    if (!this.selectedFile) {
      alert('Chưa chọn file!');
      return;
    }
    this.messageError = 'Loading...';
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    this._service.importExcel(formData).subscribe({
      next: (res: any) => {
       

        this.selectedFile = null;
        this.selectedFileName = '';
        this.messageError = null;
      },
      error: (err) => {
        alert(
          'Thêm mới thất bại! \n' + 'Có mã bị trùng!  \n Vui lòng kiểm tra lại!'
        );
        this.messageError = null;
        this.selectedFile = null;
        this.selectedFileName = '';
      },
    });
  }

  openEdit(item: any) {
    this.isEdit = true;
    this.visible = true;
    this.form.patchValue({
      id: item.id,
      code: item.code,
      name: item.name,
      isActive: item.isActive,
    });
    this.form.get('code')?.disable();
  }

  close() {
    this.visible = false;
    this.form.reset({ id: '', code: '', name: '', isActive: true });
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
}
