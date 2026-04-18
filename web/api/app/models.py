from sqlalchemy import (
    Column, Integer, String, Text, Float,
    DateTime, ForeignKey, Index
)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()

def now_utc():
    return datetime.now(timezone.utc)


class Complaint(Base):
    __tablename__ = "complaints"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    text           = Column(Text, nullable=False)
    channel        = Column(String(16), nullable=False)   # email | call | direct
    category       = Column(String(32), nullable=True)    # Product | Packaging | Trade
    priority       = Column(String(8),  nullable=True)    # High | Medium | Low
    confidence     = Column(Float,      nullable=True)    # 0.0 – 1.0
    reasoning      = Column(Text,       nullable=True)
    recommendation = Column(Text,       nullable=True)    # JSON array string
    status         = Column(String(16), nullable=False, default="open")  # open | in_progress | resolved
    sla_due_at     = Column(DateTime,   nullable=False)
    text_hash      = Column(String(64), nullable=True, index=True)  # sha256 for LLM cache
    classifier     = Column(String(16), nullable=False, default="llm")  # llm | fallback
    created_at     = Column(DateTime,   nullable=False, default=now_utc)
    updated_at     = Column(DateTime,   nullable=False, default=now_utc, onupdate=now_utc)

    # Relationship
    status_logs = relationship("StatusLog", back_populates="complaint",
                               cascade="all, delete-orphan")

    def to_dict(self):
        import json
        return {
            "id":             self.id,
            "text":           self.text,
            "channel":        self.channel,
            "category":       self.category,
            "priority":       self.priority,
            "confidence":     self.confidence,
            "reasoning":      self.reasoning,
            "recommendation": json.loads(self.recommendation) if self.recommendation else [],
            "status":         self.status,
            "sla_due_at":     self.sla_due_at.isoformat() if self.sla_due_at else None,
            "classifier":     self.classifier,
            "created_at":     self.created_at.isoformat() if self.created_at else None,
            "updated_at":     self.updated_at.isoformat() if self.updated_at else None,
        }


class StatusLog(Base):
    __tablename__ = "status_logs"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"),
                          nullable=False, index=True)
    from_status  = Column(String(16), nullable=True)
    to_status    = Column(String(16), nullable=False)
    note         = Column(Text, nullable=True)
    created_at   = Column(DateTime, nullable=False, default=now_utc)

    complaint = relationship("Complaint", back_populates="status_logs")

    def to_dict(self):
        return {
            "id":           self.id,
            "complaint_id": self.complaint_id,
            "from_status":  self.from_status,
            "to_status":    self.to_status,
            "note":         self.note,
            "created_at":   self.created_at.isoformat() if self.created_at else None,
        }


class LlmCache(Base):
    __tablename__ = "llm_cache"

    text_hash     = Column(String(64), primary_key=True)
    response_json = Column(Text, nullable=False)
    created_at    = Column(DateTime, nullable=False, default=now_utc)