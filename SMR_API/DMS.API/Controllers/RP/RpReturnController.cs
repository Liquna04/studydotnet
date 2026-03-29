using Common;
using Common.API;
using DMS.API.AppCode.Enum;
using DMS.API.AppCode.Extensions;
using DMS.BUSINESS.Dtos.PO;
using DMS.BUSINESS.Dtos.RP;
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
    public class RpReturnController : ControllerBase
    {
        private readonly IRpReturnService _service;

        public RpReturnController(IRpReturnService service)
        {
            _service = service;

        }
        [HttpGet("GetReturnReport")]
        public async Task<IActionResult> GetReturnReport([FromQuery] ReportFilterDto filterDto)
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
            var result = await _service.GetReportReturnsFiltered(filterDto);

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
        /// Export báo cáo đơn trả hàng ra file Excel
        /// </summary>
        [HttpPost("ExportReportReturn")]
        public async Task<IActionResult> ExportReturnReportToExcel([FromBody] ReportFilterDto filterDto)
        {
            try
            {
                // ===== THÊM LOGIC PHÂN QUYỀN (GIỐNG GetReturnReport) =====
                if (string.IsNullOrEmpty(filterDto.UserName) || filterDto.UserName == "SYSTEM")
                {
                    filterDto.UserName = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "SYSTEM";
                }

                if (string.IsNullOrEmpty(filterDto.AccountType))
                {
                    filterDto.AccountType = User?.FindFirst("AccountType")?.Value ?? "KH";
                }

                // Lấy dữ liệu báo cáo
                var reportData = await _service.GetReportReturnsFiltered(filterDto);

                if (reportData == null || !reportData.Any())
                {
                    return BadRequest(new { message = "Không có dữ liệu để xuất báo cáo" });
                }

                // Tạo file Excel
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

                using var package = new ExcelPackage();
                var worksheet = package.Workbook.Worksheets.Add("Báo Cáo Trả Hàng");

                // ===== TITLE ROW =====
                worksheet.Cells[1, 1].Value = "BÁO CÁO TRẢ HÀNG";
                worksheet.Cells[1, 1, 1, 12].Merge = true;
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
                    worksheet.Cells[2, 1, 2, 12].Merge = true;
                    worksheet.Cells[2, 1].Style.Font.Italic = true;
                    worksheet.Cells[2, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    worksheet.Row(2).Height = 20;
                }

                // ===== HEADER ROW =====
                var headerRow = string.IsNullOrEmpty(subtitle) ? 2 : 3;

                // Xác định tiêu đề cột 4 dựa trên StoreOrCustomer
                string column4Header = filterDto.StoreOrCustomer == "Store" ? "CỬA HÀNG" : "KHÁCH HÀNG";

                // CHỈ CÓ 12 CỘT (bỏ cột "LƯỢNG PHÊ DUYỆT")
                worksheet.Cells[headerRow, 1].Value = "STT";
                worksheet.Cells[headerRow, 2].Value = "SỐ ĐƠN TRẢ HÀNG SMO";
                worksheet.Cells[headerRow, 3].Value = "LOẠI ĐƠN HÀNG";
                worksheet.Cells[headerRow, 4].Value = column4Header; // ĐỘNG: CỬA HÀNG hoặc KHÁCH HÀNG
                worksheet.Cells[headerRow, 5].Value = "MẶT HÀNG";
                worksheet.Cells[headerRow, 6].Value = "LƯỢNG TRẢ";  // CHỈ CÓ 1 CỘT SỐ LƯỢNG
                worksheet.Cells[headerRow, 7].Value = "SỐ XE";
                worksheet.Cells[headerRow, 8].Value = "TÊN TÀI XẾ";
                worksheet.Cells[headerRow, 9].Value = "NGÀY TRẢ HÀNG";
                worksheet.Cells[headerRow, 10].Value = "NGÀY NHẬN HÀNG";
                worksheet.Cells[headerRow, 11].Value = "GHI CHÚ";
                worksheet.Cells[headerRow, 12].Value = "TRẠNG THÁI";

                // Style cho header
                using (var range = worksheet.Cells[headerRow, 1, headerRow, 12])
                {
                    range.Style.Font.Bold = true;
                    range.Style.Fill.PatternType = ExcelFillStyle.Solid;
                    range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(79, 129, 189)); // Màu đỏ cho trả hàng
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

                    // Nếu đơn trả hàng có sản phẩm
                    if (order.DanhSachMatHang != null && order.DanhSachMatHang.Any())
                    {
                        for (int i = 0; i < order.DanhSachMatHang.Count; i++)
                        {
                            var product = order.DanhSachMatHang[i];

                            // Chỉ điền thông tin chung ở dòng đầu tiên
                            if (i == 0)
                            {
                                worksheet.Cells[currentRow, 1].Value = order.STT;
                                worksheet.Cells[currentRow, 2].Value = order.SoDonTraHangSMO;
                                worksheet.Cells[currentRow, 3].Value = order.LoaiDonHang;

                                // HIỂN THỊ CỬA HÀNG HOẶC KHÁCH HÀNG DỰA TRÊN StoreOrCustomer
                                if (filterDto.StoreOrCustomer == "Store")
                                {
                                    worksheet.Cells[currentRow, 4].Value = order.CuaHang;
                                }
                                else
                                {
                                    worksheet.Cells[currentRow, 4].Value = order.KhachHang;
                                }

                                worksheet.Cells[currentRow, 7].Value = order.SoXe;
                                worksheet.Cells[currentRow, 8].Value = order.TenTaiXe;
                                worksheet.Cells[currentRow, 9].Value = order.NgayTraHang?.ToString("dd/MM/yyyy");
                                worksheet.Cells[currentRow, 10].Value = order.NgayNhanHang?.ToString("dd/MM/yyyy");
                                worksheet.Cells[currentRow, 11].Value = order.GhiChu;
                                worksheet.Cells[currentRow, 12].Value = order.TrangThai;
                            }

                            // Thông tin sản phẩm (CHỈ CÓ LƯỢNG TRẢ)
                            worksheet.Cells[currentRow, 5].Value = product.MatHang;
                            worksheet.Cells[currentRow, 6].Value = product.LuongTra;

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
                            worksheet.Cells[startRow, 7, endRow, 7].Merge = true;
                            worksheet.Cells[startRow, 8, endRow, 8].Merge = true;
                            worksheet.Cells[startRow, 9, endRow, 9].Merge = true;
                            worksheet.Cells[startRow, 10, endRow, 10].Merge = true;
                            worksheet.Cells[startRow, 11, endRow, 11].Merge = true;
                            worksheet.Cells[startRow, 12, endRow, 12].Merge = true;

                            // Center align
                            worksheet.Cells[startRow, 1, endRow, 1].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 2, endRow, 2].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 3, endRow, 3].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 4, endRow, 4].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 7, endRow, 7].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 8, endRow, 8].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 9, endRow, 9].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 10, endRow, 10].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 11, endRow, 11].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            worksheet.Cells[startRow, 12, endRow, 12].Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                        }
                    }
                    else
                    {
                        // Đơn không có sản phẩm
                        worksheet.Cells[currentRow, 1].Value = order.STT;
                        worksheet.Cells[currentRow, 2].Value = order.SoDonTraHangSMO;
                        worksheet.Cells[currentRow, 3].Value = order.LoaiDonHang;

                        // HIỂN THỊ CỬA HÀNG HOẶC KHÁCH HÀNG DỰA TRÊN StoreOrCustomer
                        if (filterDto.StoreOrCustomer == "Store")
                        {
                            worksheet.Cells[currentRow, 4].Value = order.CuaHang;
                        }
                        else
                        {
                            worksheet.Cells[currentRow, 4].Value = order.KhachHang;
                        }

                        worksheet.Cells[currentRow, 7].Value = order.SoXe;
                        worksheet.Cells[currentRow, 8].Value = order.TenTaiXe;
                        worksheet.Cells[currentRow, 9].Value = order.NgayTraHang?.ToString("dd/MM/yyyy");
                        worksheet.Cells[currentRow, 10].Value = order.NgayNhanHang?.ToString("dd/MM/yyyy");
                        worksheet.Cells[currentRow, 11].Value = order.GhiChu;
                        worksheet.Cells[currentRow, 12].Value = order.TrangThai;

                        currentRow++;
                    }
                }

                // ===== FORMATTING =====
                var dataRange = worksheet.Cells[headerRow, 1, currentRow - 1, 12];
                dataRange.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                dataRange.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
                dataRange.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                dataRange.Style.Border.Right.Style = ExcelBorderStyle.Thin;

                // Alignment
                worksheet.Cells[headerRow + 1, 1, currentRow - 1, 1].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center; // STT
                worksheet.Cells[headerRow + 1, 2, currentRow - 1, 2].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center; // Số đơn
                worksheet.Cells[headerRow + 1, 6, currentRow - 1, 6].Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;  // Lượng trả
                worksheet.Cells[headerRow + 1, 9, currentRow - 1, 10].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center; // Ngày

                // Column widths
                worksheet.Cells.AutoFitColumns();
                worksheet.Column(1).Width = 8;   // STT
                worksheet.Column(2).Width = 20;  // Số đơn trả hàng
                worksheet.Column(3).Width = 20;  // Loại đơn hàng
                worksheet.Column(4).Width = 25;  // Cửa hàng/Khách hàng
                worksheet.Column(5).Width = 30;  // Mặt hàng
                worksheet.Column(11).Width = 35; // Ghi chú

                // Freeze header
                worksheet.View.FreezePanes(headerRow + 1, 1);

                // ===== GENERATE FILE =====
                var stream = new MemoryStream(package.GetAsByteArray());
                var fileName = $"BaoCaoTraHang_{DateTime.Now:yyyyMMddHHmmss}.xlsx";

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
