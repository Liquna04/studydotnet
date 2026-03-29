using DMS.CORE.Common;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DMS.CORE.Entities.PO
{
    [Table("T_PO_HHK_HISTORY")]
    public class TblPoHhkHistory : BaseEntity
    {
        [Key]
        [Column("PKID")]
        public string Pkid { get; set; }

        [Column("HEADER_CODE")]
        public string HeaderCode { get; set; }

        [Column("STATUS")]
        public string Status { get; set; }

        [Column("NOTES")]
        public string Notes { get; set; }

        [Column("STATUS_DATE")]
        public DateTime? StatusDate { get; set; }

  

        // Audit columns are inherited from BaseEntity
    }
}
