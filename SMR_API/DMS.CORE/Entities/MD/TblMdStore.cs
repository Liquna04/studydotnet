using DMS.CORE.Common;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DMS.CORE.Entities.MD
{


    [Table("T_MD_STORE")]
    public class TblMdStore : BaseEntity
    {
        [Key]
        [Column("ID")]
        public string Id { get; set; }
        [Column("CODE")]

        public string? Code { get; set; }
        [Column("NAME")]

        public string? Name { get; set; }
        [Column("EMAIL")]
        public string? Email { get; set; }
        [Column("PHONE")]

        public string? Phone { get; set; }

    }

}
