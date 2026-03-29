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

export class TransportVehicleService {
  constructor(private commonService: CommonService,
              private http: HttpClient,
              private globalService: GlobalService
  ) {}

  search(params: any): Observable<any> {
    return this.commonService.get('TransportVehicle/Search', params);
  }

  getAll(): Observable<any> {
    return this.commonService.get('TransportVehicle/GetAll');
  }

    create(params: any): Observable<ApiResponse<any>> {
      const url = `${environment.apiUrl}/TransportVehicle/Insert`;
      return this.http.post<ApiResponse<any>>(url, params);
    }
      update(params: any): Observable<ApiResponse<any>> {
      const url = `${environment.apiUrl}/TransportVehicle/Update`;
      return this.http.put<ApiResponse<any>>(url, params);
    }

  importExcel(file: FormData): Observable<ApiResponse<any>> {
    const url = `${environment.apiUrl}/TransportVehicle/ImportExcel`;
    return this.http.post<ApiResponse<any>>(url, file);
  }
}
