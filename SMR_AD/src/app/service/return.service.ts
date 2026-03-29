import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { GlobalService } from './global.service';
import { CommonService } from './common.service';
export interface ReturnOrder {
  poType: string;
  code: string;
  customerCode: string;
  customerName: string;
  storeCode: string
  vehicleCode: string;
  status: string;
  orderCode: string;
  returnDate: Date;
  expectedReturnDate: Date;
  returnNote: string;
  returnReason: string;
  items: ReturnItem[];
}

export interface ReturnItem {
  name: string;
  quantity: number;
  approveQuantity: number;
  unit: string;
  basicUnit: string;
  price: string;
}
export interface ApiResponse<T> {
  status: boolean;
  data?: T;
  messageObject?: {
    messageType: number;
    message: string;
  };
}
export interface Order {
  id: string;
  poType: string;
  orderCode: string;
  customer: string;
  customerCode: string;
  storeCode: string;
  vehicle: string;
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
export interface OrderDetail {
  name: string;
  quantity: number;
  approveQuantity: number;
  unit: string;
  basicUnit: string;
  price: number;
}
// export interface CreateReturnOrderRequest {
//   returnReason: string;
//   customer: string;
//   originalOrderCode?: string;
//   expectedReturnDate?: Date;
//   notes?: string;
//   items: ReturnItem[];
// }

@Injectable({
  providedIn: 'root',
})
export class ReturnService {
  private ordersSubject = new BehaviorSubject<Order[]>([]);

  private returnsSubject = new BehaviorSubject<ReturnOrder[]>([]);
  private returns: ReturnOrder[] = [];

  constructor(
    private commonService: CommonService,
    private http: HttpClient,
    private globalService: GlobalService
  ) {
    this.returnsSubject.next(this.returns);
  }

  /**
   * Map status from database value to display text
   * Status 1 = "Khởi tạo"
   */
  private mapStatusFromDb(statusCode: string): string {
    const statusMap: { [key: string]: string } = {
      '1': 'Khởi tạo',
      '2': 'Chờ phê duyệt',
      '3': 'Đã phê duyệt',
      '4': 'Từ chối',
      '5': 'Hủy yêu cầu',
      '6': 'Trả hàng thành công',
    };
    return statusMap[statusCode] || statusCode;
  }

  /**
   * Get all return orders
   */
  getCustomerByCode(customerCode: string | number): Observable<any> {
      return this.commonService.get(`PoReturn/GetCustomerByCode/${customerCode}`);
    }
  getProductLists(): Observable<any> {
    return this.commonService.get('PoReturn/GetProductLists');
  }
  getTransportTypes(): Observable<any> {
    return this.commonService.get('PoReturn/GetTransportTypes');
  }
  getTransportUnits(): Observable<any> {
    return this.commonService.get('PoReturn/GetTransportUnits');
  }
  getTransportVehicles(): Observable<any> {
    return this.commonService.get('PoReturn/GetTransportVehicles');
  }
  getStorages(): Observable<any> {
    return this.commonService.get('PoReturn/GetStorages');
  }
  getUnitProducts(): Observable<any> {
    return this.commonService.get('PoReturn/GetUnitProducts');
  }
  getCustomers(): Observable<any> {
    return this.commonService.get('PoReturn/GetCustomers');
  }
updateCustomer(params: any): Observable<ApiResponse<any>> {
  const url = `${environment.apiUrl}/PoReturn/UpdateCustomer`;
  return this.http.put<ApiResponse<any>>(url, params);
}

  GetByCustomerCode(customerCode: string | number): Observable<any> {
    return this.commonService.get(`PoReturn/GetByCustomerCode/${customerCode}`);
  }
  getReturns(): Observable<ReturnOrder[]> {
    const userInfo = this.globalService.getUserInfo();
    const userName =
      userInfo?.userName || localStorage.getItem('userName') || 'SYSTEM';
    const accountType = userInfo?.accountType || 'KH';

    // Build query parameters
    let url = `PoReturn/GetAll?userName=${encodeURIComponent(
      userName
    )}&accountType=${encodeURIComponent(accountType)}`;

    return this.commonService.get(url).pipe(
      map((res: any) => {
        const rawData = Array.isArray(res.data) ? res.data : res;

        // Group by return code
        const returnMap = new Map<string, ReturnOrder>();

        rawData.forEach((item: any) => {
          if (!returnMap.has(item.code)) {
            returnMap.set(item.code, {
              poType: item.poType,
              code: item.code,
              customerName: item.customerName,
              customerCode: item.customerCode,
              storeCode: item.storeCode,
              vehicleCode: item.vehicleCode,
              status: this.mapStatusFromDb(item.status),
              orderCode: item.orderCode,
              returnDate: item.returnDate,
              expectedReturnDate: item.expectedReturnDate,
              returnNote: item.returnNote,
              returnReason: item.returnReason,
              items: [],
            });
          }

          // Add detail items
          if (item.detailId || item.itemName) {
            const returnOrder = returnMap.get(item.code)!;
            returnOrder.items.push({
              name: item.itemName || item.productName,
              quantity: item.quantity || 0,
              approveQuantity: item.approveQuantity || 0,
              unit: item.unit || '',
              basicUnit: item.basicUnit || '',
              price: item.price || 0,
            });
          }
        });

        return Array.from(returnMap.values());
      })
    );
  }

