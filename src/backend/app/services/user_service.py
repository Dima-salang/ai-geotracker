import uuid
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.schema import (
    User, Organization, Business, BusinessCreate,
    UserCreate, UserUpdate, OrganizationUpdate, BusinessUpdate
)


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

    @staticmethod
    def list_users(db: Session, limit: int = 100, offset: int = 0) -> List[User]:
        """List registered users with pagination."""
        return db.query(User).order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    @staticmethod
    def create_user(db: Session, data: UserCreate) -> User:
        """Create a new user profile manually."""
        user = User(
            id=data.id,
            organization_id=data.organization_id,
            first_name=data.first_name,
            last_name=data.last_name,
            phone=data.phone,
            email=data.email,
            auth_provider=data.auth_provider,
            tier=data.tier,
            role=data.role,
            team_id=data.team_id,
            is_verified=data.is_verified
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_user(db: Session, user_id: uuid.UUID, data: UserUpdate) -> Optional[User]:
        """Update user profile."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(user, key, value)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user_id: uuid.UUID) -> bool:
        """Delete user profile, respecting safety block for default manager."""
        if user_id == uuid.UUID("00000000-0000-0000-0000-000000000001"):
            return False
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        db.delete(user)
        db.commit()
        return True

    @staticmethod
    def list_organizations(db: Session, limit: int = 100, offset: int = 0) -> List[Organization]:
        """List parent franchise organizations with pagination."""
        return db.query(Organization).order_by(Organization.created_at.desc()).offset(offset).limit(limit).all()

    @staticmethod
    def update_organization(db: Session, org_id: uuid.UUID, name: Optional[str]) -> Optional[Organization]:
        """Update organization details."""
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            return None
        if name is not None:
            org.name = name
        db.commit()
        db.refresh(org)
        return org

    @staticmethod
    def delete_organization(db: Session, org_id: uuid.UUID) -> bool:
        """Delete an organization, respecting safety block for default organization."""
        if org_id == uuid.UUID("00000000-0000-0000-0000-000000000000"):
            return False
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            return False
        db.delete(org)
        db.commit()
        return True

    @staticmethod
    def list_businesses(
        db: Session, 
        organization_id: Optional[uuid.UUID] = None, 
        limit: int = 100, 
        offset: int = 0
    ) -> List[Business]:
        """List registered business profiles with optional organization filter and pagination."""
        query = db.query(Business)
        if organization_id:
            query = query.filter(Business.organization_id == organization_id)
        return query.order_by(Business.created_at.desc()).offset(offset).limit(limit).all()

    @staticmethod
    def update_business(db: Session, biz_id: uuid.UUID, data: BusinessUpdate) -> Optional[Business]:
        """Update registered business profile."""
        biz = db.query(Business).filter(Business.id == biz_id).first()
        if not biz:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(biz, key, value)
        db.commit()
        db.refresh(biz)
        return biz

    @staticmethod
    def delete_business(db: Session, biz_id: uuid.UUID) -> bool:
        """Delete business profile."""
        biz = db.query(Business).filter(Business.id == biz_id).first()
        if not biz:
            return False
        db.delete(biz)
        db.commit()
        return True
