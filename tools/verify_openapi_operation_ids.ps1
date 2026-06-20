$ErrorActionPreference = "Stop"

$specPaths = @(
    "sdks/sdkwork-documents-sdk/openapi/documents-open-api.openapi.json",
    "sdks/sdkwork-documents-app-sdk/openapi/documents-app-api.openapi.json",
    "sdks/sdkwork-documents-backend-sdk/openapi/documents-backend-api.openapi.json"
)

$requiredBySpec = @{
    "sdks/sdkwork-documents-sdk/openapi/documents-open-api.openapi.json" = @(
        "capabilities.retrieve",
        "documents.list",
        "documents.retrieve"
    )
    "sdks/sdkwork-documents-app-sdk/openapi/documents-app-api.openapi.json" = @(
        "documents.list",
        "documents.create",
        "documents.retrieve",
        "documents.update"
    )
    "sdks/sdkwork-documents-backend-sdk/openapi/documents-backend-api.openapi.json" = @(
        "documents.list",
        "documents.create",
        "documents.retrieve",
        "documents.update",
        "documents.delete"
    )
}

$requiredSchemas = @(
    "Document",
    "DocumentList",
    "DocumentCreateRequest",
    "DocumentUpdateRequest",
    "DocumentCapabilities",
    "ProblemDetails"
)

foreach ($specPath in $specPaths) {
    if (!(Test-Path $specPath)) {
        throw "Missing OpenAPI spec: $specPath"
    }

    $spec = Get-Content -Raw $specPath | ConvertFrom-Json
    if ($spec.'x-sdkwork-owner' -ne "sdkwork-documents") {
        throw "OpenAPI spec must declare x-sdkwork-owner=sdkwork-documents: $specPath"
    }
    if (!$spec.components -or !$spec.components.schemas) {
        throw "OpenAPI spec has no component schemas: $specPath"
    }

    $operationIds = New-Object System.Collections.Generic.List[string]
    foreach ($pathProperty in $spec.paths.PSObject.Properties) {
        foreach ($methodProperty in $pathProperty.Value.PSObject.Properties) {
            $methodName = [string]$methodProperty.Name
            if ($methodName -eq "parameters") {
                continue
            }

            $operation = $methodProperty.Value
            $operationId = $operation.operationId
            if (!$operationId) {
                throw "OpenAPI operation missing operationId at $($pathProperty.Name) $methodName in $specPath"
            }

            if ($operationId.Contains("_")) {
                throw "operationId contains underscore: $operationId"
            }

            foreach ($extension in @("x-sdkwork-api-surface", "x-sdkwork-request-context", "x-sdkwork-auth-mode")) {
                if (!$operation.PSObject.Properties[$extension]) {
                    throw "OpenAPI operation $operationId missing $extension in $specPath"
                }
            }

            [void]$operationIds.Add([string]$operationId)
        }
    }

    foreach ($requiredId in $requiredBySpec[$specPath]) {
        if (!$operationIds.Contains($requiredId)) {
            throw "Missing required operationId in ${specPath}: $requiredId"
        }
    }

    foreach ($requiredSchema in $requiredSchemas) {
        if (!$spec.components.schemas.PSObject.Properties[$requiredSchema]) {
            throw "Missing required OpenAPI schema ${requiredSchema} in $specPath"
        }
    }
}

Write-Host "Verified Documents OpenAPI operationIds and schemas across $($specPaths.Count) specs."
