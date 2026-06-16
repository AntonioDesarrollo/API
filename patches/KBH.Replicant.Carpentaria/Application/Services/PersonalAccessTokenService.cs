using System.Runtime.InteropServices;
using System.Security.Principal;
using KBH.Replicant.Carpentaria.Application.Interfaces;
using KBH.Replicant.Carpentaria.Application.Statics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace KBH.Replicant.Carpentaria.Application.Services;

public class PersonalAccessTokenService : IPersonalAccessTokenService
{
    private readonly ILogger<PersonalAccessTokenService> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private const string _KBH_PAT = "KBH_PAT";

    public PersonalAccessTokenService(
        ILogger<PersonalAccessTokenService> logger,
        IHttpContextAccessor httpContextAccessor)
    {
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    public string GetMasterToken() => ResolveCredentialAsCallingUser(_KBH_PAT);

    public string GetProjectToken(string projectName) =>
        ResolveCredentialAsCallingUser($"KBH_PAT_{projectName}");

    // Lee la credencial impersonando al usuario Windows que hizo el request,
    // de modo que accede a SU propio Windows Credential Manager.
    private string ResolveCredentialAsCallingUser(string key)
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            _logger.LogWarning("Windows Credential Manager solo está disponible en Windows.");
            return string.Empty;
        }

        var windowsIdentity = _httpContextAccessor.HttpContext?.User.Identity as WindowsIdentity;
        if (windowsIdentity == null)
        {
            _logger.LogWarning(
                "No se pudo obtener la identidad Windows del request. ¿Está habilitada la autenticación Windows en IIS?"
            );
            return string.Empty;
        }

        string result = string.Empty;
        WindowsIdentity.RunImpersonated(windowsIdentity.AccessToken, () =>
        {
            result = WindowsCredentialManager.GetCredential(key) ?? string.Empty;
        });

        _logger.LogInformation(
            "PAT '{Key}' para {User}: {Status}",
            key, windowsIdentity.Name,
            string.IsNullOrEmpty(result) ? "NO ENCONTRADO en Credential Manager" : "encontrado"
        );

        if (string.IsNullOrEmpty(result))
            _logger.LogWarning(
                "El usuario {User} no tiene '{Key}' en su Windows Credential Manager.",
                windowsIdentity.Name, key
            );

        return result;
    }

    public bool Save(TokenDTO tokenDTO)
    {
        _logger.LogInformation("Guardando token: {Target}", tokenDTO.Target);
        if (!tokenDTO.Target.StartsWith("KBH_"))
            _logger.LogWarning("El target '{Target}' no es de carpentaria", tokenDTO.Target);

        var windowsIdentity = _httpContextAccessor.HttpContext?.User.Identity as WindowsIdentity;
        if (windowsIdentity != null)
        {
            // Guarda en el Credential Manager del usuario que llama
            WindowsIdentity.RunImpersonated(windowsIdentity.AccessToken, () =>
            {
                WindowsCredentialManager.SaveCredential(tokenDTO.Target, "Carpentaria", tokenDTO.Value);
            });
        }
        else
        {
            WindowsCredentialManager.SaveCredential(tokenDTO.Target, "Carpentaria", tokenDTO.Value);
        }
        return true;
    }

    public bool Delete(string target)
    {
        _logger.LogInformation("Eliminando token: {Target}", target);
        if (!target.StartsWith("KBH_"))
        {
            _logger.LogWarning("El target '{Target}' no es de carpentaria", target);
            return false;
        }

        var windowsIdentity = _httpContextAccessor.HttpContext?.User.Identity as WindowsIdentity;
        if (windowsIdentity != null)
        {
            WindowsIdentity.RunImpersonated(windowsIdentity.AccessToken, () =>
            {
                WindowsCredentialManager.DeleteCredential(target);
            });
        }
        else
        {
            WindowsCredentialManager.DeleteCredential(target);
        }
        return true;
    }
}
