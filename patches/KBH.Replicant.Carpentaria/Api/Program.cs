using KBH.Replicant.Carpentaria.Application;
using KBH.Replicant.Carpentaria.Application.Interfaces;
using KBH.Replicant.Carpentaria.Application.Services;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddAuthentication(Microsoft.AspNetCore.Server.IISIntegration.IISDefaults.AuthenticationScheme);
builder.Services.AddHttpContextAccessor();

// Scoped: cada request obtiene el PAT del usuario Windows que llama
builder.Services.AddScoped<IPersonalAccessTokenService, PersonalAccessTokenService>();
builder.Services.AddScoped<IAzureDevopsService, AzureDevopsService>();

builder.Services.AddScoped<IReleaseService, ReleasesService>();
builder.Services.AddScoped<IVariablesService, VariablesService>();

builder.Host.UseSerilog();

string logDirectory =
    builder.Configuration.GetValue<string>("Logging:FilePath")
    ?? $"/Logs/{AppDomain.CurrentDomain.FriendlyName}/log-.log";

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File(logDirectory, rollingInterval: RollingInterval.Hour)
    .CreateLogger();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.MapControllers();

app.Run();
