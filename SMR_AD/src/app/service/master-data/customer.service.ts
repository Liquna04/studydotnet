import { Injectable } from '@angular/core';
import { CommonService } from '../common.service';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../global.service';
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
export class CustomerService {
  constructor(private commonService: CommonService,
              private http: HttpClient,
              private globalService: GlobalService) {}

  search(params: any): Observable<any> {
    return this.commonService.get('Customer/Search', params);
  }

  getAll(): Observable<any> {
    return this.commonService.get('Customer/GetAll');
  }
  create(params: any): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Customer/Insert`;
    return this.http.post<ApiResponse<any>>(url, params);
  }
  update(params: any): Observable<ApiResponse<any>> {
  const url = `${environment.apiUrl}/Customer/Update`;    
  return this.http.put<ApiResponse<any>>(url, params);
  }
 importExcel(file: FormData): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/Customer/ImportExcel`;
    return this.http.post<ApiResponse<any>>(url, file);
  }
GetByCustomerCode(customerCode: string | number): Observable<any> {
    return this.commonService.get(`Customer/GetByCustomerCode/${customerCode}`);
  }
GetByUserName(userName: string | number): Observable<any> {
    return this.commonService.get(`Customer/GetByUserName/${userName}`);
  }
    updateInformation(params: any): Observable<any> {
      return this.commonService.put('Customer/UpdateInformation', params)
    }
}
