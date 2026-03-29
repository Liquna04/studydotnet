# Table Pagination Component

A shared, reusable pagination component for all tables in the SMR_AD project.

## Features

- Consistent pagination styling across all tables
- Responsive design
- Configurable page size options
- Vietnamese language support
- Item count display ("Tổng số X mục")
- Page navigation with disabled states

## Usage

### 1. Import the component

```typescript
import { TablePaginationComponent } from '../../shared/components/table-pagination/table-pagination.component';

@Component({
  // ...
  imports: [
    // ... other imports
    TablePaginationComponent,
  ],
})
```

### 2. Add pagination properties to your component

```typescript
export class YourListComponent {
  // Data properties
  dataList: YourDataType[] = [];
  paginatedDataList: YourDataType[] = [];

  // Pagination properties
  currentPage = 1;
  pageSize = 20;
  total = 0;

  // Pagination methods
  updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedDataList = this.dataList.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedData();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.updatePaginatedData();
  }

  // Update your data loading method
  loadData(): void {
    this.yourService.getData().subscribe((data) => {
      this.dataList = data;
      this.total = data.length;
      this.updatePaginatedData();
    });
  }
}
```

### 3. Update your table template

```html
<!-- Table -->
<nz-table [nzData]="paginatedDataList" [nzShowPagination]="false" nzSize="middle">
  <!-- table content -->
</nz-table>

<!-- Add the pagination component -->
<app-table-pagination [total]="total" [pageSize]="pageSize" [pageIndex]="currentPage" (pageChange)="onPageChange($event)" (pageSizeChange)="onPageSizeChange($event)"> </app-table-pagination>
```

## Component API

### Inputs

| Property          | Type       | Default             | Description                        |
| ----------------- | ---------- | ------------------- | ---------------------------------- |
| `total`           | `number`   | `0`                 | Total number of items              |
| `pageSize`        | `number`   | `20`                | Number of items per page           |
| `pageIndex`       | `number`   | `1`                 | Current page number (1-based)      |
| `pageSizeOptions` | `number[]` | `[10, 20, 50, 100]` | Available page size options        |
| `showSizeChanger` | `boolean`  | `true`              | Whether to show page size selector |
| `showTotal`       | `boolean`  | `true`              | Whether to show total count        |

### Outputs

| Event            | Type                   | Description                    |
| ---------------- | ---------------------- | ------------------------------ |
| `pageChange`     | `EventEmitter<number>` | Emitted when page changes      |
| `pageSizeChange` | `EventEmitter<number>` | Emitted when page size changes |

## Examples

### Basic usage (current implementation)

```html
<app-table-pagination [total]="total" [pageSize]="pageSize" [pageIndex]="currentPage" (pageChange)="onPageChange($event)" (pageSizeChange)="onPageSizeChange($event)"> </app-table-pagination>
```

### Custom page size options

```html
<app-table-pagination [total]="total" [pageSize]="pageSize" [pageIndex]="currentPage" [pageSizeOptions]="[5, 10, 25, 50]" (pageChange)="onPageChange($event)" (pageSizeChange)="onPageSizeChange($event)"> </app-table-pagination>
```

### Hide page size selector

```html
<app-table-pagination [total]="total" [pageSize]="pageSize" [pageIndex]="currentPage" [showSizeChanger]="false" (pageChange)="onPageChange($event)" (pageSizeChange)="onPageSizeChange($event)"> </app-table-pagination>
```

## Currently Used In

- `OrderListComponent` - `/src/app/order/order-list/`
- `ReturnListComponent` - `/src/app/order/return-list/`
- `AccountIndexComponent` - `/src/app/@system-manager/account/account-index/`
- `AccountGroupIndexComponent` - `/src/app/@system-manager/account-group/account-group-index/`

## Footer Positioning Strategy

To ensure pagination always appears at the bottom of the table container regardless of content amount, use flexbox layout:

```scss
.table-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px); // Fixed height
  background: #fff;
  border-radius: 6px;
  overflow: hidden;

  .table-wrapper {
    flex: 1; // Take all remaining space
    overflow: hidden;

    .ant-table-wrapper {
      height: 100%;

      .ant-table-container {
        height: 100%;

        .ant-table-content {
          height: 100%;
          overflow-y: auto; // Scrollable table content
        }
      }
    }
  }

  // Pagination always at bottom
  :host ::ng-deep app-table-pagination {
    flex-shrink: 0; // Never shrink

    .table-pagination {
      border-top: 1px solid #f0f0f0;
      margin-top: auto; // Push to bottom
    }
  }
}
```

This approach ensures:

- Table content is scrollable when data exceeds container height
- Pagination is always visible at the bottom
- Container maintains fixed height for consistent layout
- Mobile responsive design is preserved

## Styling and Integration

The component matches the design shown in the screenshot with:

- "Tổng số X mục" text on the left
- Page navigation buttons (previous/next) in the center
- Current page number highlighted in blue
- Page size dropdown on the right with "X / page" format
- Responsive design for mobile devices

### Custom Styling

To integrate the pagination seamlessly with your table container, you can override the component's CSS:

```scss
// Example: Remove background and adjust border for seamless integration
:host ::ng-deep app-table-pagination {
  .table-pagination {
    background: transparent !important;
    border-top: none !important;
    padding: 12px 16px !important;
    border-radius: 0;
  }
}

// Example: For mobile responsive adjustments
@media (max-width: 767px) {
  :host ::ng-deep app-table-pagination {
    .table-pagination {
      .pagination-controls {
        flex-direction: column;
        gap: 8px;
      }
    }
  }
}
```

### Container Integration

Ensure your table container has `overflow: hidden` to keep pagination within bounds:

```scss
.table-container {
  overflow: hidden;
  border-radius: 6px;

  :host ::ng-deep app-table-pagination {
    .table-pagination {
      border-radius: 0;
    }
  }
}
```
