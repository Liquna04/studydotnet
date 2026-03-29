using DMS.CORE.Common;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.CORE.Entities.PO
{
    [Table("T_PO_HHK_DETAIL_RETURN")]
    public class TblPoHhkDetailReturn : BaseEntity
    {
        [Key]
        [Column("PKID")]
        public string Pkid { get; set; }

        [Column("HEADER_CODE")]
        public string HeaderCode { get; set; }

        [Column("MATERIAL_CODE")]
        public string MaterialCode { get; set; }

        [Column("NUMBER_ITEM")]
        public int? NumberItem { get; set; }

        [Column("RETURN_QUANTITY")]
        public decimal? ReturnQuantity { get; set; }

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


        [ForeignKey(nameof(HeaderCode))]
        public virtual TblPoHhkReturn PoHhkReturn { get; set; }
    }
}
