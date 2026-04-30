"""add source config json

Revision ID: 20260428_0004
Revises: 20260428_0003
Create Date: 2026-04-28 00:00:04
"""

from alembic import op
import sqlalchemy as sa


revision = "20260428_0004"
down_revision = "20260428_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("data_sources", sa.Column("config_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("data_sources", "config_json")
