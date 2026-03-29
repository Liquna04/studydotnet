import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { GlobalService } from './global.service';
import { CommonService } from './common.service';
export interface OrderDetail {
  name: string;
  quantity: number;
  approveQuantity: number;
  unit: string;
  basicUnit: string;
  price: number;
}

export interface Order {
  id: string;
  poType: string;
  orderCode: string;
  customer: string;
  customerCode: string;
  storeCode: string;
  vehicle: string;
  vehicleCode: string;
  status: string;
  orderDate: string;
  receiveDate: string;
  expireDate: string;
  shipmentCount: string;
  creator: string;
  orderType: string;
  vehicleMethod: string;
  customerInfo: string;
  unitPrice: string;
  orderNote: string;
  orderAddress: string;
  email: string;
  phone: string;
  additionalNotes: string;
  items: OrderDetail[];
}

// Backend API DTOs (matching C# PoHhkCreateDto)
export interface PoHhkCreateDto {
  poType: string;
  customerCode: string;
  customerName?: string;
  storeCode?: string;
  orderDate?: string; // ISO date string
  deliveryDate?: string;
  receiptDate?: string;
  transportType?: string;
  vehicleCode?: string;
  vehicleInfo?: string;
  driver?: string;
  storageCode?: string;
  storageName?: string;
  representative?: string;
  email?: string;
  phone?: string;
  note?: string;
  items: PoHhkDetailItemDto[];
}

export interface PoHhkDetailItemDto {
  materialCode: string;
  numberItem?: number;
  quantity: number;
  approveQuantity: number;
  unitCode: string;
  basicUnit: string;
}

export interface ApiResponse<T> {
  status: boolean;
  data?: T;
  messageObject?: {
    messageType: number;
    message: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  public orders$ = this.ordersSubject.asObservable();

  constructor(
    private http: HttpClient,
    private globalService: GlobalService,
    private commonService: CommonService
  ) {}

  getCustomers(): Observable<any> {
    return this.commonService.get('Po/GetCustomers');
  }
  getStores(): Observable<any> {
    return this.commonService.get('Po/GetStores');
  }
  getOrders(): Observable<Order[]> {
    // Get user info from localStorage
    const userInfo = this.globalService.getUserInfo();
    const userName =
      userInfo?.userName || localStorage.getItem('userName') || 'SYSTEM';
    const accountType = userInfo?.accountType || 'KH';

    // Build query parameters
    let url = `${environment.apiUrl}/Po/GetAll?userName=${encodeURIComponent(
      userName
    )}&accountType=${encodeURIComponent(accountType)}`;

    return this.http.get<ApiResponse<any>>(url).pipe(
      map((response) => {
        if (response.status && response.data) {
          // Map backend PoHhkDto to frontend Order interface
          const orders: Order[] = response.data.map((poDto: any) =>
            this.mapPoHhkDtoToOrder(poDto)
          );
          this.ordersSubject.next(orders);
          return orders;
        }
        return [];
      })
    );
  }

  getAllOrders(): Order[] {
    return this.ordersSubject.value;
  }

  /**
   * Map backend PoHhkDto to frontend Order interface
   */
  private mapPoHhkDtoToOrder(poDto: any): Order {
    // Extract vehicle name from VEHICLE_INFO (format: "CODE-NAME", take only NAME)
    let vehicleName = '';
    if (poDto.vehicleInfo) {
      const parts = poDto.vehicleInfo.split('-');
      vehicleName = parts.length > 1 ? parts[1].trim() : poDto.vehicleInfo;
    }

    // Parse dates
    const orderDate = poDto.orderDate ? new Date(poDto.orderDate) : null;
    const receiptDate = poDto.receiptDate ? new Date(poDto.receiptDate) : null;

    // Calculate expireDate: receiptDate + 1 day
    let expireDate = '';
    if (receiptDate) {
      const expireDateObj = new Date(receiptDate);
      expireDateObj.setDate(expireDateObj.getDate() + 1);
      expireDate = this.formatDate(expireDateObj);
    }

    return {
      poType: poDto.poType,
      id: poDto.code,
      orderCode: poDto.code,
      customer: poDto.customerName || '',
      customerCode: poDto.customerCode || '',
      storeCode: poDto.storeCode || '',
      vehicle: poDto.vehicleCode || '-',
      vehicleCode: poDto.vehicleCode || '',
      status: this.mapStatusFromDb(poDto.status),
      orderDate: orderDate ? this.formatDate(orderDate) : '-',
      receiveDate: receiptDate ? this.formatDate(receiptDate) : '-',
      expireDate: expireDate || '-',
      shipmentCount: '1', // Default value
      creator: poDto.createdBy || 'System',
      orderType: '',
      vehicleMethod: '',
      customerInfo: poDto.representative || '',
      unitPrice: '',
      orderNote: poDto.note || '-',
      orderAddress: poDto.storageName || '',
      email: poDto.email || '',
      phone: poDto.phone || '',
      additionalNotes: '',
      items: poDto.items || [],
    };
  }

  /**
   * Map status from database value to display text
   * Status 1 = "Khởi tạo"
   * Status 2 = "Chờ phê duyệt"
   * Status 3 = "Đã phê duyệt"
   * Status 4 = "Từ chối"
   * Status 5 = "Đã xác nhận thực nhận"
   * Status -1 = "Hủy đơn hàng"
   */
  private mapStatusFromDb(statusCode: string): string {
    const statusMap: { [key: string]: string } = {
      '1': 'Khởi tạo',
      '2': 'Chờ phê duyệt',
      '3': 'Đã phê duyệt',
      '4': 'Từ chối',
      '5': 'Đã xác nhận thực nhận',
      '-1': 'Hủy đơn hàng',
      '-3': 'Đã phê duyệt lượng'
    };
    return statusMap[statusCode] || statusCode;
  }

  private formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  addOrder(
    order: Omit<Order, 'id' | 'orderCode' | 'status' | 'expireDate' | 'creator'>
  ): Order {
    // Generate random order code (8 digits starting with 825)
    const orderCode =
      '825' +
      Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, '0');

    // Calculate expire date (receive date + 1 day)
    const receiveDate = new Date(order.receiveDate);
    const expireDate = new Date(receiveDate);
    expireDate.setDate(expireDate.getDate() + 1);

    const newOrder: Order = {
      ...order,
      id: Date.now().toString(),

      orderCode,
      status: 'Khởi tạo',
      expireDate: this.formatDate(expireDate),
      creator: 'Admin',
      shipmentCount: '1110_KD3',
    };

    const currentOrders = this.ordersSubject.value;
    this.ordersSubject.next([...currentOrders, newOrder]);

    return newOrder;
  }

