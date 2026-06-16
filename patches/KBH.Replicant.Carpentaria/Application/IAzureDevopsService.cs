using Microsoft.Azure.Pipelines.WebApi;
using Microsoft.TeamFoundation.Build.WebApi;
using Microsoft.TeamFoundation.Core.WebApi;
using Microsoft.TeamFoundation.DistributedTask.WebApi;
using Microsoft.VisualStudio.Services.ReleaseManagement.WebApi;

namespace KBH.Replicant.Carpentaria.Application;

public interface IAzureDevopsService
{
    Task<IEnumerable<TeamProjectReference>> GetProjects();

    Task<Release?> GetRelease(string projectName, int releaseId);

    Task<Build?> GetBuild(string projectName, int releaseId);

    Task<
        List<Microsoft.VisualStudio.Services.ReleaseManagement.WebApi.Contracts.Artifact>
    > GetBuildArtifacts(Release release);

    Task<Microsoft.TeamFoundation.DistributedTask.WebApi.VariableGroup> GetVariableGroup(
        string projectName,
        int variableGroupId
    );

    int? TryGetBuildIdFromArtifact(
        Microsoft.VisualStudio.Services.ReleaseManagement.WebApi.Contracts.Artifact artifact
    );
}
