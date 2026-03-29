using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Common.Constants
{
    /// <summary>
    /// Constants cho Purchase Order (PO)
    /// </summary>
    public static class PoConstants
    {
        /// <summary>
        /// Loại đơn hàng
        /// </summary>
        public static class PoType
        {
            public const string InProvince = "IN_PROVINCE";
            public const string OutProvince = "OUT_PROVINCE";
        }

        /// <summary>
        /// Tên hiển thị loại đơn hàng
        /// </summary>
        public static class PoTypeName
        {
            public const string InProvince = "Nội tỉnh";
            public const string OutProvince = "Ngoại tỉnh";
        }

        /// <summary>
        /// Trạng thái đơn hàng
        /// </summary>
        public static class PoStatus
        {
            public const string KhoiTao = "1";
            public const string ChoPheDuyet = "2";
            public const string DaPheDuyetSoLuong = "-3";
            public const string DaPheDuyet = "3";
            public const string TuChoi = "4";
            public const string DaXacNhanThucNhan = "5";
            public const string DaHuy = "-1";
            public const string ChinhSuaThongTin = "0";
        }

        /// <summary>
        /// Tên hiển thị trạng thái
        /// </summary>
        public static class PoStatusName
        {
            public const string KhoiTao = "Khởi tạo";
            public const string ChoPheDuyet = "Chờ phê duyệt";
            public const string DaPheDuyetSoLuong = "Đã phê duyệt số lượng";
            public const string DaPheDuyet = "Đã phê duyệt";
            public const string TuChoi = "Từ chối";
            public const string DaXacNhanThucNhan = "Đã xác nhận thực nhận";
            public const string DaHuy = "Đã hủy";
            public const string ChinhSuaThongTin = "Chỉnh sửa thông tin";
        }

        /// <summary>
        /// Helper method: Convert PoType code sang tên tiếng Việt
        /// </summary>
        public static string GetPoTypeName(string poType)
        {
            return poType switch
            {
                PoType.InProvince => PoTypeName.InProvince,
                PoType.OutProvince => PoTypeName.OutProvince,
                _ => poType ?? ""
            };
        }

        /// <summary>
        /// Helper method: Convert Status code sang tên tiếng Việt
        /// </summary>
        public static string GetStatusName(string status)
        {
            return status switch
            {
                PoStatus.KhoiTao => PoStatusName.KhoiTao,
                PoStatus.ChoPheDuyet => PoStatusName.ChoPheDuyet,
                PoStatus.DaPheDuyetSoLuong => PoStatusName.DaPheDuyetSoLuong,
                PoStatus.DaPheDuyet => PoStatusName.DaPheDuyet,
                PoStatus.TuChoi => PoStatusName.TuChoi,
                PoStatus.DaXacNhanThucNhan => PoStatusName.DaXacNhanThucNhan,
                PoStatus.DaHuy => PoStatusName.DaHuy,
                PoStatus.ChinhSuaThongTin => PoStatusName.ChinhSuaThongTin,
                _ => status ?? ""
            };
        }
    }
}