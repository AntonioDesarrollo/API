using System.Runtime.InteropServices;
using System.Security.Principal;
using KBH.Replicant.Carpentaria.Application.Interfaces;
using KBH.Replicant.Carpentaria.Application.Statics;
using Microsoft.AspNetCore.Mvc;

namespace KBH.Replicant.Carpentaria.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DiagnosticsController : ControllerBase
{
    private readonly IPersonalAccessTokenService _tokenService;

    public DiagnosticsController(IPersonalAccessTokenService tokenService)
    {
        _tokenService = tokenService;
    }

    /// <summary>
    /// Muestra el usuario Windows que está llamando al API, su dominio y si tiene PAT configurado.
    /// </summary>
    [HttpGet("whoami")]
    public IActionResult WhoAmI()
    {
        var identity = HttpContext.User.Identity as WindowsIdentity;

        string fullName   = identity?.Name ?? HttpContext.User.Identity?.Name ?? "anónimo";
        string domain     = fullName.Contains('\\') ? fullName.Split('\\')[0] : Environment.UserDomainName;
        string userName   = fullName.Contains('\\') ? fullName.Split('\\')[1] : fullName;

        string pat        = _tokenService.GetMasterToken();
        bool   hasPat     = !string.IsNullOrEmpty(pat);

        return Ok(new
        {
            domain,
            userName,
            isAuthenticated   = identity?.IsAuthenticated ?? false,
            authenticatedWith = identity?.AuthenticationType ?? "ninguna",
            pat = new
            {
                found   = hasPat,
                preview = hasPat ? $"{pat[..4]}...{pat[^4..]}" : "—",
            },
        });
    }
}
