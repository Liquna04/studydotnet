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
export class StorageService {
  constructor(private commonService: CommonService,
              private http: HttpClient,
              private globalService: GlobalService) {}

  search(params: any): Observable<any> {
    return this.commonService.get('Storage/Search', params);
  }

  getAll(): Observable<any> {
    return this.commonService.get('Storage/GetAll');
  }

    create(params: any): Observable<ApiResponse<any>> {
      const url = `${environment.apiUrl}/Storage/Insert`;
      return this.http.post<ApiResponse<any>>(url, params);
    }
      update(params: any): Observable<ApiResponse<any>> {
      const url = `${environment.apiUrl}/Storage/Update`;
      return this.http.put<ApiResponse<any>>(url, params);
    }
  importExcel(formData: FormData): Observable<any> {
    return this.commonService.post('Storage/ImportExcel', formData, false);
  }

  delete(id: number): Observable<any> {
    return this.commonService.delete(`Storage/Delete/${id}`);
  }
}
