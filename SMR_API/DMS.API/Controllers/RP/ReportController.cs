using Common;
using Common.API;
using DMS.API.AppCode.Enum;
using DMS.API.AppCode.Extensions;
using DMS.BUSINESS.Dtos.RP;
using DMS.BUSINESS.Services.RP;
using Microsoft.AspNetCore.Mvc;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using System.Security.Claims;

namespace DMS.API.Controllers.RP
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportController : ControllerBase
    {
        private readonly IReportService _service;

        public ReportController(IReportService service)
        {
            _service = service;
        }

        /// <summary>
        /// Lấy báo cáo theo thời gian thực
        /// </summary>
        [HttpGet("GetRealtimeReport")]
        public async Task<IActionResult> GetRealtimeReport([FromQuery] ReportFilterDto filterDto)
        {
            var transferObject = new TransferObject();

            // Xử lý thông tin User/Account từ Token
            if (string.IsNullOrEmpty(filterDto.UserName) || filterDto.UserName == "SYSTEM")
            {
                filterDto.UserName = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "SYSTEM";
            }

            if (string.IsNullOrEmpty(filterDto.AccountType))
            {
                filterDto.AccountType = User?.FindFirst("AccountType")?.Value ?? "KH";
            }

            // Gọi Service
            var result = await _service.GetRealtimeReport(filterDto);

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
        /// Export báo cáo thời gian thực ra Excel
        /// </summary>
        [HttpPost("ExportRealtimeReport")]
        public async Task<IActionResult> ExportRealtimeReportToExcel([FromBody] ReportFilterDto filterDto)
        {
            try
            {
                // Xử lý thông tin User/Account từ Token
                if (string.IsNullOrEmpty(filterDto.UserName) || filterDto.UserName == "SYSTEM")
                {
                    filterDto.UserName = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "SYSTEM";
                }

                if (string.IsNullOrEmpty(filterDto.AccountType))
                {
                    filterDto.AccountType = User?.FindFirst("AccountType")?.Value ?? "KH";
                }

                // Lấy dữ liệu báo cáo
                var reportData = await _service.GetRealtimeReport(filterDto);

                if (reportData == null || !reportData.Any())
                {
                    return BadRequest(new { message = "Không có dữ liệu để xuất báo cáo" });
                }

                // Tạo file Excel
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

                using var package = new ExcelPackage();
                var worksheet = package.Workbook.Worksheets.Add("Báo Cáo Thời Gian Thực");

                // ===== TITLE ROW =====
                worksheet.Cells[1, 1].Value = "BÁO CÁO ĐƠN HÀNG THEO THỜI GIAN THỰC";
                worksheet.Cells[1, 1, 1, 15].Merge = true;
                worksheet.Cells[1, 1].Style.Font.Bold = true;
                worksheet.Cells[1, 1].Style.Font.Size = 16;
                worksheet.Cells[1, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                worksheet.Cells[1, 1].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                worksheet.Row(1).Height = 30;

                // ===== SUBTITLE ROW =====
                string subtitle = $"Thời gian xuất: {DateTime.Now:dd/MM/yyyy HH:mm:ss}";
                if (filterDto.FromDate.HasValue && filterDto.ToDate.HasValue)
                {
                    subtitle += $" | Từ ngày {filterDto.FromDate.Value:dd/MM/yyyy} đến ngày {filterDto.ToDate.Value:dd/MM/yyyy}";
                }
                else if (filterDto.FromDate.HasValue)
                {
                    subtitle += $" | Từ ngày {filterDto.FromDate.Value:dd/MM/yyyy}";
                }
                else if (filterDto.ToDate.HasValue)
                {
                    subtitle += $" | Đến ngày {filterDto.ToDate.Value:dd/MM/yyyy}";
                }

                worksheet.Cells[2, 1].Value = subtitle;
                worksheet.Cells[2, 1, 2, 15].Merge = true;
                worksheet.Cells[2, 1].Style.Font.Italic = true;
                worksheet.Cells[2, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                worksheet.Row(2).Height = 20;

                // ===== HEADER ROW =====
                var headerRow = 3;
                string column4Header = filterDto.StoreOrCustomer == "Store" ? "CỬA HÀNG" : "KHÁCH HÀNG";

                worksheet.Cells[headerRow, 1].Value = "STT";
                worksheet.Cells[headerRow, 2].Value = "SỐ ĐƠN HÀNG SMO";
                worksheet.Cells[headerRow, 3].Value = "LOẠI ĐƠN HÀNG";
                worksheet.Cells[headerRow, 4].Value = column4Header;
                worksheet.Cells[headerRow, 5].Value = "MẶT HÀNG";
                worksheet.Cells[headerRow, 6].Value = "LƯỢNG ĐẶT";
                worksheet.Cells[headerRow, 7].Value = "LƯỢNG PHÊ DUYỆT";
                worksheet.Cells[headerRow, 10].Value = "SỐ XE";
                worksheet.Cells[headerRow, 11].Value = "TÊN TÀI XẾ";
                worksheet.Cells[headerRow, 12].Value = "NGÀY ĐẶT HÀNG";
                worksheet.Cells[headerRow, 13].Value = "NGÀY DỰ KIẾN GIAO";
                worksheet.Cells[headerRow, 14].Value = "TRẠNG THÁI";
                worksheet.Cells[headerRow, 15].Value = "CẬP NHẬT LẦN CUỐI";

                // Style cho header
                using (var range = worksheet.Cells[headerRow, 1, headerRow, 15])
                {
                    range.Style.Font.Bold = true;
                    range.Style.Fill.PatternType = ExcelFillStyle.Solid;
                    range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(0, 176, 80)); // Màu xanh lá
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

                    if (order.DanhSachMatHang != null && order.DanhSachMatHang.Any())
                    {
                        for (int i = 0; i < order.DanhSachMatHang.Count; i++)
                        {
                            var product = order.DanhSachMatHang[i];

                            if (i == 0)
                            {
                                worksheet.Cells[currentRow, 1].Value = order.STT;
                                worksheet.Cells[currentRow, 2].Value = order.SoDonHangSMO;
                                worksheet.Cells[currentRow, 3].Value = order.LoaiDonHang;

                                if (filterDto.StoreOrCustomer == "Store")
                                {
                                    worksheet.Cells[currentRow, 4].Value = order.CuaHang;
                                }
                                else
                                {
                                    worksheet.Cells[currentRow, 4].Value = order.KhachHang;
                                }

                                worksheet.Cells[currentRow, 10].Value = order.SoXe;
                                worksheet.Cells[currentRow, 11].Value = order.TenTaiXe;
                                worksheet.Cells[currentRow, 12].Value = order.NgayDatHang?.ToString("dd/MM/yyyy HH:mm");
                                worksheet.Cells[currentRow, 13].Value = order.NgayDuKienGiao?.ToString("dd/MM/yyyy HH:mm");
                                worksheet.Cells[currentRow, 14].Value = order.TrangThai;
                                worksheet.Cells[currentRow, 15].Value = order.CapNhatLanCuoi?.ToString("dd/MM/yyyy HH:mm:ss");
                            }

                            // Thông tin sản phẩm
                            worksheet.Cells[currentRow, 5].Value = product.MatHang;
                            worksheet.Cells[currentRow, 6].Value = product.LuongDat;
                            worksheet.Cells[currentRow, 7].Value = product.LuongPheDuyet;
                           

                            // Tô màu cảnh báo cho lượng còn lại > 0
                            if (product.LuongConLai > 0)
                            {
                                worksheet.Cells[currentRow, 9].Style.Fill.PatternType = ExcelFillStyle.Solid;
                                worksheet.Cells[currentRow, 9].Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(255, 242, 204));
                            }

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
                            worksheet.Cells[startRow, 10, endRow, 10].Merge = true;
                            worksheet.Cells[startRow, 11, endRow, 11].Merge = true;
                            worksheet.Cells[startRow, 12, endRow, 12].Merge = true;
                            worksheet.Cells[startRow, 13, endRow, 13].Merge = true;
                            worksheet.Cells[startRow, 14, endRow, 14].Merge = true;
                            worksheet.Cells[startRow, 15, endRow, 15].Merge = true;

                            // Center align
                            worksheet.Cells[startRow, 1, endRow, 1].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 2, endRow, 2].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 3, endRow, 3].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 4, endRow, 4].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 10, endRow, 10].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 11, endRow, 11].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 12, endRow, 12].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 13, endRow, 13].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 14, endRow, 14].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 15, endRow, 15].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                        }
                    }
                    else
                    {
                        // Đơn không có sản phẩm
                        worksheet.Cells[currentRow, 1].Value = order.STT;
                        worksheet.Cells[currentRow, 2].Value = order.SoDonHangSMO;
                        worksheet.Cells[currentRow, 3].Value = order.LoaiDonHang;

                        if (filterDto.StoreOrCustomer == "Store")
                        {
                            worksheet.Cells[currentRow, 4].Value = order.CuaHang;
                        }
                        else
                        {
                            worksheet.Cells[currentRow, 4].Value = order.KhachHang;
                        }

                        worksheet.Cells[currentRow, 10].Value = order.SoXe;
                        worksheet.Cells[currentRow, 11].Value = order.TenTaiXe;
                        worksheet.Cells[currentRow, 12].Value = order.NgayDatHang?.ToString("dd/MM/yyyy HH:mm");
                        worksheet.Cells[currentRow, 13].Value = order.NgayDuKienGiao?.ToString("dd/MM/yyyy HH:mm");
                        worksheet.Cells[currentRow, 14].Value = order.TrangThai;
                        worksheet.Cells[currentRow, 15].Value = order.CapNhatLanCuoi?.ToString("dd/MM/yyyy HH:mm:ss");

                        currentRow++;
                    }
                }

                // ===== FORMATTING =====
                var dataRange = worksheet.Cells[headerRow, 1, currentRow - 1, 15];
                dataRange.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                dataRange.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
                dataRange.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                dataRange.Style.Border.Right.Style = ExcelBorderStyle.Thin;

                // Alignment
                worksheet.Cells[headerRow + 1, 1, currentRow - 1, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                worksheet.Cells[headerRow + 1, 2, currentRow - 1, 2].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                worksheet.Cells[headerRow + 1, 6, currentRow - 1, 9].Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;
                worksheet.Cells[headerRow + 1, 12, currentRow - 1, 13].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                worksheet.Cells[headerRow + 1, 15, currentRow - 1, 15].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;

                // Column widths
                worksheet.Cells.AutoFitColumns();
                worksheet.Column(1).Width = 8;
                worksheet.Column(2).Width = 20;
                worksheet.Column(3).Width = 20;
                worksheet.Column(4).Width = 25;
                worksheet.Column(5).Width = 30;
                worksheet.Column(11).Width = 20;
                worksheet.Column(12).Width = 20;
                worksheet.Column(13).Width = 20;
                worksheet.Column(14).Width = 20;
                worksheet.Column(15).Width = 20;

                // Freeze header
                worksheet.View.FreezePanes(headerRow + 1, 1);

                // ===== GENERATE FILE =====
                var stream = new MemoryStream(package.GetAsByteArray());
                var fileName = $"BaoCaoThoiGianThuc_{DateTime.Now:yyyyMMddHHmmss}.xlsx";

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