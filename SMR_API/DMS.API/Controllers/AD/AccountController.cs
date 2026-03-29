using Common;
using DMS.API.AppCode.Attribute;
using DMS.API.AppCode.Enum;
using DMS.API.AppCode.Extensions;
using DMS.BUSINESS.Dtos.AD;
using DMS.BUSINESS.Filter.AD;
using DMS.BUSINESS.Services.AD;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DMS.API.Controllers.MD
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AccountController(IAccountService service) : ControllerBase
    {
        public readonly IAccountService _service = service;

        [HttpGet("Debug")]
        public async Task<IActionResult> Debug()
        {
            try
            {
                // Lấy tất cả accounts và organize codes
                var accounts = await _service.GetAllForDebug();
                return Ok(accounts);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error: {ex.Message}");
            }
        }

        [HttpGet("Search")]
        [CustomAuthorize(Right = "R1.3.1")]

        public async Task<IActionResult> Search([FromQuery] AccountFilter filter)
        {
            Console.WriteLine($"[DEBUG] AccountController.Search called with filter:");
            Console.WriteLine($"[DEBUG] - OrganizeCode: '{filter.OrganizeCode}'");
            Console.WriteLine($"[DEBUG] - KeyWord: '{filter.KeyWord}'");
            Console.WriteLine($"[DEBUG] - AccountType: '{filter.AccountType}'");
            Console.WriteLine($"[DEBUG] - GroupId: '{filter.GroupId}'");
            
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
                transferObject.GetMessage("2000", _service);
            }
            return Ok(transferObject);
        }

        [HttpGet("GetAll")]
        [CustomAuthorize(Right = "R1.3.1")]

        public async Task<IActionResult> GetAll([FromQuery] AccountFilterLite filter)
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

        [HttpGet("GetDetail")]
        [CustomAuthorize(Right = "R1.3.1")]

        public async Task<IActionResult> GetDetail(string userName)
        {
            var transferObject = new TransferObject();
            var result = await _service.GetByIdWithRightTree(userName);
            if (_service.Status)
            {
                transferObject.Data = result;
            }
            else
            {
                transferObject.Status = false;
                transferObject.MessageObject.MessageType = MessageType.Error;
                transferObject.GetMessage("2000", _service);
            }
            return Ok(transferObject);
        }

        [HttpPost("Insert")]
        [CustomAuthorize(Right = "R1.3.3")]

        public async Task<IActionResult> Insert([FromBody] AccountCreateDto account)
        {
            var transferObject = new TransferObject();
            var result = await _service.Add(account);
            if (_service.Status)
            {
                transferObject.Data = result;
                transferObject.Status = true;
                transferObject.MessageObject.MessageType = MessageType.Success;
                transferObject.GetMessage("0100", _service);
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
        [CustomAuthorize(Right = "R1.3.2")]

        public async Task<IActionResult> Update([FromBody] AccountUpdateDto account)
        {
            var transferObject = new TransferObject();
            await _service.Update(account);
            if (_service.Status)
            {
                transferObject.Status = true;
                transferObject.MessageObject.MessageType = MessageType.Success;
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

        [HttpDelete("Delete/{userName}")]
        public async Task<IActionResult> Delete(string userName)
        {
            var transferObject = new TransferObject();
            await _service.Delete(userName);
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

        [HttpPut("UpdateInformation")]
        [CustomAuthorize(Right = "R1.3.2")]

        public async Task<IActionResult> UpdateInformation([FromBody] AccountUpdateInformationDto account)
        {
            var transferObject = new TransferObject();
            await _service.UpdateInformation(account);
            if (_service.Status)
            {
                transferObject.Status = true;
                transferObject.MessageObject.MessageType = MessageType.Success;
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

        [HttpPut("ResetPassword")]
        public IActionResult ResetPassword([FromQuery] string username)
        {
            var transferObject = new TransferObject();
            _service.ResetPassword(username);
            if (_service.Status)
            {
                transferObject.Status = true;
                transferObject.MessageObject.MessageType = MessageType.Success;
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

        [HttpPut("RegisterFace")]
        public IActionResult RegisterFace([FromQuery] string username)
        {
            var transferObject = new TransferObject();
            var result =  _service.RegisterFaceAsync(username);
            if (_service.Status)
            {
                transferObject.Status = true;
                transferObject.MessageObject.MessageType = MessageType.Success;
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
        [HttpGet("GetUIdFace")]
        public IActionResult GetUIdFace([FromQuery] string username)
        {
            var transferObject = new TransferObject();
            var result = _service.GetUIdFace(username);
            if (_service.Status)
            {
                transferObject.Data = result;
                transferObject.Status = true;
                transferObject.MessageObject.MessageType = MessageType.Success;
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
