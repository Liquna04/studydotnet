using AutoMapper;
using Common;
using DMS.BUSINESS.Common;
using DMS.BUSINESS.Common.Constants;
using DMS.BUSINESS.Dtos.PO;
using DMS.BUSINESS.Dtos.RP;
using DMS.CORE;
using DMS.CORE.Entities.PO;
using DMS.CORE.Entities.PO.Attribute;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace DMS.BUSINESS.Services.RP
{
    public interface IReportService : IGenericService<TblPoHhk, PoHhkDto>
    {
        Task<IList<RealtimeReportDto>> GetRealtimeReport(ReportFilterDto filterDto);
    }

    public class ReportService : GenericService<TblPoHhk, PoHhkDto>, IReportService
    {
        public ReportService(AppDbContext dbContext, IMapper mapper) : base(dbContext, mapper)
        {
        }

        public async Task<IList<RealtimeReportDto>> GetRealtimeReport(ReportFilterDto filterDto)
        {
            try
            {
                var result = new List<RealtimeReportDto>();
                int stt = 1;

                // =========================================================================
                // PHẦN 1: LẤY ĐƠN GIAO HÀNG (TblPoHhk)
                // =========================================================================
                var deliveryOrders = await GetDeliveryOrders(filterDto);

                foreach (var order in deliveryOrders)
                {
                    order.STT = stt++;
                    result.Add(order);
                }

                // =========================================================================
                // PHẦN 2: LẤY ĐƠN TRẢ HÀNG (TblPoHhkReturn)
                // =========================================================================
                var returnOrders = await GetReturnOrders(filterDto);

                foreach (var order in returnOrders)
                {
                    order.STT = stt++;
                    result.Add(order);
                }

                // =========================================================================
                // PHẦN 3: SẮP XẾP THEO NGÀY ĐẶT HÀNG
                // =========================================================================
                result = result.OrderByDescending(x => x.NgayDatHang)
                               .ThenByDescending(x => x.SoDonHangSMO)
                               .ToList();

                // Cập nhật lại STT sau khi sort
                for (int i = 0; i < result.Count; i++)
                {
                    result[i].STT = i + 1;
                }

                return result;
            }
            catch (Exception ex)
            {
                Status = false;
                Exception = ex;
                return new List<RealtimeReportDto>();
            }
        }

        /// <summary>
        /// Lấy đơn GIAO HÀNG
        /// </summary>
        private async Task<List<RealtimeReportDto>> GetDeliveryOrders(ReportFilterDto filterDto)
        {
            var query = _dbContext.TblPoHhk.AsNoTracking().AsQueryable();

            // PHÂN QUYỀN
            query = ApplyPermissionFilter(query, filterDto);

            // FILTER CƠ BẢN
            query = ApplyBasicFilters(query, filterDto);

            // FILTER THEO SẢN PHẨM
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
                    return new List<RealtimeReportDto>();
                }
            }

            var headers = await query.ToListAsync();

            // TỐI ƯU: Lấy tất cả dữ liệu liên quan một lần
            var headerCodes = headers.Select(h => h.Code).ToList();
            var storeCodes = headers.Where(h => !string.IsNullOrEmpty(h.StoreCode)).Select(h => h.StoreCode).Distinct().ToList();

            var storeDict = await _dbContext.TblMdStore
                .AsNoTracking()
                .Where(s => storeCodes.Contains(s.Code))
                .ToDictionaryAsync(s => s.Code, s => s.Name);

            var allDetails = await _dbContext.TblPoHhkDetail
                .AsNoTracking()
                .Where(d => headerCodes.Contains(d.HeaderCode))
                .OrderBy(d => d.HeaderCode)
                .ThenBy(d => d.NumberItem)
                .ToListAsync();

            var materialCodes = allDetails.Select(d => d.MaterialCode).Distinct().ToList();

            var productDict = await _dbContext.TblMdProductList
                .AsNoTracking()
                .Where(p => materialCodes.Contains(p.Code))
                .ToDictionaryAsync(p => p.Code, p => new { p.Name, p.Unit });

            var detailsGrouped = allDetails.GroupBy(d => d.HeaderCode).ToDictionary(g => g.Key, g => g.ToList());

            // TẠO RESULT
            var result = new List<RealtimeReportDto>();

            foreach (var header in headers)
            {
                string storeName = null;
                if (!string.IsNullOrEmpty(header.StoreCode) && storeDict.ContainsKey(header.StoreCode))
                {
                    storeName = storeDict[header.StoreCode];
                }

                var details = detailsGrouped.ContainsKey(header.Code)
                    ? detailsGrouped[header.Code]
                    : new List<TblPoHhkDetail>();

                var danhSachMatHang = new List<RealtimeProductDto>();
                decimal tongLuongDat = 0;
                decimal tongLuongPheDuyet = 0;
                decimal tongLuongGiao = 0;
                decimal tongLuongConLai = 0;

                foreach (var detail in details)
                {
                    var productInfo = productDict.ContainsKey(detail.MaterialCode)
                        ? productDict[detail.MaterialCode]
                        : null;

                    var productName = productInfo?.Name ?? detail.MaterialCode;
                    var productUnit = productInfo?.Unit ?? "";

                    var luongDat = detail.Quantity ?? 0;
                    var luongPheDuyet = detail.ApproveQuantity ?? 0;

                    // LOGIC TÍNH LƯỢNG GIAO THEO STATUS - ĐƠN GIAO HÀNG (SỬ DỤNG CONSTANTS)
                    decimal luongGiao = 0;
                    decimal luongConLai = 0;
                    decimal tyLeGiao = 0;

                    if (header.Status == PoConstants.PoStatus.DaXacNhanThucNhan) // "5"
                    {
                        luongGiao = luongPheDuyet;
                        luongConLai = 0;
                        tyLeGiao = 100;
                    }
                    else if (header.Status == PoConstants.PoStatus.DaPheDuyet ||
                             header.Status == PoConstants.PoStatus.DaPheDuyetSoLuong) // "3" || "-3"
                    {
                        luongGiao = 0;
                        luongConLai = luongPheDuyet;
                        tyLeGiao = 0;
                    }
                    else if (header.Status == PoConstants.PoStatus.TuChoi ||
                             header.Status == PoConstants.PoStatus.DaHuy) // "4" || "-1"
                    {
                        luongGiao = 0;
                        luongConLai = 0;
                        tyLeGiao = 0;
                    }
                    else
                    {
                        luongGiao = 0;
                        luongConLai = luongPheDuyet;
                        tyLeGiao = 0;
                    }

                    danhSachMatHang.Add(new RealtimeProductDto
                    {
                        MatHang = productName,
                        MaMatHang = detail.MaterialCode,
                        LuongDat = luongDat,
                        LuongPheDuyet = luongPheDuyet,
                        LuongGiao = luongGiao,
                        LuongConLai = luongConLai,
                        TyLeGiao = tyLeGiao,
                        DonViTinh = productUnit
                    });

                    tongLuongDat += luongDat;
                    tongLuongPheDuyet += luongPheDuyet;
                    tongLuongGiao += luongGiao;
                    tongLuongConLai += luongConLai;
                }

                var tyLeHoanThanh = tongLuongPheDuyet > 0
                    ? (tongLuongGiao / tongLuongPheDuyet) * 100
                    : 0;

                result.Add(new RealtimeReportDto
                {
                    STT = 0,
                    SoDonHangSMO = header.Code,
                    LoaiDonHang = PoConstants.GetPoTypeName(header.PoType) + " (Giao hàng)",
                    KhachHang = header.CustomerName,
                    CuaHang = storeName,
                    SoXe = header.VehicleCode,
                    TenTaiXe = header.Driver,
                    NgayDatHang = header.OrderDate,
                    NgayDuKienGiao = header.ReceiptDate,
                    TrangThai = PoConstants.GetStatusName(header.Status),
                    CapNhatLanCuoi = header.UpdateDate ?? header.CreateDate,
                    DanhSachMatHang = danhSachMatHang,
                    TongLuongDat = tongLuongDat,
                    TongLuongPheDuyet = tongLuongPheDuyet,
                    TongLuongGiao = tongLuongGiao,
                    TongLuongConLai = tongLuongConLai,
                    TyLeHoanThanh = Math.Round(tyLeHoanThanh, 2)
                });
            }

            return result;
        }

        /// <summary>
        /// Lấy đơn TRẢ HÀNG
        /// </summary>
        private async Task<List<RealtimeReportDto>> GetReturnOrders(ReportFilterDto filterDto)
        {
            var query = _dbContext.TblPoHhkReturn.AsNoTracking().AsQueryable();

            // PHÂN QUYỀN
            query = ApplyPermissionFilterReturn(query, filterDto);

            // FILTER CƠ BẢN
            query = ApplyBasicFiltersReturn(query, filterDto);

            // FILTER THEO SẢN PHẨM
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
                    return new List<RealtimeReportDto>();
                }
            }

            var headers = await query.ToListAsync();

            // TỐI ƯU: Lấy tất cả dữ liệu liên quan một lần
            var headerCodes = headers.Select(h => h.Code).ToList();
            var storeCodes = headers.Where(h => !string.IsNullOrEmpty(h.StoreCode)).Select(h => h.StoreCode).Distinct().ToList();

            var storeDict = await _dbContext.TblMdStore
                .AsNoTracking()
                .Where(s => storeCodes.Contains(s.Code))
                .ToDictionaryAsync(s => s.Code, s => s.Name);

            var allDetails = await _dbContext.TblPoHhkDetailReturn
                .AsNoTracking()
                .Where(d => headerCodes.Contains(d.HeaderCode))
                .OrderBy(d => d.HeaderCode)
                .ThenBy(d => d.NumberItem)
                .ToListAsync();

            var materialCodes = allDetails.Select(d => d.MaterialCode).Distinct().ToList();

            var productDict = await _dbContext.TblMdProductList
                .AsNoTracking()
                .Where(p => materialCodes.Contains(p.Code))
                .ToDictionaryAsync(p => p.Code, p => new { p.Name, p.Unit });

            var detailsGrouped = allDetails.GroupBy(d => d.HeaderCode).ToDictionary(g => g.Key, g => g.ToList());

            // TẠO RESULT
            var result = new List<RealtimeReportDto>();

            foreach (var header in headers)
            {
                string storeName = null;
                if (!string.IsNullOrEmpty(header.StoreCode) && storeDict.ContainsKey(header.StoreCode))
                {
                    storeName = storeDict[header.StoreCode];
                }

                var details = detailsGrouped.ContainsKey(header.Code)
                    ? detailsGrouped[header.Code]
                    : new List<TblPoHhkDetailReturn>();

                var danhSachMatHang = new List<RealtimeProductDto>();
                decimal tongLuongDat = 0;
                decimal tongLuongPheDuyet = 0;
                decimal tongLuongGiao = 0;
                decimal tongLuongConLai = 0;

                foreach (var detail in details)
                {
                    var productInfo = productDict.ContainsKey(detail.MaterialCode)
                        ? productDict[detail.MaterialCode]
                        : null;

                    var productName = productInfo?.Name ?? detail.MaterialCode;
                    var productUnit = productInfo?.Unit ?? "";

                    var luongDat = detail.ReturnQuantity ?? 0;
                    var luongPheDuyet = detail.ApproveQuantity ?? 0;

                    // LOGIC TÍNH LƯỢNG GIAO THEO STATUS - ĐƠN TRẢ HÀNG (SỬ DỤNG CONSTANTS)
                    decimal luongGiao = 0;
                    decimal luongConLai = 0;
                    decimal tyLeGiao = 0;

                    if (header.Status == PoConstants.PoStatus.DaXacNhanThucNhan) // "5"
                    {
                        luongGiao = luongPheDuyet;
                        luongConLai = 0;
                        tyLeGiao = 100;
                    }
                    else if (header.Status == PoConstants.PoStatus.DaPheDuyet ||
                             header.Status == PoConstants.PoStatus.DaPheDuyetSoLuong) // "3" || "-3"
                    {
                        luongGiao = 0;
                        luongConLai = luongPheDuyet;
                        tyLeGiao = 0;
                    }
                    else if (header.Status == PoConstants.PoStatus.TuChoi ||
                             header.Status == PoConstants.PoStatus.DaHuy) // "4" || "-1"
                    {
                        luongGiao = 0;
                        luongConLai = 0;
                        tyLeGiao = 0;
                    }
                    else
                    {
                        luongGiao = 0;
                        luongConLai = luongPheDuyet;
                        tyLeGiao = 0;
                    }

                    danhSachMatHang.Add(new RealtimeProductDto
                    {
                        MatHang = productName,
                        MaMatHang = detail.MaterialCode,
                        LuongDat = luongDat,
                        LuongPheDuyet = luongPheDuyet,
                        LuongGiao = luongGiao,
                        LuongConLai = luongConLai,
                        TyLeGiao = tyLeGiao,
                        DonViTinh = productUnit
                    });

                    tongLuongDat += luongDat;
                    tongLuongPheDuyet += luongPheDuyet;
                    tongLuongGiao += luongGiao;
                    tongLuongConLai += luongConLai;
                }

                var tyLeHoanThanh = tongLuongPheDuyet > 0
                    ? (tongLuongGiao / tongLuongPheDuyet) * 100
                    : 0;

                result.Add(new RealtimeReportDto
                {
                    STT = 0,
                    SoDonHangSMO = header.Code,
                    LoaiDonHang = PoConstants.GetPoTypeName(header.PoType) + " (Trả hàng)",
                    KhachHang = header.CustomerName,
                    CuaHang = storeName,
                    SoXe = header.VehicleCode,
                    TenTaiXe = header.Driver,
                    NgayDatHang = header.OrderDate ?? header.ReturnDate,
                    NgayDuKienGiao = header.ExpectedReturnDate ?? header.ReceiptDate,
                    TrangThai = PoConstants.GetStatusName(header.Status),
                    CapNhatLanCuoi = header.UpdateDate ?? header.CreateDate,
                    DanhSachMatHang = danhSachMatHang,
                    TongLuongDat = tongLuongDat,
                    TongLuongPheDuyet = tongLuongPheDuyet,
                    TongLuongGiao = tongLuongGiao,
                    TongLuongConLai = tongLuongConLai,
                    TyLeHoanThanh = Math.Round(tyLeHoanThanh, 2)
                });
            }

            return result;
        }

        #region Helper Methods - Phân Quyền & Filter

        private IQueryable<TblPoHhk> ApplyPermissionFilter(IQueryable<TblPoHhk> query, ReportFilterDto filterDto)
        {
            if (filterDto.AccountType == "KD")
            {
                query = query.Where(x => x.CreateBy == filterDto.UserName ||
                    (x.CreateBy != filterDto.UserName && x.Status != PoConstants.PoStatus.KhoiTao && x.Status != PoConstants.PoStatus.DaHuy));
            }
            else if (filterDto.AccountType == "CH")
            {
                query = query.Where(x => x.CreateBy == filterDto.UserName);
            }
            else if (filterDto.AccountType == "KT")
            {
                query = query.Where(x => x.PoType == PoConstants.PoType.OutProvince &&
                    (x.Status == PoConstants.PoStatus.DaPheDuyetSoLuong ||
                     x.Status == PoConstants.PoStatus.DaPheDuyet ||
                     x.Status == PoConstants.PoStatus.TuChoi ||
                     x.Status == PoConstants.PoStatus.DaXacNhanThucNhan ||
                     x.Status == PoConstants.PoStatus.DaHuy));
            }
            else if (filterDto.AccountType == "KH")
            {
                var mapAccount = _dbContext.TblAdAccountCustomer
                    .AsNoTracking()
                    .FirstOrDefault(x => x.UserName == filterDto.UserName);

                if (mapAccount != null && !string.IsNullOrEmpty(mapAccount.CustomerCode))
                {
                    query = query.Where(x => x.CustomerCode == mapAccount.CustomerCode);
                }
                else
                {
                    query = query.Where(x => false);
                }
            }
            else
            {
                query = query.Where(x => false);
            }

            return query;
        }

        private IQueryable<TblPoHhkReturn> ApplyPermissionFilterReturn(IQueryable<TblPoHhkReturn> query, ReportFilterDto filterDto)
        {
            if (filterDto.AccountType == "KD")
            {
                query = query.Where(x => x.CreateBy == filterDto.UserName ||
                    (x.CreateBy != filterDto.UserName && x.Status != PoConstants.PoStatus.KhoiTao && x.Status != PoConstants.PoStatus.DaHuy));
            }
            else if (filterDto.AccountType == "CH")
            {
                query = query.Where(x => x.CreateBy == filterDto.UserName);
            }
            else if (filterDto.AccountType == "KT")
            {
                query = query.Where(x => x.PoType == PoConstants.PoType.OutProvince &&
                    (x.Status == PoConstants.PoStatus.DaPheDuyetSoLuong ||
                     x.Status == PoConstants.PoStatus.DaPheDuyet ||
                     x.Status == PoConstants.PoStatus.TuChoi ||
                     x.Status == PoConstants.PoStatus.DaXacNhanThucNhan ||
                     x.Status == PoConstants.PoStatus.DaHuy));
            }
            else if (filterDto.AccountType == "KH")
            {
                var mapAccount = _dbContext.TblAdAccountCustomer
                    .AsNoTracking()
                    .FirstOrDefault(x => x.UserName == filterDto.UserName);

                if (mapAccount != null && !string.IsNullOrEmpty(mapAccount.CustomerCode))
                {
                    query = query.Where(x => x.CustomerCode == mapAccount.CustomerCode);
                }
                else
                {
                    query = query.Where(x => false);
                }
            }
            else
            {
                query = query.Where(x => false);
            }

            return query;
        }

        private IQueryable<TblPoHhk> ApplyBasicFilters(IQueryable<TblPoHhk> query, ReportFilterDto filterDto)
        {
            if (filterDto.FromDate.HasValue)
                query = query.Where(x => x.OrderDate >= filterDto.FromDate.Value.Date);

            if (filterDto.ToDate.HasValue)
                query = query.Where(x => x.OrderDate <= filterDto.ToDate.Value.Date.AddDays(1).AddTicks(-1));

            if (!string.IsNullOrEmpty(filterDto.StoreOrCustomer))
            {
                if (filterDto.StoreOrCustomer == "Store")
                    query = query.Where(x => x.StoreCode != null && x.StoreCode != "");
                else if (filterDto.StoreOrCustomer == "Customer")
                    query = query.Where(x => x.CustomerCode != null && x.CustomerCode != "");
            }

            if (!string.IsNullOrEmpty(filterDto.Status))
            {
                if (filterDto.Status == "approved")
                    query = query.Where(x => x.Status == PoConstants.PoStatus.DaPheDuyet || x.Status == PoConstants.PoStatus.DaPheDuyetSoLuong);
                else if (filterDto.Status == "new")
                    query = query.Where(x => x.Status == PoConstants.PoStatus.KhoiTao);
                else
                    query = query.Where(x => x.Status == filterDto.Status);
            }

            return query;
        }

        private IQueryable<TblPoHhkReturn> ApplyBasicFiltersReturn(IQueryable<TblPoHhkReturn> query, ReportFilterDto filterDto)
        {
            if (filterDto.FromDate.HasValue)
                query = query.Where(x => x.OrderDate >= filterDto.FromDate.Value.Date || x.ReturnDate >= filterDto.FromDate.Value.Date);

            if (filterDto.ToDate.HasValue)
                query = query.Where(x => x.OrderDate <= filterDto.ToDate.Value.Date.AddDays(1).AddTicks(-1) || x.ReturnDate <= filterDto.ToDate.Value.Date.AddDays(1).AddTicks(-1));

            if (!string.IsNullOrEmpty(filterDto.StoreOrCustomer))
            {
                if (filterDto.StoreOrCustomer == "Store")
                    query = query.Where(x => x.StoreCode != null && x.StoreCode != "");
                else if (filterDto.StoreOrCustomer == "Customer")
                    query = query.Where(x => x.CustomerCode != null && x.CustomerCode != "");
            }

            if (!string.IsNullOrEmpty(filterDto.Status))
            {
                if (filterDto.Status == "approved")
                    query = query.Where(x => x.Status == PoConstants.PoStatus.DaPheDuyet || x.Status == PoConstants.PoStatus.DaPheDuyetSoLuong);
                else if (filterDto.Status == "new")
                    query = query.Where(x => x.Status == PoConstants.PoStatus.KhoiTao);
                else
                    query = query.Where(x => x.Status == filterDto.Status);
            }

            return query;
        }

        #endregion
    }
}