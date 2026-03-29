using DMS.CORE.Common;
using DMS.CORE.Entities.MD;
using DMS.CORE.Entities.MD.Attributes;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DMS.CORE.Entities.PO.Attribute
{
    [Table("T_PO_HHK")]
    public class TblPoHhk : BaseEntity
    {
        [Key]
        [Column("CODE")]
        [ExcelColumn("SỐ ĐƠN HÀNG SMO")]
        public string Code { get; set; }
        [Column("PO_TYPE")]
        [ExcelColumn("LOẠI ĐƠN HÀNG")]
        public string? PoType { get; set; }
        [Column("TOTAL_PRICE")]
        public decimal? TotalPrice { get; set; }

        [Column("CUSTOMER_CODE")]
        public string? CustomerCode { get; set; }

        [Column("CUSTOMER_NAME")]
        [ExcelColumn("KHÁCH HÀNG")]
        public string? CustomerName { get; set; }

        [Column("ORDER_DATE")]
        [ExcelColumn("NGÀY ĐẶT HÀNG")]
        public DateTime? OrderDate { get; set; }

        [Column("DELIVERY_DATE")]
        [ExcelColumn("NGÀY NHẬN HÀNG")]
        public DateTime? DeliveryDate { get; set; }

        [Column("RECEIPT_DATE")]
        public DateTime? ReceiptDate { get; set; }

        [Column("TRANSPORT_TYPE")]
        public string? TransportType { get; set; }
        [Column("TRANSPORT_METHOD")]
        public string? TransportMethod { get; set; }

        [Column("VEHICLE_CODE")]
        [ExcelColumn("SỐ XE")]
        public string? VehicleCode { get; set; }

        [Column("VEHICLE_INFO")]
        public string? VehicleInfo { get; set; }

        [Column("DRIVER")]
        [ExcelColumn("TÊN TÀI XẾ")]
        public string? Driver { get; set; }

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
        [ExcelColumn("GHI CHÚ")]
        public string? Note { get; set; }

        [Column("STATUS")]
        [ExcelColumn("TRẠNG THÁI")]
        public string? Status { get; set; }
        [Column("STORE_CODE")]
        [ExcelColumn("CỬA HÀNG")]
        public string? StoreCode { get; set; }

     
    }
}
