import json

import psycopg
from psycopg.rows import dict_row


def build_connection_string(config: dict[str, str | int]) -> str:
    return (
        f"host={config['host']} "
        f"port={config['port']} "
        f"dbname={config['database']} "
        f"user={config['username']} "
        f"password={config['password']} "
        f"sslmode={config.get('sslmode', 'prefer')}"
    )


def validate_connection(config: dict[str, str | int]) -> None:
    connection_string = build_connection_string(config)
    with psycopg.connect(connection_string, connect_timeout=5) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()


def extract_snapshot_text(config: dict[str, str | int]) -> str:
    connection_string = build_connection_string(config)
    schema_name = str(config.get("schema", "public"))
    parts: list[str] = [f"PostgreSQL schema snapshot for {config['database']} / {schema_name}", ""]

    with psycopg.connect(connection_string, connect_timeout=5, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = %s AND table_type = 'BASE TABLE'
                ORDER BY table_name
                LIMIT 20
                """,
                (schema_name,),
            )
            tables = [row["table_name"] for row in cursor.fetchall()]

            for table_name in tables:
                parts.append(f"Table: {table_name}")
                cursor.execute(
                    """
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_schema = %s AND table_name = %s
                    ORDER BY ordinal_position
                    """,
                    (schema_name, table_name),
                )
                columns = cursor.fetchall()
                parts.append("Columns:")
                for column in columns:
                    parts.append(f"- {column['column_name']}: {column['data_type']}")

                cursor.execute(f'SELECT * FROM "{schema_name}"."{table_name}" LIMIT 3')
                sample_rows = cursor.fetchall()
                parts.append("Sample rows:")
                if sample_rows:
                    for row in sample_rows:
                        parts.append(json.dumps(row, ensure_ascii=True, default=str))
                else:
                    parts.append("- no rows")
                parts.append("")

    return "\n".join(parts).strip()
