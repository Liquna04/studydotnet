import { Injectable } from '@angular/core';
import { CommonService } from '../common.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TemplateService {
  constructor(private commonService: CommonService) {}

  search(params: any): Observable<any> {
    return this.commonService.get('Template/Search', params);
  }

  getAll(): Observable<any> {
    return this.commonService.get('Template/GetAll');
  }

  getDeviceTemplate(code : string): Observable<any> {
    return this.commonService.get(`Template/GetDeviceByTemplate?TemplateCode=${code}`);
  }

  getSeatByTemplate(code: string): Observable<any> {
    return this.commonService.get(`Template/GetSeatByTemplate?TemplateId=${code}`);
  }

  create(params: any): Observable<any> {
    return this.commonService.post('Template/Insert', params);
  }

  update(params: any): Observable<any> {
    return this.commonService.put('Template/Update', params);
  }
}
