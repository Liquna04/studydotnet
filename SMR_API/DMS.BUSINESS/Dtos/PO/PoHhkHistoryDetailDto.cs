using System.ComponentModel.DataAnnotations;

namespace DMS.BUSINESS.Dtos.PO
{
    /// <summary>
    /// Extended DTO for order history that includes user information
    /// Used for order detail view to display full history with user names
    /// </summary>
    public class PoHhkHistoryDetailDto
    {
        [Key]
        public string? Pkid { get; set; }

        public string? HeaderCode { get; set; }

        /// <summary>
        /// Status code: -1 (Hủy), 0 (Chỉnh sửa), 1 (Khởi tạo), 2 (Chờ duyệt)
        /// </summary>
        public string? Status { get; set; }

        public string? Notes { get; set; }

        public DateTime? StatusDate { get; set; }

        /// <summary>
        /// User who created/updated the history record (USER_NAME)
        /// </summary>
        public string? CreateBy { get; set; }

        /// <summary>
        /// Full name of the user (from T_AD_ACCOUNT.FULL_NAME)
        /// </summary>
        public string? UserFullName { get; set; }

        public DateTime? CreateDate { get; set; }
    }
}
