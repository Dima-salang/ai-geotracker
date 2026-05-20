import uuid
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.schema import User, Organization, Business, BusinessCreate


class UserService:
    @staticmethod
    def get_user(db: Session, user_id: uuid.UUID) -> Optional[User]:
        """Retrieve a user by ID."""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_or_create_user(
        db: Session, 
        user_id: uuid.UUID, 
        email: Optional[str] = None, 
        auth_provider: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        phone: Optional[str] = None
    ) -> User:
        """Get an existing user or create a new user profile."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = User(
                id=user_id,
                email=email,
                auth_provider=auth_provider,
                first_name=first_name,
                last_name=last_name,
                phone=phone
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    @staticmethod
    def create_organization(db: Session, name: str) -> Organization:
        """Create a new Organization."""
        org = Organization(name=name)
        db.add(org)
        db.commit()
        db.refresh(org)
        return org

    @staticmethod
    def get_organization(db: Session, org_id: uuid.UUID) -> Optional[Organization]:
        """Retrieve an organization by ID."""
        return db.query(Organization).filter(Organization.id == org_id).first()

    @staticmethod
    def assign_user_to_org(db: Session, user_id: uuid.UUID, org_id: uuid.UUID) -> Optional[User]:
        """Link a user to an organization."""
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.organization_id = org_id
            db.commit()
            db.refresh(user)
        return user

    @staticmethod
    def create_business(db: Session, org_id: uuid.UUID, biz_data: BusinessCreate) -> Business:
        """Create a new Business under an Organization."""
        biz = Business(
            organization_id=org_id,
            name=biz_data.name,
            domain=biz_data.domain,
            industry=biz_data.industry,
            primary_city=biz_data.primary_city,
            primary_state=biz_data.primary_state,
            country=biz_data.country,
            service_focuses=biz_data.service_focuses,
            target_suburbs=biz_data.target_suburbs
        )
        db.add(biz)
        db.commit()
        db.refresh(biz)
        return biz

    @staticmethod
    def get_business(db: Session, biz_id: uuid.UUID) -> Optional[Business]:
        """Retrieve a business by ID."""
        return db.query(Business).filter(Business.id == biz_id).first()

    @staticmethod
    def get_businesses_by_org(db: Session, org_id: uuid.UUID) -> List[Business]:
        """Retrieve all businesses registered under an organization."""
        return db.query(Business).filter(Business.organization_id == org_id).all()
