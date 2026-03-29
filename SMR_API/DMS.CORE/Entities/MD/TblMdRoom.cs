using DMS.CORE.Common;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DMS.CORE.Entities.MD
{
    [Table("T_MD_ROOM")]
    public class TblMdRoom : BaseEntity
    {
        [Key]
        [Column("ID")]
        public string Id { get; set; }

        [Column("NAME")]
        public string Name { get; set; }

        [Column("COLS")]
        public decimal? Cols { get; set; }

        [Column("ROWS")]
        public decimal? Rows { get; set; }

        [Column("ADDRESS")]
        public string? Address { get; set; }

        [Column("NOTE")]
        public string? Note { get; set; }

        [Column("FILE_PATH")]
        public string? FilePath { get; set; }

        [Column("TOTAL_SEAT")]
        public decimal? TotalSeat { get; set; }
    }
}
