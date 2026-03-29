using Common;
using Common.API;
using DMS.API.AppCode.Attribute;
using DMS.API.AppCode.Enum;
using DMS.API.AppCode.Extensions;
using DMS.BUSINESS.Dtos.PO;
using DMS.BUSINESS.Dtos.RP;
using DMS.BUSINESS.Services.MD;
using DMS.BUSINESS.Services.RP;
using DocumentFormat.OpenXml.Office2010.Excel;
using Microsoft.AspNetCore.Mvc;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using System.Drawing;
using System.Security.Claims;

namespace DMS.API.Controllers.RP
{
    [Route("api/[controller]")]
    [ApiController]
    public class RpOrderController : ControllerBase
    {
        private readonly IRpOrderService _service;
        private readonly IProductListService _productListService;

        public RpOrderController(IRpOrderService service,IProductListService productListService)
        {
            _service = service;
            _productListService = productListService;

        }


        [HttpGet("GetProductList")]
        public async Task<IActionResult> GetProductList([FromQuery] BaseMdFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _productListService.GetAll(filter);
            if (_productListService.Status)
            {
                transferObject.Data = result;
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0001", _productListService);
            }
            return Ok(transferObject);
        }

        [HttpGet("GetReport")]
        public async Task<IActionResult> GetReport([FromQuery] ReportFilterDto filterDto)
        {
            var transferObject = new TransferObject();

            // 1. Xử lý thông tin User/Account từ Token (Logic phân quyền & bảo mật)
            if (string.IsNullOrEmpty(filterDto.UserName) || filterDto.UserName == "SYSTEM")
            {
                filterDto.UserName = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "SYSTEM";
            }

            if (string.IsNullOrEmpty(filterDto.AccountType))
            {
                filterDto.AccountType = User?.FindFirst("AccountType")?.Value ?? "KH";
            }

            // 2. Gọi Service
            var result = await _service.GetReportOrdersFiltered(filterDto);

            if (_service.Status)
            {
                transferObject.Data = result;
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0001", _service);
            }

            return Ok(transferObject);
        }

