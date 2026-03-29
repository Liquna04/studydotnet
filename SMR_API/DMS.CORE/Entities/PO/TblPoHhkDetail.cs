using DMS.CORE.Common;
using DMS.CORE.Entities.MD;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DMS.CORE.Entities.PO.Attribute
{
    [Table("T_PO_HHK_DETAIL")]
    public class TblPoHhkDetail : BaseEntity
    {
        [Column("HEADER_CODE")]
        public string HeaderCode { get; set; }

        [Column("MATERIAL_CODE")]
        public string MaterialCode { get; set; }

        [Column("NUMBER_ITEM")]
        public int? NumberItem { get; set; }

        [Column("QUANTITY")]
        public decimal? Quantity { get; set; }

        [Column("APPROVE_QUANTITY")]
        public decimal? ApproveQuantity { get; set; }

        [Column("REAL_QUANTITY")]
        public decimal? RealQuantity { get; set; }

        [Column("UNIT_CODE")]
        public string UnitCode { get; set; }

        [Column("BASIC_UNIT")]
        public string? BasicUnit { get; set; }
        [Column("PRICE")]
        public decimal? Price { get; set; }


    }
}
