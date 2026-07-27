"""Extract per-part baked rotations + joint pivots from the minifig LCA files.

Walks each WLD object tree exactly like export_obj.py does, and records for
every emitted shape object:
  - m:     the composed world rotation matrix (row-major 3x3, VRT space)
  - pivot: the world position of its rotation centre (VRT units, pre-flip)

The game un-bakes each part's rotation about that pivot to obtain a true
neutral pose, and uses the pivot as the joint centre for animation.

Output: src/game/data/minifig-rest.generated.json
"""
import json
import math
import os
import sys

RES = r"d:/CODING/THREEJS/knightskingdom/knightskingdom/resources"
TOOLS = os.path.join(RES, "model_files", "tools")
LCA_DIR = os.path.join(RES, "model_files", "extracted", "pak", "warehouse",
                       "main_interface", "minifigures_animals")
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "game", "data",
                   "minifig-rest.generated.json")

sys.path.insert(0, TOOLS)
from lca_parser import parse_lca  # noqa: E402

E_OFINVISIBLE = 0x80000000
E_OFINVISDEF = 0x40000000


def mat_identity():
    return [[1.0, 0, 0], [0, 1.0, 0], [0, 0, 1.0]]


def mat_mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)]
            for i in range(3)]


def mat_vec(m, v):
    return [sum(m[i][k] * v[k] for k in range(3)) for i in range(3)]


def rot_from_brees(brees):
    rx, ry, rz = [b * 2.0 * math.pi / 65536.0 for b in brees]
    cx, sx = math.cos(rx), math.sin(rx)
    cy, sy = math.cos(ry), math.sin(ry)
    cz, sz = math.cos(rz), math.sin(rz)
    RX = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]]
    RY = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]
    RZ = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]]
    return mat_mul(RY, mat_mul(RX, RZ))


def build_tree(objects):
    by_off = {o["offset"]: o for o in objects}
    for o in objects:
        o["children"] = []
    for o in objects:
        ch_off = o.get("child")
        while ch_off:
            ch = by_off.get(ch_off)
            if ch is None:
                break
            o["children"].append(ch)
            ch_off = ch.get("sibling")
    child_offs = {c["offset"] for o in objects for c in o["children"]}
    roots = [o for o in objects if o["offset"] not in child_offs]
    return roots


def walk(ob, pM, pT, out):
    if ob["oflags"] & (E_OFINVISIBLE | E_OFINVISDEF):
        return
    rot = ob.get("rot")
    if rot and any(rot["brees"]):
        R = rot_from_brees(rot["brees"])
        c = rot["center"]
    else:
        R, c = mat_identity(), [0, 0, 0]
    base = [ob["pos"][i] + c[i] - mat_vec(R, c)[i] for i in range(3)]
    M = mat_mul(pM, R)
    T = [pT[i] + mat_vec(pM, base)[i] for i in range(3)]
    pivot = [pT[i] + mat_vec(pM, [ob["pos"][j] + c[j] for j in range(3)])[i]
             for i in range(3)]
    if ob["type"] != 0xFFFF:
        out[str(ob["number"])] = {
            "m": [round(v, 6) for row in M for v in row],
            "pivot": [round(v, 2) for v in pivot],
        }
    for ch in ob["children"]:
        walk(ch, M, T, out)


def main():
    result = {}
    for fn in sorted(os.listdir(LCA_DIR)):
        if not fn.startswith("minifig") or not fn.endswith(".lca"):
            continue
        donor = fn[:-4]
        try:
            r = parse_lca(os.path.join(LCA_DIR, fn))
        except Exception as e:  # noqa: BLE001
            print(f"  ! {donor}: {e}")
            continue
        objects = r.get("wld", {}).get("objects", [])
        if not objects:
            continue
        roots = build_tree(objects)
        parts = {}
        for root in roots:
            walk(root, mat_identity(), [0.0, 0.0, 0.0], parts)
        result[donor] = parts
        rotated = sum(1 for p in parts.values()
                      if any(abs(v) > 1e-4 for i, v in enumerate(p["m"])
                             if i % 4 != 0))
        print(f"  {donor}: {len(parts)} parts, {rotated} carry rotation")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, separators=(",", ":"))
    print(f"wrote {OUT} ({len(result)} donors)")


if __name__ == "__main__":
    main()
