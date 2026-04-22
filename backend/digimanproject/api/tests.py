import uuid
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, override_settings
import requests

from .utils.celery_wake import wake_celery_worker
from .utils.helper_functions import (
    get_dominant_attribute_and_score,
    get_target_object,
    serialize_object,
    update_instance,
)


class UpdateInstanceTests(SimpleTestCase):
    def test_update_instance_updates_only_allowed_fields_and_saves(self):
        instance = type("Dummy", (), {})()
        instance.name = "old"
        instance.status = "old"
        instance.save = Mock()

        update_instance(
            instance,
            allowed_fields={"name"},
            name="new",
            status="ignored",
            unknown="ignored",
        )

        self.assertEqual(instance.name, "new")
        self.assertEqual(instance.status, "old")
        instance.save.assert_called_once_with(update_fields=["name"])

    def test_update_instance_does_not_save_when_nothing_changes(self):
        instance = type("Dummy", (), {})()
        instance.name = "old"
        instance.save = Mock()

        update_instance(instance, allowed_fields={"status"}, name="new")

        self.assertEqual(instance.name, "old")
        instance.save.assert_not_called()


class GetTargetObjectTests(SimpleTestCase):
    def test_get_target_object_raises_for_invalid_mapping_key(self):
        with self.assertRaises(ValueError):
            get_target_object(uuid.uuid4(), "invalid", {})

    def test_get_target_object_returns_found_object(self):
        target = object()

        class DummyModel:
            class DoesNotExist(Exception):
                pass

        DummyModel.objects = Mock()
        DummyModel.objects.get.return_value = target

        result = get_target_object(
            uuid.uuid4(),
            "dummy",
            {"dummy": DummyModel},
        )

        self.assertIs(result, target)
        DummyModel.objects.get.assert_called_once()

    def test_get_target_object_returns_none_when_missing(self):
        class DummyModel:
            class DoesNotExist(Exception):
                pass

        DummyModel.objects = Mock()
        DummyModel.objects.get.side_effect = DummyModel.DoesNotExist

        result = get_target_object(
            uuid.uuid4(),
            "dummy",
            {"dummy": DummyModel},
        )

        self.assertIsNone(result)


class SerializeObjectTests(SimpleTestCase):
    def test_serialize_object_uses_serializer_mapping(self):
        obj = type("Book", (), {"title": "A"})()

        class BookSerializer:
            def __init__(self, instance):
                self.data = {"title": instance.title}

        result = serialize_object(obj, {"Book": BookSerializer})

        self.assertEqual(result, {"title": "A"})


class DominantAttributeTests(SimpleTestCase):
    def test_get_dominant_attribute_returns_unknown_for_empty_scores(self):
        key, score = get_dominant_attribute_and_score({}, {"toxicity": 0.5})
        self.assertEqual(key, "unknown")
        self.assertEqual(score, 0.0)

    def test_get_dominant_attribute_returns_highest_margin(self):
        key, score = get_dominant_attribute_and_score(
            {"toxicity": 0.8, "insult": 0.4},
            {"toxicity": 0.6, "insult": 0.1},
        )
        self.assertEqual(key, "insult")
        self.assertEqual(score, 0.4)

    def test_get_dominant_attribute_returns_unknown_when_no_threshold_matches(self):
        key, score = get_dominant_attribute_and_score(
            {"custom": 0.9},
            {"toxicity": 0.6},
        )
        self.assertEqual(key, "unknown")
        self.assertEqual(score, 0.0)


class WakeCeleryWorkerTests(SimpleTestCase):
    @override_settings(IS_RENDER=False)
    @patch("api.utils.celery_wake.requests.get")
    def test_wake_celery_worker_short_circuits_outside_render(self, mock_get):
        self.assertTrue(wake_celery_worker())
        mock_get.assert_not_called()

    @override_settings(IS_RENDER=True, CELERY_WAKE_URL="https://example.com/wake")
    @patch("api.utils.celery_wake.time.sleep")
    @patch("api.utils.celery_wake.requests.get")
    def test_wake_celery_worker_returns_true_on_success(self, mock_get, _mock_sleep):
        mock_get.return_value.status_code = 200

        self.assertTrue(wake_celery_worker(max_attempts=3, timeout=1))
        mock_get.assert_called_once_with("https://example.com/wake", timeout=1)

    @override_settings(IS_RENDER=True, CELERY_WAKE_URL="https://example.com/wake")
    @patch("api.utils.celery_wake.time.sleep")
    @patch("api.utils.celery_wake.requests.get")
    def test_wake_celery_worker_returns_false_after_retries(self, mock_get, mock_sleep):
        mock_get.side_effect = requests.RequestException("network")

        self.assertFalse(wake_celery_worker(max_attempts=2, timeout=1))

        self.assertEqual(mock_get.call_count, 2)
        self.assertEqual(mock_sleep.call_count, 2)
