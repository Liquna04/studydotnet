using DMS.CORE.Common;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using DMS.CORE.Entities.MD;

namespace DMS.CORE.Entities.MD.Attributes
{
   

    [Table("T_MD_CUSTOMER")]
    public class TblMdCustomer : BaseEntity
    {
        [Key]
        [Column("ID")]
        public string Id { get; set; }
        [Column("CUSTOMER_CODE")]
        [ExcelColumn("Mã khách hàng")]

        public string? CustomerCode { get; set; }
        [Column("FULL_NAME")]
        [ExcelColumn("Tên khách hàng")]
        public string? FullName { get; set; }
        [Column("SHORT_NAME")]
        [ExcelColumn("Tên tắt")]

        public string? ShortName { get; set; }
        [Column("ADDRESS")]
        [ExcelColumn("Địa chỉ nhận thông báo")]

        public string? Address { get; set; }
        [Column("VAT_NUMBER")]
        [ExcelColumn("Mã số thuế")]

        public string? VatNumber { get; set; }
        [Column("EMAIL")]
        [ExcelColumn("Email")]
        public string? Email { get; set; }
        [Column("PHONE")]
        [ExcelColumn("Số điện thoại")]

        public string? Phone { get; set; }
        [Column("IS_SEND_ONLY_REJECT")]

        public bool? IsSendOnlyReject { get; set; }
        [Column("GIAO_CHXD")]
        [ExcelColumn("Giao CHXD")]
        public string? GiaoCHXD { get; set; }
      

    }

}
