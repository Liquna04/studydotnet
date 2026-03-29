import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { CommonService } from '../common.service'

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private commonService: CommonService) {}

  search(params: any): Observable<any> {
    return this.commonService.get('User/Search', params)
  }

  getAll(params: any): Observable<any> {
    return this.commonService.get('User/GetAll', params)
  }
  getDetail(params: any): Observable<any> {
    return this.commonService.get('User/GetDetail', params)
  }

  create(params: any): Observable<any> {
    return this.commonService.post('User/Insert', params)
  }

  update(params: any): Observable<any> {
    return this.commonService.put('User/Update', params)
  }

  delete(code: string | number): Observable<any> {
    return this.commonService.delete(`User/Delete/${code}`)
  }

  getByType(params: any): Observable<any> {
    return this.commonService.get('User/GetByType', params)
  }
}
