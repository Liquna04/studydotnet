using DMS.CORE.Common;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using DMS.CORE.Entities.MD;

namespace DMS.CORE.Entities.MD.Attributes
{


    [Table("T_MD_CUSTOMER_ORG")]
    public class TblMdCustomerOrg : BaseEntity
    {
        [Key]
        [Column("ID")]
        public string Id { get; set; }
        [Column("CUSTOMER_CODE")]
        public string CustomerCode { get; set; }
        [Column("ORG_CODE")]
        public string OrgCode { get; set; }
       



    }

}
