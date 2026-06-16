using System.Runtime.InteropServices;
using System.Security.Principal;
using Microsoft.AspNetCore.Mvc;

namespace KBH.Replicant.Carpentaria.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DiagnosticsController : ControllerBase
{
    [HttpGet("whoami")]
    public IActionResult WhoAmI()
    {
        var windowsIdentity = HttpContext.User.Identity as WindowsIdentity;

        var info = new
        {
            AuthenticationType   = HttpContext.User.Identity?.AuthenticationType ?? "ninguna",
            IsAuthenticated      = HttpContext.User.Identity?.IsAuthenticated ?? false,
            UserName             = windowsIdentity?.Name ?? HttpContext.User.Identity?.Name ?? "anónimo",
            IsImpersonating      = windowsIdentity?.ImpersonationLevel.ToString() ?? "N/A",
            OS                   = RuntimeInformation.OSDescription,
            AppPoolUser          = Environment.UserDomainName + "\\" + Environment.UserName,
            HasKbhPat            = HasCredential("KBH_PAT", windowsIdentity),
        };

        return Ok(info);
    }

    private bool HasCredential(string key, WindowsIdentity? identity)
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return false;
        if (identity == null)
            return false;

        bool found = false;
        WindowsIdentity.RunImpersonated(identity.AccessToken, () =>
        {
            string? val = KBH.Replicant.Carpentaria.Application.Statics.WindowsCredentialManager.GetCredential(key);
            found = !string.IsNullOrEmpty(val);
        });
        return found;
    }
}
