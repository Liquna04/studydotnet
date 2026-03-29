using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Dtos.RP
{
    public class ReportReturnDto
    {
        /// <summary>
        /// DTO chi tiết từng sản phẩm trả hàng (chỉ có số lượng, không có lượng phê duyệt)
        /// </summary>
        public class ReportProductReturnItemDto
        {
            public string MatHang { get; set; }      // Tên sản phẩm
            public decimal? LuongTra { get; set; }   // Số lượng trả
        }

        /// <summary>
        /// DTO cho báo cáo đơn trả hàng gộp (mỗi đơn = 1 dòng, có nhiều sản phẩm)
        /// </summary>
        public class ReportPoHhkReturnGroupedDto
        {
            public int STT { get; set; }
            public string LoaiDonHang { get; set; }           // PoType
            public string KhachHang { get; set; }             // CustomerName
            public string CuaHang { get; set; }               // Tên cửa hàng
            public string SoDonTraHangSMO { get; set; }       // Code (Return Order Code)

            // DANH SÁCH SẢN PHẨM TRẢ (nhiều sản phẩm trong 1 đơn)
            public List<ReportProductReturnItemDto> DanhSachMatHang { get; set; } = new List<ReportProductReturnItemDto>();

            public string SoXe { get; set; }                  // VehicleCode
            public string TenTaiXe { get; set; }              // Driver
            public DateTime? NgayTraHang { get; set; }        // OrderDate (Ngày trả)
            public DateTime? NgayNhanHang { get; set; }       // ReceiptDate
            public string GhiChu { get; set; }                // Note
            public string TrangThai { get; set; }             // Status (mapped to Vietnamese)
        }

        /// <summary>
        /// DTO Detail item cho đơn trả hàng
        /// </summary>
        public class PoHhkDetailReturnItemDto
        {
            public string MaterialCode { get; set; }
            public int? NumberItem { get; set; }
            public decimal? Quantity { get; set; }
            public string UnitCode { get; set; }
            public string? BasicUnit { get; set; }
            public decimal? Price { get; set; }
        }
    }
}
