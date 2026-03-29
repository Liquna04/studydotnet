using DMS.CORE.Common;
using DMS.CORE.Entities.PO;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Runtime.CompilerServices;

namespace DMS.CORE.Entities.MD
{
    [Table("T_MD_UNIT_PRODUCT")]
    public class TblMdUnitProduct : BaseEntity
    {
        [Key]
        [Column("ID")]
        public string Id { get; set; }

        [Column("NAME")]
        public string Name { get; set; }

        [Column("CODE")]
        public string Code { get; set; }



    }
}
