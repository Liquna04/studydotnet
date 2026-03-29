import { ShareModule } from './../../shared/share-module/index';
import {
  Component,
  OnInit,
  ViewChild,
  Output,
  EventEmitter,
  Input,
} from '@angular/core';
import {
  NzFormatEmitEvent,
  NzTreeComponent,
  NzTreeNodeOptions,
} from 'ng-zorro-antd/tree';
import { OrganizeService } from '../../service/system-manager/organize.service';
import { FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { GlobalService } from '../../service/global.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ADMIN_RIGHTS } from '../../shared/constants';

@Component({
  selector: 'app-organize',
  standalone: true,
  imports: [ShareModule],
  templateUrl: './organize.component.html',
  styleUrl: './organize.component.scss',
})
export class OrganizeComponent implements OnInit {
  @ViewChild('treeCom', { static: false }) treeCom!: NzTreeComponent;
  @Input() readonly: boolean = false; // Khi true, chỉ cho phép select, không edit
  @Output() selectOrg: EventEmitter<any> = new EventEmitter<any>();
  @Output() resetOrg: EventEmitter<void> = new EventEmitter<void>(); // Event để reset selection

  searchValue = '';
  nodes: any = [];
  originalNodes: any[] = [];
  visible: boolean = false;
  edit: boolean = false;
  loading: boolean = false;
  nodeCurrent!: any;
  titleParent: string = '';

  validateForm: FormGroup;
  ADMIN_RIGHTS = ADMIN_RIGHTS;
  constructor(
    private _service: OrganizeService,
    private fb: NonNullableFormBuilder,
    private globalService: GlobalService,
    private message: NzMessageService
  ) {
    this.validateForm = this.fb.group({
      id: ['', [Validators.required]],
      name: ['', [Validators.required]],
      pId: ['', [Validators.required]],
      children: [null],
      orderNumber: [null],
      isActive: [true, [Validators.required]],
    });
  }

  ngOnInit(): void {
    // Only set breadcrumb when the component is used in its full-page mode
    // (not when embedded in other pages with readonly=true)
    if (!this.readonly) {
      this.globalService.setBreadcrumb([
        {
          name: 'Cấu hình cấu trúc tổ chức',
          path: 'system-manager/organization',
        },
      ]);
    }

    this.getOrg();
  }

  ngOnDestroy(): void {
    // Clear breadcrumb only when this component previously set it
    if (!this.readonly) {
      this.globalService.setBreadcrumb([]);
    }
  }

  getOrg() {
    this._service.GetOrgTree().subscribe((res) => {
      console.log('Organization tree data from API:', res);
      this.nodes = [res];
      this.originalNodes = [res];
    });
  }

  nzEvent(event: NzFormatEmitEvent): void {}

  onDrop(event: any) {}

  onDragStart(event: any) {}

  // Hàm đệ quy để lấy tất cả organization code con
  getAllChildrenCodes(node: any): string[] {
    const codes: string[] = [];

    // Thêm node hiện tại
    const nodeId = node?.id || node?.code || node?.key || '';
    if (nodeId) {
      codes.push(nodeId);
    }

    // Tìm children trong các thuộc tính có thể có
    const children = node?.children || node?.Children || [];
    console.log(`Node ${nodeId} has ${children.length} children:`, children);

    if (children && children.length > 0) {
      for (const child of children) {
        const childCodes = this.getAllChildrenCodes(child);
        codes.push(...childCodes);
      }
    }

    return codes;
  }

  onClick(node: any) {
    this.nodeCurrent = node?.origin;

    // Debug log để kiểm tra cấu trúc node
    console.log('Node clicked:', node);
    console.log('Node origin:', this.nodeCurrent);
    console.log('Node children:', this.nodeCurrent?.children);

    // Emit the selected organize code/id for parent components
    try {
      // Lấy tất cả organization codes (bao gồm cả node hiện tại và các con)
      const allCodes = this.getAllChildrenCodes(this.nodeCurrent);
      console.log('All codes from getAllChildrenCodes:', allCodes);

      const orgData = {
        selectedCode: this.nodeCurrent?.id || this.nodeCurrent?.code || '',
        selectedName: this.nodeCurrent?.name || this.nodeCurrent?.title || '',
        allCodes: allCodes, // Danh sách tất cả codes để filter
      };
      console.log('Emitting orgData:', orgData);
      this.selectOrg.emit(orgData);
    } catch (e) {
      // ignore emit errors
    }

    // Chỉ hiển thị form edit khi không ở readonly mode
    if (!this.readonly) {
      this.edit = true;
      this.visible = true;
      this.titleParent = node.parentNode?.origin?.title || '';
      this.validateForm.setValue({
        id: this.nodeCurrent?.id,
        name: this.nodeCurrent?.name,
        pId: this.nodeCurrent?.pId,
        children: [],
        orderNumber: this.nodeCurrent?.orderNumber,
        isActive: this.nodeCurrent?.isActive,
      });
    }
  }

  close() {
    this.visible = false;
    this.resetForm();
  }

  reset() {
    this.searchValue = '';
    this.getOrg();
    this.nodes = [...this.originalNodes];

    // Emit reset event để parent component có thể clear selection
    this.resetOrg.emit();
  }

  resetForm() {
    this.validateForm.reset();
  }

  openCreateChild(node: any) {
    this.close();
    this.edit = false;
    this.visible = true;
    this.validateForm.get('pId')?.setValue(node?.origin.id);
    this.validateForm.get('orderNumber')?.setValue(null);
    this.validateForm.get('children')?.setValue([]);
    this.validateForm.get('isActive')?.setValue(true);
  }

  openCreate() {
    this.close();
    this.edit = false;
    this.visible = true;
    this.validateForm.get('pId')?.setValue(this.nodeCurrent?.id || 'R');
    this.validateForm.get('children')?.setValue([]);
    this.validateForm.get('orderNumber')?.setValue(null);
    this.validateForm.get('isActive')?.setValue(true);
  }
  isIdExist(id: string, node: any): boolean {
    if (node.id === id) {
      return true;
    }
    if (node.children) {
      for (const child of node.children) {
        if (this.isIdExist(id, child)) {
          return true;
        }
      }
    }
    return false;
  }
  submitForm() {
    if (!this.validateForm.valid) {
      Object.values(this.validateForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    if (this.edit) {
      this.loading = true;
      this._service.Update(this.validateForm.getRawValue()).subscribe({
        next: (data) => {
          this.getOrg();
          this.loading = false;
        },
        error: (response) => {
          console.log(response);
          this.loading = false;
        },
      });
    } else {
      const formData = this.validateForm.getRawValue();
      const newId = formData.id;
      const idExists = this.nodes.some((node: any) =>
        this.isIdExist(newId, node)
      );
      if (idExists) {
        this.message.error(
          `Mã đơn vị ${newId} đã được sử dụng, vui lòng nhập lại`
        );
        return;
      }
      this.loading = true;
      this._service.Insert(formData).subscribe({
        next: (data) => {
          this.getOrg();
          this.loading = false;
        },
        error: (response) => {
          console.log(response);
          this.loading = false;
        },
      });
    }
  }

  updateOrderTree() {
    const treeData = this.treeCom
      .getTreeNodes()
      .map((node) => this.mapNode(node));
    this._service.UpdateOrderTree(treeData[0]).subscribe({
      next: (data) => {
        this.getOrg();
      },
      error: (response) => {
        console.log(response);
      },
    });
  }

  private mapNode(node: any): any {
    const children = node.children
      ? node.children.map((child: any) => this.mapNode(child))
      : [];
    return {
      id: node.origin.id,
      pId: node.parentNode?.key || '-',
      name: node.origin.name,
      children: children,
      isActive: node.origin.isActive,
    };
  }

  deleteItem(node: any) {
    if (node.children && node.children.length > 0) {
      // Thông báo rằng không thể xóa vì node có children
      this.message.error(
        'Không được phép xóa Cấu trúc tổ chức Cha khi còn các thành phần con'
      );
      return; // Dừng quá trình xóa
    }
    this._service.Delete(node.origin.id).subscribe({
      next: (data) => {
        this.getOrg();
      },
      error: (response) => {
        console.log(response);
      },
    });
  }
  searchTables(searchValue: string) {
    const filterNode = (node: NzTreeNodeOptions): boolean => {
      if (node.title.toLowerCase().includes(searchValue.toLowerCase())) {
        return true;
      } else if (node.children) {
        node.children = node.children.filter((child) => filterNode(child));
        return node.children.length > 0;
      }
      return false;
    };

    if (!searchValue) {
      this.nodes = [...this.originalNodes];
    } else {
      this.nodes = this.originalNodes
        .map((node) => ({ ...node }))
        .filter((node) => filterNode(node));
    }
  }
}
