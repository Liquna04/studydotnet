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
using static DMS.BUSINESS.Dtos.RP.ReportReturnDto;

namespace DMS.BUSINESS.Services.RP
{
    public interface IRpReturnService : IGenericService<TblPoHhkReturn, PoHhkReturnDto>
    {
        Task<IList<ReportPoHhkReturnGroupedDto>> GetReportReturnsFiltered(ReportFilterDto filterDto);
    }

    public class RpReturnService : GenericService<TblPoHhkReturn, PoHhkReturnDto>, IRpReturnService
    {
        public RpReturnService(AppDbContext dbContext, IMapper mapper) : base(dbContext, mapper)
        {
        }
        public async Task<IList<ReportPoHhkReturnGroupedDto>> GetReportReturnsFiltered(ReportFilterDto filterDto)
        {
            try
            {
                // 1. Query cơ bản cho Header
                var query = _dbContext.TblPoHhkReturn.AsNoTracking().AsQueryable();

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
                        return new List<ReportPoHhkReturnGroupedDto>();
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
                        var validHeaderCodes = await _dbContext.TblPoHhkDetailReturn
                            .AsNoTracking()
                            .Where(d => validMaterialCodes.Contains(d.MaterialCode))
                            .Select(d => d.HeaderCode)
                            .Distinct()
                            .ToListAsync();

                        query = query.Where(x => validHeaderCodes.Contains(x.Code));
                    }
                    else
                    {
                        return new List<ReportPoHhkReturnGroupedDto>();
                    }
                }

                // Sắp xếp
                query = query.OrderByDescending(x => x.OrderDate).ThenByDescending(x => x.Code);

                // =========================================================================
                // PHẦN 4: LẤY DỮ LIỆU VÀ NHÓM THEO ĐƠN TRẢ HÀNG
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
                var allDetails = await _dbContext.TblPoHhkDetailReturn
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
                var result = new List<ReportPoHhkReturnGroupedDto>();
                int stt = 1;

                foreach (var header in headers)
                {
                    // Lấy tên cửa hàng
                    string storeName = null;
                    if (!string.IsNullOrEmpty(header.StoreCode) && storeDict.ContainsKey(header.StoreCode))
                    {
                        storeName = storeDict[header.StoreCode];
                    }

                    // Lấy details của đơn trả hàng này
                    var details = detailsGrouped.ContainsKey(header.Code)
                        ? detailsGrouped[header.Code]
                        : new List<TblPoHhkDetailReturn>();

                    // Tạo danh sách sản phẩm trả (chỉ có số lượng, không có lượng phê duyệt)
                    var danhSachMatHang = new List<ReportProductReturnItemDto>();

                    foreach (var detail in details)
                    {
                        // Lấy tên sản phẩm
                        var productName = productDict.ContainsKey(detail.MaterialCode)
                            ? productDict[detail.MaterialCode]
                            : detail.MaterialCode;

                        danhSachMatHang.Add(new ReportProductReturnItemDto
                        {
                            MatHang = productName,
                            LuongTra = detail.ReturnQuantity  // CHỈ CÓ SỐ LƯỢNG TRẢ
                        });
                    }

                    // Tạo 1 dòng báo cáo cho đơn trả hàng này
                    result.Add(new ReportPoHhkReturnGroupedDto
                    {
                        STT = stt++,
                        LoaiDonHang = GetPoTypeName(header.PoType),
                        KhachHang = header.CustomerName,
                        CuaHang = storeName,  // TÊN CỬA HÀNG
                        SoDonTraHangSMO = header.Code,
                        DanhSachMatHang = danhSachMatHang,
                        SoXe = header.VehicleCode,  // Dùng VehicleCode
                        TenTaiXe = header.Driver,
                        NgayTraHang = header.ReturnDate,  // Ngày trả hàng
                        NgayNhanHang = header.ExpectedReturnDate,
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
                return new List<ReportPoHhkReturnGroupedDto>();
            }
        }        /// <summary>
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
                "3" => "Đã phê duyệt",
                "4" => "Từ chối",
                "5" => "Hủy yêu cầu",
                "6" => "Trả hàng thành công",
                "0" => "Chỉnh sửa thông tin",
                _ => status ?? ""
            };
        }
    }
}

