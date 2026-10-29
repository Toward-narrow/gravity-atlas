"""Refresh the offline MATLAB download payload after editing the .m source."""
from pathlib import Path
import json
root = Path(__file__).resolve().parents[1] / "matlab"
source = (root / "gravity_forward_studio.m").read_text(encoding="utf-8-sig")
(root / "forward-matlab-source.js").write_text(
    "/* Embedded offline MATLAB source. */\nwindow.ForwardMatlabSource = "
    + json.dumps(source, ensure_ascii=False) + ";\n", encoding="utf-8"
)
print("Updated offline MATLAB export.")
