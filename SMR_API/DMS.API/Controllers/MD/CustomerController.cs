using Common;
using DMS.API.AppCode.Attribute;
using DMS.API.AppCode.Enum;
using DMS.API.AppCode.Extensions;
using DMS.BUSINESS.Dtos.AD;
using DMS.BUSINESS.Dtos.MD;
using DMS.BUSINESS.Services.AD;
using DMS.BUSINESS.Services.MD;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DMS.API.Controllers.MD
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CustomerController(ICustomerService service,IAccountService accountService) : ControllerBase
    {
        public readonly ICustomerService _service = service;
        public readonly IAccountService _accountService = accountService;

        [HttpGet("Search")]
        [CustomAuthorize(Right = "R2.1.1")]
        public async Task<IActionResult> Search([FromQuery] BaseFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _service.Search(filter);
            var data = result.Data as List<CustomerDto>;

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
        [CustomAuthorize(Right = "R2.1.1")]
        public async Task<IActionResult> GetAll([FromQuery] BaseMdFilter filter)
        {
            var transferObject = new TransferObject();
            var result = await _service.GetAll(filter);
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
        [HttpPost("Insert")]
        [CustomAuthorize(Right = "R2.1.2")]

        public async Task<IActionResult> Create([FromBody] CustomerDto data)
        {
            var transferObject = new TransferObject();
            var result = await _service.Add(data);
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
        [HttpPut("Update")]
        [CustomAuthorize(Right = "R2.1.3")]

        public async Task<IActionResult> Update([FromBody] CustomerDto data)
        {
            var transferObject = new TransferObject();
            await _service.Update(data);
            if (_service.Status)
            {
                transferObject.Status = true;
                transferObject.GetMessage("0103", _service);
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0104", _service);
            }
            return Ok(transferObject);
        }
        [HttpDelete("Delete/{id}")]
        public async Task<IActionResult> Delete([FromRoute] string id)
        {
            var transferObject = new TransferObject();
            await _service.Delete(id);
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
        [HttpPost("ImportExcel")]
        [CustomAuthorize(Right = "R2.1.4")]

        public async Task<IActionResult> ImportExcel( IFormFile file)
        {
            var transferObject = new TransferObject();

            try
            {
                var result = await _service.ImportExcel(file);

                if (_service.Status)
                {
                    transferObject.Status = true;
                    transferObject.Data = result;
                    transferObject.MessageObject.MessageType = MessageType.Success;
                    transferObject.GetMessage("0103", _service);
                }
                else
                {
                    transferObject.Status = false;
                    transferObject.Data = result;
                    transferObject.MessageObject.MessageType = MessageType.Error;
                    transferObject.GetMessage("0104", _service);
                }
            }
            catch (ArgumentException argEx) // ❌ Lỗi nghiệp vụ
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.MessageObject.Message = argEx.Message;
            }
            catch (Exception ex) // ❌ Lỗi hệ thống khác
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.MessageObject.Message = $"Lỗi hệ thống: {ex.Message}";
            }

            return Ok(transferObject);
        }
        [HttpGet("GetByCustomerCode/{customerCode}")]
        public async Task<IActionResult> GetByCustomerCode([FromRoute] string customerCode)
        {
            var transferObject = new TransferObject();
            var result = await _service.GetByCustomerCode(customerCode);
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
        [HttpGet("GetByUserName/{userName}")]
        public async Task<IActionResult> GetByUserName([FromRoute] string userName)
        {
            var transferObject = new TransferObject();
            var result = await _accountService.GetByUserName(userName);
            if (_accountService.Status)
            {
                transferObject.Data = result;
            }
            else
            {
                transferObject.Status = false;
                transferObject.GetMessage("0001", _accountService);
            }
            return Ok(transferObject);
        }
        [HttpPut("UpdateInformation")]
        public async Task<IActionResult> UpdateInformation([FromBody] AccountUpdateInformationDto account)
        {
            var transferObject = new TransferObject();
            await _accountService.UpdateInformation(account);
            if (_service.Status)
            {
                transferObject.Status = true;
                transferObject.GetMessage("0103", _service);
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("0104", _service);
            }
            return Ok(transferObject);
        }



    }
}
