import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonService } from './common.service';
import { GlobalService } from './global.service';

// ========== EXISTING INTERFACES (GIỮ NGUYÊN) ==========
export interface ReportFilterDto {
  userName?: string;
  accountType?: string;
  fromDate?: string;
  toDate?: string;
  storeOrCustomer?: string;
  status?: string;
  productName?: string;
}

export interface ReportProductItemDto {
  matHang: string;
  luongDat?: number;
  luongPheDuyet?: number;
}

export interface ReportProductReturnItemDto {
  matHang: string;
  luongTra?: number;
}

export interface ReportPoHhkGroupedDto {
  stt: number;
  loaiDonHang: string;
  khachHang: string;
  cuaHang: string;
  soDonHangSMO: string;
  danhSachMatHang: ReportProductItemDto[];
  soXe: string;
  tenTaiXe: string;
  ngayDatHang: string;
  ngayNhanHang: string;
  ghiChu: string;
  trangThai: string;
}

export interface ReportPoHhkReturnGroupedDto {
  stt: number;
  loaiDonHang: string;
  khachHang: string;
  cuaHang: string;
  soDonTraHangSMO: string;
  danhSachMatHang: ReportProductReturnItemDto[];
  soXe: string;
  tenTaiXe: string;
  ngayTraHang: string;
  ngayNhanHang: string;
  ghiChu: string;
  trangThai: string;
}

// ========== NEW INTERFACES - BÁO CÁO THỜI GIAN THỰC ==========
export interface RealtimeProductDto {
  matHang: string;
  maMatHang?: string;
  luongDat: number;
  luongPheDuyet: number;
  luongGiao: number;
  luongConLai: number;
  tyLeGiao: number;
  donViTinh?: string;
}

export interface RealtimeReportDto {
  stt: number;
  soDonHangSMO: string;
  loaiDonHang: string;
  cuaHang?: string;
  khachHang?: string;
  soXe?: string;
  tenTaiXe?: string;
  ngayDatHang?: string;
  ngayDuKienGiao?: string;
  trangThai: string;
  capNhatLanCuoi?: string;
  danhSachMatHang: RealtimeProductDto[];
  tongLuongDat: number;
  tongLuongPheDuyet: number;
  tongLuongGiao: number;
  tongLuongConLai: number;
  tyLeHoanThanh: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  constructor(
    private commonService: CommonService,
    private globalService: GlobalService
  ) { }

  /**
   * Lấy thông tin user từ localStorage
   */
  private getUserInfo(): { userName: string; accountType: string } {
    const userInfo = this.globalService.getUserInfo();
    const userName = userInfo?.userName || localStorage.getItem('userName') || 'SYSTEM';
    const accountType = userInfo?.accountType || 'KH';

    return { userName, accountType };
  }

  /**
   * Build params với user info
   */
  private buildParams(filter: ReportFilterDto): any {
    const { userName, accountType } = this.getUserInfo();

    const params: any = {
      userName,
      accountType
    };

    if (filter.fromDate) params.fromDate = filter.fromDate;
    if (filter.toDate) params.toDate = filter.toDate;
    if (filter.storeOrCustomer) params.storeOrCustomer = filter.storeOrCustomer;
    if (filter.status) params.status = filter.status;
    if (filter.productName) params.productName = filter.productName;

    return params;
  }

  // ========== EXISTING METHODS - SỬ DỤNG CommonService ==========

  /**
   * Lấy báo cáo đơn hàng
   */
  getOrderReport(filter: ReportFilterDto): Observable<any> {
    const params = this.buildParams(filter);
    return this.commonService.get<any>('RpOrder/GetReport', params);
  }

  /**
   * Lấy danh sách sản phẩm
   */
  getProductList(params: any): Observable<any> {
    return this.commonService.get<any>('RpOrder/GetProductList', params);
  }

  /**
   * Lấy báo cáo trả hàng
   */
  getReturnReport(filter: ReportFilterDto): Observable<any> {
    const params = this.buildParams(filter);
    return this.commonService.get<any>('RpReturn/GetReturnReport', params);
  }

  /**
   * Xuất Excel báo cáo đơn hàng
   */
  generateOrderReport(filter: ReportFilterDto): Observable<Blob> {
  const params = this.buildParams(filter);
  return this.commonService.postBlob('RpOrder/ExportReportOrder', params);
}

  /**
   * Xuất Excel báo cáo trả hàng
   */
    generateReturnReport(filter: ReportFilterDto): Observable<Blob> {
  const params = this.buildParams(filter);
  return this.commonService.postBlob('RpReturn/ExportReportReturn', params);
}


  getRealtimeReport(filter: ReportFilterDto): Observable<any> {
    const params = this.buildParams(filter);
    return this.commonService.get<any>('Report/GetRealtimeReport', params);
  }


exportRealtimeExcel(filter: ReportFilterDto): Observable<Blob> {
  const params = this.buildParams(filter);
  return this.commonService.postBlob('Report/ExportRealtimeReport', params);
}


  downloadFile(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}