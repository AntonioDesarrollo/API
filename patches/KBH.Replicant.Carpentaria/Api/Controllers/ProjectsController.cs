using KBH.Replicant.Carpentaria.Application;
using Microsoft.AspNetCore.Mvc;

namespace KBH.Replicant.Carpentaria.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ProjectsController : ControllerBase
{
    private readonly ILogger<ProjectsController> _logger;
    private readonly IAzureDevopsService _azureService;

    public ProjectsController(ILogger<ProjectsController> logger, IAzureDevopsService azureService)
    {
        _logger = logger;
        _azureService = azureService;
    }

    /// <summary>
    /// Lista todos los proyectos disponibles en la organización de Azure DevOps.
    /// Útil para obtener el projectName que usan los demás endpoints.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        _logger.LogInformation("Listando proyectos de Azure DevOps");
        var projects = await _azureService.GetProjects();
        var result = projects.Select(p => new
        {
            p.Id,
            p.Name,
            p.Description,
            p.State,
            p.Url,
        });
        return Ok(result);
    }
}
