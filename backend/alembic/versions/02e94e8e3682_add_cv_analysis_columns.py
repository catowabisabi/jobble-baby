"""add_cv_analysis_columns

Revision ID: 02e94e8e3682
Revises: 
Create Date: 2026-05-22 02:42:46.907051

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '02e94e8e3682'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cvs', sa.Column('score_breakdown', sa.JSON(), nullable=True))
    op.add_column('cvs', sa.Column('text_suggestions', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('cvs', 'text_suggestions')
    op.drop_column('cvs', 'score_breakdown')
