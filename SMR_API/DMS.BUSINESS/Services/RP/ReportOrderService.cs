using AutoMapper;
using Common;
using DMS.BUSINESS.Common;
using DMS.BUSINESS.Dtos.PO;
using DMS.BUSINESS.Dtos.RP;
using DMS.CORE;
using DMS.CORE.Entities.MD;
using DMS.CORE.Entities.PO;
using DMS.CORE.Entities.PO.Attribute;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using static DMS.BUSINESS.Dtos.RP.ReportOrderDto;

namespace DMS.BUSINESS.Services.RP
{
    public interface IRpOrderService : IGenericService<TblPoHhk, PoHhkDto>
    {
        Task<IList<ReportPoHhkGroupedDto>> GetReportOrdersFiltered(ReportFilterDto filterDto);
    }

    public class RpOrderService : GenericService<TblPoHhk, PoHhkDto>, IRpOrderService
    {
        public RpOrderService(AppDbContext dbContext, IMapper mapper) : base(dbContext, mapper)
        {
        }
        public async Task<IList<ReportPoHhkGroupedDto>> GetReportOrdersFiltered(ReportFilterDto filterDto)
        {
            try
            {
                // 1. Query cơ bản cho Header
                var query = _dbContext.TblPoHhk.AsNoTracking().AsQueryable();

                // =========================================================================
                // PHẦN 1: LOGIC PHÂN QUYỀN
                // =========================================================================
                if (filterDto.AccountType == "KD")
                {
                    query = query.Where(x => x.CreateBy == filterDto.UserName ||
                        (x.CreateBy != filterDto.UserName && x.Status != "1" && x.Status != "-1"));
                }
                else if (filterDto.AccountType == "CH")
                {
                    query = query.Where(x => x.CreateBy == filterDto.UserName);
                }
                else if (filterDto.AccountType == "KT")
                {
                    query = query.Where(x => x.PoType == "OUT_PROVINCE" &&
                        (x.Status == "-3" || x.Status == "3" || x.Status == "4" || x.Status == "5" || x.Status == "-1"));
                }
                else if (filterDto.AccountType == "KH")
                {
                    var mapAccount = await _dbContext.TblAdAccountCustomer
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x => x.UserName == filterDto.UserName);

                    if (mapAccount != null && !string.IsNullOrEmpty(mapAccount.CustomerCode))
                    {
                        query = query.Where(x => x.CustomerCode == mapAccount.CustomerCode);
                    }
                    else
                    {
                        return new List<ReportPoHhkGroupedDto>();
                    }
                }
                else
                {
                    query = query.Where(x => false);
                }

                // =========================================================================
                // PHẦN 2: CÁC FILTER CƠ BẢN
                // =========================================================================

                // Filter Ngày
                if (filterDto.FromDate.HasValue)
                    query = query.Where(x => x.OrderDate >= filterDto.FromDate.Value.Date);

                if (filterDto.ToDate.HasValue)
                    query = query.Where(x => x.OrderDate <= filterDto.ToDate.Value.Date.AddDays(1).AddTicks(-1));

                // Filter Store/Customer
                if (!string.IsNullOrEmpty(filterDto.StoreOrCustomer))
                {
                    if (filterDto.StoreOrCustomer == "Store")
                        query = query.Where(x => x.StoreCode != null && x.StoreCode != "");
                    else if (filterDto.StoreOrCustomer == "Customer")
                        query = query.Where(x => x.CustomerCode != null && x.CustomerCode != "");
                }

                // Filter Status
                if (!string.IsNullOrEmpty(filterDto.Status))
                {
                    if (filterDto.Status == "approved")
                        query = query.Where(x => x.Status == "3" || x.Status == "-3");
                    else if (filterDto.Status == "new")
                        query = query.Where(x => x.Status == "1");
                    else
                        query = query.Where(x => x.Status == filterDto.Status);
                }

                // =========================================================================
                // PHẦN 3: FILTER THEO TÊN SẢN PHẨM
                // =========================================================================
                if (!string.IsNullOrEmpty(filterDto.ProductName))
                {
                    var validMaterialCodes = await _dbContext.TblMdProductList
                        .AsNoTracking()
                        .Where(p => p.Name.Contains(filterDto.ProductName))
                        .Select(p => p.Code)
                        .ToListAsync();

                    if (validMaterialCodes.Any())
                    {
                        var validHeaderCodes = await _dbContext.TblPoHhkDetail
                            .AsNoTracking()
                            .Where(d => validMaterialCodes.Contains(d.MaterialCode))
                            .Select(d => d.HeaderCode)
                            .Distinct()
                            .ToListAsync();

                        query = query.Where(x => validHeaderCodes.Contains(x.Code));
                    }
                    else
                    {
                        return new List<ReportPoHhkGroupedDto>();
                    }
                }

                // Sắp xếp
                query = query.OrderByDescending(x => x.OrderDate).ThenByDescending(x => x.Code);

                // =========================================================================
                // PHẦN 4: LẤY DỮ LIỆU VÀ NHÓM THEO ĐƠN HÀNG
                // =========================================================================
                var headers = await query.ToListAsync();

                // =========================================================================
                // PHẦN 5: TỐI ƯU - LẤY TẤT CẢ STORES VÀ PRODUCTS MỘT LẦN
                // =========================================================================

                // Lấy tất cả store codes từ headers
                var storeCodes = headers
                    .Where(h => !string.IsNullOrEmpty(h.StoreCode))
                    .Select(h => h.StoreCode)
                    .Distinct()
                    .ToList();

                // Lấy tất cả stores một lần
                var storeDict = await _dbContext.TblMdStore
                    .AsNoTracking()
                    .Where(s => storeCodes.Contains(s.Code))
                    .ToDictionaryAsync(s => s.Code, s => s.Name);

                // Lấy tất cả header codes
                var headerCodes = headers.Select(h => h.Code).ToList();

                // Lấy tất cả details một lần
                var allDetails = await _dbContext.TblPoHhkDetail
                    .AsNoTracking()
                    .Where(d => headerCodes.Contains(d.HeaderCode))
                    .OrderBy(d => d.HeaderCode)
                    .ThenBy(d => d.NumberItem)
                    .ToListAsync();

                // Lấy tất cả material codes
                var materialCodes = allDetails.Select(d => d.MaterialCode).Distinct().ToList();

                // Lấy tất cả products một lần
                var productDict = await _dbContext.TblMdProductList
                    .AsNoTracking()
                    .Where(p => materialCodes.Contains(p.Code))
                    .ToDictionaryAsync(p => p.Code, p => p.Name);

                // Group details theo header code
                var detailsGrouped = allDetails.GroupBy(d => d.HeaderCode)
                                               .ToDictionary(g => g.Key, g => g.ToList());

                // =========================================================================
                // PHẦN 6: TẠO RESULT
                // =========================================================================
                var result = new List<ReportPoHhkGroupedDto>();
                int stt = 1;

                foreach (var header in headers)
                {
                    // Lấy tên cửa hàng
                    string storeName = null;
                    if (!string.IsNullOrEmpty(header.StoreCode) && storeDict.ContainsKey(header.StoreCode))
                    {
                        storeName = storeDict[header.StoreCode];
                    }

                    // Lấy details của đơn hàng này
                    var details = detailsGrouped.ContainsKey(header.Code)
                        ? detailsGrouped[header.Code]
                        : new List<TblPoHhkDetail>();

                    // Tạo danh sách sản phẩm
                    var danhSachMatHang = new List<ReportProductItemDto>();

                    foreach (var detail in details)
                    {
                        // Lấy tên sản phẩm
                        var productName = productDict.ContainsKey(detail.MaterialCode)
                            ? productDict[detail.MaterialCode]
                            : detail.MaterialCode;

                        danhSachMatHang.Add(new ReportProductItemDto
                        {
                            MatHang = productName,
                            LuongDat = detail.Quantity,
                            LuongPheDuyet = detail.ApproveQuantity
                        });
                    }

                    // Tạo 1 dòng báo cáo cho đơn hàng này
                    result.Add(new ReportPoHhkGroupedDto
                    {
                        STT = stt++,
                        LoaiDonHang = GetPoTypeName(header.PoType),
                        KhachHang = header.CustomerName,
                        CuaHang = storeName,  // TÊN CỬA HÀNG
                        SoDonHangSMO = header.Code,
                        DanhSachMatHang = danhSachMatHang,
                        SoXe = header.VehicleCode,
                        TenTaiXe = header.Driver,
                        NgayDatHang = header.OrderDate,
                        NgayNhanHang = header.ReceiptDate,
                        GhiChu = header.Note,
                        TrangThai = GetStatusName(header.Status)
                    });
                }

                return result;
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return new List<ReportPoHhkGroupedDto>();
            }
        }
        /// <summary>
        /// Convert PoType code sang tên tiếng Việt
        /// </summary>
        private string GetPoTypeName(string poType)
        {
            return poType switch
            {
                "IN_PROVINCE" => "Nội tỉnh",
                "OUT_PROVINCE" => "Ngoại tỉnh",
                _ => poType ?? ""
            };
        }

        private string GetStatusName(string status)
        {
            return status switch
            {
                "1" => "Khởi tạo",
                "2" => "Chờ phê duyệt",
                "-3" => "Đã phê duyệt số lượng",
                "3" => "Đã phê duyệt",
                "4" => "Từ chối",
                "5" => "Đã xác nhận thực nhận",
                "-1" => "Đã hủy",
                "0" => "Chỉnh sửa thông tin",
                _ => status ?? ""
            };
        }
    }
}

