import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

def arg_after_dash():
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1:]

args = arg_after_dash()
if len(args) < 3:
    raise SystemExit("Usage: blender -b --python render_exterior_model.py -- <model_json> <output_type> <output_png>")

model_json = Path(args[0])
output_type = args[1]
output_png = Path(args[2])

spec = json.loads(model_json.read_text(encoding="utf-8"))

def mat(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = color
    return m

def cube(name, loc, scale, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        obj.data.materials.append(material)
    return obj

def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

def camera_from_spec(cam):
    # Stored camera uses x=width, y=height, z=depth.
    # Blender uses x=width, y=depth, z=height.
    pos = cam.get("position", [0, 8, 35])
    target = cam.get("target", [0, 8, 0])
    return (float(pos[0]), -float(pos[2]), float(pos[1])), (float(target[0]), -float(target[2]), float(target[1]))

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()

plot = spec.get("plot", {})
env = spec.get("buildingEnvelope", {})
facade = spec.get("facadeSystem", {})
queue = spec.get("renderQueue", [])

width = float(plot.get("widthFt") or 30)
depth = float(plot.get("depthFt") or 40)
levels = int(env.get("levels") or 2)
floor_h = float(env.get("approxFloorHeightFt") or 10)
parapet_h = float(env.get("parapetHeightFt") or 3)
height = levels * floor_h

white = mat("Warm White Plaster", (0.88, 0.86, 0.80, 1))
grey = mat("Soft Grey Plaster", (0.38, 0.38, 0.38, 1))
dark = mat("Black Metal / Glass", (0.02, 0.02, 0.025, 1))
wood = mat("Wood Accent", (0.55, 0.30, 0.13, 1))
glass = mat("Dark Glass", (0.05, 0.08, 0.10, 1))
ground_mat = mat("Concrete Ground", (0.45, 0.45, 0.42, 1))
road_mat = mat("Road", (0.12, 0.12, 0.12, 1))

# Ground and road
cube("Plot Ground", (0, depth / 2, -0.05), (width, depth, 0.1), ground_mat)
cube("Front Road", (0, -7, -0.06), (width + 12, 12, 0.08), road_mat)

# Main building massing, front at y=4
b_width = width * 0.78
b_depth = depth * 0.55
front_y = 4.0
b_center_y = front_y + b_depth / 2
cube("Main G+ Massing", (0, b_center_y, height / 2), (b_width, b_depth, height), white)

# Grey vertical facade bay
cube("Grey Vertical Facade Bay", (b_width * 0.23, front_y - 0.15, height / 2), (b_width * 0.22, 0.35, height * 0.92), grey)

# Wood accent bay
cube("Wood Accent Panel", (-b_width * 0.25, front_y - 0.22, height * 0.58), (b_width * 0.20, 0.25, height * 0.65), wood)

# First floor balcony slab and railing
bal_w = b_width * 0.43
bal_y = front_y - 1.2
cube("Balcony Slab", (-b_width * 0.12, bal_y, floor_h + 0.25), (bal_w, 2.0, 0.28), grey)
cube("Balcony Back", (-b_width * 0.12, front_y - 0.08, floor_h + 1.5), (bal_w, 0.25, 2.6), white)
cube("Balcony Railing", (-b_width * 0.12, bal_y - 0.95, floor_h + 1.25), (bal_w, 0.12, 1.1), dark)

# Windows
win_w = b_width * 0.16
cube("Ground Window Left", (-b_width * 0.25, front_y - 0.32, 4.5), (win_w, 0.12, 3.0), glass)
cube("Ground Window Right", (b_width * 0.25, front_y - 0.32, 4.5), (win_w, 0.12, 3.0), glass)
cube("First Window Left", (-b_width * 0.30, front_y - 0.34, floor_h + 5.0), (win_w, 0.12, 3.2), glass)
cube("First Window Right", (b_width * 0.27, front_y - 0.34, floor_h + 5.0), (win_w, 0.12, 3.2), glass)

# Main door
cube("Main Door", (0, front_y - 0.38, 3.2), (b_width * 0.13, 0.16, 4.2), wood)

# Parapet and top frame
cube("Parapet", (0, b_center_y, height + parapet_h / 2), (b_width, b_depth, parapet_h), grey)
cube("Top White Frame", (0, front_y - 0.25, height + 0.6), (b_width * 0.95, 0.25, 1.0), white)

# Boundary wall and gate
cube("Left Boundary Wall", (-width * 0.31, 0.2, 2.2), (width * 0.22, 0.35, 4.4), white)
cube("Right Boundary Wall", (width * 0.31, 0.2, 2.2), (width * 0.22, 0.35, 4.4), white)
cube("Front Gate", (0, -0.05, 2.2), (width * 0.42, 0.25, 4.0), dark)

# Simple horizontal gate strips
for i in range(4):
    cube(f"Gate Strip {i+1}", (0, -0.24, 1.0 + i * 0.75), (width * 0.42, 0.08, 0.12), grey)

# Warm facade lights
for x in [-b_width * 0.38, 0, b_width * 0.38]:
    bpy.ops.object.light_add(type="POINT", location=(x, front_y - 1.2, height - 2.5))
    l = bpy.context.object
    l.name = "Warm Facade Light"
    l.data.energy = 120
    l.data.color = (1.0, 0.78, 0.45)

# Sun and world
bpy.ops.object.light_add(type="SUN", location=(0, -10, 25))
sun = bpy.context.object
sun.name = "Sun"
sun.data.energy = 2.5

bpy.context.scene.world.color = (0.78, 0.84, 0.92)

# Camera from render queue
item = None
for q in queue:
    if str(q.get("outputType", "")).upper() == str(output_type).upper():
        item = q
        break
if not item and queue:
    item = queue[0]
cam_spec = (item or {}).get("camera", {})

cam_loc, cam_target = camera_from_spec(cam_spec)
bpy.ops.object.camera_add(location=cam_loc)
cam = bpy.context.object
cam.name = f"Camera {output_type}"
look_at(cam, cam_target)
cam.data.lens = 28
bpy.context.scene.camera = cam

# Render settings
engines = [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
bpy.context.scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
bpy.context.scene.eevee.taa_render_samples = 48

bpy.context.scene.render.resolution_x = 1400
bpy.context.scene.render.resolution_y = 1000
bpy.context.scene.render.film_transparent = False
bpy.context.scene.render.filepath = str(output_png)

output_png.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.save_as_mainfile(filepath=str(output_png.with_suffix(".blend")))
bpy.ops.render.render(write_still=True)

print("REAL_RENDER_OK", output_png)
