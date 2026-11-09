#!/usr/bin/env python3
from pathlib import Path
import importlib.util, json, unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("build_vercel",ROOT/"scripts/build_vercel.py")
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
class VercelTests(unittest.TestCase):
    def test_preview_is_unindexed_even_with_site_url(self):
        self.assertEqual(m.production_origin({"VERCEL_ENV":"preview", "SITE_URL":"https://example.org"}),"")
    def test_local_is_preview(self): self.assertEqual(m.production_origin({}),"")
    def test_explicit_origin(self):
        self.assertEqual(m.production_origin({"VERCEL_ENV":"production","SITE_URL":"https://example.org/"}),"https://example.org")
    def test_assigned_domain(self):
        self.assertEqual(m.production_origin({"VERCEL_ENV":"production","VERCEL_PROJECT_PRODUCTION_URL":"assigned-example.vercel.app"}),"https://assigned-example.vercel.app")
    def test_missing_domain_fails(self):
        with self.assertRaises(ValueError): m.production_origin({"VERCEL_ENV":"production"})
    def test_invalid_origins(self):
        for url in ["http://example.org","https://example.org/path","https://user:pass@example.org","https://example.org?x=1","https://example.org#x","https://example.org:443", "https://localhost", "https://fishing-atlas.netlify.app", "https://not-real.invalid"]:
            with self.subTest(url=url), self.assertRaises(ValueError):
                m.production_origin({"VERCEL_ENV":"production","SITE_URL":url})
    def test_local_placeholder_allowed_only_outside_vercel(self):
        env={"VERCEL_ENV":"production","SITE_URL":"https://verification.invalid","ATLAS_LOCAL_CHECK":"1"}
        self.assertEqual(m.production_origin(env),"https://verification.invalid")
        with self.assertRaises(ValueError): m.production_origin(dict(env,VERCEL="1"))
    def test_no_spa_rewrite_or_project_secrets(self):
        c=json.loads((ROOT/"vercel.json").read_text())
        self.assertNotIn("rewrites",c); self.assertNotIn("env",c)
        self.assertEqual(c["outputDirectory"],"dist")
    def test_redirects_unique_and_not_loops(self):
        rs=json.loads((ROOT/"vercel.json").read_text())["redirects"]
        self.assertEqual(len(rs),519)
        self.assertEqual(len({r["source"] for r in rs}),len(rs))
        for r in rs:
            self.assertNotEqual(r["source"],r["destination"])
            self.assertTrue(r["permanent"])
    def test_no_credentials_in_vercel_config(self):
        text=(ROOT/"vercel.json").read_text().lower()
        self.assertNotIn("token",text); self.assertNotIn("secret",text)
if __name__=="__main__": unittest.main(verbosity=2)
