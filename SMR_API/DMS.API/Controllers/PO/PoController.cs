using Common;
using Common.API;
using DMS.API.AppCode.Enum;
using DMS.API.AppCode.Extensions;
using DMS.BUSINESS.Dtos.CM;
using DMS.BUSINESS.Dtos.MD;
using DMS.BUSINESS.Dtos.PO;
using DMS.BUSINESS.Dtos.RP;
using DMS.BUSINESS.Services.MD;
using DMS.BUSINESS.Services.PO;
using DocumentFormat.OpenXml.Office2010.Excel;
using Microsoft.AspNetCore.Mvc;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using System.Drawing;
using System.Security.Claims;

namespace DMS.API.Controllers.PO
{
    [Route("api/[controller]")]
    [ApiController]
    public class PoController : ControllerBase
    {
        private readonly IPoService _service;
        private readonly ICustomerService _customerService;
        private readonly IProductListService _productListService;
        private readonly ITransportTypeService _transportTypeService;
        private readonly ITransportUnitService _transportUnitService;
        private readonly ITransportVehicleService _transportVehicleService;
        private readonly IStorageService _storageService;
        private readonly IUnitProductService _unitProductService;
        public readonly IStoreService _storeService;

        public PoController(IPoService service, ICustomerService customerService,IStoreService storeService, IProductListService productListService, ITransportTypeService transportTypeService, ITransportUnitService transportUnitService, ITransportVehicleService transportVehicleService, IStorageService storageService, IUnitProductService unitProductService)
        {
            _service = service;
            _customerService = customerService;
            _storeService = storeService;
            _productListService = productListService;
            _transportTypeService = transportTypeService;
            _transportUnitService = transportUnitService;
            _transportVehicleService = transportVehicleService;
            _storageService = storageService;
            _unitProductService = unitProductService;
        }
        [HttpPut("UpdateCustomer")]

        public async Task<IActionResult> UpdateCustomer([FromBody] CustomerDto data)
        {
            var transferObject = new TransferObject();
            await _customerService.Update(data);
            if (_customerService.Status)
            {
                transferObject.Status = true;
                transferObject.GetMessage("0103", _customerService);
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0104", _customerService);
            }
            return Ok(transferObject);
        }
        [HttpGet("GetCustomers")]
        public async Task<IActionResult> GetCustomers([FromQuery] BaseMdFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _customerService.GetAll(filter);
            if (_customerService.Status)
            {
                transferObject.Data = result;
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0001", _customerService);
            }
            return Ok(transferObject);
        }
        [HttpGet("GetStores")]
        public async Task<IActionResult> GetStores([FromQuery] BaseMdFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _storeService.GetAll(filter);
            if (_storeService.Status)
            {
                transferObject.Data = result;
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0001", _storeService);
            }
            return Ok(transferObject);
        }

        [HttpGet("GetStorages")]
        public async Task<IActionResult> GetStorages([FromQuery] BaseMdFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _storageService.GetAll(filter);
            if (_storageService.Status)
            {
                transferObject.Data = result;
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0001", _storageService);
            }
            return Ok(transferObject);
        }

        [HttpGet("GetTransportTypes")]
        public async Task<IActionResult> GetTransportTypes([FromQuery] BaseMdFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _transportTypeService.GetAll(filter);
            if (_transportTypeService.Status)
            {
                transferObject.Data = result;
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0001", _transportTypeService);
            }
            return Ok(transferObject);
        }

        [HttpGet("GetTransportUnits")]
        public async Task<IActionResult> GetTransportUnits([FromQuery] BaseMdFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _transportUnitService.GetAll(filter);
            if (_transportUnitService.Status)
            {
                transferObject.Data = result;
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0001", _transportUnitService);
            }
            return Ok(transferObject);
        }

        [HttpGet("GetTransportVehicles")]
        public async Task<IActionResult> GetTransportVehicles([FromQuery] BaseMdFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _transportVehicleService.GetAll(filter);
            if (_transportVehicleService.Status)
            {
                transferObject.Data = result;
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0001", _transportVehicleService);
            }
            return Ok(transferObject);
        }

        [HttpGet("GetProductLists")]
        public async Task<IActionResult> GetProductLists([FromQuery] BaseMdFilter filter)
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

        [HttpGet("GetUnitProducts")]
        public async Task<IActionResult> GetUnitProducts([FromQuery] BaseMdFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _unitProductService.GetAll(filter);
            if (_unitProductService.Status)
            {
                transferObject.Data = result;
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0001", _unitProductService);
            }
            return Ok(transferObject);
        }

