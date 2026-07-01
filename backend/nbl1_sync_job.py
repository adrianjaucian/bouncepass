import threading
from copy import deepcopy
from typing import Any, Dict, Optional

from database import SessionLocal
from nbl1_fixtures_sync import Nbl1SyncError, sync_nbl1_fixtures

_lock = threading.Lock()
_states: Dict[int, Dict[str, Any]] = {}


def _empty_state() -> Dict[str, Any]:
    return {
        "running": False,
        "progress": "",
        "result": None,
        "error": None,
    }


def _empty_aggregate() -> Dict[str, Any]:
    return {
        "season_year": "",
        "discovered": 0,
        "completed": 0,
        "pending": 0,
        "skipped_existing": 0,
        "updated_metadata_count": 0,
        "imported_count": 0,
        "imported": [],
        "failed_count": 0,
        "errors": [],
        "has_more": False,
    }


def _get_state(user_id: int) -> Dict[str, Any]:
    if user_id not in _states:
        _states[user_id] = _empty_state()
    return _states[user_id]


def get_sync_status(user_id: int) -> Dict[str, Any]:
    with _lock:
        state = _get_state(user_id)
        return {
            "running": state["running"],
            "progress": state["progress"],
            "result": deepcopy(state["result"]),
            "error": state["error"],
        }


def _merge_batch(aggregate: Dict[str, Any], batch: Dict[str, Any]) -> None:
    aggregate["season_year"] = batch["season_year"]
    aggregate["discovered"] = batch["discovered"]
    aggregate["completed"] = batch["completed"]
    aggregate["pending"] = batch["pending"]
    aggregate["skipped_existing"] = batch["skipped_existing"]
    aggregate["updated_metadata_count"] += batch.get("updated_metadata_count", 0)
    aggregate["imported_count"] += batch["imported_count"]
    aggregate["imported"].extend(batch.get("imported") or [])
    aggregate["failed_count"] += batch["failed_count"]
    aggregate["errors"].extend(batch.get("errors") or [])
    aggregate["has_more"] = batch.get("has_more", False)


def _run_sync_job(user_id: int, season_year: Optional[str], max_imports: int) -> None:
    state = _get_state(user_id)
    with _lock:
        state["running"] = True
        state["progress"] = "Starting NBL1 sync..."
        state["result"] = None
        state["error"] = None

    aggregate = _empty_aggregate()
    try:
        while True:
            db = SessionLocal()
            try:
                batch = sync_nbl1_fixtures(
                    db,
                    user_id=user_id,
                    season_year=season_year,
                    max_imports=max_imports,
                )
            finally:
                db.close()

            _merge_batch(aggregate, batch)
            with _lock:
                state["progress"] = (
                    f"Updated {aggregate['updated_metadata_count']} game"
                    f"{'' if aggregate['updated_metadata_count'] == 1 else 's'} with gender/region · "
                    f"Imported {aggregate['imported_count']} new game"
                    f"{'' if aggregate['imported_count'] == 1 else 's'} "
                    f"({aggregate['pending']} still pending)..."
                )

            if not batch.get("has_more"):
                aggregate["has_more"] = False
                break

        with _lock:
            state["result"] = aggregate
            state["progress"] = "Sync complete."
    except Nbl1SyncError as exc:
        with _lock:
            state["error"] = str(exc)
            state["progress"] = ""
    except Exception as exc:  # pragma: no cover
        with _lock:
            state["error"] = str(exc)
            state["progress"] = ""
    finally:
        with _lock:
            state["running"] = False


def start_sync_job(
    user_id: int,
    season_year: Optional[str] = None,
    max_imports: int = 40,
) -> Dict[str, Any]:
    state = _get_state(user_id)
    with _lock:
        if state["running"]:
            return {"started": False, "message": "A sync is already running."}

    thread = threading.Thread(
        target=_run_sync_job,
        args=(user_id, season_year, max_imports),
        daemon=True,
    )
    thread.start()
    return {"started": True, "message": "Sync started in the background."}
