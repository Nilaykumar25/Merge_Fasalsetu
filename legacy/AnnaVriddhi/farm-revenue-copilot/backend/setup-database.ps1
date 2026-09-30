# Database Setup Script for Farm Revenue Copilot
# Run with: powershell -ExecutionPolicy Bypass -File setup-database.ps1

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Farm Revenue Copilot - Database Setup" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check for Docker
function Test-Docker {
    try {
        $dockerVersion = docker --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
    } catch {}
    return $false
}

# Check for PostgreSQL
function Test-PostgreSQL {
    try {
        $psqlVersion = psql --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
    } catch {}
    return $false
}

$hasDocker = Test-Docker
$hasPostgreSQL = Test-PostgreSQL

Write-Host "System Check:" -ForegroundColor Yellow
Write-Host "  Docker:     " -NoNewline
if ($hasDocker) {
    Write-Host "✓ Installed" -ForegroundColor Green
} else {
    Write-Host "✗ Not found" -ForegroundColor Red
}

Write-Host "  PostgreSQL: " -NoNewline
if ($hasPostgreSQL) {
    Write-Host "✓ Installed" -ForegroundColor Green
} else {
    Write-Host "✗ Not found" -ForegroundColor Red
}
Write-Host ""

# Setup options
if ($hasDocker) {
    Write-Host "Using Docker for PostgreSQL setup..." -ForegroundColor Cyan
    Write-Host ""
    
    # Check if container already exists
    $existingContainer = docker ps -a --filter "name=postgres-farm" --format "{{.Names}}" 2>$null
    
    if ($existingContainer -eq "postgres-farm") {
        Write-Host "Container 'postgres-farm' already exists." -ForegroundColor Yellow
        $restart = Read-Host "Do you want to remove and recreate it? (y/N)"
        
        if ($restart -eq 'y' -or $restart -eq 'Y') {
            Write-Host "Removing existing container..." -ForegroundColor Yellow
            docker rm -f postgres-farm 2>$null
        } else {
            Write-Host "Starting existing container..." -ForegroundColor Yellow
            docker start postgres-farm
            Start-Sleep -Seconds 3
            
            Write-Host ""
            Write-Host "Applying schema to existing database..." -ForegroundColor Cyan
            Get-Content "src\models\schema.sql" | docker exec -i postgres-farm psql -U postgres -d farm_revenue_copilot 2>$null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Schema applied successfully!" -ForegroundColor Green
            } else {
                Write-Host "⚠ Schema may have been applied before (this is OK)" -ForegroundColor Yellow
            }
            
            Write-Host ""
            Write-Host "Container is running!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Connection details:" -ForegroundColor Yellow
            Write-Host "  Host:     localhost"
            Write-Host "  Port:     5432"
            Write-Host "  Database: farm_revenue_copilot"
            Write-Host "  User:     postgres"
            Write-Host "  Password: changeme"
            Write-Host ""
            
            # Update .env if needed
            if (-not (Test-Path ".env")) {
                Write-Host "Creating .env file..." -ForegroundColor Cyan
                Copy-Item ".env.example" ".env"
                Write-Host "✓ Created .env from .env.example" -ForegroundColor Green
                Write-Host "  Update DB_PASSWORD=changeme if needed" -ForegroundColor Yellow
            }
            
            exit 0
        }
    }
    
    # Create new container
    Write-Host "Creating PostgreSQL container..." -ForegroundColor Cyan
    docker run --name postgres-farm `
        -e POSTGRES_PASSWORD=changeme `
        -e POSTGRES_DB=farm_revenue_copilot `
        -p 5432:5432 `
        -d postgres:15
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to create container" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Container created successfully!" -ForegroundColor Green
    Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Apply schema
    Write-Host "Applying database schema..." -ForegroundColor Cyan
    Get-Content "src\models\schema.sql" | docker exec -i postgres-farm psql -U postgres -d farm_revenue_copilot
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Schema applied successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠ Schema application had issues - check output above" -ForegroundColor Yellow
    }
    
    # Verify tables
    Write-Host ""
    Write-Host "Verifying tables..." -ForegroundColor Cyan
    docker exec -it postgres-farm psql -U postgres -d farm_revenue_copilot -c "\dt"
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Setup Complete! ✓" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Connection details:" -ForegroundColor Yellow
    Write-Host "  Host:     localhost"
    Write-Host "  Port:     5432"
    Write-Host "  Database: farm_revenue_copilot"
    Write-Host "  User:     postgres"
    Write-Host "  Password: changeme"
    Write-Host ""
    
    # Create/update .env
    if (-not (Test-Path ".env")) {
        Write-Host "Creating .env file..." -ForegroundColor Cyan
        Copy-Item ".env.example" ".env"
        Write-Host "✓ Created .env from .env.example" -ForegroundColor Green
    } else {
        Write-Host ".env file already exists" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Verify .env has correct database credentials"
    Write-Host "  2. Run: npm install"
    Write-Host "  3. Run: npm run test:crop-state"
    Write-Host ""
    Write-Host "Docker commands:" -ForegroundColor Yellow
    Write-Host "  Stop:   docker stop postgres-farm"
    Write-Host "  Start:  docker start postgres-farm"
    Write-Host "  Logs:   docker logs postgres-farm"
    Write-Host "  Shell:  docker exec -it postgres-farm psql -U postgres -d farm_revenue_copilot"
    Write-Host ""
    
} elseif ($hasPostgreSQL) {
    Write-Host "Using local PostgreSQL installation..." -ForegroundColor Cyan
    Write-Host ""
    
    $username = Read-Host "PostgreSQL username (default: postgres)"
    if ([string]::IsNullOrWhiteSpace($username)) {
        $username = "postgres"
    }
    
    # Check if database exists
    Write-Host "Checking if database exists..." -ForegroundColor Cyan
    $dbExists = psql -U $username -lqt 2>$null | Select-String -Pattern "farm_revenue_copilot"
    
    if (-not $dbExists) {
        Write-Host "Creating database..." -ForegroundColor Cyan
        psql -U $username -c "CREATE DATABASE farm_revenue_copilot;"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Database created!" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to create database" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✓ Database already exists" -ForegroundColor Green
    }
    
    # Apply schema
    Write-Host "Applying schema..." -ForegroundColor Cyan
    psql -U $username -d farm_revenue_copilot -f "src\models\schema.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Schema applied!" -ForegroundColor Green
    } else {
        Write-Host "⚠ Schema application had issues" -ForegroundColor Yellow
    }
    
    # Verify tables
    Write-Host ""
    Write-Host "Verifying tables..." -ForegroundColor Cyan
    psql -U $username -d farm_revenue_copilot -c "\dt"
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Setup Complete! ✓" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Update your .env file with:" -ForegroundColor Yellow
    Write-Host "  DB_HOST=localhost"
    Write-Host "  DB_PORT=5432"
    Write-Host "  DB_NAME=farm_revenue_copilot"
    Write-Host "  DB_USER=$username"
    Write-Host "  DB_PASSWORD=your_password"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Update .env with your credentials"
    Write-Host "  2. Run: npm install"
    Write-Host "  3. Run: npm run test:crop-state"
    Write-Host ""
    
} else {
    Write-Host "Neither Docker nor PostgreSQL found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install one of the following:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1 - Docker Desktop (Recommended):" -ForegroundColor Cyan
    Write-Host "  Download: https://www.docker.com/products/docker-desktop/"
    Write-Host "  Then run this script again"
    Write-Host ""
    Write-Host "Option 2 - PostgreSQL:" -ForegroundColor Cyan
    Write-Host "  Download: https://www.postgresql.org/download/windows/"
    Write-Host "  Then run this script again"
    Write-Host ""
    Write-Host "See DATABASE_SETUP.md for detailed instructions" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
