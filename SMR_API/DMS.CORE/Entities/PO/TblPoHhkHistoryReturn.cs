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
    [Table("T_PO_HHK_HISTORY_RETURN")]
    public class TblPoHhkHistoryReturn : BaseEntity
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


    }
}
