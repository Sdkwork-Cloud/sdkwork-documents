$ErrorActionPreference = "Stop"

function Assert-PathExists {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [string]$Message = "Missing required path"
    )
    if (!(Test-Path -LiteralPath $Path)) {
        throw "${Message}: ${Path}"
    }
}

function Assert-PathAbsent {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [string]$Message = "Forbidden path exists"
    )
    if (Test-Path -LiteralPath $Path) {
        throw "${Message}: ${Path}"
    }
}

Assert-PathExists "AGENTS.md" "Missing SDKWORK agent entrypoint"
Assert-PathExists "sdkwork.app.config.json" "Missing application manifest"
Assert-PathExists ".sdkwork/README.md" "Missing SDKWORK workspace README"
Assert-PathExists ".sdkwork/skills/README.md" "Missing SDKWORK skills README"
Assert-PathExists ".sdkwork/plugins/README.md" "Missing SDKWORK plugins README"
Assert-PathExists ".sdkwork/.gitignore" "Missing SDKWORK workspace .gitignore"

function Assert-Contains {
    param(
        [Parameter(Mandatory = $true)][string]$Content,
        [Parameter(Mandatory = $true)][string]$Required,
        [Parameter(Mandatory = $true)][string]$Path
    )
    if (!$Content.Contains($Required)) {
        throw "${Path} must contain: ${Required}"
    }
}

function Assert-NotContains {
    param(
        [Parameter(Mandatory = $true)][string]$Content,
        [Parameter(Mandatory = $true)][string]$Forbidden,
        [Parameter(Mandatory = $true)][string]$Path
    )
    if ($Content.Contains($Forbidden)) {
        throw "${Path} must not contain: ${Forbidden}"
    }
}

function Get-JsonFile {
    param([Parameter(Mandatory = $true)][string]$Path)
    return Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
}

$requiredSpecPaths = @(
    "../sdkwork-specs/README.md",
    "../sdkwork-specs/SOUL.md",
    "../sdkwork-specs/AGENTS_SPEC.md",
    "../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md",
    "../sdkwork-specs/CODE_STYLE_SPEC.md",
    "../sdkwork-specs/NAMING_SPEC.md",
    "../sdkwork-specs/RUST_CODE_SPEC.md"
)

foreach ($path in $requiredSpecPaths) {
    Assert-PathExists $path "Required SDKWORK spec path does not resolve"
}

$agent = Get-Content -Raw -LiteralPath "AGENTS.md"
Assert-Contains $agent "sdkwork.app.config.json" "AGENTS.md"
Assert-NotContains $agent "No ``sdkwork.app.config.json`` is present" "AGENTS.md"

foreach ($path in @(".sdkwork/README.md", ".sdkwork/skills/README.md", ".sdkwork/plugins/README.md")) {
    $content = Get-Content -Raw -LiteralPath $path
    Assert-NotContains $content '$name' $path
    Assert-NotContains $content '$specPath' $path
}

$rootManifest = Get-JsonFile "sdkwork.app.config.json"
if ($rootManifest.publish.config.workspaceRoot -ne ".") {
    throw "sdkwork.app.config.json publish.config.workspaceRoot must be '.': $($rootManifest.publish.config.workspaceRoot)"
}
if ($rootManifest.devApp.sourceRoot -ne ".") {
    throw "sdkwork.app.config.json devApp.sourceRoot must be '.': $($rootManifest.devApp.sourceRoot)"
}

Assert-PathExists "specs/topology.spec.json" "Missing topology spec"
Assert-PathExists "docs/topology-standard.md" "Missing topology standard doc"
Assert-PathExists "scripts/lib/documents-topology.mjs" "Missing topology adapter"
Assert-PathExists "scripts/documents-dev.mjs" "Missing topology dev orchestrator"

$topologySpec = Get-Content -Raw "specs/topology.spec.json" | ConvertFrom-Json
if ($topologySpec.schemaVersion -ne 2) {
    throw "specs/topology.spec.json schemaVersion must be 2"
}
if ($topologySpec.kind -ne "sdkwork.app.topology") {
    throw "specs/topology.spec.json kind must be sdkwork.app.topology"
}
foreach ($configFile in $topologySpec.packaging.cloudConfigFiles) {
    Assert-PathExists (Join-Path "configs" $configFile) "Missing cloud gateway config bundle"
}