        /// <summary>
        /// Create a new purchase order with details and initial history
        /// </summary>
        [HttpPost("Create")]
        public async Task<IActionResult> CreateOrder([FromBody] PoHhkCreateDto createDto)
        {
            var transferObject = new TransferObject();

            try
            {
                // Get current user from claims (adjust based on your auth setup)
                var currentUser = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "SYSTEM";

                var result = await _service.CreateOrder(createDto);

                if (_service.Status && result != null)
                {
                    transferObject.Status = true;
                    transferObject.Data = result;
                    transferObject.MessageObject.MessageType = MessageType.Success;
                    transferObject.GetMessage("0100", _service); // Success message
                }
                else
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.GetMessage("0101", _service); // Error message
                }
            }
            catch (Exception ex)
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.MessageObject.Message = $"Lỗi khi tạo đơn hàng: {ex.Message}";
            }

            return Ok(transferObject);
        }

        /// <summary>
        /// Get order by code
        /// </summary>
        [HttpGet("GetByCode/{code}")]
        public async Task<IActionResult> GetByCode([FromRoute] string code)
        {
            var transferObject = new TransferObject();

            var result = await _service.GetOrderByCode(code);

            if (_service.Status && result != null)
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
        /// Search orders with pagination
        /// </summary>
        [HttpGet("Search")]
        public async Task<IActionResult> Search([FromQuery] BaseFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _service.Search(filter);

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

        [HttpGet("GetAll")]
        public async Task<IActionResult> GetAll([FromQuery] BaseFilter filter, [FromQuery] string userName = "SYSTEM", [FromQuery] string accountType = "KH")
        {
            var transferObject = new TransferObject();

            // 1. Xử lý thông tin User/Account từ Token (Logic phân quyền & bảo mật)
            if (string.IsNullOrEmpty(userName) || userName == "SYSTEM")
            {
                userName = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "SYSTEM";
            }

            if (string.IsNullOrEmpty(accountType))
            {
                accountType = User?.FindFirst("AccountType")?.Value ?? "KH";
            }

            var filterDto = new OrderFilterDto
            {
                UserName = userName,
                AccountType = accountType,
                KeyWord = filter.KeyWord
            };

            var result = await _service.GetAllOrdersFiltered(filterDto);

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
       
        [HttpGet("GetDetails/{headerCode}")]
        public async Task<IActionResult> GetDetails([FromRoute] string headerCode)
        {
            var transferObject = new TransferObject();
            var result = await _service.GetOrderDetails(headerCode);

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
        /// Get order history by header code
        /// </summary>
        [HttpGet("GetHistory/{headerCode}")]
        public async Task<IActionResult> GetHistory([FromRoute] string headerCode)
        {
            var transferObject = new TransferObject();
            var result = await _service.GetOrderHistory(headerCode);

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
        /// Get order history with user information by header code
        /// </summary>
        [HttpGet("GetHistoryDetail/{headerCode}")]
        public async Task<IActionResult> GetHistoryDetail([FromRoute] string headerCode)
        {
            var transferObject = new TransferObject();
            var result = await _service.GetOrderHistoryDetail(headerCode);

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
        /// Update an existing order with new details
        /// - Updates T_PO_HHK header (STATUS remains unchanged)
        /// - Updates T_PO_HHK_DETAIL items
        /// - Adds history record with STATUS = 0 ("Chỉnh sửa thông tin")
        /// </summary>
        [HttpPut("Update/{orderCode}")]
        public async Task<IActionResult> UpdateOrder([FromRoute] string orderCode, [FromBody] PoHhkUpdateDto updateDto)
        {
            var transferObject = new TransferObject();

            try
            {
                if (string.IsNullOrEmpty(orderCode))
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.UpdateOrderWithHistory(orderCode, updateDto);

                if (_service.Status && result != null)
                {
                    transferObject.Status = true;
                    transferObject.Data = result;
                    transferObject.MessageObject.MessageType = MessageType.Success;
                    transferObject.MessageObject.Message = $"Cập nhật đơn hàng {orderCode} thành công!";
                }
                else
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.GetMessage("0101", _service); // Error message
                }
            }
            catch (Exception ex)
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.MessageObject.Message = $"Lỗi khi cập nhật đơn hàng: {ex.Message}";
            }

            return Ok(transferObject);
        }

        /// <summary>
        /// Cancel one or multiple orders
        /// Sets STATUS = -1 in T_PO_HHK and adds new history record in T_PO_HHK_HISTORY
        /// </summary>
        [HttpPost("CancelOrders")]
        public async Task<IActionResult> CancelOrders([FromBody] CancelOrdersRequest request)
        {
            var transferObject = new TransferObject();

            try
            {
                if (request?.OrderCodes == null || request.OrderCodes.Count == 0)
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Danh sách mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.CancelOrders(request.OrderCodes);

                if (_service.Status)
                {
                    transferObject.Status = true;
                    transferObject.Data = result;
                    transferObject.MessageObject.MessageType = MessageType.Success;
                    transferObject.MessageObject.Message = $"Hủy {request.OrderCodes.Count} đơn hàng thành công!";
                }
                else
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.GetMessage("0101", _service);
                }
            }
            catch (Exception ex)
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.MessageObject.Message = $"Lỗi khi hủy đơn hàng: {ex.Message}";
            }

            return Ok(transferObject);
        }

        /// <summary>
        /// Submit orders: change STATUS from 1 to 2 (Chờ duyệt)
        /// </summary>
        [HttpPost("SubmitOrders")]
        public async Task<IActionResult> SubmitOrders([FromBody] SubmitOrdersRequest request)
        {
            var transferObject = new TransferObject();

            try
            {
                if (request?.OrderCodes == null || request.OrderCodes.Count == 0)
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Danh sách mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.SubmitOrders(request.OrderCodes);

                if (_service.Status)
                {
                    transferObject.Status = true;
                    transferObject.Data = result;
                    transferObject.MessageObject.MessageType = MessageType.Success;
                    transferObject.MessageObject.Message = $"Gửi {request.OrderCodes.Count} đơn hàng chờ duyệt thành công!";
                }
                else
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.GetMessage("0101", _service);
                }
            }
            catch (Exception ex)
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.MessageObject.Message = $"Lỗi khi gửi đơn hàng: {ex.Message}";
            }

            return Ok(transferObject);
        }

        [HttpPost("ConfirmReceiveds")]
        public async Task<IActionResult> ConfirmReceiveds([FromBody] ConfirmReceivedsRequest request)
        {
            var transferObject = new TransferObject();

            try
            {
                if (request?.OrderCodes == null || request.OrderCodes.Count == 0)
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Danh sách mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.ConfirmReceiveds(request.OrderCodes);

                if (_service.Status)
                {
                    transferObject.Status = true;
                    transferObject.Data = result;
                    transferObject.MessageObject.MessageType = MessageType.Success;
                    transferObject.MessageObject.Message = $"Xác nhận thực nhận {request.OrderCodes.Count} đơn hàng thành công!";
                }
                else
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.GetMessage("0101", _service);
                }
            }
            catch (Exception ex)
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.MessageObject.Message = $"Lỗi khi xác nhận thực nhận đơn hàng: {ex.Message}";
            }

            return Ok(transferObject);
        }

        /// <summary>
        /// Submit single order: change STATUS from 1 to 2 (Chờ duyệt)
        /// </summary>
        [HttpPost("Submit/{orderCode}")]
        public async Task<IActionResult> SubmitOrder([FromRoute] string orderCode)
        {
            var transferObject = new TransferObject();

            try
            {
                if (string.IsNullOrWhiteSpace(orderCode))
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.SubmitOrders(new List<string> { orderCode });

                if (_service.Status && result.Count > 0)
                {
                    transferObject.Status = true;
                    transferObject.Data = result[0];
                    transferObject.MessageObject.MessageType = MessageType.Success;
                    transferObject.MessageObject.Message = "Gửi đơn hàng chờ duyệt thành công!";
                }
                else
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Không thể gửi đơn hàng. Kiểm tra trạng thái đơn hàng!";
                }
            }
            catch (Exception ex)
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.MessageObject.Message = $"Lỗi khi gửi đơn hàng: {ex.Message}";
            }

            return Ok(transferObject);
        }

        /// <summary>
        /// Approve order: change STATUS from 2 (Chờ phê duyệt) to 3 (Đã phê duyệt)
        /// POST /api/Po/ApproveOrder/{orderCode}
        /// Only for KD (Distributor) accounts
        /// </summary>
        [HttpPost("ApproveOrder/{orderCode}")]
        public async Task<IActionResult> ApproveOrder([FromRoute] string orderCode)
        {
            var transferObject = new TransferObject();

            try
            {
                if (string.IsNullOrWhiteSpace(orderCode))
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.ApproveOrder(orderCode);

                if (_service.Status && result != null)
                {
                    transferObject.Status = true;
                    transferObject.Data = result;
                    transferObject.MessageObject.MessageType = MessageType.Success;
                    transferObject.MessageObject.Message = "Phê duyệt đơn hàng thành công!";
                }
                else
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = _service.Exception?.Message ?? "Không thể phê duyệt đơn hàng!";
                }
            }
            catch (Exception ex)
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.MessageObject.Message = $"Lỗi khi phê duyệt đơn hàng: {ex.Message}";
            }

            return Ok(transferObject);
        }
        /// <summary>
        /// Approve order quantity: change STATUS from 2 (Chờ duyệt) to -3 (Đã phê duyệt số lượng)
        /// POST /api/Po/ApproveQuantityOrder/{orderCode}
        /// Only for KD (Distributor) accounts
        /// </summary>
        [HttpPost("ApproveQuantityOrder/{orderCode}")]
        public async Task<IActionResult> ApproveQuantityOrder([FromRoute] string orderCode)
        {
            var transferObject = new TransferObject();

            try
            {
               

                if (string.IsNullOrWhiteSpace(orderCode))
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.ApproveQuantityOrder(orderCode);

                if (_service.Status && result != null)
                {
                    transferObject.Status = true;
                    transferObject.Data = result;
                    transferObject.MessageObject.MessageType = MessageType.Success;
                    transferObject.MessageObject.Message = "Phê duyệt số lượng đơn hàng thành công!";
                }
                else
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = _service.Exception?.Message ?? "Không thể phê duyệt số lượng đơn hàng!";
                }
            }
            catch (Exception ex)
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.MessageObject.Message = $"Lỗi khi phê duyệt số lượng: {ex.Message}";
            }

            return Ok(transferObject);
        }
        /// <summary>
        /// Reject order: change STATUS from 2 (Chờ phê duyệt) to 4 (Từ chối)
        /// POST /api/Po/RejectOrder/{orderCode}
        /// Only for KD (Distributor) accounts
        /// </summary>
        [HttpPost("RejectOrder/{orderCode}")]
        public async Task<IActionResult> RejectOrder([FromRoute] string orderCode)
        {
            var transferObject = new TransferObject();

            try
            {
                if (string.IsNullOrWhiteSpace(orderCode))
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.RejectOrder(orderCode);

                if (_service.Status && result != null)
                {
                    transferObject.Status = true;
                    transferObject.Data = result;
                    transferObject.MessageObject.MessageType = MessageType.Success;
                    transferObject.MessageObject.Message = "Từ chối đơn hàng thành công!";
                }
                else
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = _service.Exception?.Message ?? "Không thể từ chối đơn hàng!";
                }
            }
            catch (Exception ex)
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.MessageObject.Message = $"Lỗi khi từ chối đơn hàng: {ex.Message}";
            }

            return Ok(transferObject);
        }

        /// <summary>
        /// Confirm received: change STATUS from 3 (Đã phê duyệt) to 5 (Đã xác nhận thực nhận)
        /// POST /api/Po/ConfirmReceived/{orderCode}
        /// Only for KH (Customer) accounts
        /// </summary>
        [HttpPost("ConfirmReceived/{orderCode}")]
        public async Task<IActionResult> ConfirmReceived([FromRoute] string orderCode)
        {
            var transferObject = new TransferObject();

            try
            {
                if (string.IsNullOrWhiteSpace(orderCode))
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.ConfirmReceived(orderCode);

                if (_service.Status && result != null)
                {
                    transferObject.Status = true;
                    transferObject.Data = result;
                    transferObject.MessageObject.MessageType = MessageType.Success;
                    transferObject.MessageObject.Message = "Xác nhận thực nhận đơn hàng thành công!";
                }
                else
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = _service.Exception?.Message ?? "Không thể xác nhận thực nhận đơn hàng!";
                }
            }
            catch (Exception ex)
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.MessageObject.Message = $"Lỗi khi xác nhận thực nhận đơn hàng: {ex.Message}";
            }

            return Ok(transferObject);
        }
    }

    /// <summary>
    /// Request model for cancel orders endpoint
    /// </summary>
    public class CancelOrdersRequest
    {
        public List<string> OrderCodes { get; set; }
    }

    /// <summary>
    /// Request model for submit orders endpoint
    /// </summary>
    public class SubmitOrdersRequest
    {
        public List<string> OrderCodes { get; set; }
    }
    public class ConfirmReceivedsRequest
    {
        public List<string> OrderCodes { get; set; }
    }
}