  updateOrder(id: string, changes: Partial<Order>): Order | null {
    const orders = this.ordersSubject.value.slice();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    const updated = { ...orders[idx], ...changes } as Order;
    orders[idx] = updated;
    this.ordersSubject.next(orders);
    return updated;
  }

  getCustomerByCode(code: string): string {
    const customers: { [key: string]: string } = {
      KH001: '000010110 - Công ty TNHH MỔI Thành Viền Hà Giang Việt Nam ABCD',
      KH002: '000010210 - Công ty XD Cao Bằng',
      KH003: '000010210 - Công ty xăng dầu KV1- TNHH MTV',
    };
    return customers[code] || code;
  }
updateCustomer(params: any): Observable<ApiResponse<any>> {
  const url = `${environment.apiUrl}/Po/UpdateCustomer`;
  return this.http.put<ApiResponse<any>>(url, params);
}
  /**
   * Call backend API to create a new purchase order
   * POST /api/Po/Create
   */
  createOrder(dto: PoHhkCreateDto): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Po/Create`;
    return this.http.post<ApiResponse<any>>(url, dto);
  }

  /**
   * Get order by code from backend
   * GET /api/Po/GetByCode/{code}
   */
  getOrderByCode(code: string): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Po/GetByCode/${code}`;
    return this.http.get<ApiResponse<any>>(url);
  }

  /**
   * Get order details (items) by header code
   * GET /api/Po/GetDetails/{headerCode}
   */
  getOrderDetails(headerCode: string): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Po/GetDetails/${headerCode}`;
    return this.http.get<ApiResponse<any>>(url);
  }

  /**
   * Cancel one or multiple orders
   * POST /api/Po/CancelOrders
   * Request body: { orderCodes: string[] }
   * This will:
   * - Set STATUS = -1 in T_PO_HHK
   * - Add new history record in T_PO_HHK_HISTORY with STATUS = -1
   */
  cancelOrders(orderCodes: string[]): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Po/CancelOrders`;
    return this.http.post<ApiResponse<any>>(url, { orderCodes });
  }
   confirmReceiveds(orderCodes: string[]): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Po/ConfirmReceiveds`;
    return this.http.post<ApiResponse<any>>(url, { orderCodes });
  }
  /**
   * Update an existing order with details
   * PUT /api/Po/Update/{orderCode}
   * This will:
   * - Update T_PO_HHK header (STATUS remains unchanged)
   * - Update T_PO_HHK_DETAIL items
   * - Add new history record in T_PO_HHK_HISTORY with STATUS = 0 ("Chỉnh sửa thông tin")
   */
  updateOrderWithHistory(
    orderCode: string,
    updateData: any
  ): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Po/Update/${orderCode}`;
    return this.http.put<ApiResponse<any>>(url, updateData);
  }

  /**
   * Submit multiple orders: change STATUS from 1 (Khởi tạo) to 2 (Chờ duyệt)
   * POST /api/Po/SubmitOrders
   * Request body: { orderCodes: string[] }
   * This will:
   * - Set STATUS = 2 in T_PO_HHK
   * - Add new history record in T_PO_HHK_HISTORY with STATUS = 0 (change record)
   */
  submitOrders(orderCodes: string[]): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Po/SubmitOrders`;
    return this.http.post<ApiResponse<any>>(url, { orderCodes });
  }

  /**
   * Submit orders: change STATUS from 1 (Khởi tạo) to 2 (Chờ duyệt)
   * POST /api/Po/SubmitOrders
   * This will:
   * - Set STATUS = 2 in T_PO_HHK
   * - Add new history record in T_PO_HHK_HISTORY with STATUS = 0 (change record)
   */
  search(keyword: string): Observable<Order[]> {
    // Get user info from localStorage
    const userInfo = this.globalService.getUserInfo();
    const userName =
      userInfo?.userName || localStorage.getItem('userName') || 'SYSTEM';
    const accountType = userInfo?.accountType || 'KH';

    // Build search URL with keyword parameter
    let url = `${environment.apiUrl}/Po/Search?keyword=${encodeURIComponent(
      keyword
    )}&userName=${encodeURIComponent(
      userName
    )}&accountType=${encodeURIComponent(accountType)}`;

    return this.http.get<ApiResponse<any>>(url).pipe(
      map((response) => {
        if (response.status && response.data) {
          // API returns response.data as an object with nested .data property containing the array
          const dataArray = response.data.data || response.data;

          // Check if dataArray is actually an array
          if (Array.isArray(dataArray)) {
            const orders: Order[] = dataArray.map((poDto: any) =>
              this.mapPoHhkDtoToOrder(poDto)
            );
            return orders;
          }
        }
        return [];
      })
    );
  }

  /**
   * Submit orders: change STATUS from 1 (Khởi tạo) to 2 (Chờ duyệt)
   * POST /api/Po/SubmitOrders
   * This will:
   * - Set STATUS = 2 in T_PO_HHK
   * - Add new history record in T_PO_HHK_HISTORY with STATUS = 0 (change record)
   */
  submitOrder(orderCode: string): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Po/Submit/${orderCode}`;
    return this.http.post<ApiResponse<any>>(url, {});
  }

  /**
   * Get order history with user information by order code
   * GET /api/Po/GetHistoryDetail/{orderCode}
   * Returns array of history records with user FULL_NAME
   */
  getOrderHistory(orderCode: string): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Po/GetHistoryDetail/${orderCode}`;
    return this.http.get<ApiResponse<any>>(url);
  }

  /**
   * Approve order: change STATUS to 3 (Đã phê duyệt)
   * POST /api/Po/ApproveOrder/{orderCode}
   * For KD (Nhà cung cấp) accounts only
   */
  approveOrder(orderCode: string): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Po/ApproveOrder/${orderCode}`;
    return this.http.post<ApiResponse<any>>(url, {});
  }
  approveQuantityOrder(orderCode: string): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Po/ApproveQuantityOrder/${orderCode}`;
    return this.http.post<ApiResponse<any>>(url, {});
  }
  /**
   * Reject order: change STATUS to 4 (Từ chối)
   * POST /api/Po/RejectOrder/{orderCode}
   * For KD (Nhà cung cấp) accounts only
   */
  rejectOrder(orderCode: string): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Po/RejectOrder/${orderCode}`;
    return this.http.post<ApiResponse<any>>(url, {});
  }

  /**
   * Confirm received: change STATUS to 5 (Đã xác nhận thực nhận)
   * POST /api/Po/ConfirmReceived/{orderCode}
   * For KH (Khách hàng) accounts only
   */
  confirmReceived(orderCode: string): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Po/ConfirmReceived/${orderCode}`;
    return this.http.post<ApiResponse<any>>(url, {});
  }

  /**
   * Get storages (kho hàng) - allows KH and KD accounts
   * GET /api/Po/GetStorages
   */
  getStorages(): Observable<any> {
    return this.commonService.get('Po/GetStorages');
  }

  /**
   * Get transport types (loại vận chuyển) - allows KH and KD accounts
   * GET /api/Po/GetTransportTypes
   */
  getTransportTypes(): Observable<any> {
    return this.commonService.get('Po/GetTransportTypes');
  }

  /**
   * Get transport units (đơn vị vận tải) - allows KH and KD accounts
   * GET /api/Po/GetTransportUnits
   */
  getTransportUnits(): Observable<any> {
    return this.commonService.get('Po/GetTransportUnits');
  }

  /**
   * Get transport vehicles (phương tiện vận tải) - allows KH and KD accounts
   * GET /api/Po/GetTransportVehicles
   */
  getTransportVehicles(): Observable<any> {
    return this.commonService.get('Po/GetTransportVehicles');
  }

  /**
   * Get product lists (danh sách sản phẩm) - allows KH and KD accounts
   * GET /api/Po/GetProductLists
   */
  getProductLists(): Observable<any> {
    return this.commonService.get('Po/GetProductLists');
  }

  /**
   * Get unit products (đơn vị tính hàng hóa) via Po controller to avoid MD permission check
   * GET /api/Po/GetUnitProducts
   */
  getUnitProducts(): Observable<any> {
    return this.commonService.get('Po/GetUnitProducts');
  }
}
