using System;
using System.Collections.Generic;

namespace DMS.BUSINESS.Dtos.RP
{
    /// DTO báo cáo thời gian thực
    /// </summary>
    public class RealtimeReportDto
    {
        public int STT { get; set; }
        public string SoDonHangSMO { get; set; }
        public string LoaiDonHang { get; set; }
        public string? CuaHang { get; set; }
        public string? KhachHang { get; set; }
        public string? SoXe { get; set; }
        public string? TenTaiXe { get; set; }
        public DateTime? NgayDatHang { get; set; }
        public DateTime? NgayDuKienGiao { get; set; }
        public string TrangThai { get; set; }
        public DateTime? CapNhatLanCuoi { get; set; }

        // Danh sách mặt hàng
        public List<RealtimeProductDto> DanhSachMatHang { get; set; } = new List<RealtimeProductDto>();

        // Thông tin tổng hợp
        public decimal TongLuongDat { get; set; }
        public decimal TongLuongPheDuyet { get; set; }
        public decimal TongLuongGiao { get; set; }
        public decimal TongLuongConLai { get; set; }
        public decimal TyLeHoanThanh { get; set; } // % hoàn thành
    }

    /// <summary>
    /// DTO sản phẩm trong báo cáo thời gian thực
    /// </summary>
    public class RealtimeProductDto
    {
        public string MatHang { get; set; }
        public string? MaMatHang { get; set; }
        public decimal LuongDat { get; set; }
        public decimal LuongPheDuyet { get; set; }
        public decimal LuongGiao { get; set; }
        public decimal LuongConLai { get; set; }
        public decimal TyLeGiao { get; set; } // % đã giao
        public string? DonViTinh { get; set; }
    }

}