$requiredRootDirectories = @(
    "apis", "apps", "crates", "sdks", "tools", "configs", "deployments",
    "scripts", "docs", "tests", "database", "specs", ".sdkwork"
)

foreach ($directory in $requiredRootDirectories) {
    Assert-PathExists $directory "Missing standard root directory"
    Assert-PathExists (Join-Path $directory "README.md") "Missing standard root directory README"
}

Assert-PathExists "apps/sdkwork-documents-pc/AGENTS.md" "Missing PC app surface AGENTS.md"

$legacyForbiddenPackages = @(
    "sdkwork-documents-core",
    "sdkwork-documents-product",
    "sdkwork-documents-storage-sqlx"
)

$rootCargo = Get-Content -Raw -LiteralPath "Cargo.toml"
foreach ($forbiddenPackage in $legacyForbiddenPackages) {
    Assert-NotContains $rootCargo $forbiddenPackage "Cargo.toml"
}
foreach ($memberMatch in [regex]::Matches($rootCargo, '"([^"]+)"')) {
    $memberPath = $memberMatch.Groups[1].Value
    if ($memberPath.StartsWith("services/")) {
        throw "Cargo workspace member must not live under services/: $memberPath"
    }
}

$componentSpecs = Get-ChildItem -Path . -Recurse -Filter component.spec.json -File |
    Where-Object { $_.FullName -notmatch "\\target\\" } |
    Sort-Object FullName

