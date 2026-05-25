import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.schema import Team, Lead, User, InAppNotification, Business

logger = logging.getLogger("app.services.team_service")


class TeamService:
    @staticmethod
    def create_team(db: Session, name: str, leader_id: Optional[uuid.UUID] = None) -> Team:
        """Create a new agent team with an optional leader."""
        team = Team(name=name, leader_id=leader_id)
        db.add(team)
        db.commit()
        db.refresh(team)
        return team

    @staticmethod
    def get_team(db: Session, team_id: uuid.UUID) -> Optional[Team]:
        """Retrieve a team by ID."""
        return db.query(Team).filter(Team.id == team_id).first()

    @staticmethod
    def list_teams(db: Session, limit: int = 100, offset: int = 0) -> List[Team]:
        """List all teams."""
        return db.query(Team).order_by(Team.created_at.desc()).offset(offset).limit(limit).all()

    @staticmethod
    def assign_user_to_team(db: Session, user_id: uuid.UUID, team_id: Optional[uuid.UUID]) -> Optional[User]:
        """Assign an agent/user to a specific team."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        user.team_id = team_id
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def distribute_lead(db: Session, business_id: uuid.UUID, visibility_score: int) -> Lead:
        """
        Creates a potential lead and load balances it across existing teams.
        Uses Least-Loaded Team strategy to ensure all teams are not hogging everything.
        """
        # Find all teams
        teams = db.query(Team).all()
        assigned_team_id = None

        if teams:
            # Query lead count for each team and pick the one with fewest leads
            team_load = []
            for t in teams:
                lead_count = db.query(Lead).filter(Lead.team_id == t.id).count()
                team_load.append((t.id, lead_count))
            
            # Sort by load (least first)
            team_load.sort(key=lambda x: x[1])
            assigned_team_id = team_load[0][0]

        # Fetch business to get name for notification
        biz = db.query(Business).filter(Business.id == business_id).first()

        # Create the lead record
        lead = Lead(
            business_id=business_id,
            team_id=assigned_team_id,
            visibility_score=visibility_score,
            status="new"
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

        # Trigger notification
        if assigned_team_id and biz:
            TeamService.notify_team_of_lead(db, lead, biz)

        return lead

    @staticmethod
    def notify_team_of_lead(db: Session, lead: Lead, business: Business):
        """
        Notify all agents in the assigned team about the new potential lead.
        Creates in-app notifications and logs Supabase email dispatch.
        """
        team = db.query(Team).filter(Team.id == lead.team_id).first()
        if not team:
            return

        # Fetch all members of the team
        members = db.query(User).filter(User.team_id == team.id).all()
        
        # If there's a team leader, include them as well
        recipients = list(members)
        if team.leader_id:
            leader = db.query(User).filter(User.id == team.leader_id).first()
            if leader and leader not in recipients:
                recipients.append(leader)

        for user in recipients:
            # 1. Create In-App Notification
            notification = InAppNotification(
                user_id=user.id,
                title="New Low Visibility Lead",
                message=f"Potential lead for '{business.name}' ({visibility_score_label(lead.visibility_score)}) balanced to team '{team.name}'.",
                is_read=False
            )
            db.add(notification)

            # 2. Simulate/Send email notification using Supabase email context
            TeamService.send_supabase_email(
                recipient_email=user.email,
                subject=f"[Iozera GeoTracker] New Low Visibility Lead: {business.name}",
                body=(
                    f"Hello {user.first_name or 'Agent'},\n\n"
                    f"A new potential lead has been balanced and assigned to your team '{team.name}':\n"
                    f"- Business: {business.name} ({business.domain})\n"
                    f"- Visibility Score: {lead.visibility_score}/100\n"
                    f"- Location: {business.primary_city}, {business.primary_state}\n\n"
                    f"Log in to your GeoTracker account to review and assign this lead to an agent.\n\n"
                    f"Best regards,\nIozera GeoTracker Team"
                )
            )
        
        db.commit()

    @staticmethod
    def send_supabase_email(recipient_email: str, subject: str, body: str):
        """
        Send a real email using Resend SDK, with fallback/development sandboxing boundaries.
        """
        import os
        import resend

        api_key = os.getenv("RESEND_API_KEY")
        if not api_key:
            logger.warning("RESEND_API_KEY not found in environment. Simulating email send instead.")
            logger.info("SIMULATED_EMAIL: To: %s | Subject: %s\nBody:\n%s", recipient_email, subject, body)
            return

        # Configure resend API key (strip quotes if any)
        resend.api_key = api_key.strip('"').strip("'")

        # In sandbox mode, Resend only allows sending to the verified email address.
        # If recipient is not the verified address, override to prevent sandbox exception.
        from_email = "onboarding@resend.dev"
        to_email = recipient_email
        
        # Sandbox fallback logic
        if recipient_email != "luisgabrielle1026@gmail.com":
            logger.info("Sandbox mode: Overriding recipient '%s' to verified email 'luisgabrielle1026@gmail.com' to prevent sandbox exceptions.", recipient_email)
            to_email = "luisgabrielle1026@gmail.com"
            subject = f"[Sandbox copy for {recipient_email}] {subject}"
            body_prefix = f"<div style='background-color: #ffe6e6; border: 2px solid #ff3333; padding: 10px; font-family: monospace; font-size: 14px; margin-bottom: 20px;'><strong>[DEVELOPMENT SANDBOX OVERRIDE]</strong><br/>This email was originally addressed to: <code>{recipient_email}</code><br/>It was redirected to avoid Resend sandbox constraints.</div>"
        else:
            body_prefix = ""

        # Construct premium HTML email body (Retro-Futurist zero-border aesthetics style, light mode, clean table/container)
        html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{subject}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Courier New', Courier, monospace; background-color: #f7f7f7; color: #1a1a1a;">
    {body_prefix}
    <div style="background-color: #ffffff; border: 4px solid #1a1a1a; padding: 30px; box-shadow: 8px 8px 0px #1a1a1a; max-width: 600px; margin: 0 auto;">
        <div style="border-bottom: 4px solid #1a1a1a; padding-bottom: 15px; margin-bottom: 25px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #1a1a1a;">IOZERA GEOTRACKER</h1>
            <span style="font-size: 12px; font-weight: bold; background-color: #00e5ff; border: 2px solid #1a1a1a; padding: 2px 8px; color: #1a1a1a; display: inline-block; margin-top: 10px; box-shadow: 2px 2px 0px #1a1a1a;">SYSTEM NOTIFICATION</span>
        </div>
        
        <div style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; white-space: pre-wrap; font-family: sans-serif;">{body}</div>
        
        <div style="border-top: 4px solid #1a1a1a; padding-top: 15px; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #666666;">
            &copy; {datetime.now(timezone.utc).year} IOZERA INC. | ALL RIGHTS RESERVED.
        </div>
    </div>
</body>
</html>
"""

        try:
            logger.info("RESEND: Dispatching email from '%s' to '%s' | Subject: '%s'", from_email, to_email, subject)
            response = resend.Emails.send({
                "from": from_email,
                "to": to_email,
                "subject": subject,
                "html": html_body
            })
            logger.info("RESEND SUCCESS: Email dispatched successfully. Response ID: %s", response.get("id"))
        except Exception as e:
            logger.error("RESEND FAILURE: Failed to send email via Resend. Error: %s", str(e))
            # Fallback to simulation log so the system keeps functioning
            logger.info("SIMULATED_EMAIL_FALLBACK: To: %s | Subject: %s\nBody:\n%s", recipient_email, subject, body)

    @staticmethod
    def assign_lead_to_agent(db: Session, lead_id: uuid.UUID, agent_id: uuid.UUID) -> Optional[Lead]:
        """Manually assign a lead to a specific agent within their team."""
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        agent = db.query(User).filter(User.id == agent_id).first()
        if not lead or not agent:
            return None
        
        lead.assigned_agent_id = agent_id
        lead.status = "assigned"
        db.commit()
        db.refresh(lead)
        return lead

    @staticmethod
    def update_team(db: Session, team_id: uuid.UUID, name: Optional[str] = None, leader_id: Optional[uuid.UUID] = None) -> Optional[Team]:
        """Update team details."""
        team = db.query(Team).filter(Team.id == team_id).first()
        if not team:
            return None
        if name is not None:
            team.name = name
        if leader_id is not None:
            # Check if leader_id is empty string or None to represent clear
            if leader_id == "" or leader_id is None:
                team.leader_id = None
            else:
                team.leader_id = leader_id
        db.commit()
        db.refresh(team)
        return team

    @staticmethod
    def delete_team(db: Session, team_id: uuid.UUID) -> bool:
        """Delete a team, safely updating active member associations."""
        team = db.query(Team).filter(Team.id == team_id).first()
        if not team:
            return False
        
        # Nullify user team associations
        db.query(User).filter(User.team_id == team_id).update({User.team_id: None}, synchronize_session=False)
        
        db.delete(team)
        db.commit()
        return True


def visibility_score_label(score: int) -> str:
    if score >= 80:
        return f"High: {score}/100"
    elif score >= 50:
        return f"Medium: {score}/100"
    return f"Low: {score}/100"
