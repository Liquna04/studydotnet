using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DMS.CORE.Common;

namespace DMS.CORE.Entities.AD
{
    [Table("T_AD_ACCOUNT_ORG")]
    public class TblAdAccountOrg : SoftDeleteEntity
    {
        [Key]
        [Column("ID")]
        public string? Id { get; set; }


        [Column("USERNAME")]
        [MaxLength(100)]
        public string? Username { get; set; }


        [Column("ORG_CODE")]
        [MaxLength(50)]
        public string? OrgCode { get; set; }
    }
}