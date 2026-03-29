using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Dtos.PO
{
    public class PoHhkHistoryDetailReturnDto
    {
        [Key]
        public string? Pkid { get; set; }

        public string? HeaderCode { get; set; }

    
        public string? Status { get; set; }

        public string? Notes { get; set; }

        public DateTime? StatusDate { get; set; }


        public string? CreateBy { get; set; }


        public string? UserFullName { get; set; }

        public DateTime? CreateDate { get; set; }
    }
}
