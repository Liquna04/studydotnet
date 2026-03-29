using DMS.CORE.Common;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DMS.CORE.Entities.MD.Attributes
{
    [AttributeUsage(AttributeTargets.Property, AllowMultiple = false)]
    public class ExcelColumnAttribute : Attribute
    {
        public string Name { get; }

        public ExcelColumnAttribute(string name)
        {
            Name = name?.Trim().ToLower() ?? throw new ArgumentNullException(nameof(name));
        }
    }
    [Table("T_MD_TRANSPORT_VEHICLE")]
    public class TblMdTransportVehicle : BaseEntity
    {
        [Key]
        [Column("ID")]
        public string Id { get; set; }
        [Column("CODE")]
        [ExcelColumn("mã phương tiện")]
        public string Code { get; set; }
        [Column("NAME")]
        [ExcelColumn("tên phương tiện")]
        public string Name { get; set; }
        [Column("TYPE")]
        [ExcelColumn("loại phương tiện")]
        public string Type { get; set; }

        [Column("CAPACITY")]
        [ExcelColumn("dung tích")]
        public string Capacity { get; set; }
        [Column("DRIVER")]
        [ExcelColumn("tên tài xế")]
        public string Driver { get; set; }

        [ForeignKey(nameof(Type))]
        public TblMdTransportType TransportType { get; set; }
    }
    
}
