# Decides whether Cursor may run one shell command.
# This script does not execute the command it reviews.
# It is not a sandbox. A person still has to set Cursor's Run Mode to Allowlist.

$ErrorActionPreference = 'Stop'

function Write-Decision {
    param(
        [ValidateSet('allow', 'ask', 'deny')]
        [string]$Permission,
        [string]$Message
    )

    $payload = [ordered]@{
        permission    = $Permission
        user_message  = $Message
        agent_message = $Message
    }
    [Console]::Out.WriteLine(($payload | ConvertTo-Json -Compress))
}

function Get-RepoRoot {
    return [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
}

function Test-InsideRepo {
    param([string]$Cwd)

    if ([string]::IsNullOrWhiteSpace($Cwd)) {
        return $false
    }

    try {
        $root = Get-RepoRoot
        $full = [System.IO.Path]::GetFullPath($Cwd)
    }
    catch {
        return $false
    }

    if ($full.Equals($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $true
    }

    $prefix = $root.TrimEnd('\') + '\'
    return $full.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-StaticText {
    param($Element)

    if ($Element -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
        return $Element.Value
    }

    if ($Element -is [System.Management.Automation.Language.ConstantExpressionAst]) {
        return [string]$Element.Value
    }

    if ($Element -is [System.Management.Automation.Language.ExpandableStringExpressionAst]) {
        if (@($Element.NestedExpressions).Count -gt 0) {
            return $null
        }
        return $Element.Value
    }

    if ($Element -is [System.Management.Automation.Language.CommandParameterAst]) {
        $name = [string]$Element.ParameterName
        if ([string]::IsNullOrWhiteSpace($name)) {
            return $null
        }
        $forbidden = [char[]]@(';', '&', '|', '`', '$', '<', '>', '(', ')', '{', '}', ' ', "`n", "`r", "`t")
        if ($name.IndexOfAny($forbidden) -ge 0) {
            return $null
        }
        $flag = '-' + $name
        if ($null -ne $Element.Argument) {
            $argumentText = Get-StaticText $Element.Argument
            if ($null -eq $argumentText) {
                return $null
            }
            return ($flag + ':' + $argumentText)
        }
        return $flag
    }

    return $null
}

function Get-LeafName {
    param([string]$PathText)

    $leaf = [System.IO.Path]::GetFileName($PathText)
    if ($leaf -match '(?i)\.(exe|cmd|bat|ps1)$') {
        return [System.IO.Path]::GetFileNameWithoutExtension($leaf)
    }
    return $leaf
}

function Test-SecretArgument {
    param([string]$Argument)

    if ([string]::IsNullOrWhiteSpace($Argument)) {
        return $false
    }

    $leaf = $Argument
    if ($Argument -match '[\\/:]') {
        $leaf = [System.IO.Path]::GetFileName(($Argument -split ':', 2)[-1])
    }

    if ($leaf -match '(?i)^\.env($|\.)') { return $true }
    if ($Argument -match '(?i)(^|[\\/:])\.env($|[\\/])') { return $true }
    if ($Argument -match '(?i)(^|[\\/:])\.env\.[A-Za-z0-9_-]+($|[\\/])') { return $true }
    if ($leaf -match '(?i)^(credentials\.json|id_rsa|id_ed25519)$') { return $true }
    if ($leaf -match '(?i)\.(pem|p12|pfx)$') { return $true }
    return $false
}

function Test-MigrationArgument {
    param([string]$Argument)

    return $Argument -match '(?i)(^|[\\/])scripts[\\/]database([\\/]|$)'
}

function Get-AuditedScript {
    param([string]$ScriptName)

    $path = Join-Path (Get-RepoRoot) 'package.json'
    $json = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    if ([string]$json.name -ne 'biztoollab') {
        return $null
    }
    return [string]$json.scripts.$ScriptName
}

function Resolve-CommandName {
    param([string]$Name)

    $result = @{
        Leaf    = (Get-LeafName $Name)
        Alias   = $false
        Wrapped = $false
    }

    try {
        $info = Get-Command -Name $Name -ErrorAction SilentlyContinue
    }
    catch {
        $result.Wrapped = $true
        return $result
    }

    if ($null -eq $info) {
        return $result
    }

    if ($info.CommandType -eq 'Function') {
        $result.Wrapped = $true
        return $result
    }

    if ($info.CommandType -eq 'Alias') {
        $result.Alias = $true
        $definition = [string]$info.Definition
        if ($definition -match '[;&|]|&&|\|\|') {
            $result.Wrapped = $true
            return $result
        }
        $first = ($definition -split '\s+', 2)[0]
        $result.Leaf = Get-LeafName $first
    }

    return $result
}

function Get-GitInvocation {
    param([string[]]$Arguments)

    $unsafeGlobal = $false
    $index = 0

    while ($index -lt $Arguments.Count) {
        $arg = $Arguments[$index]
        if ($arg -eq '--') { break }
        if ($arg -eq '--no-pager' -or $arg -eq '--paginate') {
            $index++
            continue
        }
        if ($arg -eq '-c' -or $arg -eq '--config-env' -or $arg -eq '-C' -or $arg -eq '--git-dir' -or $arg -eq '--work-tree' -or $arg -eq '--exec-path' -or $arg -eq '--namespace') {
            $unsafeGlobal = $true
            $index += 2
            continue
        }
        if ($arg -like '-c*' -or $arg -like '-C*' -or $arg -like '--git-dir=*' -or $arg -like '--work-tree=*' -or $arg -like '--exec-path=*' -or $arg -like '--namespace=*' -or $arg -like '--config-env=*') {
            $unsafeGlobal = $true
            $index++
            continue
        }
        if ($arg.StartsWith('-')) {
            $index++
            continue
        }
        $rest = @()
        if (($index + 1) -lt $Arguments.Count) {
            $rest = @($Arguments[($index + 1)..($Arguments.Count - 1)])
        }
        return @{
            Name         = $arg
            Rest         = $rest
            UnsafeGlobal = $unsafeGlobal
        }
    }

    return $null
}

function Test-ExternalDiffArgument {
    param([string]$Argument)

    if ($Argument -eq '--ext-diff' -or $Argument -eq '--textconv' -or $Argument -eq '--extcmd' -or $Argument -eq '-x') {
        return $true
    }
    if ($Argument -like '--output*' -or $Argument -like '--extcmd=*') {
        return $true
    }
    return $false
}

function Get-GitDecision {
    param([string[]]$Arguments)

    $invocation = Get-GitInvocation $Arguments
    if ($null -eq $invocation) {
        return 'ask'
    }

    $action = $invocation.Name.ToLowerInvariant()
    $rest = @($invocation.Rest | Where-Object { $_ -ne $null })
    $humanOnly = @('add', 'commit', 'push', 'reset', 'clean')

    if ($humanOnly -contains $action) {
        return 'deny'
    }

    if ($invocation.UnsafeGlobal) {
        return 'ask'
    }

    foreach ($arg in $rest) {
        if (Test-ExternalDiffArgument $arg) {
            return 'ask'
        }
    }

    switch ($action) {
        'status' { return 'allow' }
        'diff' { return 'allow' }
        'log' { return 'allow' }
        'rev-parse' { return 'allow' }
        'show' {
            foreach ($arg in $rest) {
                if (Test-SecretArgument $arg) {
                    return 'deny'
                }
            }
            return 'allow'
        }
        'branch' {
            if ($rest.Count -eq 1 -and $rest[0] -eq '--show-current') {
                return 'allow'
            }
            return 'ask'
        }
        default { return 'ask' }
    }
}

function Get-NpmDecision {
    param(
        [string[]]$Arguments,
        [string]$Cwd
    )

    if ($Arguments.Count -eq 0) {
        return 'ask'
    }

    if (-not (Test-InsideRepo $Cwd)) {
        return 'ask'
    }

    $first = $Arguments[0].ToLowerInvariant()
    $rest = @()
    if ($Arguments.Count -gt 1) {
        $rest = @($Arguments[1..($Arguments.Count - 1)])
    }

    if ($first -eq 'run' -and $rest.Count -ge 1) {
        if ($rest[0] -match '(?i)^(deploy|migrate|migration|hostinger)$') {
            return 'deny'
        }
    }

    foreach ($arg in $Arguments) {
        if (Test-MigrationArgument $arg) {
            return 'deny'
        }
    }

    if ($first -eq 'test' -and $Arguments.Count -eq 1) {
        if ((Get-AuditedScript 'test') -eq 'tsx --test tests/**/*.test.ts') {
            return 'allow'
        }
        return 'ask'
    }

    if ($first -eq 'run' -and $Arguments.Count -eq 2 -and $rest[0] -eq 'lint') {
        if ((Get-AuditedScript 'lint') -eq 'eslint') {
            return 'allow'
        }
        return 'ask'
    }

    if ($first -eq 'audit' -and $Arguments.Count -eq 2 -and $rest[0] -eq '--json') {
        return 'allow'
    }

    if ($first -eq 'audit' -and $Arguments.Count -eq 3 -and $rest[0] -eq '--omit=dev' -and $rest[1] -eq '--json') {
        return 'allow'
    }

    return 'ask'
}

function Get-SingleCommandDecision {
    param(
        $CommandAst,
        [string]$Cwd
    )

    if ($CommandAst.InvocationOperator -ne [System.Management.Automation.Language.TokenKind]::Unknown) {
        return 'ask'
    }

    $texts = New-Object System.Collections.Generic.List[string]
    $staticPrefixOnly = $false
    foreach ($element in $CommandAst.CommandElements) {
        $text = Get-StaticText $element
        if ($null -eq $text) {
            $staticPrefixOnly = $true
            break
        }
        $texts.Add($text)
    }

    if ($texts.Count -eq 0) {
        return 'ask'
    }

    $resolved = Resolve-CommandName $texts[0]
    if ($resolved.Wrapped) {
        return 'ask'
    }

    $leaf = $resolved.Leaf.ToLowerInvariant()
    $argumentList = @()
    if ($texts.Count -gt 1) {
        $argumentList = @($texts.GetRange(1, $texts.Count - 1))
    }

    $shells = @('powershell', 'pwsh', 'cmd', 'bash', 'sh', 'wsl', 'ssh')
    if ($shells -contains $leaf) {
        return 'deny'
    }

    if ($leaf -eq 'hostinger' -or $leaf -eq 'hpanel') {
        return 'deny'
    }

    if ($leaf -eq 'git') {
        $decision = Get-GitDecision $argumentList
    }
    elseif ($leaf -eq 'npm') {
        $decision = Get-NpmDecision -Arguments $argumentList -Cwd $Cwd
    }
    elseif ($leaf -eq 'rg') {
        foreach ($arg in $argumentList) {
            if ($arg -eq '--pre' -or $arg -like '--pre=*' -or $arg -eq '--pre-glob' -or $arg -like '--pre-glob=*') {
                return 'deny'
            }
            if (Test-SecretArgument $arg) {
                return 'deny'
            }
        }
        $decision = 'ask'
    }
    elseif ($leaf -eq 'get-content' -or $leaf -eq 'type' -or $leaf -eq 'cat') {
        foreach ($arg in $argumentList) {
            if (Test-SecretArgument $arg) {
                return 'deny'
            }
        }
        $decision = 'ask'
    }
    elseif ($leaf -eq 'node' -or $leaf -eq 'tsx' -or $leaf -eq 'npx') {
        foreach ($arg in $argumentList) {
            if (Test-MigrationArgument $arg) {
                return 'deny'
            }
        }
        $decision = 'ask'
    }
    else {
        foreach ($arg in $argumentList) {
            if (Test-SecretArgument $arg) {
                return 'deny'
            }
            if (Test-MigrationArgument $arg) {
                return 'deny'
            }
        }
        $decision = 'ask'
    }

    if ($staticPrefixOnly -and $decision -ne 'deny') {
        return 'ask'
    }

    if ($resolved.Alias -and $decision -eq 'allow') {
        return 'ask'
    }

    return $decision
}

function Get-CommandDecision {
    param(
        [string]$CommandText,
        [string]$Cwd
    )

    $ask = 'This command is not on the automatic approval list.'
    $deny = 'This command stays manual.'

    if ([string]::IsNullOrWhiteSpace($CommandText)) {
        return @{ Permission = 'ask'; Message = $ask }
    }

    $tokens = $null
    $parseErrors = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseInput($CommandText, [ref]$tokens, [ref]$parseErrors)
    if ($parseErrors -and @($parseErrors).Count -gt 0) {
        return @{ Permission = 'ask'; Message = $ask }
    }

    $commands = @($ast.FindAll({
                param($Node)
                $Node -is [System.Management.Automation.Language.CommandAst]
            }, $true))

    if ($commands.Count -eq 0) {
        return @{ Permission = 'ask'; Message = $ask }
    }

    $structured = $false
    $statements = @($ast.EndBlock.Statements)
    if ($statements.Count -ne 1) {
        $structured = $true
    }
    elseif ($statements[0] -isnot [System.Management.Automation.Language.PipelineAst]) {
        $structured = $true
    }
    elseif ($statements[0].PipelineElements.Count -ne 1) {
        $structured = $true
    }

    $redirections = @($ast.FindAll({
                param($Node)
                $Node -is [System.Management.Automation.Language.RedirectionAst]
            }, $true))
    if ($redirections.Count -gt 0) {
        $structured = $true
    }

    $substitutions = @($ast.FindAll({
                param($Node)
                $Node -is [System.Management.Automation.Language.SubExpressionAst] -or
                $Node -is [System.Management.Automation.Language.ScriptBlockExpressionAst]
            }, $true))
    if ($substitutions.Count -gt 0) {
        $structured = $true
    }

    $decisions = @()
    foreach ($command in $commands) {
        $decisions += Get-SingleCommandDecision -CommandAst $command -Cwd $Cwd
    }

    if ($decisions -contains 'deny') {
        return @{ Permission = 'deny'; Message = $deny }
    }

    if ($structured -or $commands.Count -ne 1) {
        return @{ Permission = 'ask'; Message = $ask }
    }

    if ($decisions[0] -eq 'allow') {
        return @{
            Permission = 'allow'
            Message    = 'The command is a validated read or local check.'
        }
    }

    return @{ Permission = 'ask'; Message = $ask }
}

try {
    $raw = [Console]::In.ReadToEnd()
    $commandText = ''
    $cwd = ''

    if (-not [string]::IsNullOrWhiteSpace($raw)) {
        $payload = $raw | ConvertFrom-Json
        $commandText = [string]$payload.command
        $cwd = [string]$payload.cwd
    }

    $decision = Get-CommandDecision -CommandText $commandText -Cwd $cwd
    Write-Decision -Permission $decision.Permission -Message $decision.Message
    exit 0
}
catch {
    Write-Decision -Permission 'ask' -Message 'This command is not on the automatic approval list.'
    exit 0
}
