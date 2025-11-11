from typing import Any, Dict, Optional, Set, TypeVar
import uuid
from django.db.models import Model
from rest_framework.serializers import Serializer

M = TypeVar("M", bound=Model)
S = TypeVar("S", bound=Serializer)

def update_instance(instance: type[M], allowed_fields: Set, **data: Any) -> None:
    updated_fields = []
    for field, value in data.items():
        if field in allowed_fields:
            setattr(instance, field, value)
            updated_fields.append(field)
    if updated_fields:
        instance.full_clean()
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