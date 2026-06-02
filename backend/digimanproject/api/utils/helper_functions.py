from typing import Any, Dict, Optional, Set, Tuple, TypeVar, TYPE_CHECKING
import uuid
from django.db.models import Model
from django.db import transaction
from rest_framework.serializers import Serializer
from datetime import datetime, timezone

if TYPE_CHECKING:
    from ..models.user_models import User

M = TypeVar("M", bound=Model)
S = TypeVar("S", bound=Serializer)

@transaction.atomic
def update_instance(instance: type[M], allowed_fields: Set, **data: Any) -> None:
    updated_fields = []
    for field, value in data.items():
        if field in allowed_fields:
            setattr(instance, field, value)
            updated_fields.append(field)
    if updated_fields:
        instance.save(update_fields=updated_fields)

def get_target_object(
    target_object_id: uuid.UUID, 
    target_object_type: str, 
    mapping: Dict[str, type[M]]
) -> Optional[M]:
    if target_object_type not in mapping:
        raise ValueError(f"Invalid target type: {target_object_type}")
    
    model_class = mapping[target_object_type]
    try:
        return model_class.objects.get(id=target_object_id)
    except model_class.DoesNotExist:
        return None

def serialize_object(obj: M, mapping: Dict[str, type[S]]) -> Dict[str, Any]:
    serializer_class = mapping[type(obj).__name__]
    serializer = serializer_class(obj)
    return serializer.data

def get_dominant_attribute_and_score(scores: Dict[str, float], thresholds: Dict[str, float]) -> Optional[Tuple[str, float, bool, bool]]:
    """
    Returns the attribute, the highest margin of score above the threshold, and boolean flags for flag and ban status.
    """
    if not scores:
        return "safe", 0.0, False, False
    try:
        dominant_attribute = "safe"
        dominant_score = 0.0
        is_flagged = False
        is_banned = False
        max_margin = 0.0
        for attribute, score in scores.items():
            if attribute not in thresholds:
                continue
            margin = score - thresholds[attribute][0]
            if margin > max_margin:
                max_margin = margin
                dominant_attribute = attribute
                dominant_score = score
                is_flagged = True
                if not is_banned and score >= thresholds[attribute][1]:
                    is_banned = True
        return (dominant_attribute, dominant_score, is_flagged, is_banned)
    except Exception as e:
        print("Error in get_dominant_attribute_and_score")
        print(e)
        return None

def cast_user_to_subclass(user: "User"):
    from ..models.user_models import Reader, Administrator, RoleChoices

    role = user.get_role()
    if role == RoleChoices.READER:
        return Reader.objects.get(pk=user.pk)
    elif role == RoleChoices.ADMIN:
        return Administrator.objects.get(pk=user.pk)
    else:
        return user
    
def stripe_ts_to_datetime(ts: int | None) -> datetime | None:
    return None if not ts else datetime.fromtimestamp(ts, tz=timezone.utc)

def format_datetime_long(dt: datetime | None) -> str:
    return "" if not dt else dt.strftime("%Y-%m-%d %H:%M:%S")

def format_datetime_short(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")