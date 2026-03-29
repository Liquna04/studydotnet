import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { CommonModule } from '@angular/common';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzStatus } from 'ng-zorro-antd/core/types'; // Import để dùng NzStatus

@Component({
  selector: 'app-input-select',
  templateUrl: './input-select.component.html',
  styleUrls: ['./input-select.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NzSelectModule,
    CommonModule,
    NzFormModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputSelectComponent),
      multi: true,
    },
  ],
})
export class InputSelectComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() required: boolean = false;
  @Input() control!: FormControl;
  @Input() placeholder: string = '';
  @Input() nzErrorTip: string = 'Vui lòng chọn';
  @Input() options: Array<{ label: string, value: any }> = [];
  @Input() nzShowSearch: boolean = true;
  @Input() nzAllowClear: boolean = true;
  @Input() disabled: boolean = false;
  @Input() formItemClass: string = '';
  @Input() status: NzStatus = ''; // Thêm status để hỗ trợ trạng thái (error/warning)

  onChange!: (value: any) => void;
  onTouched!: () => void;
  value: any;

  onValueChange(newValue: any): void {
    this.value = newValue;
    this.onChange(newValue);
  }

  onBlur(): void {
    this.onTouched();
  }

  checkError(): boolean {
    if (this.control?.errors) {
      const { required, pattern, ...otherErrors } = this.control.errors;
      return !required && !pattern && otherErrors && Object.keys(otherErrors).length !== 0;
    }
    return false;
  }

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  ngOnInit() {
    if (this.control && this.disabled) {
      this.control.disable();
    }
    if (this.control) {
      this.control.valueChanges.subscribe((value: any) => {
        this.value = value;
        // Cập nhật status dựa trên lỗi nếu cần
        this.status = this.control.invalid && (this.control.touched || this.control.dirty) ? 'error' : '';
      });
    }
  }
}