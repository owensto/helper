"""Compatibility entry point for current world-edition UI checks."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('world_browser_test.py')),run_name='__main__')
