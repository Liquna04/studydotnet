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
    [Table("T_MD_ROOM_SEAT")]
    public class TblMdRoomSeat : BaseEntity
    {
        [Key]
        [Column("ID")]
        public string Id { get; set; }

        [Column("NAME")]
        public string Name { get; set; }

        [Column("COL")]
        public decimal Col { get; set; }

        [Column("ROW")]
        public decimal Row { get; set; }

        [Column("ROOM_ID")]
        public string RoomId { get; set; }

        [Column("TYPE")]
        public string? Type { get; set; }

    }
}
