from typing import Any, Dict, Optional, Set, TypeVar
import uuid
from django.db.models import Model

T = TypeVar("T", bound=Model)

def update_instance(instance: type[T], allowed_fields: Set, **data: Any) -> None:
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
    mapping: Dict[str, type[T]]
) -> Optional[T]:
    if target_object_type not in mapping:
        raise ValueError(f"Invalid target type: {target_object_type}")
    
    model_class = mapping[target_object_type]
    try:
        return model_class.objects.get(id=target_object_id)
    except model_class.DoesNotExist:
        return None