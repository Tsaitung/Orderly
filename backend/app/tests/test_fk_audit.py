"""Local/CI mirror of the cd.yml preflight orphan-audit oracle.

The CD `preflight` job runs scripts/database/monolith_fk_audit.sql against the
LIVE Cloud SQL DB and fails the deploy if any of the 7 cross-module FK checks
returns > 0 orphans. That live-data check is cloud-only — but the SQL's *syntax*
and the *zero-orphans-on-a-clean-schema invariant* ARE repo-content, so they are
mirrored here: this runs the exact same .sql against the freshly-migrated CI /
local DB (where every monolith table is empty) and asserts the total is 0.

Catches: a syntax break in the audit SQL (which would abort CD preflight under
`psql -v ON_ERROR_STOP=1`) and any non-empty result on a clean schema. Runs in
CI backend-test (postgres service + alembic ran) and `make test-be` (ensure-db +
alembic). Skips only if no DB is reachable (so a DB-free smoke run still works);
in CI/test-be alembic has already connected, so it never skips there.
"""

import pathlib

import pytest

AUDIT_SQL = (
    pathlib.Path(__file__).resolve().parents[3]
    / "scripts"
    / "database"
    / "monolith_fk_audit.sql"
)


def _split_statements(sql: str) -> list[str]:
    """Split on top-level `;`, ignoring `;` inside a `--` line comment, a '...'
    string literal, or a $$...$$ dollar-quoted body.

    The file is a header comment (which itself contains a `;`), one CREATE
    FUNCTION (dollar-quoted body with `;`s and `'...'`s), then 7 SELECTs (whose
    labels contain `->`). A naive split on `;` would shred all of these and even
    emit comment-only fragments that psycopg2 rejects as empty queries.
    """
    statements: list[str] = []
    buf: list[str] = []
    in_line_comment = in_string = in_dollar = False
    i, n = 0, len(sql)
    while i < n:
        ch = sql[i]
        two = sql[i : i + 2]
        if in_line_comment:
            buf.append(ch)
            if ch == "\n":
                in_line_comment = False
            i += 1
            continue
        if in_string:
            buf.append(ch)
            if ch == "'":
                in_string = False
            i += 1
            continue
        if in_dollar:
            if two == "$$":
                in_dollar = False
                buf.append("$$")
                i += 2
                continue
            buf.append(ch)
            i += 1
            continue
        # not inside any quoting/comment context
        if two == "--":
            in_line_comment = True
            buf.append(two)
            i += 2
            continue
        if two == "$$":
            in_dollar = True
            buf.append("$$")
            i += 2
            continue
        if ch == "'":
            in_string = True
            buf.append(ch)
            i += 1
            continue
        if ch == ";":
            stmt = "".join(buf).strip()
            if stmt:
                statements.append(stmt)
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    tail = "".join(buf).strip()
    if tail:
        statements.append(tail)
    return statements


def test_monolith_fk_audit_runs_and_reports_zero_orphans() -> None:
    assert AUDIT_SQL.is_file(), f"audit SQL not found at {AUDIT_SQL}"

    from sqlalchemy import create_engine
    from sqlalchemy.exc import OperationalError

    from app.modules.users.core.config import settings

    engine = create_engine(settings.get_database_url_sync())
    try:
        raw = engine.raw_connection()
    except OperationalError as exc:  # no DB locally → DB-free smoke run, skip
        pytest.skip(f"DB not reachable, skipping audit mirror: {exc}")

    total = 0
    try:
        cur = raw.cursor()
        # psycopg2 only does %-interpolation when params are passed; the function
        # body contains literal %I/%s, so we pass NO params (raw cursor, not
        # SQLAlchemy text()) to avoid the ConfigParser/format `%` pitfall.
        for stmt in _split_statements(AUDIT_SQL.read_text()):
            cur.execute(stmt)
            if stmt.lstrip().upper().startswith("SELECT"):
                row = cur.fetchone()  # (check_name, orphan_count)
                assert row is not None, f"audit check returned no row: {stmt[:60]}"
                total += int(row[1])
        raw.commit()
    finally:
        raw.close()

    assert total == 0, (
        f"monolith_fk_audit found {total} orphan rows on the test schema — "
        "the same condition would abort the 0002/0003 FK migration in CD."
    )
