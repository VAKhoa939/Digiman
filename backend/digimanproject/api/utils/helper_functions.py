from typing import Any, Dict, Optional, Set, Tuple, TypeVar, TYPE_CHECKING
import uuid
from django.db.models import Model
from rest_framework.serializers import Serializer
from datetime import datetime, timezone

if TYPE_CHECKING:
    from ..models.user_models import User

M = TypeVar("M", bound=Model)
S = TypeVar("S", bound=Serializer)

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

def get_dominant_attribute_and_score(scores: Dict[str, float], thresholds: Dict[str, float]) -> Tuple[str, float]:
    """
    Returns the attribute with the highest margin of score above the threshold.
    """
    if not scores:
        return "unknown", 0.0
    max_margin = float('-inf')
    for attribute, score in scores.items():
        if attribute not in thresholds:
            continue
        margin = score - thresholds[attribute]
        if margin > max_margin:
            max_margin = margin
            dominant_key = attribute
            dominant_score = score
    return dominant_key, dominant_score

def cast_user_to_subclass(user: "User"):
    from ..models.user_models import Reader, Administrator, RoleChoices

    role = user.get_role()
    if role == RoleChoices.READER:
        return Reader.objects.get(pk=user.pk)
    elif role == RoleChoices.ADMIN:
        return Administrator.objects.get(pk=user.pk)
    else:
        return user
    
def stripe_ts_to_datetime(ts: int) -> datetime:
    return datetime.fromtimestamp(ts, tz=timezone.utc)