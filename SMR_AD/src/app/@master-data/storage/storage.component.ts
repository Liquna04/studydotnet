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
import { StorageService } from '../../service/master-data/Storage.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzUploadFile, NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { TablePaginationComponent } from '../../shared/components/table-pagination/table-pagination.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-storage',
  imports: [ShareModule],
  templateUrl: './storage.component.html',
  styleUrls: ['./storage.component.scss'],
})
export class StorageComponent implements OnInit, OnDestroy {
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

  importVisible = false;
  fileList: NzUploadFile[] = [];
  selectedFileObj: any = null;
  importMessage: string = '';
  // Drawer responsive width
  drawerWidth: string | number = '720px';
  private _resizeDrawerListener: any;

  // Form
  form: FormGroup;

  constructor(
    private _service: StorageService,
    private globalService: GlobalService,
    private modal: NzModalService,
    private fb: FormBuilder,    
    private message: NzMessageService
    
  ) {
    this.globalService.setBreadcrumb([
      { name: 'Danh sách kho hàng', path: 'master-data/storage' },
    ]);

    this.form = this.fb.group({
      id:[''],
      code: ['', [Validators.required]],
      name: ['', [Validators.required]],
      isActive: [true]
    });
  }
  openModal(tpl: TemplateRef<{}>, titleTpl: TemplateRef<{}>): void {
    this.modal.create({
      nzTitle: titleTpl,
      nzContent: tpl,
      nzFooter: null,
      nzWidth: '500px',
      nzMaskClosable: true,
      // hide default close icon; we'll provide a 'Huỷ' in the header template
      nzClosable: false,
      nzOnCancel: () => {
        this.selectedFile = null;
        this.selectedFileName = '';
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
      },
    });
  }

  cancelExcel(): void {
    this.modal.closeAll();
  }

  openImportExcel() {
    this.importVisible = true;
    this.fileList = [];
    this.importMessage = '';
  }

  submitImport() {
    if (this.fileList.length === 0) {
      this.importMessage = 'Vui lòng chọn file!';
      return;
    }

    if (!this.selectedFileObj) {
      this.importMessage = 'File không hợp lệ!';
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFileObj as File);

    this.loading = true;
    this._service.importExcel(formData).subscribe({
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

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size && file.size > maxSize) {
      this.importMessage = 'File quá lớn. Vui lòng chọn file nhỏ hơn 10MB';
      return false;
    }

    this.fileList = [file];
    this.selectedFileObj = (file as any).originFileObj || (file as any);
    this.importMessage = `Đã chọn file: ${file.name}`;

    return false;
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

  ngOnInit() {
    this.search();
    this.updateTableScrollHeight();
    window.addEventListener('resize', this.resizeHandler);
    this.updateDrawerWidth();
    this._resizeDrawerListener = () => this.updateDrawerWidth();
    window.addEventListener('resize', this._resizeDrawerListener);
    // keep table scroll managed by CSS; avoid viewport calc values
    this.tableScrollY = null;
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

  openCreate() {
    this.isEdit = false;
    this.visible = true;
    this.form.reset({
      id:'',
      code: '',
      name: '',
      isActive: true
    });
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

        // Nếu cần reset

        this.selectedFile = null;
        this.selectedFileName = '';
        this.messageError = null;
      },
      error: (err) => {
        this.messageError = null;
        this.selectedFile = null;
        this.selectedFileName = '';
        alert(
          'Thêm mới thất bại! \n' + 'Có mã bị trùng!  \n Vui lòng kiểm tra lại!'
        );
      },
    });
  }

  openEdit(item: any) {
    this.isEdit = true;
    this.visible = true;
    this.form.patchValue({
      id:item.id,
      code: item.code,
      name: item.name,
      isActive: item.isActive
    });
        this.form.get('code')?.disable();

  }

  close() {
    this.visible = false;
    this.item = this.initItem();
  }

  submit() {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    const formValue = this.form.getRawValue();
    this.item = { ...this.item, ...formValue };

    const request = this.isEdit
      ? this._service.update(this.item)
      : this._service.create(this.item);

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
