import { Component, OnInit, OnDestroy, TemplateRef } from '@angular/core';
import { ShareModule } from '../../shared/share-module';
import { BaseFilter, PaginationResult } from '../../models/base.model';
import { TransportTypeService } from '../../service/master-data/transport-type.service';
import { GlobalService } from '../../service/global.service';
import { TablePaginationComponent } from '../../shared/components/table-pagination/table-pagination.component';
import { NzUploadFile, NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzMessageService } from 'ng-zorro-antd/message';


@Component({
  selector: 'app-transport-type',
  standalone: true,
  imports: [ShareModule],
  templateUrl: './transport-type.component.html',
  styleUrl: './transport-type.component.scss',
})
export class TransportTypeComponent implements OnInit, OnDestroy {
  paginationResult = new PaginationResult();
  loading = false;
  tableScrollY: string | null = null;
  tableScrollX: string | null = '100%';
  private resizeHandler = () => this.updateTableScrollHeight();
  filter = new BaseFilter();
  visible = false;
  isEdit = false;
  item: any = this.initItem();

  // Import properties
  importVisible = false;
  fileList: NzUploadFile[] = [];
  selectedFileObj: any;
  importMessage = '';
  importTitleTpl!: TemplateRef<any>;
  // Drawer responsive width
  drawerWidth: string | number = '720px';
  private _resizeDrawerListener: any;

  // Form
  form: FormGroup;

  constructor(
    private _service: TransportTypeService,
    private globalService: GlobalService,
    private fb: FormBuilder,
    private message: NzMessageService
    ) {
    this.globalService.setBreadcrumb([
      {
        name: 'Danh sách loại hình vận tải',
        path: 'master-data/transport-type',
      },
    ]);

    this.form = this.fb.group({
      id: [''],
      code: ['', [Validators.required]],
      name: ['', [Validators.required]],
      isActive: [true]
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
  private initItem() {
    return {id:'', code: '', name: '', note: '', isActive: true };
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
    this.form.reset({id:'', code: '', name: '', isActive: true });
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
    this.form.reset({id:'', code: '', name: '', isActive: true });
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

  // Import methods
  openImport() {
    this.importVisible = true;
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

  beforeUpload = (file: NzUploadFile): boolean => {
    this.fileList = [file];
    return false; // Prevent auto upload
  };

  handleFileChange(info: NzUploadChangeParam): void {
    if (info.file.status === 'removed') {
      this.fileList = [];
      this.selectedFileObj = null;
      this.importMessage = '';
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileObj = file;
      this.importMessage = `Đã chọn file: ${file.name}`;
    }
  }

  submitImport() {
    if (!this.selectedFileObj) return;

    // TODO: Implement import logic
    this.importMessage = 'Đang xử lý file...';
    // this._service.import(this.selectedFileObj).subscribe({
    //   next: () => {
    //     this.importMessage = 'Import thành công!';
    //     this.search();
    //     setTimeout(() => this.closeImport(), 2000);
    //   },
    //   error: (err) => {
    //     this.importMessage = 'Import thất bại!';
    //     console.error(err);
    //   }
    // });
  }
}
