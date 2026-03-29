import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-table-pagination',
  standalone: true,
  imports: [
    CommonModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    FormsModule,
  ],
  templateUrl: './table-pagination.component.html',
  styleUrls: ['./table-pagination.component.scss'],
})
export class TablePaginationComponent implements OnInit {
  @Input() total: number = 0;
  @Input() pageSize: number = 20;
  @Input() pageIndex: number = 1;
  @Input() pageSizeOptions: number[] = [10, 20, 50, 100];
  @Input() showSizeChanger: boolean = true;
  @Input() showTotal: boolean = true;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  totalPages: number = 0;
  startItem: number = 0;
  endItem: number = 0;

  ngOnInit(): void {
    this.calculatePagination();
  }

  ngOnChanges(): void {
    this.calculatePagination();
  }

  private calculatePagination(): void {
    this.totalPages = Math.ceil(this.total / this.pageSize);
    this.startItem =
      this.total === 0 ? 0 : (this.pageIndex - 1) * this.pageSize + 1;
    this.endItem = Math.min(this.pageIndex * this.pageSize, this.total);
  }

  onPageSizeChange(newPageSize: number): void {
    this.pageSize = newPageSize;
    // Reset to first page when page size changes
    this.pageIndex = 1;
    this.calculatePagination();
    this.pageSizeChange.emit(this.pageSize);
    this.pageChange.emit(this.pageIndex);
  }

  onPreviousPage(): void {
    if (this.pageIndex > 1) {
      this.pageIndex--;
      this.calculatePagination();
      this.pageChange.emit(this.pageIndex);
    }
  }

  onNextPage(): void {
    if (this.pageIndex < this.totalPages) {
      this.pageIndex++;
      this.calculatePagination();
      this.pageChange.emit(this.pageIndex);
    }
  }

  onFirstPage(): void {
    if (this.pageIndex !== 1) {
      this.pageIndex = 1;
      this.calculatePagination();
      this.pageChange.emit(this.pageIndex);
    }
  }

  onLastPage(): void {
    if (this.pageIndex !== this.totalPages && this.totalPages > 0) {
      this.pageIndex = this.totalPages;
      this.calculatePagination();
      this.pageChange.emit(this.pageIndex);
    }
  }

  get canGoPrevious(): boolean {
    return this.pageIndex > 1;
  }

  get canGoNext(): boolean {
    return this.pageIndex < this.totalPages;
  }
}
