using DMS.CORE.Common;
using DMS.CORE.Entities.MD;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.CORE.Entities.PO
{
    [Table("T_PO_HHK_RETURN")]
    public class TblPoHhkReturn : BaseEntity
    {
        [Key]
        [Column("CODE")]
        public string Code { get; set; }
        [Column("PO_TYPE")]
        public string? PoType { get; set; }
        [Column("TOTAL_PRICE")]
        public decimal? TotalPrice { get; set; }
        [Column("ORDER_CODE")]
        public string? OrderCode { get; set; }

        [Column("CUSTOMER_CODE")]
        public string? CustomerCode { get; set; }


        [Column("CUSTOMER_NAME")]
        public string? CustomerName { get; set; }

        [Column("ORDER_DATE")]
        public DateTime? OrderDate { get; set; }

        [Column("DELIVERY_DATE")]
        public DateTime? DeliveryDate { get; set; }

        [Column("RECEIPT_DATE")]
        public DateTime? ReceiptDate { get; set; }

        [Column("TRANSPORT_TYPE")]
        public string? TransportType { get; set; }

        [Column("VEHICLE_CODE")]
        public string? VehicleCode { get; set; }

        [Column("DRIVER")]
        public string? Driver { get; set; }

        [Column("TRANSPORT_UNIT")]
        public string? TransportUnit { get; set; }
        [Column("STORE_CODE")]
        public string? StoreCode { get; set; }

        [Column("STORAGE_CODE")]
        public string? StorageCode { get; set; }

        [Column("STORAGE_NAME")]
        public string? StorageName { get; set; }

        [Column("REPRESENTATIVE")]
        public string? Representative { get; set; }

        [Column("EMAIL")]
        public string? Email { get; set; }

        [Column("PHONE")]
        public string? Phone { get; set; }

        [Column("NOTE")]
        public string? Note { get; set; }

        [Column("STATUS")]
        public string? Status { get; set; }
        [Column("RETURN_REASON")]
        public string? ReturnReason { get; set; }
        [Column("RETURN_DATE")]
        public DateTime? ReturnDate { get; set; }
        [Column("APPROVED_BY")]
        public string? ApprovedBy { get; set; }
        [Column("APPROVED_DATE")]
        public DateTime? ApprovedDate { get; set; }
        [Column("REJECT_REASON")]
        public string? RejectReason { get; set; }
        [Column("ATTACHMENT_PATH")]
        public string? AttachmentPath { get; set; }
        [Column("RETURN_NOTE")]
        public string? ReturnNote { get; set; }
        [Column("EXPECTED_RETURN_DATE")]
        public DateTime? ExpectedReturnDate { get; set; }
        public virtual ICollection<TblPoHhkDetailReturn> PoHhkDetailReturn { get; set; }

    }
}
