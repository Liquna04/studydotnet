import { Injectable } from '@angular/core'
import { CommonService } from '../common.service'
import { Observable } from 'rxjs'

@Injectable({
  providedIn: 'root',
})
export class TemplateTypeService {
  constructor(private commonService: CommonService) { }

  search(params: any): Observable<any> {

    return this.commonService.get('TemplateType/Search', params)
  }

  getAll(): Observable<any> {
    return this.commonService.get('TemplateType/GetAll')
  }

  create(params: any): Observable<any> {
    console.log('params', params)
    return this.commonService.post('TemplateType/Insert', params)
  }

  update(params: any): Observable<any> {

    return this.commonService.put('TemplateType/Update', params)
  }

  delete(id: string): Observable<any> {
    return this.commonService.delete(`TemplateType/Delete/${id}`)
  }
}
