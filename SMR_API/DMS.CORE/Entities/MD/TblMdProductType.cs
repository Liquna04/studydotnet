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

namespace DMS.CORE.Entities.MD
{
    [Table("T_MD_PRODUCT_TYPE")]
    public class TblMdProductType : BaseEntity
    {
        [Key]
        [Column("ID")]
        public string Id { get; set; }

        [Column("CODE")]
        public string Code { get; set; }

        [Column("NAME")]
        public string Name { get; set; }
    }
}