  getReturnHistory(code: string): Observable<any> {
    return this.commonService.get(`PoReturn/GetHistoryDetailReturn/${code}`);
  }
  /**
   * Get return order by ID
   */
  getReturnById(code: string): Observable<ReturnOrder | undefined> {
    const returnOrder = this.returns.find((r) => r.code === code);
    return of(returnOrder);
  }

  getAllOrders(): Observable<Order[]> {
    // Build query parameters
    let url = `${environment.apiUrl}/PoReturn/GetAllOrders`;
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
  search(filter: any): Observable<any> {
    const userInfo = this.globalService.getUserInfo();
    const userName =
      userInfo?.userName || localStorage.getItem('userName') || 'SYSTEM';
    const accountType = userInfo?.accountType || 'KH';

    // Build query parameters
    let url = `PoReturn/Search?userName=${encodeURIComponent(
      userName
    )}&accountType=${encodeURIComponent(
      accountType
    )}&keyWord=${encodeURIComponent(
      filter.keyWord || ''
    )}&pageIndex=1&pageSize=50`;

    return this.commonService.get(url).pipe(
      map((res: any) => {
        const rawData = Array.isArray(res.data) ? res.data : res;

        // Group by return code
        const returnMap = new Map<string, ReturnOrder>();

        rawData.forEach((item: any) => {
          if (!returnMap.has(item.code)) {
            returnMap.set(item.code, {
              poType: item.poType,
              code: item.code,
              customerName: item.customerName,
              customerCode: item.customerCode,
              storeCode: item.storeCode,
              vehicleCode: item.vehicleCode,
              status: this.mapStatusFromDb(item.status),
              orderCode: item.orderCode,
              returnDate: item.returnDate,
              expectedReturnDate: item.expectedReturnDate,
              returnNote: item.returnNote,
              returnReason: item.returnReason,
              items: [],
            });
          }

          // Add detail items
          if (item.detailId || item.itemName) {
            const returnOrder = returnMap.get(item.code)!;
            returnOrder.items.push({
              name: item.itemName || item.productName,
              quantity: item.quantity || 0,
              approveQuantity: item.approveQuantity || 0,
              unit: item.unit || '',
              basicUnit : item.basicUnit || '',
              price: item.price || 0,
            });
          }
        });

        return Array.from(returnMap.values());
      })
    );
  }

    getReturnByCode(code: string): Observable<ApiResponse<any>> {
      const url = `${environment.apiUrl}/PoReturn/GetReturnByCode/${code}`;
      return this.http.get<ApiResponse<any>>(url);
    }

  createReturn(params: any): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/PoReturn/InsertReturn`;
    return this.http.post<ApiResponse<any>>(url, params);
  }

  createDetailReturn(params: any): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/PoReturn/InsertDetailReturn`;
    return this.http.post<ApiResponse<any>>(url, params);
  }
  updateReturn(params: any): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/PoReturn/UpdateReturn`;
    return this.http.put<ApiResponse<any>>(url, params);
  }
  updateDetailReturn(params: any): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/PoReturn/UpdateDetailReturn`;
    return this.http.put<ApiResponse<any>>(url, params);
  }

