using System.Runtime.InteropServices;
using KBH.Replicant.Carpentaria.Application.Interfaces;
using KBH.Replicant.Carpentaria.Application.Statics;
using Microsoft.Extensions.Logging;

namespace KBH.Replicant.Carpentaria.Application.Services;

public class PersonalAccessTokenService : IPersonalAccessTokenService
{
    private Dictionary<string, string> _credentials = new Dictionary<string, string>();
    private readonly ILogger<PersonalAccessTokenService> _logger;
    private const string _KBH_PAT = "KBH_PAT";

    public PersonalAccessTokenService(ILogger<PersonalAccessTokenService> logger)
    {
        _logger = logger;
    }

    public string GetMasterToken()
    {
        string token = ResolveCredential(_KBH_PAT);
        string domain = Environment.UserDomainName;
        string user = Environment.UserName;
        _logger.LogInformation(
            "PAT para {User}@{Domain}: {Status}",
            user, domain,
            string.IsNullOrEmpty(token) ? "NO ENCONTRADO" : "encontrado"
        );
        if (string.IsNullOrEmpty(token))
            _logger.LogWarning(
                "No se encontró el PAT '{Name}' en Credential Manager ni en variables de entorno.",
                _KBH_PAT
            );
        return token;
    }

    public string GetProjectToken(string projectName)
    {
        if (_credentials.TryGetValue(projectName, out string? token))
            return token;

        token = ResolveCredential($"KBH_PAT_{projectName}");
        _credentials[projectName] = token;
        if (string.IsNullOrEmpty(token))
            _logger.LogWarning("No personal access token found for {Name}.", projectName);
        return token;
    }

    // Busca la credencial en: 1) Windows Credential Manager, 2) Variable de entorno
    private string ResolveCredential(string key)
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            string? fromManager = WindowsCredentialManager.GetCredential(key);
            if (!string.IsNullOrEmpty(fromManager))
            {
                _logger.LogDebug("Credencial '{Key}' obtenida desde Windows Credential Manager.", key);
                return fromManager;
            }
            _logger.LogWarning(
                "Credencial '{Key}' no encontrada en Windows Credential Manager (usuario: {User}@{Domain}). Intentando variable de entorno.",
                key, Environment.UserName, Environment.UserDomainName
            );
        }

        string? fromEnv = Environment.GetEnvironmentVariable(key);
        if (!string.IsNullOrEmpty(fromEnv))
        {
            _logger.LogDebug("Credencial '{Key}' obtenida desde variable de entorno.", key);
            return fromEnv;
        }

        return string.Empty;
    }

    public bool Save(TokenDTO tokenDTO)
    {
        _logger.LogInformation("Patch TokenDTO: {Target}", tokenDTO.Target);
        if (!tokenDTO.Target.StartsWith("KBH_"))
        {
            _logger.LogWarning("El target a crear no es de carpentaria");
        }
        WindowsCredentialManager.SaveCredential(tokenDTO.Target, "Carpentaria", tokenDTO.Value);
        return true;
    }

    public bool Delete(string target)
    {
        _logger.LogInformation("Delete TokenDTO: {Target}", target);
        if (!target.StartsWith("KBH_"))
        {
            _logger.LogWarning("El target a eliminar no es de carpentaria");
            return false;
        }
        WindowsCredentialManager.DeleteCredential(target);
        return true;
    }
}
