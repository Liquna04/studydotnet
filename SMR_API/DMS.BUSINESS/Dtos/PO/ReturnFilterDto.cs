using Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Dtos.PO
{
    public class ReturnFilterDto : BaseFilter
    {
        /// <summary>
        /// User name (from claims, matches CREATE_BY in T_PO_HHK)
        /// </summary>
        public string? UserName { get; set; }

        /// <summary>
        /// Account type: KD (distributor) or KH (customer)
        /// </summary>
        public string? AccountType { get; set; }

        /// <summary>
        /// Optional keyword for search (Code, CustomerName, CustomerCode)
        /// </summary>
    }
}
