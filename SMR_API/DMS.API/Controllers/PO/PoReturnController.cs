using Common;
using DMS.API.AppCode.Attribute;
using DMS.API.AppCode.Enum;
using DMS.API.AppCode.Extensions;
using DMS.BUSINESS.Dtos.MD;
using DMS.BUSINESS.Dtos.PO;
using DMS.BUSINESS.Services.MD;
using DMS.BUSINESS.Services.PO;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DMS.API.Controllers.PO
{
    [Route("api/[controller]")]
    [ApiController]
    public class PoReturnController(IPoReturnService service, IProductListService productListService, ITransportTypeService transportTypeService,ITransportUnitService transportUnitService,ITransportVehicleService transportVehicleService,IStorageService storageService,ICustomerService customerService,IUnitProductService unitProductService) : ControllerBase
    {
        public readonly IPoReturnService _service = service;
        public readonly IProductListService _productListService = productListService;
        public readonly ITransportTypeService _transportTypeService = transportTypeService;
        public readonly ITransportUnitService _transportUnitService = transportUnitService;
        public readonly ITransportVehicleService _transportVehicleService = transportVehicleService;
        public readonly IStorageService _storageService = storageService;
        public readonly ICustomerService _customerService = customerService;
        public readonly IUnitProductService _unitProductService = unitProductService;

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
        [HttpGet("GetCustomerByCode/{customerCode}")]
        public async Task<IActionResult> GetCustomerByCode([FromRoute] string customerCode)
        {
            var transferObject = new TransferObject();
            var result = await _customerService.GetByCustomerCode(customerCode);
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
        [HttpGet("GetByCustomerCode/{customerCode}")]
        public async Task<IActionResult> GetByCustomerCode([FromRoute] string customerCode)
        {
            var transferObject = new TransferObject();
            var result = await _customerService.GetByCustomerCode(customerCode);
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

        [HttpGet("Search")]
        public async Task<IActionResult> Search([FromQuery] ReturnFilterDto filter)
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

            // Use user info from query parameters (passed by frontend)
            // If frontend doesn't send them, use claims as fallback
            if (string.IsNullOrEmpty(userName) || userName == "SYSTEM")
            {
                userName = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "SYSTEM";
            }

            if (string.IsNullOrEmpty(accountType))
            {
                accountType = User?.FindFirst("AccountType")?.Value ?? "KH";
            }

            // Use filtered version with user account type
            var filterDto = new ReturnFilterDto
            {
                UserName = userName,
                AccountType = accountType,
                KeyWord = filter.KeyWord
            };

            var result = await _service.GetAllReturnsFiltered(filterDto);

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

        [HttpGet("GetAllOrders")]

        public async Task<IActionResult> GetAllOrders([FromQuery] BaseFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _service.GetAllOrders(filter);
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
        [HttpGet("GetReturnByCode/{code}")]
        public async Task<IActionResult> GetReturnByCode([FromRoute] string code)
        {
            var transferObject = new TransferObject();

            var result = await _service.GetReturnByCode(code);

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
        [HttpPost("InsertReturn")]

        public async Task<IActionResult> InsertReturn([FromBody] PoHhkReturnCreateUpdateDto data)
        {
            var transferObject = new TransferObject();
            var result= await _service.AddReturnCustom(data);
            if (_service.Status)
            {
                transferObject.Data = result;

            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0101", _service);
            }
            return Ok(transferObject);
        }
        [HttpPost("InsertDetailReturn")]

        public async Task<IActionResult> InsertDetailReturn([FromBody] PoHhkDetailReturnDto data)
        {
            var transferObject = new TransferObject();
            var result = await _service.AddDetailReturnCustom(data);
            if (_service.Status)
            {
                transferObject.Data = result;

            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0101", _service);
            }
            return Ok(transferObject);
        }
        [HttpPut("UpdateReturn")]

        public async Task<IActionResult> UpdateReturn([FromBody] PoHhkReturnCreateUpdateDto data)
        {
            var transferObject = new TransferObject();
            await _service.UpdateReturnCustom(data);
            if (_service.Status)
            {
                transferObject.Data = data;

            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0104", _service);
            }
            return Ok(transferObject);
        }
        [HttpPut("UpdateDetailReturn")]

        public async Task<IActionResult> UpdateDetailReturn([FromBody] PoHhkDetailReturnDto data)
        {
            var transferObject = new TransferObject();
            await _service.UpdateDetailReturnCustom(data);
            if (_service.Status)
            {
                transferObject.Data = data;

            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0104", _service);
            }
            return Ok(transferObject);
        }
        [HttpDelete("DeleteDetailReturn/{pkid}")]
        public async Task<IActionResult> DeleteDetailReturn([FromRoute] string pkid)
        {
            var transferObject = new TransferObject();
            await _service.DeleteCustom(pkid);

            if (_service.Status)
            {
                transferObject.Status = true;
                transferObject.MessageObject.MessageType = MessageType.Success;
                transferObject.GetMessage("0105", _service);
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0106", _service);
            }
            return Ok(transferObject);
        }
        [HttpGet("GetHistoryReturn/{headerCode}")]
        public async Task<IActionResult> GetHistory([FromRoute] string headerCode)
        {
            var transferObject = new TransferObject();
            var result = await _service.GetReturnHistory(headerCode);

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
        [HttpGet("GetHistoryDetailReturn/{headerCode}")]
        public async Task<IActionResult> GetHistoryDetailReturn([FromRoute] string headerCode)
        {
            var transferObject = new TransferObject();
            var result = await _service.GetReturnHistoryDetail(headerCode);

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
        [HttpPost("CancelReturns")]
        public async Task<IActionResult> CancelReturns([FromBody] CancelReturnsRequest request)
        {
            var transferObject = new TransferObject();

            try
            {
                if (request?.codes == null || request.codes.Count == 0)
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Danh sách mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.CancelReturns(request.codes);

                if (_service.Status)
                {
                    transferObject.Status = true;
                    transferObject.Data = result;
                    transferObject.MessageObject.MessageType = MessageType.Success;
                    transferObject.MessageObject.Message = $"Hủy {request.codes.Count} đơn hàng thành công!";
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
        [HttpPost("SubmitReturns")]
        public async Task<IActionResult> SubmitReturns([FromBody] SubmitReturnsRequest request)
        {
            var transferObject = new TransferObject();

            try
            {
                if (request?.codes == null || request.codes.Count == 0)
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Danh sách mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.SubmitReturns(request.codes);

                if (_service.Status)
                {
                    transferObject.Status = true;
                    transferObject.Data = result;
                    transferObject.MessageObject.MessageType = MessageType.Success;
                    transferObject.MessageObject.Message = $"Gửi {request.codes.Count} đơn hàng chờ duyệt thành công!";
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

        /// <summary>
        /// Submit single order: change STATUS from 1 to 2 (Chờ duyệt)
        /// </summary>
        [HttpPost("Submit/{code}")]
        public async Task<IActionResult> SubmitReturn([FromRoute] string code)
        {
            var transferObject = new TransferObject();

            try
            {
                if (string.IsNullOrWhiteSpace(code))
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.SubmitReturns(new List<string> { code });

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
        /// POST /api/Po/ApproveReturn/{code}
        /// Only for KD (Distributor) accounts
        /// </summary>
        [HttpPost("ApproveReturn/{code}")]
        public async Task<IActionResult> ApproveReturn([FromRoute] string code)
        {
            var transferObject = new TransferObject();

            try
            {
                if (string.IsNullOrWhiteSpace(code))
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.ApproveReturn(code);

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
        /// Reject order: change STATUS from 2 (Chờ phê duyệt) to 4 (Từ chối)
        /// POST /api/Po/RejectReturn/{code}
        /// Only for KD (Distributor) accounts
        /// </summary>
        [HttpPost("RejectReturn/{code}")]
        public async Task<IActionResult> RejectReturn([FromRoute] string code)
        {
            var transferObject = new TransferObject();

            try
            {
                if (string.IsNullOrWhiteSpace(code))
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.RejectReturn(code);

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
        /// POST /api/Po/ConfirmReturn/{code}
        /// Only for KH (Customer) accounts
        /// </summary>
        [HttpPost("ConfirmReturn/{code}")]
        public async Task<IActionResult> ConfirmReturn([FromRoute] string code)
        {
            var transferObject = new TransferObject();

            try
            {
                if (string.IsNullOrWhiteSpace(code))
                {
                    transferObject.Status = false;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.MessageObject.Message = "Mã đơn hàng không được để trống!";
                    return Ok(transferObject);
                }

                var result = await _service.ConfirmReturn(code);

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
        public class CancelReturnsRequest
        {
            public List<string> codes { get; set; }
        }

        /// <summary>
        /// Request model for submit orders endpoint
        /// </summary>
        public class SubmitReturnsRequest
        {
            public List<string> codes { get; set; }
        }
    }


}

