# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props Discovery.slnx ./
COPY src/Discovery.Domain/Discovery.Domain.csproj src/Discovery.Domain/
COPY src/Discovery.Application/Discovery.Application.csproj src/Discovery.Application/
COPY src/Discovery.Infrastructure/Discovery.Infrastructure.csproj src/Discovery.Infrastructure/
COPY src/Discovery.Api/Discovery.Api.csproj src/Discovery.Api/
RUN dotnet restore src/Discovery.Api/Discovery.Api.csproj
COPY . .
RUN dotnet publish src/Discovery.Api/Discovery.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
RUN mkdir -p /app/keys /app/media && chown -R app:app /app
COPY --from=build --chown=app:app /app/publish .
USER app
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true
EXPOSE 8080
ENTRYPOINT ["dotnet", "Discovery.Api.dll"]
