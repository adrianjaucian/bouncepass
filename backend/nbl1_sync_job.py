import threading
from copy import deepcopy
from typing import Any, Dict, Optional

from database import SessionLocal
from nbl1_fixtures_sync import Nbl1SyncError, sync_nbl1_fixtures

_lock = threading.Lock()
_state: Dict[str, Any] = {
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


def get_sync_status() -> Dict[str, Any]:
    with _lock:
        return {
            "running": _state["running"],
            "progress": _state["progress"],
            "result": deepcopy(_state["result"]),
            "error": _state["error"],
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


def _run_sync_job(season_year: Optional[str], max_imports: int) -> None:
    with _lock:
        _state["running"] = True
        _state["progress"] = "Starting NBL1 sync..."
        _state["result"] = None
        _state["error"] = None

    aggregate = _empty_aggregate()
    try:
        while True:
            db = SessionLocal()
            try:
                batch = sync_nbl1_fixtures(
                    db,
                    season_year=season_year,
                    max_imports=max_imports,
                )
            finally:
                db.close()

            _merge_batch(aggregate, batch)
            with _lock:
                _state["progress"] = (
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
            _state["result"] = aggregate
            _state["progress"] = "Sync complete."
    except Nbl1SyncError as exc:
        with _lock:
            _state["error"] = str(exc)
            _state["progress"] = ""
    except Exception as exc:  # pragma: no cover
        with _lock:
            _state["error"] = str(exc)
            _state["progress"] = ""
    finally:
        with _lock:
            _state["running"] = False


def start_sync_job(season_year: Optional[str] = None, max_imports: int = 40) -> Dict[str, Any]:
    with _lock:
        if _state["running"]:
            return {"started": False, "message": "A sync is already running."}

    thread = threading.Thread(
        target=_run_sync_job,
        args=(season_year, max_imports),
        daemon=True,
    )
    thread.start()
    return {"started": True, "message": "Sync started in the background."}
