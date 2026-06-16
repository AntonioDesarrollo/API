using KBH.Replicant.Carpentaria.Application;
using KBH.Replicant.Carpentaria.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MyApp.Namespace
{
    [Route("api/[controller]")]
    [ApiController]
    public class TokenController : ControllerBase
    {
        private readonly IPersonalAccessTokenService _tokenService;

        public TokenController(IPersonalAccessTokenService tokenService)
        {
            _tokenService = tokenService;
        }

        [HttpPost]
        public IActionResult PostPat([FromBody] TokenDTO tokenDto)
        {
            bool result = _tokenService.Save(tokenDto);
            return Ok(result);
        }

        [HttpDelete("{target}")]
        public IActionResult DeletePat(string target)
        {
            bool result = _tokenService.Delete(target);
            return Ok(result);
        }
    }
}
