"""Scope UI tests to the view-selector buttons, not the app's layout state."""
from pathlib import Path
import os
r=Path(os.environ['COMMAND_ROOT'])
p=r/'verify_release.py';s=p.read_text()
assert "page.locator('[data-layout" in s
s=s.replace("page.locator('[data-layout", "page.locator('.layout-switch button[data-layout")
p.write_text(s)
print('View-control tests target the buttons; all assertions retained.')
