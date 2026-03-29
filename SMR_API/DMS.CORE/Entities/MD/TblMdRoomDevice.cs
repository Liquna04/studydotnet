using DMS.CORE.Common;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DMS.CORE.Entities.MD
{
    [Table("T_MD_ROOM_DEVICE")]
    public class TblMdRoomDevice : BaseEntity
    {
        [Key]
        [Column("CODE")]
        public string Code { get; set; }

        [Column("ROOM_CODE")]
        public string? RoomCode { get; set; }

        [Column("DEVICE_CODE")]
        public string? DeviceCode { get; set; }

        [Column("QUANTITY")]
        public int? Quantity { get; set; }

    }
}