  // ✅ Trong ReturnService, đổi tên method cho rõ ràng
  deleteDetailReturn(pkid: string): Observable<any> {
    return this.commonService.delete(`PoReturn/DeleteDetailReturn/${pkid}`);
  }
  submitReturn(code: string): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/PoReturn/Submit/${code}`;
    return this.http.post<ApiResponse<any>>(url, {});
  }
  cancelReturns(codes: string[]): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/PoReturn/CancelReturns`;
    return this.http.post<ApiResponse<any>>(url, { codes });
  }
  approveReturn(code: string): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/PoReturn/ApproveReturn/${code}`;
    return this.http.post<ApiResponse<any>>(url, {});
  }

  /**
   * Reject order: change STATUS to 4 (Từ chối)
   * POST /api/Po/RejectOrder/{orderCode}
   * For KD (Nhà cung cấp) accounts only
   */
  rejectReturn(code: string): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/PoReturn/RejectReturn/${code}`;
    return this.http.post<ApiResponse<any>>(url, {});
  }

  /**
   * Confirm received: change STATUS to 5 (Đã xác nhận thực nhận)
   * POST /api/Po/ConfirmReceived/{orderCode}
   * For KH (Khách hàng) accounts only
   */
  confirmReturn(code: string): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/PoReturn/ConfirmReturn/${code}`;
    return this.http.post<ApiResponse<any>>(url, {});
  }
  /**
   * Create a new return order
   */
  // createReturn(request: CreateReturnOrderRequest): Observable<ReturnOrder> {
  //   const newReturn: ReturnOrder = {
  //     id: (this.returns.length + 1).toString(),
  //     returnCode: `RT${String(this.returns.length + 1).padStart(3, '0')}`,
  //     customer: request.customer,
  //     vehicle: 'Xe tải', // Default value, in real app get from form
  //     returnReason: request.returnReason,
  //     status: 'Chờ duyệt',
  //     originalOrderCode: request.originalOrderCode,
  //     returnDate: new Date().toISOString().split('T')[0],
  //     expectedReturnDate: request.expectedReturnDate
  //       ?.toISOString()
  //       .split('T')[0],
  //     creator: 'Current User', // In real app, get from auth service
  //     notes: request.notes,
  //     items: request.items,
  //   };

  //   this.returns.push(newReturn);
  //   this.returnsSubject.next([...this.returns]);

  //   return of(newReturn);
  // }

  /**
   * Update return order status
   */
  // updateReturnStatus(id: string, status: string): Observable<boolean> {
  //   const returnIndex = this.returns.findIndex((r) => r.id === id);
  //   if (returnIndex !== -1) {
  //     this.returns[returnIndex].status = status;
  //     this.returnsSubject.next([...this.returns]);
  //     return of(true);
  //   }
  //   return of(false);
  // }

  // /**
  //  * Delete return order
  //  */
  // deleteReturn(id: string): Observable<boolean> {
  //   const returnIndex = this.returns.findIndex((r) => r.id === id);
  //   if (returnIndex !== -1) {
  //     this.returns.splice(returnIndex, 1);
  //     this.returnsSubject.next([...this.returns]);
  //     return of(true);
  //   }
  //   return of(false);
  // }

  // /**
  //  * Search returns by criteria
  //  */
  // searchReturns(query: string): Observable<ReturnOrder[]> {
  //   if (!query.trim()) {
  //     return this.getReturns();
  //   }

  //   const filteredReturns = this.returns.filter(
  //     (returnOrder) =>
  //       returnOrder.returnCode.toLowerCase().includes(query.toLowerCase()) ||
  //       returnOrder.customer.toLowerCase().includes(query.toLowerCase()) ||
  //       returnOrder.originalOrderCode
  //         ?.toLowerCase()
  //         .includes(query.toLowerCase())
  //   );

  //   return of(filteredReturns);
  // }

  // /**
  //  * Process return from existing order (from order-list)
  //  */
  // processReturnFromOrder(
  //   orderId: string,
  //   items: ReturnItem[]
  // ): Observable<ReturnOrder> {
  //   // In real app, this would get order details and create return
  //   const returnRequest: CreateReturnOrderRequest = {
  //     returnReason: 'other',
  //     customer: 'Khách hàng từ đơn hàng ' + orderId,
  //     originalOrderCode: orderId,
  //     expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  //     notes: 'Trả hàng từ danh sách đơn hàng',
  //     items: items,
  //   };

  //   return this.createReturn(returnRequest);
  // }

  /**
   * Get return statistics
   */
  getReturnStatistics(): Observable<any> {
    const stats = {
      total: this.returns.length,
      pending: this.returns.filter((r) => r.status === 'Chờ phê duyệt').length,
      approve: this.returns.filter((r) => r.status === 'Đã duyệt').length,
      completed: this.returns.filter((r) => r.status === 'Hoàn thành').length,
      cancelled: this.returns.filter((r) => r.status === 'Đã hủy').length,
    };

    return of(stats);
  }
  private formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
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
      id: poDto.code,
      poType: poDto.poType,
      orderCode: poDto.code,
      customer: poDto.customerName || '',
      customerCode: poDto.customerCode || '',
      storeCode: poDto.storeCode ||'',
      vehicle: vehicleName || '-',
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
}
