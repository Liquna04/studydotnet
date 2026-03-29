using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Dtos.RP
{
    public class ReportOrderDto
    {
        /// <summary>
        /// DTO chi tiết từng sản phẩm (dùng trong danh sách con)
        /// </summary>
        public class ReportProductItemDto
        {
            public string MatHang { get; set; }          // Tên sản phẩm
            public decimal? LuongDat { get; set; }       // Số lượng đặt
            public decimal? LuongPheDuyet { get; set; }  // Số lượng phê duyệt
        }

        /// <summary>
        /// DTO cho báo cáo đơn hàng gộp (mỗi đơn = 1 dòng, có nhiều sản phẩm)
        /// </summary>
        public class ReportPoHhkGroupedDto
        {
            public int STT { get; set; }
            public string LoaiDonHang { get; set; }           // PoType
            public string KhachHang { get; set; }              // CustomerName
            public string CuaHang { get; set; }                 // Tên cửa hàng
            public string SoDonHangSMO { get; set; }           // Code (Order Code)

            // DANH SÁCH SẢN PHẨM (nhiều sản phẩm trong 1 đơn)
            public List<ReportProductItemDto> DanhSachMatHang { get; set; } = new List<ReportProductItemDto>();

            public string SoXe { get; set; }                   // VehicleInfo
            public string TenTaiXe { get; set; }               // Driver
            public DateTime? NgayDatHang { get; set; }         // OrderDate
            public DateTime? NgayNhanHang { get; set; }        // ReceiptDate
            public string GhiChu { get; set; }                 // Note
            public string TrangThai { get; set; }              // Status (mapped to Vietnamese)
        }
    }
}
