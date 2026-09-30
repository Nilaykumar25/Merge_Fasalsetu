.PHONY: db-init test lint

# Apply the event-log SQL to the database specified by DATABASE_URL
db-init:
	psql "$(DATABASE_URL)" -f db/001_event_log.sql

# Run the full test suite (single pass, no watch mode)
test:
	cd backend && python -m pytest tests/ -v --tb=short

# Lint with ruff (fast) + mypy for type checking
lint:
	ruff check backend/
	mypy backend/app --ignore-missing-imports
