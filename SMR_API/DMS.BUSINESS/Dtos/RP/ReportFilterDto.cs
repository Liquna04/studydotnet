using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Dtos.RP
{
    public class ReportFilterDto
    {
        // Các thông tin cơ bản
        public string? UserName { get; set; }
        public string? AccountType { get; set; } // KD, CH, KT, KH
        public string? StoreOrCustomer { get; set; } // Mã cửa hàng hoặc Mã khách hàng
        public string? ProductName { get; set; }
        public string? Status { get; set; }          // Trạng thái đơn
        public DateTime? FromDate { get; set; }      // Từ ngày
        public DateTime? ToDate { get; set; }        // Đến ngày
        public string? Shift { get; set; }           // "day" hoặc "night"
    }
}
