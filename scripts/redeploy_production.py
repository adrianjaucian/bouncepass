#!/usr/bin/env python3
"""Redeploy Bounce PASS to bouncepass.net (Vercel + Render + Cloudflare)."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

ROOT_DOMAIN = "bouncepass.net"
WWW_DOMAIN = "www.bouncepass.net"
API_DOMAIN = "api.bouncepass.net"
VERCEL_CNAME = "cname.vercel-dns.com"
RENDER_HOST = "bouncepass-api.onrender.com"
RENDER_SERVICE_NAME = "bouncepass-api"
RENDER_DB_NAME = "bouncepass-db"
VERCEL_PROJECT_HINTS = ("bouncepass", "bouncepass-drab")
KNOWN_RENDER_SERVICE_ID = "srv-d91poafavr4c73fqfr0g"


class HttpError(RuntimeError):
    def __init__(self, status: int, url: str, body: str):
        super().__init__(f"HTTP {status} {url}: {body[:500]}")
        self.status = status
        self.url = url
        self.body = body


def log(message: str) -> None:
    print(message, flush=True)


def request_json(
    method: str,
    url: str,
    headers: dict[str, str],
    payload: Any | None = None,
    timeout: int = 60,
) -> Any:
    data = None
    req_headers = dict(headers)
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        req_headers.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise HttpError(exc.code, url, body) from exc


def require_env(*names: str) -> dict[str, str]:
    missing = [name for name in names if not os.getenv(name)]
    if missing:
        raise SystemExit(
            "Missing required environment variables: " + ", ".join(missing)
        )
    return {name: os.environ[name] for name in names}


def wait_http(url: str, ok: set[int], timeout_s: int, label: str) -> int:
    deadline = time.time() + timeout_s
    last = 0
    while time.time() < deadline:
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=45) as resp:
                last = resp.status
                if last in ok:
                    log(f"  {label}: HTTP {last}")
                    return last
        except urllib.error.HTTPError as exc:
            last = exc.code
            if last in ok:
                log(f"  {label}: HTTP {last}")
                return last
        except Exception as exc:  # noqa: BLE001
            last = 0
            log(f"  {label}: waiting ({exc})")
        time.sleep(8)
    raise SystemExit(f"{label} did not become ready at {url} (last HTTP {last})")


class RenderClient:
    def __init__(self, api_key: str):
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        }

    def get(self, path: str, params: dict[str, str] | None = None) -> Any:
        url = f"https://api.render.com/v1{path}"
        if params:
            url += "?" + urllib.parse.urlencode(params)
        return request_json("GET", url, self.headers)

    def post(self, path: str, payload: Any | None = None) -> Any:
        return request_json("POST", f"https://api.render.com/v1{path}", self.headers, payload)

    def put(self, path: str, payload: Any) -> Any:
        return request_json("PUT", f"https://api.render.com/v1{path}", self.headers, payload)

    def list_services(self) -> list[dict[str, Any]]:
        rows = self.get("/services", {"limit": "50"}) or []
        return [row.get("service") or row for row in rows]

    def list_postgres(self) -> list[dict[str, Any]]:
        rows = self.get("/postgres", {"limit": "50"}) or []
        return [row.get("postgres") or row for row in rows]

    def find_service(self) -> dict[str, Any]:
        services = self.list_services()
        for svc in services:
            if svc.get("id") == KNOWN_RENDER_SERVICE_ID or svc.get("name") == RENDER_SERVICE_NAME:
                return svc
        names = [f"{s.get('name')} ({s.get('id')})" for s in services]
        raise SystemExit(f"Could not find Render service {RENDER_SERVICE_NAME}. Found: {names}")

    def postgres_connection_string(self, postgres_id: str) -> str:
        info = self.get(f"/postgres/{postgres_id}/connection-info")
        if isinstance(info, dict):
            for key in ("internalConnectionString", "externalConnectionString", "connectionString"):
                value = info.get(key)
                if value:
                    return value
            nested = info.get("connectionInfo") or {}
            for key in ("internalConnectionString", "externalConnectionString", "connectionString"):
                value = nested.get(key)
                if value:
                    return value
        raise SystemExit(f"No connection string on Postgres {postgres_id}")

    def ensure_database(self, service: dict[str, Any]) -> str | None:
        databases = self.list_postgres()
        active = []
        for db in databases:
            status = (db.get("status") or db.get("state") or "").lower()
            name = db.get("name") or ""
            expired = "expir" in status or status in {"unavailable", "deleted", "suspended"}
            log(f"  Postgres {name} id={db.get('id')} status={status or 'unknown'}")
            if not expired:
                active.append(db)

        chosen = None
        for db in active:
            if db.get("name") == RENDER_DB_NAME:
                chosen = db
                break
        if chosen is None and active:
            chosen = active[0]

        if chosen is None:
            owner_id = (service.get("ownerId") or service.get("owner", {}).get("id"))
            region = service.get("region") or "oregon"
            if not owner_id:
                raise SystemExit("Cannot recreate Postgres: Render ownerId unknown")
            log(f"  Creating free Postgres {RENDER_DB_NAME} in {region}")
            chosen = self.post(
                "/postgres",
                {
                    "name": RENDER_DB_NAME,
                    "plan": "free",
                    "ownerId": owner_id,
                    "region": region,
                    "version": "16",
                    "databaseName": "bouncepass",
                    "databaseUser": "bouncepass",
                },
            )
            postgres_id = chosen.get("id")
            deadline = time.time() + 300
            while time.time() < deadline:
                detail = self.get(f"/postgres/{postgres_id}")
                status = (detail.get("status") or detail.get("state") or "").lower()
                log(f"  Postgres status: {status or 'unknown'}")
                if status in {"available", "live", "running", "available_unspecified"}:
                    chosen = detail
                    break
                time.sleep(8)
            else:
                raise SystemExit("Postgres did not become available")

        postgres_id = chosen["id"]
        conn = self.postgres_connection_string(postgres_id)
        encoded_key = urllib.parse.quote("DATABASE_URL", safe="")
        self.put(f"/services/{service['id']}/env-vars/{encoded_key}", {"value": conn})
        log(f"  DATABASE_URL pointed at Postgres {postgres_id}")
        return postgres_id

    def ensure_custom_domain(self, service_id: str) -> None:
        existing = self.get(f"/services/{service_id}/custom-domains") or []
        names = []
        for row in existing:
            domain = row.get("customDomain") or row
            names.append(domain.get("name"))
        if API_DOMAIN in names:
            log(f"  Custom domain already present: {API_DOMAIN}")
            return
        try:
            self.post(f"/services/{service_id}/custom-domains", {"name": API_DOMAIN})
            log(f"  Added custom domain {API_DOMAIN}")
        except HttpError as exc:
            if exc.status in {409}:
                log(f"  Custom domain {API_DOMAIN} already exists")
                return
            raise

    def deploy(self, service_id: str) -> str:
        deploy = self.post(
            f"/services/{service_id}/deploys",
            {"clearCache": "do_not_clear"},
        )
        deploy_id = (deploy.get("id") if isinstance(deploy, dict) else None) or (
            deploy.get("deploy", {}).get("id") if isinstance(deploy, dict) else None
        )
        if not deploy_id:
            raise SystemExit(f"Render deploy response missing id: {deploy}")
        log(f"  Triggered deploy {deploy_id}")
        deadline = time.time() + 900
        while time.time() < deadline:
            detail = self.get(f"/services/{service_id}/deploys/{deploy_id}")
            status = (detail.get("status") or detail.get("deploy", {}).get("status") or "").lower()
            log(f"  Render deploy status: {status or 'unknown'}")
            if status in {"live", "succeeded", "success"}:
                return deploy_id
            if status in {"failed", "canceled", "cancelled", "deactivated", "build_failed", "upload_failed"}:
                raise SystemExit(f"Render deploy {deploy_id} ended with {status}")
            time.sleep(10)
        raise SystemExit(f"Timed out waiting for Render deploy {deploy_id}")


class VercelClient:
    def __init__(self, token: str):
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }
        self.team_query = ""
        slug = os.getenv("VERCEL_TEAM_SLUG", "adrianjaucian-s-projects")
        team_id = os.getenv("VERCEL_TEAM_ID") or os.getenv("VERCEL_ORG_ID")
        if team_id:
            self.team_query = "?" + urllib.parse.urlencode({"teamId": team_id})
        elif slug:
            self.team_query = "?" + urllib.parse.urlencode({"slug": slug})

    def url(self, path: str, extra: dict[str, str] | None = None) -> str:
        parsed = urllib.parse.urlparse(f"https://api.vercel.com{path}")
        query = dict(urllib.parse.parse_qsl(self.team_query.lstrip("?")))
        if extra:
            query.update(extra)
        return urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(query)))

    def get(self, path: str, extra: dict[str, str] | None = None) -> Any:
        return request_json("GET", self.url(path, extra), self.headers)

    def post(self, path: str, payload: Any, extra: dict[str, str] | None = None) -> Any:
        return request_json("POST", self.url(path, extra), self.headers, payload)

    def find_project(self) -> dict[str, Any]:
        payload = self.get("/v10/projects", {"limit": "50"})
        projects = payload.get("projects") if isinstance(payload, dict) else payload
        if not isinstance(projects, list):
            raise SystemExit(f"Unexpected Vercel projects response: {payload}")
        for hint in VERCEL_PROJECT_HINTS:
            for project in projects:
                if project.get("name") == hint or project.get("id") == os.getenv("VERCEL_PROJECT_ID"):
                    return project
        names = [p.get("name") for p in projects]
        raise SystemExit(f"Could not find Vercel project bouncepass. Found: {names}")

    def ensure_domains(self, project_id: str) -> None:
        current = self.get(f"/v9/projects/{project_id}/domains")
        items = current.get("domains") if isinstance(current, dict) else current
        existing = {item.get("name") for item in items or []}
        for domain in (ROOT_DOMAIN, WWW_DOMAIN):
            if domain in existing:
                log(f"  Domain already on project: {domain}")
                continue
            try:
                result = self.post(f"/v10/projects/{project_id}/domains", {"name": domain})
                verified = result.get("verified") if isinstance(result, dict) else None
                log(f"  Added domain {domain} (verified={verified})")
                if verified is False:
                    try:
                        self.post(f"/v9/projects/{project_id}/domains/{domain}/verify", {})
                        log(f"  Requested verification for {domain}")
                    except HttpError as exc:
                        log(f"  Domain verify deferred for {domain}: HTTP {exc.status}")
            except HttpError as exc:
                if exc.status in {409, 400} and "already" in exc.body.lower():
                    log(f"  Domain {domain} already configured")
                    continue
                raise

    def ensure_api_url(self, project_id: str) -> None:
        envs = self.get(f"/v9/projects/{project_id}/env")
        items = envs.get("envs") if isinstance(envs, dict) else envs
        api_envs = [
            item
            for item in items or []
            if item.get("key") == "API_URL" and "production" in (item.get("target") or [])
        ]
        desired = f"https://{API_DOMAIN}"
        if api_envs:
            current = api_envs[0]
            env_id = current.get("id")
            request_json(
                "PATCH",
                self.url(f"/v9/projects/{project_id}/env/{env_id}"),
                self.headers,
                {"value": desired, "target": ["production"]},
            )
            log(f"  Set API_URL={desired}")
            return
        self.post(
            f"/v10/projects/{project_id}/env",
            {
                "key": "API_URL",
                "value": desired,
                "type": "plain",
                "target": ["production"],
            },
        )
        log(f"  Created API_URL={desired}")

    def redeploy(self, project: dict[str, Any]) -> str:
        project_id = project["id"]
        deployments = self.get(
            "/v6/deployments",
            {"projectId": project_id, "limit": "5", "target": "production"},
        )
        items = deployments.get("deployments") if isinstance(deployments, dict) else deployments
        if not items:
            raise SystemExit("No existing Vercel production deployments to rebuild")
        latest = items[0]
        deployment_id = latest.get("uid") or latest.get("id")
        body = {
            "name": project.get("name") or "bouncepass",
            "deploymentId": deployment_id,
            "target": "production",
            "withLatestCommit": True,
        }
        created = self.post("/v13/deployments", body, {"forceNew": "1"})
        new_id = created.get("id") or created.get("uid")
        log(f"  Triggered Vercel production deploy {new_id}")
        deadline = time.time() + 900
        while time.time() < deadline:
            detail = self.get(f"/v13/deployments/{new_id}")
            state = (detail.get("readyState") or detail.get("status") or "").upper()
            log(f"  Vercel deploy status: {state or 'unknown'}")
            if state in {"READY", "SUCCEEDED"}:
                return new_id
            if state in {"ERROR", "CANCELED"}:
                raise SystemExit(f"Vercel deploy {new_id} ended with {state}")
            time.sleep(10)
        raise SystemExit(f"Timed out waiting for Vercel deploy {new_id}")


class CloudflareClient:
    def __init__(self, token: str):
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

    def get(self, path: str, params: dict[str, str] | None = None) -> Any:
        url = f"https://api.cloudflare.com/client/v4{path}"
        if params:
            url += "?" + urllib.parse.urlencode(params)
        return request_json("GET", url, self.headers)

    def post(self, path: str, payload: Any) -> Any:
        return request_json("POST", f"https://api.cloudflare.com/client/v4{path}", self.headers, payload)

    def patch(self, path: str, payload: Any) -> Any:
        return request_json("PATCH", f"https://api.cloudflare.com/client/v4{path}", self.headers, payload)

    def put(self, path: str, payload: Any) -> Any:
        return request_json("PUT", f"https://api.cloudflare.com/client/v4{path}", self.headers, payload)

    def zone_id(self) -> str:
        explicit = os.getenv("CLOUDFLARE_ZONE_ID")
        if explicit:
            return explicit
        payload = self.get("/zones", {"name": ROOT_DOMAIN})
        results = payload.get("result") or []
        if not results:
            raise SystemExit("Cloudflare zone bouncepass.net not found for this token")
        return results[0]["id"]

    def delete_record(self, zone_id: str, record_id: str) -> None:
        request_json(
            "DELETE",
            f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{record_id}",
            self.headers,
        )

    def upsert_cname(self, zone_id: str, name: str, content: str, proxied: bool) -> None:
        records = self.get(f"/zones/{zone_id}/dns_records", {"name": name, "per_page": "100"})
        matches = records.get("result") or []
        payload = {
            "type": "CNAME",
            "name": name,
            "content": content.rstrip("."),
            "ttl": 1,
            "proxied": proxied,
        }
        cname = None
        for record in matches:
            if record.get("type") == "CNAME":
                cname = record
            elif record.get("type") in {"A", "AAAA"}:
                self.delete_record(zone_id, record["id"])
                log(f"  Removed {record.get('type')} {name}")
        if cname:
            self.patch(f"/zones/{zone_id}/dns_records/{cname['id']}", payload)
            log(f"  Updated CNAME {name} -> {content} proxied={proxied}")
            return
        self.post(f"/zones/{zone_id}/dns_records", payload)
        log(f"  Created CNAME {name} -> {content} proxied={proxied}")

    def ensure_ssl_full(self, zone_id: str) -> None:
        try:
            self.patch(f"/zones/{zone_id}/settings/ssl", {"value": "full"})
            log("  SSL/TLS mode set to Full")
        except HttpError as exc:
            log(f"  Could not set SSL mode (HTTP {exc.status}); set Full in the Cloudflare dashboard")

    def apply_dns(self) -> None:
        zone_id = self.zone_id()
        log(f"  Zone id {zone_id}")
        self.upsert_cname(zone_id, ROOT_DOMAIN, VERCEL_CNAME, True)
        self.upsert_cname(zone_id, WWW_DOMAIN, VERCEL_CNAME, True)
        self.upsert_cname(zone_id, API_DOMAIN, RENDER_HOST, False)
        self.ensure_ssl_full(zone_id)


def main() -> int:
    secrets = require_env("VERCEL_TOKEN", "RENDER_API_KEY", "CLOUDFLARE_API_TOKEN")
    render = RenderClient(secrets["RENDER_API_KEY"])
    vercel = VercelClient(secrets["VERCEL_TOKEN"])
    cloudflare = CloudflareClient(secrets["CLOUDFLARE_API_TOKEN"])

    log("=== Render backend ===")
    service = render.find_service()
    log(f"  Service {service.get('name')} ({service.get('id')}) status={service.get('suspended') or service.get('status')}")
    render.ensure_database(service)
    render.ensure_custom_domain(service["id"])
    render.deploy(service["id"])

    log("=== Vercel frontend ===")
    project = vercel.find_project()
    log(f"  Project {project.get('name')} ({project.get('id')})")
    vercel.ensure_domains(project["id"])
    vercel.ensure_api_url(project["id"])
    vercel.redeploy(project)

    log("=== Cloudflare DNS ===")
    cloudflare.apply_dns()

    log("=== Verify ===")
    wait_http(f"https://{RENDER_HOST}/health", {200}, 180, "Render default host")
    wait_http(f"https://{WWW_DOMAIN}/login", {200}, 180, "www.bouncepass.net/login")
    wait_http(f"https://{ROOT_DOMAIN}/login", {200, 307, 308}, 180, "bouncepass.net/login")
    wait_http(f"https://{API_DOMAIN}/health", {200}, 180, "api.bouncepass.net/health")
    log("Redeploy complete.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except HttpError as exc:
        log(str(exc))
        raise
