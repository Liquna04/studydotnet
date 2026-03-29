import { Injectable } from '@angular/core'
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'
import { Observable, throwError, BehaviorSubject } from 'rxjs'
import { catchError, tap, map, finalize, switchMap, filter, take } from 'rxjs/operators'
import { environment } from '../../environments/environment'
import { NzMessageService } from 'ng-zorro-antd/message'
import { Router } from '@angular/router'
import { GlobalService } from './global.service'

@Injectable({ providedIn: 'root' })
export class CommonService {
  private baseUrl = environment.apiUrl
  private refreshTokenInProgress = false
  private refreshTokenSubject = new BehaviorSubject<any>(null)

  constructor(
    private http: HttpClient,
    private message: NzMessageService,
    private router: Router,
    private globalService: GlobalService
  ) {}

  get<T>(endpoint: string, params?: any, showLoading = true): Observable<T> {
    return this.handleRequest(
      this.http.get<any>(`${this.baseUrl}/${endpoint}`, {
        params: this.toHttpParams(params),
      }),
      showLoading,
      () => this.get<T>(endpoint, params, showLoading)
    )
  }

  post<T>(endpoint: string, data: any, showSuccess = true, showLoading = true): Observable<T> {
    return this.handleRequest(
      this.http.post<any>(`${this.baseUrl}/${endpoint}`, data),
      showLoading,
      () => this.post<T>(endpoint, data, showSuccess, showLoading),
      () => showSuccess && this.showSuccess('Thêm mới thông tin thành công')
    )
  }

  // ========== THÊM METHOD MỚI CHO BLOB ==========
  /**
   * POST request trả về Blob (dùng cho export Excel/PDF)
   */
  postBlob(endpoint: string, data: any, showLoading = true): Observable<Blob> {
    if (showLoading) this.globalService.incrementApiCallCount()

    return this.http.post(`${this.baseUrl}/${endpoint}`, data, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        if (error.error instanceof Blob && error.error.type === 'application/json') {
          return new Observable(observer => {
            const reader = new FileReader()
            reader.onload = () => {
              try {
                const errorJson = JSON.parse(reader.result as string)
                this.showError(errorJson.message || 'Có lỗi xảy ra')
                observer.error(errorJson)
              } catch (e) {
                this.showError('Có lỗi xảy ra khi xuất file')
                observer.error(error)
              }
            }
            reader.readAsText(error.error)
          })
        }
        return this.handleError(error, () => this.postBlob(endpoint, data, showLoading))
      }),
      finalize(() => this.globalService.decrementApiCallCount())
    )
  }

  put<T>(endpoint: string, data: any, showLoading = true): Observable<T> {
    return this.handleRequest(
      this.http.put<any>(`${this.baseUrl}/${endpoint}`, data),
      showLoading,
      () => this.put<T>(endpoint, data, showLoading),
      () => this.showSuccess('Cập nhật thông tin thành công')
    )
  }

  delete<T>(endpoint: string, data: any = {}, showLoading = true): Observable<T> {
    return this.handleRequest(
      this.http.delete<any>(`${this.baseUrl}/${endpoint}`, data),
      showLoading,
      () => this.delete<T>(endpoint, data, showLoading),
      () => this.showSuccess('Xoá thành công')
    )
  }

  deletes<T>(endpoint: string, data: string | number[], showLoading = true): Observable<T> {
    return this.handleRequest(
      this.http.request<any>('delete', `${this.baseUrl}/${endpoint}`, { body: data }),
      showLoading,
      () => this.deletes<T>(endpoint, data, showLoading),
      () => this.showSuccess('Xoá thành công')
    )
  }

  // ========= HELPER METHODS =========

  private handleRequest<T>(
    request$: Observable<any>,
    showLoading: boolean,
    retryCallback: () => Observable<T>,
    onSuccess?: () => void
  ): Observable<T> {
    if (showLoading) this.globalService.incrementApiCallCount()

    return request$.pipe(
      tap(response => {
        if (response.status === false) this.showError(response.messageObject.message)
        if (onSuccess) onSuccess()
      }),
      map(this.handleApiResponse),
      catchError(error => this.handleError(error, retryCallback)),
      finalize(() => this.globalService.decrementApiCallCount())
    )
  }

  private toHttpParams(params?: any): HttpParams {
    let httpParams = new HttpParams()
    if (!params) return httpParams

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(val => {
            if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
              httpParams = httpParams.append(key, String(val))
            }
          })
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          httpParams = httpParams.append(key, String(value))
        }
      }
    })

    return httpParams
  }


  private handleApiResponse(response: any): any {
    const { code } = response.messageObject
    if (!['200', '', '0100', '0103', '0105'].includes(code)) {
      throw { status: code, error: response }
    }
    return response.data
  }

  private handleError(error: HttpErrorResponse, retryCallback: () => Observable<any>): Observable<any> {
    let errorMessage = 'Unknown error!'

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`
    } else {
      if (error.status === 401) {
        if (!this.refreshTokenInProgress) {
          this.refreshTokenInProgress = true
          this.refreshTokenSubject.next(null)

          return this.refreshToken().pipe(
            switchMap(({ data }) => {
              this.refreshTokenInProgress = false
              this.refreshTokenSubject.next(data)
              localStorage.setItem('token', data?.accessToken)
              localStorage.setItem('refreshToken', data?.refreshToken)
              return retryCallback()
            }),
            catchError(err => {
              this.refreshTokenInProgress = false
              localStorage.clear()
              this.router.navigate(['/login'])
              return throwError(() => err)
            })
          )
        } else {
          return this.refreshTokenSubject.pipe(
            filter(result => result !== null),
            take(1),
            switchMap(() => retryCallback())
          )
        }
      }

      if (error.error?.messageObject) {
        const { code, message } = error.error.messageObject
        errorMessage = `MSG${code} ${message}`
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`
      }
    }

    return throwError(() => errorMessage)
  }

  private refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken')
    return this.http.post<any>(`${this.baseUrl}/Auth/RefreshToken`, { refreshToken })
  }

  private showSuccess(message: string): void {
    this.message.create('success', message)
  }

  private showError(message: string): void {
    this.message.create('error', message)
  }
}
