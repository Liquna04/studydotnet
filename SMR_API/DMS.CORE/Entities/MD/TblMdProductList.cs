using DMS.CORE.Common;
using DMS.CORE.Entities.PO;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Runtime.CompilerServices;

namespace DMS.CORE.Entities.MD
{
    [Table("T_MD_PRODUCT_LIST")]
    public class TblMdProductList : BaseEntity
    {
        [Key]
        [Column("ID")]
        public string? Id { get; set; }

        [Column("NAME")]
        public string? Name { get; set; }

        [Column("CODE")]
        public string? Code { get; set; }
        [Column("TYPE")]
        public string? Type { get; set; }
        [Column("UNIT")]
        public string? Unit { get; set; }
        [Column("BASIC_UNIT")]
        public string? BasicUnit { get; set; }
        [Column("PRICE")]
        public decimal? Price { get; set; }

        [ForeignKey(nameof(Type))]
        public TblMdProductType? ProductType { get; set; }

        [ForeignKey(nameof(Unit))]
        public TblMdUnitProduct? UnitProduct { get; set; }

        [ForeignKey(nameof(BasicUnit))]
        public TblMdUnitProduct? BasicUnitProduct { get; set; }

    }
}
