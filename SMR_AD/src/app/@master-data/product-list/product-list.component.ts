import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  TemplateRef,
} from '@angular/core';

import { ShareModule } from '../../shared/share-module';
import { BaseFilter, PaginationResult } from '../../models/base.model';
import { GlobalService } from '../../service/global.service';
import { ProductListService } from '../../service/master-data/Product-List.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzUploadFile, NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { TablePaginationComponent } from '../../shared/components/table-pagination/table-pagination.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductTypeService } from '../../service/master-data/product-type.service';
import { UnitProductService } from '../../service/master-data/Unit-Product.service';
import { finalize } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';

interface ProductList {
  label: string;
  value: string;
  name: string;
  code: string;
  type: string;
  unit: string;
  basicUnit: string;
  price: number;
  productTypeName: string;
  unitProductName: string;
  basicUnitProductName?: string;
}
interface ProductType {
  label: string;
  value: string;
  name: string;
  code: string;
}
interface UnitProduct {
  label: string;
  value: string;
  name: string;
  code: string;
}
@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [ShareModule],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent implements OnInit, OnDestroy {
  [x: string]: any;
  paginationResult = new PaginationResult();
  loading = false;
  tableScrollY: string | null = null;
  tableScrollX: string | null = '100%';
  private resizeHandler = () => this.updateTableScrollHeight();
  filter = new BaseFilter();
  visible = false;
  isEdit = false;
  item: any = this.initItem();
  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  messageError: string | null = null;
  @ViewChild('fileInput', { static: false })
  fileInput!: ElementRef<HTMLInputElement>;
  types: ProductType[] = [];
  units: UnitProduct[] = [];
  basicUnits: UnitProduct[] = [];
  // Import Excel modal state & handlers (Customer pattern)
  importVisible = false;
  fileList: NzUploadFile[] = [];
  selectedFileObj: any = null;
  importMessage: string = '';
  // Drawer responsive width
  drawerWidth: string | number = '720px';
  private _resizeDrawerListener: any;

  // Form
  form: FormGroup;

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
    .pipe(finalize(() => (this.loading = false) ))
    .subscribe({
      next: (response: any) => {
        this.search();
         this.closeImport();
        this.loading = false; // ✅ luôn reset
      },
      error: (err) => {
        this.importMessage = '';
        this.search();
        this.closeImport();
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
  constructor(
    private _sUnitProduct: UnitProductService,
    private _sProductType: ProductTypeService,
    private _service: ProductListService,
    private globalService: GlobalService,
    private modal: NzModalService,
    private fb: FormBuilder,
    private message: NzMessageService
  ) {
    this.globalService.setBreadcrumb([
      { name: 'Danh sách hàng hóa', path: 'master-data/product-list' },
    ]);

    this.form = this.fb.group({
      id: [''],
      code: ['', [Validators.required]],
      name: ['', [Validators.required]],
      type: ['', [Validators.required]],
      unit: ['', [Validators.required]],
      basicUnit: ['', [Validators.required]],
      price: ['', [Validators.required]],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadTypes(); 
    this.loadUnits();
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
      id : '',
      code: '',
      name: '',
      type: '',
      unit: '',
      basicUnit: '',
      price: null,
      productTypeName:'',
      unitProductName:'',
      basicUnitProductName:'',
      isActive: true,
    };
  }

  search() {
    this._service.search(this.filter).subscribe({
      next: (data) => ((this.paginationResult = data)),
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
  loadTypes() {
  this._sProductType.getAll().subscribe({
    next: (res) => {
      // Nếu API trả về dạng mảng
      this.types = res || [];

      // Nếu trả về { data: [...] }
      // this.transportUnits = res.data || [];
    },
    error: (err) => {
      console.error('Lỗi khi load loại hàng hóa:', err);
    },
  });
}
 loadUnits() {
  this._sUnitProduct.getAll().subscribe({
    next: (res) => {
      // Nếu API trả về dạng mảng
      this.units = res || [];
      this.basicUnits = res || [];

      // Nếu trả về { data: [...] }
      // this.transportUnits = res.data || [];
    },
    error: (err) => {
      console.error('Lỗi khi load đơn vị tính:', err);
    },
  });
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
  reset() {
    this.filter = new BaseFilter();
    this.search();
  }

  openCreate() {
    this.isEdit = false;
    this.visible = true;
    this.form.reset({ id : '',  code: '', name: '', type: '', unit: '',basicUnit:'',price:'', isActive: true });
    this.form.get('code')?.enable();
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
// THAY ĐỔI CHỮ KÝ HÀM NÀY
onPriceUpdate(inputElement: HTMLInputElement, item: ProductList) {
  // const inputElement = event.target as HTMLInputElement; // BỎ DÒNG NÀY ĐI

  const newPrice = inputElement.valueAsNumber; // Lấy giá trị số

  // 1. Kiểm tra tính hợp lệ
  if (newPrice === null || isNaN(newPrice) || newPrice < 0) {
    this.modal.error({
      nzTitle: 'Giá trị không hợp lệ',
      nzContent: 'Vui lòng nhập một mức giá hợp lệ (lớn hơn hoặc bằng 0).',
    });
    return;
  }

  // 2. Kiểm tra xem giá có thay đổi không
  if (newPrice === item.price) {
    return; // Không có gì thay đổi, không cần gọi API
  }

  // 3. Tạo payload để gửi đi
  const updatedItemPayload = {
    ...item,
    price: newPrice,
  };

  this.loading = true; 
  this._service
    .update(updatedItemPayload)
    .pipe(finalize(() => (this.loading = false)))
    .subscribe({
      next: () => {
        item.price = newPrice;
      },
      error: (err) => {
        console.error('Lỗi cập nhật giá:', err);
        this.modal.error({
          nzTitle: 'Cập nhật thất bại',
          nzContent:
            'Đã xảy ra lỗi khi cập nhật giá. Vui lòng thử lại.',
        });
        // Khôi phục giá trị cũ trong ô input nếu lỗi
        inputElement.value = item.price ? item.price.toString() : '';
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
      type: item.type,
      unit: item.unit,
      basicUnit: item.basicUnit,
      price: item.price,
      isActive: item.isActive
    });
    this.form.get('code')?.disable();
  }

  close() {
    this.visible = false;
    this.form.reset({id:'',code: '', name: '', type: '', unit: '',basicUnit:'',price:'', isActive: true });
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
