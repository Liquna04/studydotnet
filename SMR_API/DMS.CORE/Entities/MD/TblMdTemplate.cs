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
    [Table("T_MD_TEMPLATE")]
    public class TblMdTemplate : BaseEntity
    {
        [Key]
        [Column("ID")]
        public string? Id { get; set; }

        [Column("NAME")]
        public string? Name { get; set; }

        [Column("FILE_NAME")]
        public string? FileName { get; set; }

        [Column("FILE_TYPE")]
        public string? FileType { get; set; }

        [Column("FILE_PATH")]
        public string? FilePath { get; set; }

        [Column("THUMB_PATH")]
        public string? ThumbPath { get; set; }

        [Column("THUMB_NAME")]
        public string? ThumbName { get; set; }

        [Column("TEMP_TYPE")]
        public string? TempType { get; set; }
    }
}
