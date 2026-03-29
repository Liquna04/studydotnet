import { Injectable } from '@angular/core';
import { CommonService } from '../common.service';
import { GlobalService } from '../global.service';
import { Observable , BehaviorSubject, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';
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
export class AccountCustomerService {
  constructor(private commonService: CommonService,
    private http: HttpClient,
    private globalService: GlobalService

  ) {}

  search(params: any): Observable<any> {
    return this.commonService.get('AccountCustomer/Search', params);
  }

  getAll(): Observable<any> {
    return this.commonService.get('AccountCustomer/GetAll');
  }

  // create(params: any): Observable<any> {
  //   console.log('params', params);
  //   return this.commonService.post('AccountCustomer/Insert', params);
  // }
    create(params: any): Observable<ApiResponse<any>> {
      const url = `${environment.apiUrl}/AccountCustomer/Insert`;
      return this.http.post<ApiResponse<any>>(url, params);
    }
 update(params: any): Observable<ApiResponse<any>> {
      const url = `${environment.apiUrl}/AccountCustomer/Update`;
      return this.http.put<ApiResponse<any>>(url, params);
    }

  importExcel(file: FormData): Observable<any> {
  return this.commonService.post('AccountCustomer/ImportExcel', file);
}
  GetByCustomerCode(customerCode: string | number): Observable<any> {
    return this.commonService.get(`AccountCustomer/GetByCustomerCode/${customerCode}`);
  }
  GetByStoreCode(storeCode: string | number): Observable<any> {
    return this.commonService.get(`AccountCustomer/GetByStoreCode/${storeCode}`);
  }
    GetByUserName(userName: string | number): Observable<any>{
    return this.commonService.get(`AccountCustomer/GetByUserName/${userName}`)
  }
}
