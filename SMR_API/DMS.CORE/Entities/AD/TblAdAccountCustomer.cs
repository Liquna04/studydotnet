using DMS.CORE.Common;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using OfficeOpenXml.Attributes;

//using ExcelMapper;

namespace DMS.CORE.Entities.AD
{
    [Table("T_AD_ACCOUNT_CUSTOMER")]
    public class TblAdAccountCustomer : BaseEntity
    {
        [Key]
        [Column("ID")]
        public string Id { get; set; }

        [Column("CUSTOMER_CODE")]
        //[ExcelColumnName("Mã loại")]

        public string? CustomerCode { get; set; }

        [Column("USER_NAME")]
        public string? UserName { get; set; }
    }
}
