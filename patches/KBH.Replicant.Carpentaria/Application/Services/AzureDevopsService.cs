using KBH.Replicant.Carpentaria.Application.Interfaces;
using KBH.Replicant.Carpentaria.Application.Statics;
using Microsoft.Extensions.Logging;
using Microsoft.TeamFoundation.Build.WebApi;
using Microsoft.TeamFoundation.Core.WebApi;
using Microsoft.TeamFoundation.DistributedTask.WebApi;
using Microsoft.VisualStudio.Services.Common;
using Microsoft.VisualStudio.Services.ReleaseManagement.WebApi;
using Microsoft.VisualStudio.Services.ReleaseManagement.WebApi.Clients;
using Microsoft.VisualStudio.Services.WebApi;

namespace KBH.Replicant.Carpentaria.Application.Services;

public class AzureDevopsService : IAzureDevopsService
{
    private readonly IPersonalAccessTokenService _tokenService;
    private readonly ILogger<AzureDevopsService> _logger;
    private VssConnection? _vssConnection;
    private string _cachedPat = string.Empty;

    public AzureDevopsService(
        ILogger<AzureDevopsService> logger,
        IPersonalAccessTokenService tokenService
    )
    {
        _logger = logger;
        _tokenService = tokenService;
    }

    private VssConnection GetConnection()
    {
        string currentPat = _tokenService.GetMasterToken();
        if (string.IsNullOrEmpty(currentPat))
            throw new InvalidOperationException(
                "No se encontró el PAT 'KBH_PAT'. Guárdalo en Windows Credential Manager o define la variable de entorno KBH_PAT."
            );

        if (_vssConnection == null || currentPat != _cachedPat)
        {
            _vssConnection = new VssConnection(
                new Uri(Urls.AresCCB),
                new VssBasicCredential(string.Empty, currentPat)
            );
            _cachedPat = currentPat;
        }
        return _vssConnection;
    }

    public async Task<IEnumerable<TeamProjectReference>> GetProjects()
    {
        var projectClient = GetConnection().GetClient<ProjectHttpClient>();
        return await projectClient.GetProjects();
    }

    public async Task<Build?> GetBuild(string projectName, int buildId)
    {
        var buildClient = GetConnection().GetClient<BuildHttpClient>();
        return await buildClient.GetBuildAsync(projectName, buildId);
    }

    public async Task<Release?> GetRelease(string projectName, int releaseId)
    {
        var releaseClient = GetConnection().GetClient<ReleaseHttpClient>();
        Release release = await releaseClient.GetReleaseAsync(projectName, releaseId);
        return release;
    }

    public async Task<
        List<Microsoft.VisualStudio.Services.ReleaseManagement.WebApi.Contracts.Artifact>
    > GetBuildArtifacts(Release release)
    {
        return release
                .Artifacts?.Where(a =>
                    a.Type != null && a.Type.Equals("Build", StringComparison.OrdinalIgnoreCase)
                )
                ?.OfType<Microsoft.VisualStudio.Services.ReleaseManagement.WebApi.Contracts.Artifact>()
                ?.ToList()
            ?? new List<Microsoft.VisualStudio.Services.ReleaseManagement.WebApi.Contracts.Artifact>();
    }

    public async Task<Microsoft.TeamFoundation.DistributedTask.WebApi.VariableGroup> GetVariableGroup(
        string projectName,
        int variableGroupId
    )
    {
        var taskClient = GetConnection().GetClient<TaskAgentHttpClient>();
        var variableGroup = await taskClient.GetVariableGroupAsync(projectName, variableGroupId);
        return variableGroup;
    }

    /// <summary>
    /// Extrae el buildId del artifact 'Build' desde DefinitionReference["version"].Id (si está presente).
    /// Tipo totalmente calificado para evitar ambigüedad.
    /// </summary>
    public int? TryGetBuildIdFromArtifact(
        Microsoft.VisualStudio.Services.ReleaseManagement.WebApi.Contracts.Artifact artifact
    )
    {
        try
        {
            var defRef = artifact.DefinitionReference;
            if (defRef != null && defRef.ContainsKey("version"))
            {
                var versionRef = defRef["version"];
                // En la mayoría de casos, version.Id es el buildId (numérico)
                if (int.TryParse(versionRef?.Id, out var buildId))
                    return buildId;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Imposible calcular buildId");
        }
        return null;
    }
}