foreach ($componentSpec in $componentSpecs) {
    $relativePath = $componentSpec.FullName.Substring((Get-Location).Path.Length + 1).Replace("\", "/")
    $json = Get-JsonFile $componentSpec.FullName
    $componentRoot = [string]$json.component.root
    if ($componentRoot.Contains("/services/")) {
        throw "Component spec root must not reference services/: $relativePath"
    }
    if ($relativePath.StartsWith("crates/")) {
        $expectedRoot = "sdkwork-documents/" + ($relativePath -replace "/specs/component.spec.json$", "")
        if ($componentRoot -ne $expectedRoot) {
            throw "Component spec root mismatch in ${relativePath}: expected ${expectedRoot}, got ${componentRoot}"
        }
    }
}

$routeManifests = @(
    @{
        Path = "sdks/_route-manifests/open-api/sdkwork-routes-documents-open-api.route-manifest.json"
        PackageName = "sdkwork-routes-documents-open-api"
        Surface = "open-api"
        Prefix = "/doc/v3/api"
        ApiAuthority = "sdkwork-documents-open-api"
        SdkFamily = "sdkwork-documents-sdk"
    },
    @{
        Path = "sdks/_route-manifests/app-api/sdkwork-routes-documents-app-api.route-manifest.json"
        PackageName = "sdkwork-routes-documents-app-api"
        Surface = "app-api"
        Prefix = "/app/v3/api"
        ApiAuthority = "sdkwork-documents.app"
        SdkFamily = "sdkwork-documents-app-sdk"
    },
    @{
        Path = "sdks/_route-manifests/backend-api/sdkwork-routes-documents-backend-api.route-manifest.json"
        PackageName = "sdkwork-routes-documents-backend-api"
        Surface = "backend-api"
        Prefix = "/backend/v3/api"
        ApiAuthority = "sdkwork-documents.backend"
        SdkFamily = "sdkwork-documents-backend-sdk"
    }
)

foreach ($manifestExpectation in $routeManifests) {
    $path = $manifestExpectation.Path
    Assert-PathExists $path "Missing normalized route manifest"
    $manifest = Get-JsonFile $path
    if ($manifest.kind -ne "sdkwork.route.manifest") {
        throw "Route manifest kind mismatch in ${path}: $($manifest.kind)"
    }
    foreach ($field in @("PackageName", "Surface", "Prefix", "ApiAuthority", "SdkFamily")) {
        $jsonField = $field.Substring(0, 1).ToLowerInvariant() + $field.Substring(1)
        if ($manifest.$jsonField -ne $manifestExpectation.$field) {
            throw "Route manifest ${jsonField} mismatch in ${path}: expected $($manifestExpectation.$field), got $($manifest.$jsonField)"
        }
    }
    if (!$manifest.routes -or $manifest.routes.Count -eq 0) {
        throw "Route manifest must declare at least one route: $path"
    }
}

$forbiddenImportNames = @(
    "sdkwork_ai_prod_core",
    "sdkwork_ai_prod_storage_sqlx"
)

$activeSearchRoots = @(
    "AGENTS.md", "Cargo.toml", "README.md", "sdkwork.app.config.json", ".sdkwork", "apis", "apps",
    "configs", "crates", "deployments", "scripts", "sdks", "specs", "tests", "tools"
)

$filesToScan = New-Object System.Collections.Generic.List[System.IO.FileInfo]
foreach ($root in $activeSearchRoots) {
    if (!(Test-Path -LiteralPath $root)) { continue }
    $item = Get-Item -LiteralPath $root
    if ($item.PSIsContainer) {
        $filesToScan.AddRange([System.IO.FileInfo[]](Get-ChildItem -Path $root -Recurse -File |
            Where-Object { $_.FullName -notmatch "\\target\\" }))
    } else {
        $filesToScan.Add($item)
    }
}

foreach ($file in $filesToScan) {
    if ($file.Extension -notin @(".rs", ".toml", ".md", ".mjs", ".ps1", ".json", ".yaml", ".yml")) {
        continue
    }
    $relativePath = $file.FullName.Substring((Get-Location).Path.Length + 1).Replace("\", "/")
    if ($relativePath -eq "tools/verify_sdkwork_structure.ps1") { continue }
    $content = Get-Content -Raw -LiteralPath $file.FullName
    foreach ($forbidden in $forbiddenImportNames) {
        if ($content.Contains($forbidden)) {
            throw "Forbidden legacy identifier remains in ${relativePath}: ${forbidden}"
        }
    }
}

Assert-PathAbsent "services" "Nonstandard top-level services directory must be removed"

$expectedPackages = @(
    "sdkwork-documents-contract",
    "sdkwork-documents-database-host",
    "sdkwork-content-documents-service",
    "sdkwork-content-documents-repository-sqlx",
    "sdkwork-content-documents-sdk-reference",
    "sdkwork-documents-standalone-gateway",
    "sdkwork-documents-observability",
    "sdkwork-routes-documents-open-api",
    "sdkwork-routes-documents-app-api",
    "sdkwork-routes-documents-backend-api"
)

$cargoTomls = Get-ChildItem -Path . -Recurse -Filter Cargo.toml -File |
    Where-Object { $_.FullName -notmatch "\\target\\" } |
    Sort-Object FullName

$packageNames = New-Object System.Collections.Generic.List[string]
foreach ($cargoToml in $cargoTomls) {
    $relativePath = $cargoToml.FullName.Substring((Get-Location).Path.Length + 1).Replace("\", "/")
    if ($relativePath -ne "Cargo.toml" -and !$relativePath.StartsWith("crates/")) {
        throw "Authored Rust package manifest must live under crates/: $relativePath"
    }

    $match = Select-String -LiteralPath $cargoToml.FullName -Pattern '^name\s*=\s*"([^"]+)"' | Select-Object -First 1
    if ($null -ne $match) {
        [void]$packageNames.Add($match.Matches.Groups[1].Value)
    }
}

foreach ($expectedPackage in $expectedPackages) {
    if (!$packageNames.Contains($expectedPackage)) {
        throw "Expected Cargo package is missing: $expectedPackage"
    }
}

foreach ($routerCrate in @(
    "sdkwork-routes-documents-open-api",
    "sdkwork-routes-documents-app-api",
    "sdkwork-routes-documents-backend-api"
)) {
    Assert-PathExists "crates/$routerCrate/README.md" "Router crate README"
    Assert-PathExists "crates/$routerCrate/specs/component.spec.json" "Router crate component spec"
    Assert-PathExists "crates/$routerCrate/src/web_bootstrap.rs" "Router web bootstrap"
    Assert-PathExists "crates/$routerCrate/src/manifest.rs" "Router manifest"
}

Assert-PathExists "crates/sdkwork-documents-observability/specs/component.spec.json" "Observability component spec"

Write-Host "SDKWork Documents structure verification passed."
