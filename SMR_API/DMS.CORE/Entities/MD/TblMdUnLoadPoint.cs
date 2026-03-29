using DMS.CORE.Common;
using DMS.CORE.Entities.MD.Attributes;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Runtime.CompilerServices;

namespace DMS.CORE.Entities.MD
{
    [Table("T_MD_UNLOADPOINT")]
    public class TblMdUnLoadPoint : BaseEntity
    {
        [Key]
        [Column("ID")]
        public string ID { get; set; }
        [Column("CUSTOMER_ID")]
        public string CustomerId { get; set; }

        [Column("NAME")]
        public string Name { get; set; }

        [Column("CODE")]
        public string Code { get; set; }
        [ForeignKey(nameof(CustomerId))]
        public TblMdCustomer Customer { get; set; }
    }
}