        /// <summary>
        /// Export báo cáo đơn hàng ra file Excel
        /// PHƯƠNG ÁN 1: Dùng POST (KHUYẾN NGHỊ - tránh URL quá dài)
        /// </summary>
        [HttpPost("ExportReportOrder")]
        public async Task<IActionResult> ExportReporOrderToExcel([FromBody] ReportFilterDto filterDto)
        {
            try
            {
                // ===== THÊM LOGIC PHÂN QUYỀN (GIỐNG GetReport) =====
                if (string.IsNullOrEmpty(filterDto.UserName) || filterDto.UserName == "SYSTEM")
                {
                    filterDto.UserName = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "SYSTEM";
                }

                if (string.IsNullOrEmpty(filterDto.AccountType))
                {
                    filterDto.AccountType = User?.FindFirst("AccountType")?.Value ?? "KH";
                }

                // Lấy dữ liệu báo cáo
                var reportData = await _service.GetReportOrdersFiltered(filterDto);

                if (reportData == null || !reportData.Any())
                {
                    return BadRequest(new { message = "Không có dữ liệu để xuất báo cáo" });
                }

                // Tạo file Excel
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

                using var package = new ExcelPackage();
                var worksheet = package.Workbook.Worksheets.Add("Báo Cáo Đơn Hàng");

                // ===== TITLE ROW =====
                worksheet.Cells[1, 1].Value = "BÁO CÁO ĐƠN HÀNG";
                worksheet.Cells[1, 1, 1, 13].Merge = true;
                worksheet.Cells[1, 1].Style.Font.Bold = true;
                worksheet.Cells[1, 1].Style.Font.Size = 16;
                worksheet.Cells[1, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                worksheet.Cells[1, 1].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                worksheet.Row(1).Height = 30;

                // ===== SUBTITLE ROW (Thời gian lọc - nếu có) =====
                string subtitle = "";
                if (filterDto.FromDate.HasValue && filterDto.ToDate.HasValue)
                {
                    subtitle = $"Từ ngày {filterDto.FromDate.Value:dd/MM/yyyy} đến ngày {filterDto.ToDate.Value:dd/MM/yyyy}";
                }
                else if (filterDto.FromDate.HasValue)
                {
                    subtitle = $"Từ ngày {filterDto.FromDate.Value:dd/MM/yyyy}";
                }
                else if (filterDto.ToDate.HasValue)
                {
                    subtitle = $"Đến ngày {filterDto.ToDate.Value:dd/MM/yyyy}";
                }

                if (!string.IsNullOrEmpty(subtitle))
                {
                    worksheet.Cells[2, 1].Value = subtitle;
                    worksheet.Cells[2, 1, 2, 13].Merge = true;
                    worksheet.Cells[2, 1].Style.Font.Italic = true;
                    worksheet.Cells[2, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    worksheet.Row(2).Height = 20;
                }

                // ===== HEADER ROW =====
                var headerRow = string.IsNullOrEmpty(subtitle) ? 2 : 3;

                // Xác định tiêu đề cột 4 dựa trên StoreOrCustomer
                string column4Header = filterDto.StoreOrCustomer == "Store" ? "CỬA HÀNG" : "KHÁCH HÀNG";

                // THỨ TỰ: STT -> SỐ ĐƠN HÀNG SMO
                worksheet.Cells[headerRow, 1].Value = "STT";
                worksheet.Cells[headerRow, 2].Value = "SỐ ĐƠN HÀNG SMO";
                worksheet.Cells[headerRow, 3].Value = "LOẠI ĐƠN HÀNG";
                worksheet.Cells[headerRow, 4].Value = column4Header; // ĐỘNG: CỬA HÀNG hoặc KHÁCH HÀNG
                worksheet.Cells[headerRow, 5].Value = "MẶT HÀNG";
                worksheet.Cells[headerRow, 6].Value = "LƯỢNG ĐẶT";
                worksheet.Cells[headerRow, 7].Value = "LƯỢNG PHÊ DUYỆT";
                worksheet.Cells[headerRow, 8].Value = "SỐ XE";
                worksheet.Cells[headerRow, 9].Value = "TÊN TÀI XẾ";
                worksheet.Cells[headerRow, 10].Value = "NGÀY ĐẶT HÀNG";
                worksheet.Cells[headerRow, 11].Value = "NGÀY NHẬN HÀNG";
                worksheet.Cells[headerRow, 12].Value = "GHI CHÚ";
                worksheet.Cells[headerRow, 13].Value = "TRẠNG THÁI";

                // Style cho header
                using (var range = worksheet.Cells[headerRow, 1, headerRow, 13])
                {
                    range.Style.Font.Bold = true;
                    range.Style.Fill.PatternType = ExcelFillStyle.Solid;
                    range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(79, 129, 189)); // Xanh dương
                    range.Style.Font.Color.SetColor(System.Drawing.Color.White);
                    range.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    range.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    range.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                    range.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
                    range.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                    range.Style.Border.Right.Style = ExcelBorderStyle.Thin;
                    range.Style.WrapText = true;
                }
                worksheet.Row(headerRow).Height = 30;

                // ===== DATA ROWS =====
                int currentRow = headerRow + 1;

                foreach (var order in reportData)
                {
                    int startRow = currentRow;

                    // Nếu đơn hàng có sản phẩm
                    if (order.DanhSachMatHang != null && order.DanhSachMatHang.Any())
                    {
                        for (int i = 0; i < order.DanhSachMatHang.Count; i++)
                        {
                            var product = order.DanhSachMatHang[i];

                            // Chỉ điền thông tin chung ở dòng đầu tiên
                            if (i == 0)
                            {
                                // THỨ TỰ: STT -> Số đơn SMO
                                worksheet.Cells[currentRow, 1].Value = order.STT;
                                worksheet.Cells[currentRow, 2].Value = order.SoDonHangSMO;
                                worksheet.Cells[currentRow, 3].Value = order.LoaiDonHang;

                                // HIỂN THỊ CỬA HÀNG HOẶC KHÁCH HÀNG DỰA TRÊN StoreOrCustomer
                                if (filterDto.StoreOrCustomer == "Store")
                                {
                                    worksheet.Cells[currentRow, 4].Value = order.CuaHang;  // Hiển thị tên cửa hàng
                                }
                                else
                                {
                                    worksheet.Cells[currentRow, 4].Value = order.KhachHang;  // Hiển thị tên khách hàng
                                }

                                worksheet.Cells[currentRow, 8].Value = order.SoXe;
                                worksheet.Cells[currentRow, 9].Value = order.TenTaiXe;
                                worksheet.Cells[currentRow, 10].Value = order.NgayDatHang?.ToString("dd/MM/yyyy");
                                worksheet.Cells[currentRow, 11].Value = order.NgayNhanHang?.ToString("dd/MM/yyyy");
                                worksheet.Cells[currentRow, 12].Value = order.GhiChu;
                                worksheet.Cells[currentRow, 13].Value = order.TrangThai;
                            }

                            // Thông tin sản phẩm
                            worksheet.Cells[currentRow, 5].Value = product.MatHang;
                            worksheet.Cells[currentRow, 6].Value = product.LuongDat;
                            worksheet.Cells[currentRow, 7].Value = product.LuongPheDuyet;

                            currentRow++;
                        }

                        // Merge các ô nếu có nhiều sản phẩm
                        if (order.DanhSachMatHang.Count > 1)
                        {
                            int endRow = currentRow - 1;

                            worksheet.Cells[startRow, 1, endRow, 1].Merge = true;
                            worksheet.Cells[startRow, 2, endRow, 2].Merge = true;
                            worksheet.Cells[startRow, 3, endRow, 3].Merge = true;
                            worksheet.Cells[startRow, 4, endRow, 4].Merge = true;
                            worksheet.Cells[startRow, 8, endRow, 8].Merge = true;
                            worksheet.Cells[startRow, 9, endRow, 9].Merge = true;
                            worksheet.Cells[startRow, 10, endRow, 10].Merge = true;
                            worksheet.Cells[startRow, 11, endRow, 11].Merge = true;
                            worksheet.Cells[startRow, 12, endRow, 12].Merge = true;
                            worksheet.Cells[startRow, 13, endRow, 13].Merge = true;

                            // Center align
                            worksheet.Cells[startRow, 1, endRow, 1].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 2, endRow, 2].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 3, endRow, 3].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 4, endRow, 4].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 8, endRow, 8].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 9, endRow, 9].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 10, endRow, 10].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 11, endRow, 11].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 12, endRow, 12].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 13, endRow, 13].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                        }
                    }
                    else
                    {
                        // Đơn không có sản phẩm - THỨ TỰ: STT -> Số đơn SMO
                        worksheet.Cells[currentRow, 1].Value = order.STT;
                        worksheet.Cells[currentRow, 2].Value = order.SoDonHangSMO;
                        worksheet.Cells[currentRow, 3].Value = order.LoaiDonHang;

                        // HIỂN THỊ CỬA HÀNG HOẶC KHÁCH HÀNG DỰA TRÊN StoreOrCustomer
                        if (filterDto.StoreOrCustomer == "Store")
                        {
                            worksheet.Cells[currentRow, 4].Value = order.CuaHang;  // Hiển thị tên cửa hàng
                        }
                        else
                        {
                            worksheet.Cells[currentRow, 4].Value = order.KhachHang;  // Hiển thị tên khách hàng
                        }

                        worksheet.Cells[currentRow, 8].Value = order.SoXe;
                        worksheet.Cells[currentRow, 9].Value = order.TenTaiXe;
                        worksheet.Cells[currentRow, 10].Value = order.NgayDatHang?.ToString("dd/MM/yyyy");
                        worksheet.Cells[currentRow, 11].Value = order.NgayNhanHang?.ToString("dd/MM/yyyy");
                        worksheet.Cells[currentRow, 12].Value = order.GhiChu;
                        worksheet.Cells[currentRow, 13].Value = order.TrangThai;

                        currentRow++;
                    }
                }

                // ===== FORMATTING =====
                var dataRange = worksheet.Cells[headerRow, 1, currentRow - 1, 13];
                dataRange.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                dataRange.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
                dataRange.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                dataRange.Style.Border.Right.Style = ExcelBorderStyle.Thin;

                // Alignment
                worksheet.Cells[headerRow + 1, 1, currentRow - 1, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center; // STT
                worksheet.Cells[headerRow + 1, 2, currentRow - 1, 2].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center; // Số đơn SMO
                worksheet.Cells[headerRow + 1, 6, currentRow - 1, 7].Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;  // Số lượng
                worksheet.Cells[headerRow + 1, 10, currentRow - 1, 11].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center; // Ngày

                // Column widths
                worksheet.Cells.AutoFitColumns();
                worksheet.Column(1).Width = 8;   // STT
                worksheet.Column(2).Width = 20;  // Số đơn SMO
                worksheet.Column(3).Width = 20;  // Loại đơn hàng
                worksheet.Column(4).Width = 25;  // Cửa hàng/Khách hàng
                worksheet.Column(5).Width = 30;  // Mặt hàng
                worksheet.Column(12).Width = 35; // Ghi chú

                // Freeze header
                worksheet.View.FreezePanes(headerRow + 1, 1);

                // ===== GENERATE FILE =====
                var stream = new MemoryStream(package.GetAsByteArray());
                var fileName = $"BaoCaoDonHang_{DateTime.Now:yyyyMMddHHmmss}.xlsx";

                return File(
                    stream,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileName
                );
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi khi xuất báo cáo: {ex.Message}" });
            }
        }


    }
}
