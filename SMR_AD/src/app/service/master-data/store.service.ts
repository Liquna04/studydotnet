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
export class StoreService {
  constructor(private commonService: CommonService,
              private http: HttpClient,
              private globalService: GlobalService) {}

  search(params: any): Observable<any> {
    return this.commonService.get('Store/Search', params);
  }

  getAll(): Observable<any> {
    return this.commonService.get('Store/GetAll');
  }

    create(params: any): Observable<ApiResponse<any>> {
      const url = `${environment.apiUrl}/Store/Insert`;
      return this.http.post<ApiResponse<any>>(url, params);
    }
      update(params: any): Observable<ApiResponse<any>> {
      const url = `${environment.apiUrl}/Store/Update`;
      return this.http.put<ApiResponse<any>>(url, params);
    }
    GetByUserName(userName: string | number): Observable<any> {
    return this.commonService.get(`Store/GetByUserName/${userName}`);
  }
  GetByStoreCode(storeCode: string | number): Observable<any> {
    return this.commonService.get(`Store/GetByStoreCode/${storeCode}`);
  }
     updateInformation(params: any): Observable<ApiResponse<any>> {
      const url = `${environment.apiUrl}/Store/UpdateInformation`;
      return this.http.put<ApiResponse<any>>(url, params);
    }
  importExcel(file: FormData): Observable<any> {
  return this.commonService.post('Store/ImportExcel', file);
}
}
