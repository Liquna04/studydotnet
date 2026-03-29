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
export class CustomerOrgService {
   constructor(private commonService: CommonService,
               private http: HttpClient,
               private globalService: GlobalService) {}

  search(params: any): Observable<any> {
    return this.commonService.get('CustomerOrg/Search', params);
  }

  getAll(): Observable<any> {
    return this.commonService.get('CustomerOrg/GetAll');
  }

  create(params: any): Observable<any> {
    console.log('params', params);
    return this.commonService.post('CustomerOrg/Insert', params);
  }

  update(params: any): Observable<any> {
    return this.commonService.put('CustomerOrg/Update', params);
  }
  importExcel(file: FormData): Observable<any> {
  return this.commonService.post('CustomerOrg/ImportExcel', file);
}
GetByOrgCode(orgCode: string | number): Observable<any> {
    return this.commonService.get(`CustomerOrg/GetByOrgCode/${orgCode}`);
  }
GetByCustomerCode(customerCode: string | number): Observable<any> {
    return this.commonService.get(`CustomerOrg/GetByCustomerCode/${customerCode}`);
  }
}
