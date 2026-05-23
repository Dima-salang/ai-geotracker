"""add display_name to scan_results

Revision ID: 8f1b3e945c2a
Revises: 7eae7d635e4c
Create Date: 2026-05-23 18:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f1b3e945c2a'
down_revision: Union[str, Sequence[str], None] = '7eae7d635e4c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('scan_results', sa.Column('display_name', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('scan_results', 'display_name')
