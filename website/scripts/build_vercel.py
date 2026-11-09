#!/usr/bin/env python3
"""Build the existing static atlas for Vercel; this does not deploy anything."""
from pathlib import Path
from urllib.parse import urlsplit
import json, os, re, subprocess, sys
ROOT = Path(__file__).resolve().parents[1]

def production_origin(env):
    if env.get("VERCEL_ENV", "development") != "production":
        return ""
    raw = env.get("SITE_URL", "").strip()
    if not raw:
        host = env.get("VERCEL_PROJECT_PRODUCTION_URL", "").strip()
        if not host:
            raise ValueError("Production origin missing. Enable Vercel system environment variables or set SITE_URL to the assigned HTTPS production origin.")
        raw = "https://" + host
    p = urlsplit(raw)
    host = p.hostname or ""
    if (p.scheme != "https" or not host or p.username or p.password or
        p.path not in ("", "/") or p.query or p.fragment or p.port is not None or
        not re.fullmatch(r"[a-zA-Z0-9.-]+", host) or "." not in host):
        raise ValueError("SITE_URL must be an HTTPS origin with no credentials, port, path, query or fragment.")
    local_check = env.get("ATLAS_LOCAL_CHECK") == "1" and env.get("VERCEL") != "1"
    if host == "fishing-atlas.netlify.app":
        raise ValueError("Old Netlify origin rejected. Use the actual assigned Vercel production origin.")
    if host.endswith((".invalid", ".example", ".test", ".localhost")) and not local_check:
        raise ValueError("A placeholder is not a production domain.")
    return "https://" + p.netloc.lower()

def redirect_rules(path):
    result = []
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#"): continue
        source, destination, status = line.split()
        if status != "301" or not source.startswith("/") or not destination.startswith("/"):
            raise ValueError("Unsupported redirect: " + line)
        result.append({"source": source, "destination": destination, "permanent": True})
    return result

def main():
    env = os.environ.copy()
    origin = production_origin(env)
    env.update(SITE_URL=origin, ATLAS_HOSTING="vercel", ATLAS_FORMS_ENABLED="false")
    subprocess.run([sys.executable, "scripts/compile_release.py"], cwd=ROOT, env=env, check=True)
    subprocess.run([sys.executable, "scripts/build.py"], cwd=ROOT, env=env, check=True)
    rules = redirect_rules(ROOT / "dist/_redirects")
    config_path = ROOT / "vercel.json"
    config = json.loads(config_path.read_text())
    if "--sync-routing" in sys.argv:
        config["redirects"] = rules
        config_path.write_text(json.dumps(config, indent=2) + "\n")
    elif config.get("redirects") != rules:
        raise ValueError("Redirect map changed. Run python3 scripts/build_vercel.py --sync-routing locally and commit vercel.json before deploying.")
    if not origin:
        # The standard generator already emits noindex and disallows crawling.
        assert not (ROOT / "dist/sitemap.xml").exists()
    (ROOT / "dist/_redirects").unlink()  # Netlify-only control file is not public content.
    report = {"provider": "vercel", "origin": origin or None,
              "mode": "production" if origin else "preview", "redirects": len(rules),
              "formsEnabled": False, "deployed": False}
    (ROOT / "test-results").mkdir(exist_ok=True)
    (ROOT / "test-results/vercel-build.json").write_text(json.dumps(report, indent=2))
    print("Vercel static build complete; authenticated upload has not been performed.")

if __name__ == "__main__":
    try: main()
    except (ValueError, subprocess.CalledProcessError) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
