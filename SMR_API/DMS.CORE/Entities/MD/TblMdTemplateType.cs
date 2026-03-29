using DMS.CORE.Common;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;


namespace DMS.CORE.Entities.MD
{
    [Table("T_MD_TEMPLATE_TYPE")]
    public class TblMdTemplateType : BaseEntity
    {
        [Key]
        [Column("ID")]
        public string? Id { get; set; }

        [Column("NAME")]
        public string Name { get; set; }
    }
}