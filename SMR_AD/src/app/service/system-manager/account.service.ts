import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { CommonService } from '../common.service'

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  constructor(private commonService: CommonService) {}

  search(params: any): Observable<any> {
    return this.commonService.get('Account/Search', params)
  }

  getDetail(params: any): Observable<any> {
    return this.commonService.get('Account/GetDetail', params)
  }

  create(params: any): Observable<any> {
    return this.commonService.post('Account/Insert', params)
  }

  update(params: any): Observable<any> {
    return this.commonService.put('Account/Update', params)
  }


  resetPassword(username: any): Observable<any> {
    return this.commonService.put(`Account/ResetPassword?username=${username}`, {})
  }



  delete(code: string | number): Observable<any> {
    return this.commonService.delete(`Partner/Delete/${code}`)
  }

  getByType(params: any): Observable<any> {
    return this.commonService.get('Account/GetByType', params)
  }
}
